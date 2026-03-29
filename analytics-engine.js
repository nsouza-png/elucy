// ==================================================================
// ELUCY — ANALYTICS ENGINE (Enterprise)
// Módulo separado. UI nunca computa — só renderiza.
// Toda métrica declara dimensão: operator | line | stage | channel | task
// Lei 2: Nenhum relatório sem taxonomia.
// ==================================================================

(function(){
'use strict';

// Dependencies from cockpit-engine
var _sb = function(){ return window.getSB ? window.getSB() : null; };
var _opId = function(){ return window.getOperatorId ? window.getOperatorId() : null; };
var _map = function(){ return window._COCKPIT_DEAL_MAP || {}; };
var _deals = function(){ return Object.values(_map()); };
var _taxonomy = function(){ return window.REVENUE_LINES || {}; };
var _stages = function(){ return window.STAGE_PROB || {}; };
var _channels = function(){ return window.CADENCE_CHANNELS || {}; };
var _taskTypes = function(){ return window.TASK_TYPES || {}; };
var _buildTaskQueue = function(f){ return window.buildTaskQueue ? window.buildTaskQueue(f) : []; };
var _calcAgingRisk = function(d){ return window.calcAgingRisk ? window.calcAgingRisk(d) : {}; };
var _enrichDeal = function(d){ if(window.enrichDealContext) window.enrichDealContext(d); };

// ── SHARED: Load activity log from Supabase ──────────────────────
var _activityCache = null;
var _activityCacheTs = 0;

async function _loadActivity(periodDays){
  var now = Date.now();
  // Cache for 60s
  if(_activityCache && (now - _activityCacheTs) < 60000) return _activityCache;

  var sb=_sb(); if(!sb) return [];
  var opId=_opId(); if(!opId) return [];
  var since=new Date();
  since.setDate(since.getDate()-(periodDays||30));
  var result=await sb.from('activity_log')
    .select('activity_type,deal_id,metadata,created_at')
    .eq('operator_id',opId)
    .gte('created_at',since.toISOString())
    .order('created_at',{ascending:false})
    .limit(2000);
  _activityCache = result.data || [];
  _activityCacheTs = now;
  return _activityCache;
}

// ── SHARED: Classify deal dimensions ─────────────────────────────
function _classifyDeal(d){
  if(!d._revLine) _enrichDeal(d);
  return {
    line: d._revLine || d.linhaReceita || d.grupo_de_receita || 'Outro',
    stage: d.etapa || d._etapa || d.fase || 'Outro',
    channel: d.canal || d.utm_medium || 'Outro',
    persona: d._persona || 'Outro',
    framework: d._framework || 'Outro',
    tier: (d.tier || '').toLowerCase() || 'outro',
    aging: d._delta || d.delta || 0,
    risk: d._aging ? d._aging.riskLevel : 'none',
    value: d.elucyValor || d.revenueRaw || 0,
    status: (d.statusDeal || '').toLowerCase()
  };
}

// ── HELPER: Group + count ────────────────────────────────────────
function _groupBy(arr, keyFn){
  var groups = {};
  arr.forEach(function(item){
    var key = keyFn(item) || 'Outro';
    if(!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

function _pct(num, den){ return den > 0 ? Math.round(num/den*1000)/10 : 0; }

// ==================================================================
// calcByOperator() — Métricas do operador atual
// ==================================================================
async function calcByOperator(periodDays){
  var activities = [];
  try { activities = await _loadActivity(periodDays || 30); } catch(e){ console.warn('[analytics] _loadActivity failed, using empty:',e.message); }
  var deals = _deals().filter(function(d){
    var s=(d.statusDeal||'').toLowerCase();
    return s!=='perdido'&&s!=='ganho';
  });

  var fups = activities.filter(function(a){ return ['copy_generated','copy_sent_wa','copy_sent_ig'].indexOf(a.activity_type)>=0; }).length;
  var analyses = activities.filter(function(a){ return a.activity_type==='analysis_generated'; }).length;
  var copies = activities.filter(function(a){ return a.activity_type==='copy_generated'; }).length;
  var dvl = activities.filter(function(a){ return a.activity_type==='dvl_confirmed'; }).length;
  var dms = activities.filter(function(a){ return ['dm_generated','dm_copied'].indexOf(a.activity_type)>=0; }).length;
  var notes = activities.filter(function(a){ return a.activity_type==='note_crm_copied'; }).length;
  var enrichments = activities.filter(function(a){ return ['enrichment_added','whatsapp_pasted'].indexOf(a.activity_type)>=0; }).length;

  var dealSet = {};
  activities.forEach(function(a){ if(a.deal_id) dealSet[a.deal_id]=true; });
  var uniqueDeals = Object.keys(dealSet).length;

  var totalAging = deals.reduce(function(s,d){ return s+(d._delta||d.delta||0); },0);
  var avgAging = deals.length>0 ? Math.round(totalAging/deals.length*10)/10 : 0;

  var atRisk = deals.filter(function(d){
    var aging = d._aging || _calcAgingRisk(d);
    return aging && aging.isAtRisk;
  }).length;

  // Speed: avg days per stage advance
  var advancedDeals = deals.filter(function(d){
    var e=(d._etapa||d.etapa||'').toLowerCase();
    return e.includes('agend')||e.includes('entrevista')||e==='conectados';
  }).length;

  // DQI
  var dqiRaw = analyses + (dvl*2) + (notes*0.5);
  var dqi = uniqueDeals > 0 ? Math.min(100, Math.round(dqiRaw/uniqueDeals*100)) : 0;

  // Score (5 components)
  var p = periodDays || 30;
  var dailyAvgFups = fups / Math.max(p, 1);
  var qualNorm = Math.min(100, Math.round(dailyAvgFups/15*100));
  var handoffNorm = copies > 0 ? Math.min(100, Math.round(dvl/copies*100)) : 0;
  var winRate = uniqueDeals > 0 ? Math.min(100, Math.round(advancedDeals/uniqueDeals*100)) : 0;
  var speedScore = Math.max(0, Math.min(100, Math.round((1-(avgAging-1)/14)*100)));

  var score = Math.round((qualNorm*0.2 + handoffNorm*0.3 + winRate*0.3 + speedScore*0.1 + dqi*0.1));

  // By day
  var byDay = {};
  activities.forEach(function(a){
    var day = a.created_at.slice(0,10);
    byDay[day] = (byDay[day]||0) + 1;
  });

  return {
    dimension: 'operator',
    period: p,
    metrics: {
      fups: fups, analyses: analyses, copies: copies, dvl: dvl,
      dms: dms, notes: notes, enrichments: enrichments,
      uniqueDeals: uniqueDeals, total: activities.length
    },
    pipeline: {
      activeDeals: deals.length, avgAging: avgAging, atRisk: atRisk
    },
    scores: {
      overall: score, qualification: qualNorm, handoff: handoffNorm,
      winRate: winRate, speed: speedScore, dqi: dqi
    },
    byDay: byDay
  };
}

// ==================================================================
// calcByLine() — Métricas por revenue line
// ==================================================================
function calcByLine(){
  var deals = _deals();
  var lines = _groupBy(deals, function(d){
    _enrichDeal(d);
    return d._revLine || d.linhaReceita || d.grupo_de_receita || 'Outro';
  });

  var result = {};
  Object.keys(lines).forEach(function(line){
    var ld = lines[line];
    var active = ld.filter(function(d){ var s=(d.statusDeal||'').toLowerCase(); return s!=='perdido'&&s!=='ganho'; });
    var won = ld.filter(function(d){ return (d.statusDeal||'').toLowerCase()==='ganho'; });
    var lost = ld.filter(function(d){ return (d.statusDeal||'').toLowerCase()==='perdido'; });

    var totalAging = active.reduce(function(s,d){ return s+(d._delta||d.delta||0); },0);
    var avgAging = active.length>0 ? Math.round(totalAging/active.length*10)/10 : 0;

    var atRisk = active.filter(function(d){
      var aging = d._aging || _calcAgingRisk(d);
      return aging && aging.isAtRisk;
    }).length;

    var totalValue = active.reduce(function(s,d){ return s+(d.elucyValor||d.revenueRaw||0); },0);

    // Stage distribution
    var byStage = {};
    active.forEach(function(d){
      var st = d.etapa || d._etapa || d.fase || 'Outro';
      byStage[st] = (byStage[st]||0)+1;
    });

    result[line] = {
      total: ld.length, active: active.length,
      won: won.length, lost: lost.length,
      winRate: _pct(won.length, won.length + lost.length),
      avgAging: avgAging, atRisk: atRisk,
      totalValue: totalValue,
      byStage: byStage
    };
  });

  return { dimension: 'line', data: result };
}

// ==================================================================
// calcByStage() — Métricas por etapa do pipeline
// ==================================================================
function calcByStage(){
  var deals = _deals();
  var STAGE_ORDER = ['MQL','SAL','Conectados','Agendamento','Negociacao','Oportunidade','Ganho','Perdido'];

  var stages = _groupBy(deals, function(d){
    return d.etapa || d._etapa || d.fase || 'Outro';
  });

  var result = {};
  Object.keys(stages).forEach(function(stage){
    var sd = stages[stage];
    var totalAging = sd.reduce(function(s,d){ return s+(d._delta||d.delta||0); },0);
    var avgAging = sd.length>0 ? Math.round(totalAging/sd.length*10)/10 : 0;
    var totalValue = sd.reduce(function(s,d){ return s+(d.elucyValor||d.revenueRaw||0); },0);

    var atRisk = sd.filter(function(d){
      var aging = d._aging || _calcAgingRisk(d);
      return aging && aging.isAtRisk;
    }).length;

    // By line
    var byLine = {};
    sd.forEach(function(d){
      _enrichDeal(d);
      var line = d._revLine || d.linhaReceita || 'Outro';
      byLine[line] = (byLine[line]||0)+1;
    });

    // By tier
    var byTier = {};
    sd.forEach(function(d){
      var tier = (d.tier||'outro').toLowerCase();
      byTier[tier] = (byTier[tier]||0)+1;
    });

    result[stage] = {
      count: sd.length, avgAging: avgAging,
      totalValue: totalValue, atRisk: atRisk,
      byLine: byLine, byTier: byTier,
      order: STAGE_ORDER.indexOf(stage) >= 0 ? STAGE_ORDER.indexOf(stage) : 99
    };
  });

  return { dimension: 'stage', data: result };
}

// ==================================================================
// calcByChannel() — Métricas por canal de marketing
// ==================================================================
function calcByChannel(){
  var deals = _deals();
  var channels = _groupBy(deals, function(d){
    return d.canal || d.utm_medium || 'Outro';
  });

  var result = {};
  Object.keys(channels).forEach(function(ch){
    var cd = channels[ch];
    var active = cd.filter(function(d){ var s=(d.statusDeal||'').toLowerCase(); return s!=='perdido'&&s!=='ganho'; });
    var won = cd.filter(function(d){ return (d.statusDeal||'').toLowerCase()==='ganho'; });
    var lost = cd.filter(function(d){ return (d.statusDeal||'').toLowerCase()==='perdido'; });

    var totalValue = active.reduce(function(s,d){ return s+(d.elucyValor||d.revenueRaw||0); },0);
    var avgAging = active.length>0 ? Math.round(active.reduce(function(s,d){return s+(d._delta||d.delta||0);},0)/active.length*10)/10 : 0;

    result[ch] = {
      total: cd.length, active: active.length,
      won: won.length, lost: lost.length,
      winRate: _pct(won.length, won.length + lost.length),
      avgAging: avgAging, totalValue: totalValue
    };
  });

  return { dimension: 'channel', data: result };
}

// ==================================================================
// calcByTask() — Métricas por tipo de task
// ==================================================================
function calcByTask(){
  var tasks = _buildTaskQueue();
  var types = _groupBy(tasks, function(t){ return t.taskType; });

  var result = {};
  Object.keys(types).forEach(function(type){
    var tt = types[type];
    var cfg = (_taskTypes())[type] || { label: type };
    var avgUrgency = tt.length>0 ? Math.round(tt.reduce(function(s,t){return s+(t.urgency||0);},0)/tt.length) : 0;
    var critical = tt.filter(function(t){ return t.priority==='critical'; }).length;
    var high = tt.filter(function(t){ return t.priority==='high'; }).length;

    result[type] = {
      label: cfg.label || type,
      count: tt.length,
      critical: critical, high: high,
      avgUrgency: avgUrgency
    };
  });

  return { dimension: 'task', data: result };
}

// ==================================================================
// calcGlobal() — Overview geral (usa todas as dimensões)
// ==================================================================
async function calcGlobal(periodDays){
  var _emptyOp = {dimension:'operator',period:periodDays||30,metrics:{fups:0,analyses:0,copies:0,dvl:0,dms:0,notes:0,enrichments:0,uniqueDeals:0,total:0},pipeline:{activeDeals:0,avgAging:0,atRisk:0},scores:{overall:0,qualification:0,handoff:0,winRate:0,speed:0,dqi:0},byDay:{}};
  var operator;
  try { operator = await calcByOperator(periodDays); } catch(e){ console.warn('[analytics] calcByOperator failed:',e.message); operator = _emptyOp; }
  if(!operator || !operator.scores) operator = _emptyOp;

  var byLine, byStage, byChannel, byTask;
  try { byLine = calcByLine(); } catch(e){ console.warn('[analytics] calcByLine failed:',e.message); byLine = {dimension:'line',data:{}}; }
  try { byStage = calcByStage(); } catch(e){ console.warn('[analytics] calcByStage failed:',e.message); byStage = {dimension:'stage',data:{}}; }
  try { byChannel = calcByChannel(); } catch(e){ console.warn('[analytics] calcByChannel failed:',e.message); byChannel = {dimension:'channel',data:{}}; }
  try { byTask = calcByTask(); } catch(e){ console.warn('[analytics] calcByTask failed:',e.message); byTask = {dimension:'task',data:{}}; }

  var deals = _deals();
  var active = deals.filter(function(d){ var s=(d.statusDeal||'').toLowerCase(); return s!=='perdido'&&s!=='ganho'; });
  var totalValue = active.reduce(function(s,d){ return s+(d.elucyValor||d.revenueRaw||0); },0);

  // Enrich operator pipeline from local deals if Supabase was unavailable
  if(operator.pipeline.activeDeals===0 && active.length>0){
    var totalAging = active.reduce(function(s,d){ return s+(d._delta||d.delta||0); },0);
    operator.pipeline.activeDeals = active.length;
    operator.pipeline.avgAging = active.length>0 ? Math.round(totalAging/active.length*10)/10 : 0;
    operator.pipeline.atRisk = active.filter(function(d){ var aging=d._aging||_calcAgingRisk(d); return aging&&aging.isAtRisk; }).length;
  }

  // Enterprise (V11)
  var enterprise;
  try { enterprise = calcEnterprise(); } catch(e){ console.warn('[analytics] calcEnterprise failed:',e.message); enterprise = {dimension:'enterprise',enterprise5m:{count:0,pipelineValue:0,byLine:{}},midMarket:{count:0},standard:{count:0},avgEVS:0,totalScored:0,advisor:null,strategic:null}; }

  return {
    dimension: 'global',
    period: periodDays || 30,
    overview: {
      totalDeals: deals.length,
      activeDeals: active.length,
      totalValue: totalValue,
      operatorScore: operator.scores.overall,
      dqi: operator.scores.dqi,
      enterprise5mCount: enterprise.enterprise5m.count,
      avgEVS: enterprise.avgEVS,
      trustedAdvisorScore: enterprise.advisor ? enterprise.advisor.score : null
    },
    operator: operator,
    byLine: byLine,
    byStage: byStage,
    byChannel: byChannel,
    byTask: byTask,
    enterprise: enterprise
  };
}

// ==================================================================
// calcSpeed() — Velocidade de avanço no pipeline
// ==================================================================
function calcSpeed(){
  var deals = _deals();
  var active = deals.filter(function(d){ var s=(d.statusDeal||'').toLowerCase(); return s!=='perdido'&&s!=='ganho'; });
  var STAGE_ORDER = ['MQL','SAL','Conectados','Agendamento','Negociacao','Oportunidade'];

  var speedByLine = {};
  active.forEach(function(d){
    _enrichDeal(d);
    var line = d._revLine || 'Outro';
    var stageIdx = STAGE_ORDER.indexOf(d.etapa || d._etapa || '');
    var aging = d._delta || d.delta || 1;
    var velocity = stageIdx >= 0 ? (stageIdx + 1) / Math.max(aging, 1) : 0;

    if(!speedByLine[line]) speedByLine[line] = { totalVelocity: 0, count: 0 };
    speedByLine[line].totalVelocity += velocity;
    speedByLine[line].count++;
  });

  var result = {};
  Object.keys(speedByLine).forEach(function(line){
    var s = speedByLine[line];
    result[line] = {
      avgVelocity: s.count > 0 ? Math.round(s.totalVelocity / s.count * 100) / 100 : 0,
      count: s.count
    };
  });

  return { dimension: 'speed', data: result };
}

// ==================================================================
// calcDQI() — Decision Quality Index dimensionado
// ==================================================================
async function calcDQI(periodDays){
  var activities = [];
  try { activities = await _loadActivity(periodDays || 30); } catch(e){ console.warn('[analytics] _loadActivity failed in calcDQI:',e.message); }
  var deals = _deals();

  // DQI per deal
  var dealDQI = {};
  activities.forEach(function(a){
    if(!a.deal_id) return;
    if(!dealDQI[a.deal_id]) dealDQI[a.deal_id] = { analyses:0, dvl:0, notes:0, corrections:0 };
    if(a.activity_type==='analysis_generated') dealDQI[a.deal_id].analyses++;
    if(a.activity_type==='dvl_confirmed') dealDQI[a.deal_id].dvl++;
    if(a.activity_type==='note_crm_copied') dealDQI[a.deal_id].notes++;
    if(a.activity_type==='correction_requested') dealDQI[a.deal_id].corrections++;
  });

  // DQI grouped by line
  var byLine = {};
  Object.keys(dealDQI).forEach(function(dealId){
    var deal = _map()[dealId];
    if(!deal) return;
    _enrichDeal(deal);
    var line = deal._revLine || 'Outro';
    var d = dealDQI[dealId];
    var score = Math.min(100, Math.round((d.analyses + d.dvl*2 + d.notes*0.5 + d.corrections*0.5) * 20));
    if(!byLine[line]) byLine[line] = { totalDQI: 0, count: 0 };
    byLine[line].totalDQI += score;
    byLine[line].count++;
  });

  var result = {};
  Object.keys(byLine).forEach(function(line){
    result[line] = {
      avgDQI: byLine[line].count > 0 ? Math.round(byLine[line].totalDQI / byLine[line].count) : 0,
      deals: byLine[line].count
    };
  });

  return { dimension: 'dqi', data: result };
}

// ==================================================================
// calcValue() — Value Engine (opportunity value dimensionado)
// ==================================================================
function calcValue(){
  var deals = _deals();
  var active = deals.filter(function(d){ var s=(d.statusDeal||'').toLowerCase(); return s!=='perdido'&&s!=='ganho'; });

  var byLine = {};
  var byStage = {};
  var byTier = {};

  active.forEach(function(d){
    _enrichDeal(d);
    var val = d.elucyValor || d.revenueRaw || 0;
    var line = d._revLine || 'Outro';
    var stage = d.etapa || d._etapa || 'Outro';
    var tier = (d.tier || 'outro').toLowerCase();

    if(!byLine[line]) byLine[line] = { total: 0, count: 0 };
    byLine[line].total += val;
    byLine[line].count++;

    if(!byStage[stage]) byStage[stage] = { total: 0, count: 0 };
    byStage[stage].total += val;
    byStage[stage].count++;

    if(!byTier[tier]) byTier[tier] = { total: 0, count: 0 };
    byTier[tier].total += val;
    byTier[tier].count++;
  });

  return {
    dimension: 'value',
    byLine: byLine, byStage: byStage, byTier: byTier,
    totalActive: active.length,
    totalValue: active.reduce(function(s,d){ return s+(d.elucyValor||d.revenueRaw||0); },0)
  };
}

// ==================================================================
// calcEnterprise() — Enterprise Intelligence (L23-L25)
// ==================================================================
function calcEnterprise(){
  var deals = _deals();
  var active = deals.filter(function(d){ var s=(d.statusDeal||'').toLowerCase(); return s!=='perdido'&&s!=='ganho'; });

  // L23 Enterprise Value
  var enterprise5m = [];
  var midMarket = [];
  var standard = [];
  var totalEVS = 0;
  var evsCount = 0;

  active.forEach(function(d){
    _enrichDeal(d);
    var ev = d._enterprise;
    if(!ev && window.calcEnterpriseValueV23) ev = window.calcEnterpriseValueV23(d);
    if(!ev) return;
    totalEVS += ev.enterprise_value_score;
    evsCount++;
    if(ev.is_5m_plus) enterprise5m.push(d);
    else if(ev.band === 'mid_market') midMarket.push(d);
    else standard.push(d);
  });

  var avgEVS = evsCount > 0 ? Math.round(totalEVS / evsCount) : 0;
  var pipeline5mValue = enterprise5m.reduce(function(s,d){ return s + (d.elucyValor||d.revenueRaw||0); }, 0);

  // L23 by revenue line
  var byLine5m = {};
  enterprise5m.forEach(function(d){
    var line = d._revLine || 'Outro';
    byLine5m[line] = (byLine5m[line]||0) + 1;
  });

  // L24 Trusted Advisor
  var advisor = window.calcTrustedAdvisorV24 ? window.calcTrustedAdvisorV24(null, null) : null;

  // L25 Strategic
  var strategic = window.calcStrategicIntelligenceV25 ? window.calcStrategicIntelligenceV25() : null;

  return {
    dimension: 'enterprise',
    enterprise5m: { count: enterprise5m.length, pipelineValue: pipeline5mValue, byLine: byLine5m },
    midMarket: { count: midMarket.length },
    standard: { count: standard.length },
    avgEVS: avgEVS,
    totalScored: evsCount,
    advisor: advisor ? {
      score: advisor.trusted_advisor_score,
      band: advisor.band,
      credibility: advisor.credibility_score,
      availability: advisor.availability_score,
      intimacy: advisor.intimacy_score,
      selfishness: advisor.selfishness_score,
      biggestGap: advisor.biggest_gap,
      needsCoaching: advisor.needs_coaching
    } : null,
    strategic: strategic ? {
      revenueQuality: strategic.revenue_quality,
      experienceQuality: strategic.experience_quality
    } : null
  };
}

// ==================================================================
// EXPORT
// ==================================================================
window.AnalyticsEngine = {
  calcByOperator: calcByOperator,
  calcByLine: calcByLine,
  calcByStage: calcByStage,
  calcByChannel: calcByChannel,
  calcByTask: calcByTask,
  calcGlobal: calcGlobal,
  calcSpeed: calcSpeed,
  calcDQI: calcDQI,
  calcValue: calcValue,
  calcEnterprise: calcEnterprise
};

console.log('[analytics-engine] Enterprise Analytics Engine loaded — 10 dimensioned functions (V11)');

})();
