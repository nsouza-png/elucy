// ==================================================================
// ELUCY COCKPIT ENGINE v3.0 — 7-Layer Architecture
// Operator Context | Taxonomy Core | Runtime Deal Context
// Task Execution | Analytics | UI State | Product Intelligence
// Incluir APOS cockpit.html carregar (antes do </body>)
// ==================================================================

(function(){
'use strict';

// == HELPERS =======================================================
function _sb(){ return window.getSB ? window.getSB() : null; }
function _escHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _today(){ return new Date().toISOString().slice(0,10); }
function _now(){ return new Date().toISOString(); }

// ==================================================================
// LAYER 1 — OPERATOR CONTEXT
// Define o contexto base da sessao. Toda tela usa como chave primaria.
// ==================================================================

const _operatorCtx = {
  email: '',
  qualificador_name: '',
  role: 'sdr',
  meta_mensal: { fups:300, qualificacoes:100, handoffs:40 },
  meta_diaria: { fups:15, qualificacoes:5, handoffs:2 },
  focus_mode: 'velocidade',
  active_revenue_lines: [],
  permissions: { can_view_team:false, can_approve:false, is_leader:false },
  squad: '',
  performance_profile: null,
  initialized: false
};

function getOperatorId(){
  if(window._currentUser) return window._currentUser.email;
  return localStorage.getItem('elucy_operator_email')||'';
}
window.getOperatorId = getOperatorId;
function getOperatorCtx(){ return _operatorCtx; }
window.getOperatorCtx = getOperatorCtx;

async function initOperatorContext(){
  const sb=_sb(); if(!sb) return;
  const email=getOperatorId(); if(!email) return;
  _operatorCtx.email=email;
  const {data}=await sb.from('operators')
    .select('qualificador_name,role,meta_mensal,focus_mode,squad,approved')
    .eq('email',email).maybeSingle();
  if(data){
    _operatorCtx.qualificador_name=data.qualificador_name||email.split('@')[0];
    _operatorCtx.role=data.role||'sdr';
    _operatorCtx.squad=data.squad||'';
    _operatorCtx.focus_mode=data.focus_mode||'velocidade';
    if(data.meta_mensal) try{ Object.assign(_operatorCtx.meta_mensal,JSON.parse(data.meta_mensal)); }catch(e){}
    _operatorCtx.permissions.can_view_team=data.role==='leader'||data.role==='manager';
    _operatorCtx.permissions.can_approve=data.role==='leader'||data.role==='manager';
    _operatorCtx.permissions.is_leader=data.role==='leader';
  }
  _operatorCtx.meta_diaria.fups=Math.ceil(_operatorCtx.meta_mensal.fups/22);
  _operatorCtx.meta_diaria.qualificacoes=Math.ceil(_operatorCtx.meta_mensal.qualificacoes/22);
  _operatorCtx.meta_diaria.handoffs=Math.ceil(_operatorCtx.meta_mensal.handoffs/22);
  _operatorCtx.initialized=true;
}
window.initOperatorContext = initOperatorContext;

async function saveOperatorSettings(settings){
  const sb=_sb(); if(!sb) return;
  const email=getOperatorId(); if(!email) return;
  const update={};
  if(settings.focus_mode){ update.focus_mode=settings.focus_mode; _operatorCtx.focus_mode=settings.focus_mode; }
  if(settings.meta_mensal){
    update.meta_mensal=JSON.stringify(settings.meta_mensal);
    Object.assign(_operatorCtx.meta_mensal,settings.meta_mensal);
    _operatorCtx.meta_diaria.fups=Math.ceil(_operatorCtx.meta_mensal.fups/22);
    _operatorCtx.meta_diaria.qualificacoes=Math.ceil(_operatorCtx.meta_mensal.qualificacoes/22);
    _operatorCtx.meta_diaria.handoffs=Math.ceil(_operatorCtx.meta_mensal.handoffs/22);
  }
  await sb.from('operators').update(update).eq('email',email);
}
window.saveOperatorSettings = saveOperatorSettings;

const FOCUS_MODES = {
  velocidade:   { label:'Velocidade',    priority:['follow_up','social_dm','agendamento'], icon:'zap' },
  qualificacao: { label:'Qualificacao',  priority:['requalificacao','dvl_review','note_completion'], icon:'target' },
  handoff:      { label:'Handoff',       priority:['handoff_prep','dvl_review','note_completion'], icon:'handshake' },
  reativacao:   { label:'Reativacao',    priority:['reativacao','no_show_recovery','follow_up'], icon:'refresh' },
  social_dm:    { label:'Social DM',     priority:['social_dm','follow_up','agendamento'], icon:'chat' },
  imersao:      { label:'Imersao Focus', priority:['follow_up','handoff_prep','qualificacao'], icon:'trophy' }
};
window.FOCUS_MODES = FOCUS_MODES;


// ==================================================================
// LAYER 2 — TAXONOMY CORE
// ==================================================================

var REVENUE_LINES = {
  imersao:    { label:'Imersao',     base:'qualified',    risk_after:3, line_weight:1.0  },
  club:       { label:'Club',        base:'opportunity',  risk_after:5, line_weight:0.85 },
  field_sales:{ label:'Field Sales', base:'meetings',     risk_after:7, line_weight:0.9  },
  eventos:    { label:'Eventos',     base:'qualified',    risk_after:5, line_weight:0.8  },
  digital:    { label:'Digital',     base:'leads',        risk_after:3, line_weight:0.7  },
  social_dm:  { label:'Social DM',   base:'touchpoints',  risk_after:1, line_weight:0.75 },
  outbound:   { label:'Outbound',    base:'leads',        risk_after:3, line_weight:0.65 },
  parceria:   { label:'Parceria',    base:'qualified',    risk_after:7, line_weight:0.8  },
  consulting: { label:'Consulting',  base:'meetings',     risk_after:5, line_weight:1.1  }
};
window.REVENUE_LINES = REVENUE_LINES;

var STAGE_PROB = {
  'entrevista agendada':0.55,'agendamento':0.45,'reagendamento':0.38,
  'conectados':0.20,'dia 01':0.12,'dia 02':0.10,'dia 03':0.08,
  'dia 04':0.06,'dia 05':0.05,'dia 06':0.04,'novo lead':0.08
};
var TIER_BASE = { diamond:38000, gold:18000, silver:9000, bronze:4000 };
var PERSONA_MAP = { diamond:'titan', gold:'titan', silver:'builder', bronze:'executor' };
var FRAMEWORK_MAP = { titan:'Challenger', builder:'SPICED', executor:'SPIN+Champion' };
var KILL_SWITCHES = {
  titan_challenger_only:true, builder_spiced:true, executor_spin:true,
  tier2_block_imersao_presencial:true, ceo_mei_downgrade_authority:true,
  dqi_over_revenue:true, black_box_protocol:true
};
window.KILL_SWITCHES = KILL_SWITCHES;

function resolveRevenueLine(deal){
  var lr=(deal.linhaReceita||deal.linha_de_receita_vigente||'').toLowerCase();
  var gr=(deal.grupo_de_receita||deal.grupoReceita||'').toLowerCase();
  var canal=(deal.canal||'').toLowerCase();
  var utm=(deal.utm_medium||'').toLowerCase();
  if(lr.includes('social dm')||lr.includes('social media')||lr.includes('[im] social')||utm==='tallis'||utm==='nardon'||utm==='alfredo') return 'social_dm';
  if(lr.includes('club')||gr.includes('club')) return 'club';
  if(lr.includes('consulting')||gr.includes('consulting')) return 'consulting';
  if(lr.includes('field')||lr.includes('outbound')||canal==='ligacao') return 'field_sales';
  if(lr.includes('evento')||gr.includes('evento')) return 'eventos';
  if(lr.includes('digital')||lr.includes('online')||gr.includes('digital')) return 'digital';
  if(lr.includes('parceria')||gr.includes('parceria')) return 'parceria';
  if(lr.includes('outbound')) return 'outbound';
  return 'imersao';
}
window.resolveRevenueLine = resolveRevenueLine;

function resolvePersona(tier){ return PERSONA_MAP[(tier||'').toLowerCase()]||'executor'; }
function resolveFramework(tier){ return FRAMEWORK_MAP[resolvePersona(tier)]||'SPIN+Champion'; }
window.resolvePersona = resolvePersona;
window.resolveFramework = resolveFramework;

function calcOpportunityValue(deal){
  var tier=(deal.tier||deal._tier||'').toLowerCase();
  var ticket=TIER_BASE[tier]||6000;
  var cargo=(deal.cargo||'').toLowerCase();
  var icp_weight=1.0;
  if(cargo.includes('ceo')||cargo.includes('presidente')||cargo.includes('fundador')||cargo.includes('socio')) icp_weight=1.2;
  else if(cargo.includes('diretor')||cargo.includes('vp')) icp_weight=1.1;
  else if(cargo.includes('gerente')) icp_weight=0.9;
  else if(cargo.includes('coordenador')||cargo.includes('analista')) icp_weight=0.75;
  if(cargo.includes('ceo')&&(deal.faturamento||'').toLowerCase().includes('mei')) icp_weight=0.6;
  var etapa=(deal.etapa||deal._etapa||'').toLowerCase();
  var stage_prob=STAGE_PROB[etapa]||0.10;
  var persona_weight=tier==='diamond'||tier==='gold'?1.1:tier==='silver'?1.0:0.9;
  var revLine=deal._revLine||resolveRevenueLine(deal);
  var lc=REVENUE_LINES[revLine]||REVENUE_LINES.imersao;
  var delta=deal.delta||deal._delta||0;
  var ra=lc.risk_after;
  var age_penalty=delta>ra*4?0.4:delta>ra*3?0.55:delta>ra*2?0.7:delta>ra?0.85:1.0;
  var skipped=String(deal.event_skipped||deal.eventSkipped||'').toLowerCase()==='true';
  var behavior_score=1.0;
  if(!skipped) behavior_score+=0.15;
  if((deal._touchpoints||0)>=3) behavior_score+=0.15;
  var value=Math.round(ticket*icp_weight*stage_prob*persona_weight*lc.line_weight*age_penalty*behavior_score);
  return { value:value, breakdown:{ticket:ticket,icp_weight:icp_weight,stage_prob:stage_prob,persona_weight:persona_weight,line_weight:lc.line_weight,age_penalty:age_penalty,behavior_score:behavior_score} };
}
window.calcOpportunityValue = calcOpportunityValue;

function calcAgingRisk(deal){
  var revLine=deal._revLine||resolveRevenueLine(deal);
  var lc=REVENUE_LINES[revLine]||REVENUE_LINES.imersao;
  var delta=deal.delta||deal._delta||0;
  var ra=lc.risk_after;
  return { revLine:revLine, risk_after:ra, delta:delta, isAtRisk:delta>ra,
    riskLevel:delta>ra*3?'critical':delta>ra*2?'high':delta>ra?'medium':'low',
    riskLabel:delta>ra*3?'CRITICO':delta>ra*2?'ALTO':delta>ra?'MEDIO':'OK' };
}
window.calcAgingRisk = calcAgingRisk;

function calcConversionByLine(allDeals){
  var byLine={};
  allDeals.forEach(function(d){
    var line=d._revLine||resolveRevenueLine(d);
    if(!byLine[line]) byLine[line]={mql:0,sal:0,opp:0,won:0,lost:0,total_value:0};
    var s=byLine[line]; var status=(d.statusDeal||'').toLowerCase(); var fase=(d._fase||d.fase||'').toLowerCase();
    s.mql++;
    if(status==='ganho'){ s.sal++;s.opp++;s.won++;s.total_value+=(d.revenueRaw||0); }
    else if(status==='perdido'||fase==='perdido'){
      var m=(d.motivoLost||d.motivo_lost||'').toLowerCase();
      if(m.indexOf('[validacao]')!==0) s.sal++;
      if(m.indexOf('[negociacao]')===0||m.indexOf('[im]')===0) s.opp++;
      s.lost++;
    } else { if(fase!=='mql') s.sal++; if(fase==='oportunidade'||fase==='negociacao') s.opp++; }
  });
  Object.keys(byLine).forEach(function(k){ var s=byLine[k];
    s.cr_mql_sal=s.mql>0?Math.round(s.sal/s.mql*1000)/10:0;
    s.cr_sal_opp=s.sal>0?Math.round(s.opp/s.sal*1000)/10:0;
    s.cr_mql_opp=s.mql>0?Math.round(s.opp/s.mql*1000)/10:0;
    s.avg_ticket=s.won>0?Math.round(s.total_value/s.won):0;
  });
  return byLine;
}
window.calcConversionByLine = calcConversionByLine;

function calcEfficiencyByChannel(allDeals){
  var byCanal={};
  allDeals.forEach(function(d){
    var canal=d.canal||'Direto'; var line=d._revLine||resolveRevenueLine(d);
    if(!byCanal[canal]) byCanal[canal]={line:line,deals:0,won:0,touchpoints:0,meetings:0,qualified:0};
    var s=byCanal[canal]; s.deals++;
    if((d.statusDeal||'').toLowerCase()==='ganho') s.won++;
    s.touchpoints+=(d._touchpoints||1);
    var etapa=(d._etapa||d.etapa||'').toLowerCase();
    if(etapa.includes('agend')||etapa.includes('entrevista')) s.meetings++;
    if(etapa!=='novo lead'&&etapa!=='dia 01') s.qualified++;
  });
  Object.keys(byCanal).forEach(function(k){ var s=byCanal[k];
    var lc=REVENUE_LINES[s.line]||REVENUE_LINES.imersao;
    var base=s.deals;
    if(lc.base==='touchpoints') base=Math.max(s.touchpoints,1);
    else if(lc.base==='meetings') base=Math.max(s.meetings,1);
    else if(lc.base==='qualified'||lc.base==='opportunity') base=Math.max(s.qualified,1);
    s.efficiency=Math.round(s.won/base*1000)/10;
    s.baseType=lc.base; s.baseValue=base;
  });
  return byCanal;
}
window.calcEfficiencyByChannel = calcEfficiencyByChannel;

// ==================================================================
// LAYER 3 — RUNTIME DEAL CONTEXT
// Camada viva por deal. Enriquece deal com estado derivado.
// ==================================================================

function enrichDealContext(deal){
  if(!deal._revLine) deal._revLine = resolveRevenueLine(deal);
  if(!deal._aging) deal._aging = calcAgingRisk(deal);
  if(!deal._oppValue){
    var ov = calcOpportunityValue(deal);
    deal._oppValue = ov.value;
    deal._oppBreakdown = ov.breakdown;
  }
  deal._persona = resolvePersona(deal.tier||deal._tier);
  deal._framework = resolveFramework(deal.tier||deal._tier);
  // Next best action
  deal._nextAction = deriveNextAction(deal);
  return deal;
}
window.enrichDealContext = enrichDealContext;

function deriveNextAction(deal){
  var aging = deal._aging || calcAgingRisk(deal);
  var etapa = (deal.etapa||deal._etapa||'').toLowerCase();
  var signal = deal._signal||'';
  if(aging.riskLevel==='critical') return { type:'follow_up', label:'FUP URGENTE', priority:'critical' };
  if(signal==='DOME') return { type:'reativacao', label:'Reativacao Iron Dome', priority:'high' };
  if(signal==='RISK') return { type:'follow_up', label:'FUP de resgate', priority:'high' };
  if(signal==='STALL') return { type:'requalificacao', label:'Requalificar deal', priority:'medium' };
  if(etapa.includes('agend')||etapa.includes('entrevista')) return { type:'handoff_prep', label:'Preparar handoff', priority:'medium' };
  if(etapa==='conectados') return { type:'agendamento', label:'Agendar entrevista', priority:'medium' };
  if(etapa.includes('dia 0')) return { type:'follow_up', label:'FUP de prospeccao', priority:'normal' };
  if(etapa==='novo lead') return { type:'follow_up', label:'Primeiro contato', priority:'normal' };
  return { type:'follow_up', label:'FUP padrao', priority:'low' };
}

// ==================================================================
// LAYER 4 — TASK EXECUTION
// Filas operacionais. O operador trabalha TAREFAS, nao telas.
// ==================================================================

var TASK_TYPES = {
  follow_up:       { label:'Follow-Up',       icon:'msg',    color:'accent' },
  requalificacao:  { label:'Requalificacao',   icon:'target', color:'yellow' },
  agendamento:     { label:'Agendamento',      icon:'cal',    color:'green' },
  no_show_recovery:{ label:'No-Show Recovery', icon:'alert',  color:'red' },
  reativacao:      { label:'Reativacao',       icon:'refresh',color:'yellow' },
  social_dm:       { label:'Social DM',        icon:'chat',   color:'accent2' },
  handoff_prep:    { label:'Handoff Prep',     icon:'hand',   color:'green' },
  note_completion: { label:'Nota CRM',         icon:'note',   color:'text2' },
  dvl_review:      { label:'DVL Review',       icon:'check',  color:'accent' }
};
window.TASK_TYPES = TASK_TYPES;

function buildTaskQueue(filterType){
  var map = window._COCKPIT_DEAL_MAP||{};
  var tasks = [];
  var focusMode = _operatorCtx.focus_mode||'velocidade';
  var priorityOrder = (FOCUS_MODES[focusMode]||FOCUS_MODES.velocidade).priority;

  Object.keys(map).forEach(function(id){
    var d = map[id];
    if((d.statusDeal||'').toLowerCase()==='perdido'||(d.statusDeal||'').toLowerCase()==='ganho') return;
    enrichDealContext(d);
    var action = d._nextAction;
    if(!action) return;
    if(filterType && action.type !== filterType) return;
    var priorityIdx = priorityOrder.indexOf(action.type);
    var sortPriority = priorityIdx >= 0 ? priorityIdx : 99;
    tasks.push({
      id: id,
      deal: d,
      taskType: action.type,
      label: action.label,
      priority: action.priority,
      sortPriority: sortPriority,
      urgency: d._urgency||0,
      aging: d._aging
    });
  });

  // Ordena: focus mode priority primeiro, depois urgencia
  tasks.sort(function(a,b){
    if(a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
    return (b.urgency||0) - (a.urgency||0);
  });

  return tasks;
}
window.buildTaskQueue = buildTaskQueue;

// Renderiza a fila de tarefas na tela Tasks
function renderTaskRunner(filterType){
  var tasks = buildTaskQueue(filterType);
  var wrap = document.getElementById('task-runner-list');
  if(!wrap) return;

  if(!tasks.length){
    wrap.innerHTML = '<div class="task-empty">Nenhuma tarefa pendente' + (filterType ? ' do tipo ' + filterType : '') + '.</div>';
    return;
  }

  // Stats header
  var byType = {};
  tasks.forEach(function(t){ byType[t.taskType] = (byType[t.taskType]||0)+1; });
  var statsHtml = '<div class="task-stats">';
  Object.keys(byType).forEach(function(type){
    var cfg = TASK_TYPES[type]||TASK_TYPES.follow_up;
    statsHtml += '<span class="task-stat-chip task-c-'+cfg.color+'">' + cfg.label + ' <b>' + byType[type] + '</b></span>';
  });
  statsHtml += '</div>';

  // Task cards
  var cardsHtml = tasks.map(function(t,idx){
    var d = t.deal;
    var cfg = TASK_TYPES[t.taskType]||TASK_TYPES.follow_up;
    var agingLabel = t.aging && t.aging.isAtRisk ? '<span class="task-aging task-aging-'+t.aging.riskLevel+'">'+t.aging.riskLabel+'</span>' : '';
    return '<div class="task-card" data-task-idx="'+idx+'" onclick="window.openTaskDeal(\''+t.id+'\')">'
      + '<div class="task-card-top">'
      + '<span class="task-type-badge task-c-'+cfg.color+'">'+cfg.label+'</span>'
      + '<span class="task-priority task-p-'+t.priority+'">'+t.priority+'</span>'
      + agingLabel
      + '</div>'
      + '<div class="task-card-name">'+_escHtml(d.nome||d.emailLead||'Lead')+'</div>'
      + '<div class="task-card-co">'+_escHtml(d.empresa||'')+' '+_escHtml(d.cargo?'- '+d.cargo:'')+'</div>'
      + '<div class="task-card-meta">'
      + '<span>'+_escHtml(d.etapa||d._etapa||'')+'</span>'
      + '<span>'+_escHtml(d._revLine||'')+'</span>'
      + '<span>D'+Math.min(d.delta||0,99)+'</span>'
      + '</div>'
      + '<div class="task-card-actions">'
      + '<button class="task-btn" onclick="event.stopPropagation();window.taskQuickAction(\''+t.id+'\',\'fup\')">Gerar FUP</button>'
      + '<button class="task-btn" onclick="event.stopPropagation();window.taskQuickAction(\''+t.id+'\',\'analyze\')">Analisar</button>'
      + '<button class="task-btn task-btn-next" onclick="event.stopPropagation();window.taskNext('+idx+')">Proxima &rarr;</button>'
      + '</div>'
      + '</div>';
  }).join('');

  wrap.innerHTML = statsHtml + '<div class="task-cards">' + cardsHtml + '</div>';

  // Update counter
  var counter = document.getElementById('task-count');
  if(counter) counter.textContent = tasks.length;
}
window.renderTaskRunner = renderTaskRunner;

window.openTaskDeal = function(id){
  var d = (window._COCKPIT_DEAL_MAP||{})[id];
  if(d && window.selectLiveDeal){
    window.setScreen('pipeline', null);
    window.selectLiveDeal(id, d);
  }
};

window.taskQuickAction = function(id, action){
  var d = (window._COCKPIT_DEAL_MAP||{})[id];
  if(!d) return;
  if(action==='fup' && window.confirmDVL) window.confirmDVL(id);
  if(action==='analyze' && window.requestElucyAnalysis) window.requestElucyAnalysis(d.deal_id, d, id);
};

window.taskNext = function(currentIdx){
  var cards = document.querySelectorAll('.task-card');
  var next = cards[currentIdx+1];
  if(next) next.scrollIntoView({behavior:'smooth',block:'center'});
};

// ==================================================================
// LAYER 5 — ANALYTICS (Reports V3)
// Tudo filtrado por qualificador_name. Separa individual/linha/tarefa.
// ==================================================================

async function loadRealMetrics(periodDays){
  var sb=_sb(); if(!sb) return null;
  var opId=getOperatorId(); if(!opId) return null;
  var since=new Date();
  since.setDate(since.getDate()-(periodDays||30));
  var result=await sb.from('activity_log')
    .select('activity_type,deal_id,created_at')
    .eq('operator_id',opId)
    .gte('created_at',since.toISOString())
    .order('created_at',{ascending:false})
    .limit(1000);
  var data=result.data;
  if(!data) return null;

  var metrics={
    fups: data.filter(function(a){return ['copy_generated','copy_sent_wa','copy_sent_ig'].indexOf(a.activity_type)>=0;}).length,
    analyses: data.filter(function(a){return a.activity_type==='analysis_generated';}).length,
    copies: data.filter(function(a){return a.activity_type==='copy_generated';}).length,
    copies_copied: data.filter(function(a){return a.activity_type==='copy_copied';}).length,
    dvl_confirmed: data.filter(function(a){return a.activity_type==='dvl_confirmed';}).length,
    dms: data.filter(function(a){return ['dm_generated','dm_copied','dm_status_changed'].indexOf(a.activity_type)>=0;}).length,
    corrections: data.filter(function(a){return a.activity_type==='correction_requested';}).length,
    deals_opened: data.filter(function(a){return a.activity_type==='deal_opened';}).length,
    notes: data.filter(function(a){return a.activity_type==='note_crm_copied';}).length,
    enrichments: data.filter(function(a){return ['enrichment_added','whatsapp_pasted'].indexOf(a.activity_type)>=0;}).length,
    total: data.length,
    unique_deals: 0,
    by_day: {}
  };
  var dealSet={};
  data.forEach(function(a){ if(a.deal_id) dealSet[a.deal_id]=true; });
  metrics.unique_deals = Object.keys(dealSet).length;

  data.forEach(function(a){
    var day=a.created_at.slice(0,10);
    if(!metrics.by_day[day]) metrics.by_day[day]={total:0,types:{}};
    metrics.by_day[day].total++;
    metrics.by_day[day].types[a.activity_type]=(metrics.by_day[day].types[a.activity_type]||0)+1;
  });

  return metrics;
}
window.loadRealMetrics = loadRealMetrics;

// Operator Score (5 components)
async function calcOperatorScore(periodDays){
  var metrics = await loadRealMetrics(periodDays||30);
  if(!metrics) return null;
  var map=window._COCKPIT_DEAL_MAP||{};
  var allDeals=Object.values(map);
  var dailyAvgFups=metrics.fups/Math.max(periodDays||30,1);
  var qualificados_norm=Math.min(1,dailyAvgFups/15);
  var handoff_norm=metrics.copies>0?Math.min(1,metrics.dvl_confirmed/metrics.copies):0;
  var advancedDeals=allDeals.filter(function(d){
    var e=(d._etapa||d.etapa||'').toLowerCase();
    return e.includes('agend')||e.includes('entrevista')||e==='conectados';
  }).length;
  var win_rate=metrics.unique_deals>0?Math.min(1,advancedDeals/metrics.unique_deals):0;
  var totalDelta=allDeals.reduce(function(s,d){return s+(d._delta||d.delta||0);},0);
  var avgDelta=allDeals.length>0?totalDelta/allDeals.length:5;
  var speed_score=Math.max(0,Math.min(1,1-(avgDelta-1)/14));
  var dqiRaw=metrics.analyses+(metrics.dvl_confirmed*2)+(metrics.corrections*0.5);
  var dqi=Math.min(1,dqiRaw/Math.max(metrics.unique_deals,1));
  var score=Math.round((qualificados_norm*0.2+handoff_norm*0.3+win_rate*0.3+speed_score*0.1+dqi*0.1)*1000);
  return {
    score:score,
    qualificados_norm:Math.round(qualificados_norm*100),
    handoff_norm:Math.round(handoff_norm*100),
    win_rate:Math.round(win_rate*100),
    speed_score:Math.round(speed_score*100),
    dqi:Math.round(dqi*100),
    avgDelta:Math.round(avgDelta*10)/10,
    metrics:metrics
  };
}
window.calcOperatorScore = calcOperatorScore;

// Reports V3 — individual report by qualificador_name
async function loadReportsV3(period){
  var metrics = await loadRealMetrics(period||30);
  if(!metrics) return null;
  var map=window._COCKPIT_DEAL_MAP||{};
  var allDeals=Object.values(map);
  var opScore = await calcOperatorScore(period||30);

  // My deals only (filtrado por qualificador_name na query Supabase)
  var activeDeals = allDeals.filter(function(d){
    var s=(d.statusDeal||'').toLowerCase();
    return s!=='perdido'&&s!=='ganho';
  });

  // Aging medio
  var totalAging = activeDeals.reduce(function(s,d){return s+(d._delta||d.delta||0);},0);
  var avgAging = activeDeals.length>0?Math.round(totalAging/activeDeals.length*10)/10:0;

  // Deals em risco
  var dealsAtRisk = activeDeals.filter(function(d){
    var aging = d._aging||calcAgingRisk(d);
    return aging.isAtRisk;
  }).length;

  // Conversion by line
  var convByLine = calcConversionByLine(allDeals);

  // By task type
  var taskQueue = buildTaskQueue();
  var byTask = {};
  taskQueue.forEach(function(t){ byTask[t.taskType]=(byTask[t.taskType]||0)+1; });

  return {
    metrics: metrics,
    opScore: opScore,
    activeDeals: activeDeals.length,
    avgAging: avgAging,
    dealsAtRisk: dealsAtRisk,
    convByLine: convByLine,
    byTask: byTask,
    period: period||30
  };
}
window.loadReportsV3 = loadReportsV3;

// Today stats (for Home + sidebar)
async function loadTodayStats(){
  var sb=_sb(); if(!sb) return null;
  var opId=getOperatorId(); if(!opId) return null;
  var today=new Date(); today.setHours(0,0,0,0);
  var result=await sb.from('activity_log')
    .select('activity_type')
    .eq('operator_id',opId)
    .gte('created_at',today.toISOString());
  var data=result.data;
  if(!data) return {fups:0,deals:0,qualificacoes:0,handoffs:0};
  return {
    fups: data.filter(function(a){return ['copy_generated','copy_sent_wa','copy_sent_ig'].indexOf(a.activity_type)>=0;}).length,
    deals: data.filter(function(a){return a.activity_type==='deal_opened';}).length,
    qualificacoes: data.filter(function(a){return ['analysis_generated','dvl_confirmed'].indexOf(a.activity_type)>=0;}).length,
    handoffs: data.filter(function(a){return a.activity_type==='copy_sent_wa';}).length
  };
}
window.loadTodayStats = loadTodayStats;

// ==================================================================
// LAYER 6 — UI STATE
// Persistencia de estado por modulo. Nenhuma expansao depende so de DOM.
// ==================================================================

var _uiState = {};

function getUIState(moduleId){
  if(!_uiState[moduleId]) _uiState[moduleId] = { expanded:false, active_tab:null, draft_mode:null, scroll:0 };
  return _uiState[moduleId];
}
window.getUIState = getUIState;

function setUIState(moduleId, patch){
  if(!_uiState[moduleId]) _uiState[moduleId] = {};
  Object.keys(patch).forEach(function(k){ _uiState[moduleId][k]=patch[k]; });
  // Persist to localStorage
  try{ localStorage.setItem('elucy_ui_state', JSON.stringify(_uiState)); }catch(e){}
}
window.setUIState = setUIState;

function restoreUIState(){
  try{
    var saved = localStorage.getItem('elucy_ui_state');
    if(saved) _uiState = JSON.parse(saved);
  }catch(e){}
}

// ==================================================================
// LAYER 7 — PRODUCT INTELLIGENCE
// O Elucy ajuda a evoluir o proprio cockpit.
// ==================================================================

function analyzeProductUsage(){
  var map = window._COCKPIT_DEAL_MAP||{};
  var allDeals = Object.values(map);
  var insights = [];

  // Detectar modulos pouco usados
  var taskQueue = buildTaskQueue();
  var taskTypes = {};
  taskQueue.forEach(function(t){ taskTypes[t.taskType]=(taskTypes[t.taskType]||0)+1; });

  // Detectar gargalo
  var stages = {};
  allDeals.forEach(function(d){
    var e = d.etapa||d._etapa||'?';
    stages[e] = (stages[e]||0)+1;
  });
  var maxStage = null, maxCount = 0;
  Object.keys(stages).forEach(function(k){
    if(stages[k]>maxCount){ maxCount=stages[k]; maxStage=k; }
  });
  if(maxStage && maxCount > allDeals.length*0.3){
    insights.push({ type:'bottleneck', severity:'high',
      message:'Gargalo detectado: '+maxCount+' deals em '+maxStage+' ('+Math.round(maxCount/allDeals.length*100)+'% do pipeline)',
      suggestion:'Foque em mover deals de '+maxStage+' para a proxima etapa'
    });
  }

  // Linha mais promissora
  var convByLine = calcConversionByLine(allDeals);
  var bestLine = null, bestCR = 0;
  Object.keys(convByLine).forEach(function(k){
    if(convByLine[k].cr_mql_sal > bestCR){ bestCR = convByLine[k].cr_mql_sal; bestLine = k; }
  });
  if(bestLine && bestCR > 0){
    insights.push({ type:'opportunity', severity:'info',
      message:'Linha mais promissora: '+(REVENUE_LINES[bestLine]?REVENUE_LINES[bestLine].label:bestLine)+' com '+bestCR+'% de conversao MQL-SAL',
      suggestion:'Priorize deals dessa linha no focus mode'
    });
  }

  // Erro recorrente — deals parados muito tempo
  var stalledDeals = allDeals.filter(function(d){
    var aging = d._aging||calcAgingRisk(d);
    return aging.riskLevel==='critical';
  });
  if(stalledDeals.length >= 3){
    insights.push({ type:'pattern', severity:'warning',
      message:stalledDeals.length+' deals em estado CRITICO de aging. Padrao de inacao detectado.',
      suggestion:'Use o Task Runner com filtro de reativacao'
    });
  }

  // Melhor acao do dia
  if(taskQueue.length > 0){
    var topTask = taskQueue[0];
    var cfg = TASK_TYPES[topTask.taskType]||TASK_TYPES.follow_up;
    insights.push({ type:'action', severity:'info',
      message:'Melhor acao agora: '+cfg.label+' em '+_escHtml(topTask.deal.nome||''),
      suggestion:'Abra o Task Runner para executar'
    });
  }

  return insights;
}
window.analyzeProductUsage = analyzeProductUsage;

// ==================================================================
// GAMIFICATION (real data from activity_log)
// ==================================================================

var XP_TABLE = {
  deal_opened:5, analysis_generated:15, copy_generated:10, copy_copied:8,
  dvl_confirmed:20, dm_generated:12, dm_copied:8, correction_requested:5,
  note_crm_copied:10, whatsapp_pasted:15, enrichment_added:12,
  copy_sent_wa:20, copy_sent_ig:20
};

var BADGES = [
  {id:'handoff',  icon:'handshake', name:'Handoff',    condition:function(m){return m.dvl_confirmed>=5;}},
  {id:'streak7',  icon:'fire',      name:'Streak 7',   condition:function(m,s){return s>=7;}},
  {id:'qualifier',icon:'zap',       name:'Qualifier',  condition:function(m){return m.analyses>=10;}},
  {id:'fup50',    icon:'mail',      name:'50 FUPs',    condition:function(m){return m.fups>=50;}},
  {id:'closer',   icon:'money',     name:'Closer',     condition:function(m){return m.dvl_confirmed>=20;}},
  {id:'irondome', icon:'shield',    name:'Iron Dome',  condition:function(m){return m.analyses>=30;}}
];

var LEVELS = [
  {name:'Rookie',     min:0},
  {name:'Prospector', min:500},
  {name:'Hunter',     min:2000},
  {name:'Qualifier',  min:5000},
  {name:'Titan',      min:10000}
];

async function calcGamification(){
  var metrics = await loadRealMetrics(90);
  if(!metrics) return null;
  var xp = 0;
  xp += (metrics.fups||0)*XP_TABLE.copy_generated;
  xp += (metrics.analyses||0)*XP_TABLE.analysis_generated;
  xp += (metrics.dvl_confirmed||0)*XP_TABLE.dvl_confirmed;
  xp += (metrics.dms||0)*XP_TABLE.dm_generated;
  xp += (metrics.notes||0)*XP_TABLE.note_crm_copied;
  xp += (metrics.enrichments||0)*XP_TABLE.enrichment_added;
  xp += (metrics.deals_opened||0)*XP_TABLE.deal_opened;

  var level=LEVELS[0], levelIdx=0;
  for(var i=LEVELS.length-1;i>=0;i--){
    if(xp>=LEVELS[i].min){ level=LEVELS[i]; levelIdx=i; break; }
  }
  var nextLevel=LEVELS[levelIdx+1]||null;
  var xpInLevel=xp-level.min;
  var xpForNext=nextLevel?(nextLevel.min-level.min):1;
  var levelProgress=Math.min(100,Math.round(xpInLevel/xpForNext*100));

  var days=Object.keys(metrics.by_day).sort().reverse();
  var streak=0;
  for(var j=0;j<days.length;j++){
    var expected=new Date(); expected.setDate(expected.getDate()-j);
    var exp=expected.toISOString().slice(0,10);
    if(days.indexOf(exp)>=0) streak++; else break;
  }

  var badges=BADGES.map(function(b){return {id:b.id,icon:b.icon,name:b.name,earned:b.condition(metrics,streak)};});

  var today=_today();
  var todayData=metrics.by_day[today];
  var todayScore=0;
  if(todayData){
    Object.keys(todayData.types||{}).forEach(function(type){
      todayScore+=(XP_TABLE[type]||5)*(todayData.types[type]);
    });
  }

  var opScore = await calcOperatorScore(30);

  return {
    xp:xp, level:level.name, levelIdx:levelIdx+1, totalLevels:LEVELS.length,
    levelProgress:levelProgress, nextLevel:nextLevel?nextLevel.name:null,
    xpInLevel:xpInLevel, xpForNext:xpForNext,
    streak:streak, badges:badges, todayScore:todayScore,
    operatorScore:opScore?opScore.score:0,
    operatorBreakdown:opScore
  };
}
window.calcGamification = calcGamification;

async function updateGamificationUI(){
  var gam = await calcGamification();
  if(!gam) return;
  var el;
  el=document.querySelector('.lvl-n'); if(el) el.textContent=gam.level;
  el=document.querySelector('.lvl-s'); if(el) el.textContent='Nivel '+gam.levelIdx+' de '+gam.totalLevels;
  el=document.querySelector('.lvl-fill'); if(el) el.style.width=gam.levelProgress+'%';
  el=document.querySelector('.lvl-xp'); if(el) el.textContent=gam.xpInLevel.toLocaleString('pt-BR')+' / '+gam.xpForNext.toLocaleString('pt-BR')+' XP';
  el=document.querySelector('.score-big'); if(el) el.textContent=gam.todayScore;
  el=document.querySelector('.sk-n'); if(el) el.textContent=gam.streak;
  el=document.querySelector('.streak-badge'); if(el) el.textContent='streak '+gam.streak+'d';
  el=document.querySelector('.chip-lvl'); if(el) el.textContent=gam.level+' Lv'+gam.levelIdx;
  var bgis=document.querySelectorAll('.bgi');
  gam.badges.forEach(function(b,i){
    if(bgis[i]){
      bgis[i].classList.toggle('on',b.earned);
      bgis[i].classList.toggle('off',!b.earned);
    }
  });
}
window.updateGamificationUI = updateGamificationUI;

// ==================================================================
// HOME SCREEN RENDERER (V3)
// ==================================================================

async function renderHome(){
  var wrap = document.getElementById('home-content');
  if(!wrap) return;

  var todayStats = await loadTodayStats();
  var map = window._COCKPIT_DEAL_MAP||{};
  var allDeals = Object.values(map).filter(function(d){
    var s=(d.statusDeal||'').toLowerCase();
    return s!=='perdido'&&s!=='ganho';
  });

  // Enrich all deals
  allDeals.forEach(function(d){ enrichDealContext(d); });

  var tasks = buildTaskQueue();
  var insights = analyzeProductUsage();
  var meta = _operatorCtx.meta_diaria;
  var focusMode = FOCUS_MODES[_operatorCtx.focus_mode]||FOCUS_MODES.velocidade;

  // Deals em risco
  var atRisk = allDeals.filter(function(d){ return d._aging && d._aging.isAtRisk; });
  // Social DM para agir
  var dmTasks = tasks.filter(function(t){ return t.taskType==='social_dm'; });
  // Handoffs pendentes
  var handoffTasks = tasks.filter(function(t){ return t.taskType==='handoff_prep'; });

  var fupPct = meta.fups>0 ? Math.min(100,Math.round((todayStats.fups||0)/meta.fups*100)) : 0;
  var qualPct = meta.qualificacoes>0 ? Math.min(100,Math.round((todayStats.qualificacoes||0)/meta.qualificacoes*100)) : 0;
  var handPct = meta.handoffs>0 ? Math.min(100,Math.round((todayStats.handoffs||0)/meta.handoffs*100)) : 0;

  var html = '';

  // BLOCO 1 — Foco do dia
  html += '<div class="home-block">'
    + '<div class="home-block-title">Foco do Dia</div>'
    + '<div class="home-focus-row">'
    + '<div class="home-focus-mode"><span class="home-fm-icon">'+focusMode.icon+'</span> '+focusMode.label+'</div>'
    + '<button class="home-fm-btn" onclick="window.cycleFocusMode()">Trocar Modo</button>'
    + '</div>'
    + '<div class="home-meta-grid">'
    + '<div class="home-meta"><div class="home-meta-label">FUPs</div><div class="home-meta-value">'+(todayStats.fups||0)+' / '+meta.fups+'</div><div class="meta-bar-bg"><div class="meta-bar-fill'+(fupPct>=100?' done':'')+'" style="width:'+fupPct+'%"></div></div></div>'
    + '<div class="home-meta"><div class="home-meta-label">Qualificacoes</div><div class="home-meta-value">'+(todayStats.qualificacoes||0)+' / '+meta.qualificacoes+'</div><div class="meta-bar-bg"><div class="meta-bar-fill'+(qualPct>=100?' done':'')+'" style="width:'+qualPct+'%"></div></div></div>'
    + '<div class="home-meta"><div class="home-meta-label">Handoffs</div><div class="home-meta-value">'+(todayStats.handoffs||0)+' / '+meta.handoffs+'</div><div class="meta-bar-bg"><div class="meta-bar-fill'+(handPct>=100?' done':'')+'" style="width:'+handPct+'%"></div></div></div>'
    + '</div></div>';

  // BLOCO 2 — Tarefas criticas
  html += '<div class="home-block">'
    + '<div class="home-block-title">Tarefas Criticas <span class="home-count">'+Math.min(tasks.length,5)+'</span></div>';
  if(tasks.length){
    html += '<div class="home-tasks">';
    tasks.slice(0,5).forEach(function(t){
      var cfg = TASK_TYPES[t.taskType]||TASK_TYPES.follow_up;
      html += '<div class="home-task-item" onclick="window.openTaskDeal(\''+t.id+'\')">'
        + '<span class="task-type-badge task-c-'+cfg.color+'">'+cfg.label+'</span>'
        + '<span class="home-task-name">'+_escHtml(t.deal.nome||'')+'</span>'
        + '<span class="home-task-why">'+_escHtml(t.label)+'</span>'
        + '</div>';
    });
    html += '</div>';
    if(tasks.length>5) html += '<button class="home-more-btn" onclick="window.setScreen(\'tasks\')">Ver todas '+tasks.length+' tarefas</button>';
  } else {
    html += '<div class="home-empty">Sem tarefas pendentes. Pipeline limpo!</div>';
  }
  html += '</div>';

  // BLOCO 3 — Desempenho
  html += '<div class="home-block">'
    + '<div class="home-block-title">Meu Desempenho</div>'
    + '<div class="home-perf-grid">'
    + '<div class="home-perf-kpi"><div class="home-perf-v" id="home-score">--</div><div class="home-perf-l">Score</div></div>'
    + '<div class="home-perf-kpi"><div class="home-perf-v" id="home-streak">--</div><div class="home-perf-l">Streak</div></div>'
    + '<div class="home-perf-kpi"><div class="home-perf-v">'+allDeals.length+'</div><div class="home-perf-l">Ativos</div></div>'
    + '<div class="home-perf-kpi"><div class="home-perf-v">'+atRisk.length+'</div><div class="home-perf-l">Em Risco</div></div>'
    + '</div></div>';

  // BLOCO 4 — Inteligencia Elucy
  html += '<div class="home-block">'
    + '<div class="home-block-title">Inteligencia Elucy</div>';
  if(insights.length){
    insights.slice(0,3).forEach(function(ins){
      var cls = ins.severity==='high'?'home-insight-bad':ins.severity==='warning'?'home-insight-warn':'home-insight-good';
      html += '<div class="home-insight '+cls+'"><div class="home-insight-msg">'+_escHtml(ins.message)+'</div>'
        + '<div class="home-insight-sug">'+_escHtml(ins.suggestion)+'</div></div>';
    });
  } else {
    html += '<div class="home-empty">Pipeline saudavel. Continue operando.</div>';
  }
  html += '</div>';

  wrap.innerHTML = html;

  // Async: load gamification for score/streak
  calcGamification().then(function(gam){
    if(!gam) return;
    var sc=document.getElementById('home-score'); if(sc) sc.textContent=gam.operatorScore||gam.todayScore;
    var sk=document.getElementById('home-streak'); if(sk) sk.textContent=gam.streak+'d';
  });
}
window.renderHome = renderHome;

window.cycleFocusMode = function(){
  var modes = Object.keys(FOCUS_MODES);
  var cur = modes.indexOf(_operatorCtx.focus_mode);
  var next = modes[(cur+1)%modes.length];
  saveOperatorSettings({focus_mode:next}).then(function(){
    renderHome();
    if(window.showSyncToast) window.showSyncToast('ok','Modo: '+FOCUS_MODES[next].label);
  });
};

// ==================================================================
// SUPABASE REALTIME — canal UNICO (engine controla)
// ==================================================================

var _rtChan=null, _ntChan=null, _unread=0;

function initRealtimeListeners(){
  var sb=_sb(); if(!sb) return;
  var opId=getOperatorId(); if(!opId) return;
  if(window._realtimeChannel){
    try{ sb.removeChannel(window._realtimeChannel); }catch(e){}
    window._realtimeChannel=null;
  }
  if(_rtChan) sb.removeChannel(_rtChan);
  _rtChan = sb.channel('engine-resp-'+opId)
    .on('postgres_changes',{
      event:'INSERT', schema:'public', table:'cockpit_responses',
      filter:'operator_id=eq.'+opId
    }, function(payload){
      var r=payload.new; if(!r) return;
      _handleResponse(r);
    }).subscribe();

  if(_ntChan) sb.removeChannel(_ntChan);
  _ntChan = sb.channel('engine-notif-'+opId)
    .on('postgres_changes',{
      event:'INSERT', schema:'public', table:'operator_notifications',
      filter:'operator_id=eq.'+opId
    }, function(payload){
      var n=payload.new; if(!n) return;
      _unread++; _updateBadge();
      _toast(n.title, n.body, n.deal_id);
    }).subscribe();
}
window.initRealtimeListeners = initRealtimeListeners;
window.initRealtimeSubscription = function(){};

function _handleResponse(response){
  var dealId=response.deal_id;
  var type=response.request_type;
  var output=response.output||'';
  var map=window._COCKPIT_DEAL_MAP||{};
  var targetId=null;
  Object.keys(map).forEach(function(id){
    if(String(map[id].deal_id)===String(dealId)) targetId=id;
  });
  if(!targetId) targetId=dealId;
  var pending=window._pendingRequests&&window._pendingRequests[response.request_id];
  if(pending){
    if(window.handleElucyResponse) window.handleElucyResponse(response, pending);
    delete window._pendingRequests[response.request_id];
    return;
  }
  if(type==='analyze'){
    if(window.ELUCY_CACHE) window.ELUCY_CACHE[dealId]=output;
    if(window.injectElucyReport) window.injectElucyReport(targetId, output);
    saveInteraction(dealId,'analysis',output);
    _toast('Analise pronta','ELUCI REPORT disponivel',dealId);
  } else if(type==='copy'||type==='dm_copy'){
    try{
      var parsed=JSON.parse(output);
      if(window.injectElucyCopy) window.injectElucyCopy(targetId, parsed.copy_wa||parsed.copy||output, parsed.copy_crm||'');
    }catch(e){
      if(window.injectElucyCopy) window.injectElucyCopy(targetId, output, '');
    }
    saveInteraction(dealId,'copy',output);
    _toast('Copy pronta','Copy gerada pelo motor Elucy',dealId);
  } else if(type==='note'){
    if(window.injectNotaCRM) window.injectNotaCRM(targetId, output);
    saveInteraction(dealId,'note_crm',output);
    _toast('Nota CRM pronta','Nota disponivel',dealId);
  } else if(type==='business_analysis'){
    if(window.injectBusinessAnalysis) window.injectBusinessAnalysis(targetId, output);
    saveInteraction(dealId,'business_analysis',output);
  } else if(type==='brief'){
    if(window.injectElucyReport) window.injectElucyReport(targetId, output);
    saveInteraction(dealId,'brief',output);
  }
  _incrementEnrichmentCount(dealId);
}

async function _incrementEnrichmentCount(dealId){
  var sb=_sb(); if(!sb) return;
  var opId=getOperatorId();
  var result=await sb.from('deals').select('enrichment_count')
    .eq('deal_id',dealId).eq('operator_email',opId).maybeSingle();
  var current=(result.data&&result.data.enrichment_count)||0;
  sb.from('deals').update({enrichment_count:current+1})
    .eq('deal_id',dealId).eq('operator_email',opId).then(function(){});
}

function _updateBadge(){
  var b=document.getElementById('notif-badge');
  if(!b){
    var chip=document.querySelector('.tbr'); if(!chip) return;
    b=document.createElement('span');
    b.id='notif-badge';
    b.style.cssText='background:var(--red);color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:10px;cursor:pointer;';
    b.onclick=function(){_unread=0;_updateBadge();};
    chip.prepend(b);
  }
  b.textContent=_unread>0?_unread:'';
  b.style.display=_unread>0?'inline-block':'none';
}

function _toast(title,body,dealId){
  var t=document.createElement('div');
  t.style.cssText='position:fixed;top:60px;right:16px;z-index:200;background:var(--bg3);border:1px solid var(--accent);border-radius:8px;padding:12px 16px;max-width:320px;animation:fadeIn .2s ease;cursor:pointer;';
  t.innerHTML='<div style="font-size:11px;font-weight:700;color:var(--accent2);margin-bottom:3px">'+_escHtml(title)+'</div><div style="font-size:12px;color:var(--text);line-height:1.4">'+_escHtml(body||'')+'</div>';
  if(dealId){
    t.onclick=function(){
      var map=window._COCKPIT_DEAL_MAP||{};
      Object.keys(map).forEach(function(id){
        if(String(map[id].deal_id)===String(dealId)){
          if(window.selectLiveDeal) window.selectLiveDeal(id,map[id]);
        }
      });
      t.remove();
    };
  }
  document.body.appendChild(t);
  setTimeout(function(){ if(t.parentNode) t.remove(); },8000);
}
window.showNotifToast = _toast;

// ==================================================================
// ACTIVITY LOG + INTERACTIONS
// ==================================================================

function logActivity(type,dealId,meta){
  var sb=_sb(); if(!sb) return;
  var opId=getOperatorId(); if(!opId) return;
  sb.from('activity_log').insert({
    operator_id:opId, activity_type:type, deal_id:dealId||null, metadata:meta||{}
  }).then(function(){});
}
window.logActivity = logActivity;

async function saveInteraction(dealId,type,content,meta,parentId){
  var sb=_sb(); if(!sb) return null;
  var opId=getOperatorId(); if(!opId) return null;
  var result=await sb.from('deal_interactions').insert({
    deal_id:dealId, operator_id:opId, interaction_type:type,
    content:content||'', metadata:meta||{}, parent_id:parentId||null
  }).select('id').single();
  sb.from('deals').update({last_interaction_at:_now()})
    .eq('deal_id',dealId).eq('operator_email',getOperatorId()).then(function(){});
  return result.data?result.data.id:null;
}
window.saveInteraction = saveInteraction;

async function loadInteractions(dealId,targetId){
  var sb=_sb(); if(!sb) return;
  var opId=getOperatorId(); if(!opId) return;
  var result=await sb.from('deal_interactions')
    .select('*').eq('deal_id',dealId).eq('operator_id',opId)
    .order('created_at',{ascending:false}).limit(20);
  var data=result.data;
  if(!data||!data.length) return;
  _renderTimeline(targetId,data);
  var cache=window.ELUCY_CACHE||{};
  data.forEach(function(i){
    if(i.interaction_type==='analysis'&&!cache[dealId]) cache[dealId]=i.content;
  });
}
window.loadInteractions = loadInteractions;

function _renderTimeline(targetId,interactions){
  var tl=document.getElementById('timeline-'+targetId);
  if(!tl){
    var parent=document.getElementById('deal-'+targetId); if(!parent) return;
    tl=document.createElement('div'); tl.id='timeline-'+targetId;
    tl.className='card'; tl.style.cssText='max-height:300px;overflow-y:auto;';
    parent.appendChild(tl);
  }
  var ic={analysis:'chart',copy:'edit',brief:'clipboard',dm:'chat',correction:'refresh',dvl_confirmed:'check',note_crm:'pin',whatsapp_sent:'phone',enrichment:'search',business_analysis:'building',dm_touchpoint:'phone'};
  var lb={analysis:'Analise',copy:'Copy',brief:'Briefing',dm:'DM',correction:'Correcao',dvl_confirmed:'DVL',note_crm:'Nota CRM',whatsapp_sent:'WhatsApp',enrichment:'Enrichment',business_analysis:'Mercado',dm_touchpoint:'Touchpoint DM'};
  tl.innerHTML='<div class="sec-t" style="margin-bottom:10px">Historico de Interacoes</div>'+
    interactions.map(function(i){
      var dt=new Date(i.created_at);
      var tm=dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      var dd=dt.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
      var label=lb[i.interaction_type]||i.interaction_type;
      var pv=(i.content||'').slice(0,120).replace(/\n/g,' ');
      return '<div style="padding:8px 10px;border-left:2px solid var(--border2);margin-left:8px;margin-bottom:6px">'
        +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">'
        +'<span style="font-size:11px;font-weight:700;color:var(--accent2)">'+label+'</span>'
        +'<span style="font-size:10px;color:var(--text2);margin-left:auto">'+dd+' '+tm+'</span>'
        +'</div>'
        +'<div style="font-size:11px;color:var(--text2);line-height:1.4">'+_escHtml(pv)+(pv.length>=120?'...':'')+'</div>'
        +'</div>';
    }).join('');
}

// Touchpoint Analytics
async function loadTouchpointAnalytics(dealId){
  var sb=_sb(); if(!sb) return null;
  var opId=getOperatorId(); if(!opId) return null;
  var result=await sb.from('deal_interactions')
    .select('interaction_type,created_at,metadata')
    .eq('deal_id',dealId).eq('operator_id',opId)
    .order('created_at',{ascending:true});
  var data=result.data;
  if(!data||!data.length) return null;
  var touchpoints=data.map(function(d,i){
    return { number:i+1, type:d.interaction_type, timestamp:d.created_at,
      delay:i>0?Math.round((new Date(d.created_at)-new Date(data[i-1].created_at))/(1000*60*60)):0,
      metadata:d.metadata||{} };
  });
  return { total:touchpoints.length, touchpoints:touchpoints,
    avgDelay:touchpoints.length>1?Math.round(touchpoints.reduce(function(s,t){return s+t.delay;},0)/(touchpoints.length-1)):0 };
}
window.loadTouchpointAnalytics = loadTouchpointAnalytics;

// ==================================================================
// SOCIAL DM PIPELINE
// ==================================================================

var DM_STATUS_FLOW=['identified','contacted','engaged','qualified','converted','lost'];
var DM_STATUS_LABEL={identified:'Identificado',contacted:'Contatado',engaged:'Engajado',qualified:'Qualificado',converted:'Convertido',lost:'Perdido'};

async function createSocialDMLead(handle,leadName,platform,founderPersona){
  var sb=_sb(); if(!sb) return null;
  var opId=getOperatorId(); if(!opId) return null;
  var result=await sb.from('social_dm_leads').insert({
    operator_id:opId, lead_handle:handle, lead_name:leadName||'',
    platform:platform||'instagram', founder_persona:founderPersona||null,
    status:'identified'
  }).select('id').single();
  if(result.error) return null;
  logActivity('dm_generated',null,{handle:handle,platform:platform});
  if(result.data&&result.data.id) saveDMTouchpoint(result.data.id,'identified','Lead identificado no '+platform);
  renderDMPipeline();
  return result.data?result.data.id:null;
}
window.createSocialDMLead = createSocialDMLead;

async function updateSocialDMStatus(leadId,newStatus,dealId){
  var sb=_sb(); if(!sb) return;
  var update={status:newStatus,last_interaction_at:_now()};
  if(dealId) update.deal_id=dealId;
  await sb.from('social_dm_leads').update(update).eq('id',leadId);
  saveDMTouchpoint(leadId,newStatus,'Status alterado para '+DM_STATUS_LABEL[newStatus]);
  logActivity('dm_status_changed',dealId,{leadId:leadId,newStatus:newStatus});
  renderDMPipeline();
}
window.updateSocialDMStatus = updateSocialDMStatus;

async function saveDMTouchpoint(leadId,tpType,description){
  var sb=_sb(); if(!sb) return;
  var opId=getOperatorId();
  var result=await sb.from('deal_interactions')
    .select('id').eq('deal_id','dm-'+leadId).eq('operator_id',opId);
  var tpNumber=(result.data?result.data.length:0)+1;
  await sb.from('deal_interactions').insert({
    deal_id:'dm-'+leadId, operator_id:opId, interaction_type:'dm_touchpoint',
    content:description||'', metadata:{tp_number:tpNumber,tp_type:tpType,lead_id:leadId}
  });
}

async function loadSocialDMPipeline(){
  var sb=_sb(); if(!sb) return [];
  var opId=getOperatorId(); if(!opId) return [];
  var result=await sb.from('social_dm_leads')
    .select('*').eq('operator_id',opId)
    .order('created_at',{ascending:false}).limit(100);
  return result.data||[];
}
window.loadSocialDMPipeline = loadSocialDMPipeline;

async function renderDMPipeline(){
  var leads=await loadSocialDMPipeline();
  var wrap=document.getElementById('dm-pipeline-visual');
  if(!wrap) return;
  if(!leads.length){
    wrap.innerHTML='<div style="text-align:center;padding:16px;color:var(--text2);font-size:11px">Nenhum lead Social DM registrado.</div>';
    return;
  }
  var byStatus={};
  DM_STATUS_FLOW.forEach(function(s){byStatus[s]=[];});
  leads.forEach(function(l){ if(byStatus[l.status]) byStatus[l.status].push(l); else byStatus.identified.push(l); });
  var cols=DM_STATUS_FLOW.filter(function(s){return s!=='lost';}).map(function(s){
    var items=byStatus[s];
    return '<div class="dm-pipe-col">'
      +'<div class="dm-pipe-col-header"><span class="dm-pipe-col-title">'+DM_STATUS_LABEL[s]+'</span><span class="dm-pipe-col-count">'+items.length+'</span></div>'
      +items.map(function(l){return '<div class="dm-pipe-card" data-lead-id="'+l.id+'">'
        +'<div class="dm-pipe-card-name">'+_escHtml(l.lead_name||l.lead_handle)+'</div>'
        +'<div class="dm-pipe-card-handle">@'+_escHtml(l.lead_handle||'')+'</div>'
        +'<div class="dm-pipe-card-meta">'
        +'<span class="dm-pipe-card-platform">'+(l.platform||'IG')+'</span>'
        +(l.founder_persona?'<span class="dm-pipe-card-founder">'+l.founder_persona+'</span>':'')
        +'</div>'
        +'<div class="dm-pipe-card-actions">'
        +(s!=='converted'?'<button class="dm-pipe-advance" onclick="window._advanceDMLead(\''+l.id+'\',\''+s+'\')">Avancar</button>':'')
        +'<a class="dm-wa-link" href="https://wa.me/?text=" target="_blank" title="Abrir WhatsApp">WA</a>'
        +'</div>'
        +'</div>';}).join('')
      +'</div>';
  }).join('');
  var lostCount=byStatus.lost.length;
  wrap.innerHTML='<div class="dm-pipe-grid">'+cols+'</div>'
    +(lostCount?'<div class="dm-pipe-lost">'+lostCount+' lead(s) perdido(s)</div>':'');
}
window.renderDMPipeline = renderDMPipeline;

window._advanceDMLead = function(leadId,currentStatus){
  var idx=DM_STATUS_FLOW.indexOf(currentStatus);
  if(idx<0||idx>=DM_STATUS_FLOW.length-2) return;
  updateSocialDMStatus(leadId,DM_STATUS_FLOW[idx+1]);
};

// ==================================================================
// PATCHING (preserva funcoes do cockpit.html sem dupla insercao)
// ==================================================================

var _origAnalysis = window.requestElucyAnalysis;
var _origCopy = window.requestElucyCopy;

window.requestElucyAnalysis = function(deal_id, dealData, targetId){
  logActivity('analysis_generated',deal_id);
  if(_origAnalysis) _origAnalysis(deal_id, dealData, targetId);
};

window.requestElucyCopy = function(deal_id, dealData, targetId, canal){
  logActivity('copy_generated',deal_id,{canal:canal||'whatsapp'});
  if(_origCopy) _origCopy(deal_id, dealData, targetId, canal);
};

// Correction chat (max 3)
async function requestCorrection(deal_id,targetId,correctionText,parentRequestId,correctionNumber){
  if(correctionNumber>=3){
    if(window.showSyncToast) window.showSyncToast('err','Limite de 3 correcoes atingido.');
    return;
  }
  var sb=_sb(); if(!sb) return;
  var opId=getOperatorId();
  var result=await sb.from('cockpit_requests').insert({
    operator_id:opId, deal_id:deal_id, request_type:'copy', deal_data:{}, status:'pending',
    parent_request_id:parentRequestId||null,
    correction_text:correctionText,
    correction_number:(correctionNumber||0)+1
  }).select('id').single();
  if(result.error){
    if(window.showSyncToast) window.showSyncToast('err','Erro ao enviar correcao.');
    return;
  }
  if(window.showSyncToast) window.showSyncToast('ok','Correcao #'+((correctionNumber||0)+1)+' enviada.');
  logActivity('correction_requested',deal_id,{n:(correctionNumber||0)+1});
  saveInteraction(deal_id,'correction',correctionText);
}
window.requestCorrection = requestCorrection;

// Patch selectLiveDeal
var _origSelectLiveDeal = window.selectLiveDeal;
window.selectLiveDeal = function(id, d){
  enrichDealContext(d);
  if(_origSelectLiveDeal) _origSelectLiveDeal(id, d);
  logActivity('deal_opened', d.deal_id||id);
  setTimeout(function(){
    var co=document.getElementById('co-'+id);
    if(co && !document.getElementById('correction-input-'+id)){
      var chatDiv=document.createElement('div');
      chatDiv.style.cssText='padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:6px;align-items:center;';
      chatDiv.innerHTML='<input id="correction-input-'+id+'" type="text" class="srch" placeholder="Instrucao de correcao (max 3)..." data-parent-request-id="" data-correction-number="0" style="flex:1">'
        +'<button class="btn bp btn-sm" onclick="window._submitCorrection(\''+id+'\')">Corrigir</button>';
      co.appendChild(chatDiv);
    }
    if(d.deal_id) loadInteractions(d.deal_id, id);
  },300);
};

window._submitCorrection = function(targetId){
  var input=document.getElementById('correction-input-'+targetId);
  if(!input||!input.value.trim()) return;
  var deal=(window._COCKPIT_DEAL_MAP||{})[targetId];
  var dealId=deal?deal.deal_id:targetId;
  var parentId=input.dataset.parentRequestId||null;
  var corrNum=parseInt(input.dataset.correctionNumber)||0;
  requestCorrection(dealId, targetId, input.value.trim(), parentId, corrNum);
  input.value='';
};

// Patch clip
var _origClip = window.clip;
window.clip = function(elId){
  if(_origClip) _origClip(elId);
  if(elId&&elId.indexOf('-wa')>=0) logActivity('copy_copied',null,{canal:'whatsapp'});
  else if(elId&&elId.indexOf('-crm')>=0) logActivity('note_crm_copied',null,{canal:'crm'});
  else if(elId&&elId.indexOf('dmc-')>=0) logActivity('dm_copied',null,{canal:'dm'});
};

// Patch confirmDVL
var _origDVL = window.confirmDVL;
window.confirmDVL = function(id){
  logActivity('dvl_confirmed',id);
  var deal=(window._COCKPIT_DEAL_MAP||{})[id];
  if(deal&&deal.deal_id) saveInteraction(deal.deal_id,'dvl_confirmed','');
  if(_origDVL) _origDVL(id);
};

// Patch showCockpit
var _origShowCockpit = window.showCockpit;
window.showCockpit = function(user){
  if(_origShowCockpit) _origShowCockpit(user);
  var sb=_sb();
  if(sb&&user&&user.email){
    initOperatorContext().then(function(){
      initRealtimeListeners();
      setTimeout(updateGamificationUI,1500);
      setTimeout(function(){ renderHome(); },2000);
    });
  }
};

// Patch startCap (DM Assist)
var _origStartCap = window.startCap;
window.startCap = function(id){
  var fbb=document.querySelector('.fbb.on');
  var founder=fbb?fbb.textContent.trim().toLowerCase():'tallis';
  var deal=(window._COCKPIT_DEAL_MAP||{})[id];
  var handle=deal?(deal.emailLead||deal.nome||id):'unknown';
  createSocialDMLead(handle,deal?deal.nome:'',deal?deal.canal:'instagram',founder);
  if(_origStartCap) _origStartCap(id);
};

// Today stats auto-refresh
async function updateTodayStats(){
  var stats = await loadTodayStats();
  if(!stats) return;
  var meta = _operatorCtx.meta_diaria;
  var el;
  el=document.getElementById('hoje-fups'); if(el) el.textContent=stats.fups;
  el=document.getElementById('hoje-deals'); if(el) el.textContent=stats.deals;
  el=document.getElementById('hoje-qual'); if(el) el.textContent=stats.qualificacoes;
  el=document.getElementById('hoje-hand'); if(el) el.textContent=stats.handoffs;
  el=document.getElementById('meta-fups-v'); if(el) el.textContent=stats.fups+' / '+meta.fups;
  el=document.getElementById('meta-fups-bar'); if(el) el.style.width=Math.min(100,Math.round(stats.fups/meta.fups*100))+'%';
  el=document.getElementById('meta-qual-v'); if(el) el.textContent=stats.qualificacoes+' / '+meta.qualificacoes;
  el=document.getElementById('meta-qual-bar'); if(el) el.style.width=Math.min(100,Math.round(stats.qualificacoes/meta.qualificacoes*100))+'%';
  el=document.getElementById('meta-hand-v'); if(el) el.textContent=stats.handoffs+' / '+meta.handoffs;
  el=document.getElementById('meta-hand-bar'); if(el) el.style.width=Math.min(100,Math.round(stats.handoffs/meta.handoffs*100))+'%';
}
window.updateTodayStats = updateTodayStats;
setInterval(function(){ if(getOperatorId()) updateTodayStats(); },60000);
setTimeout(function(){ if(getOperatorId()) updateTodayStats(); },2000);

// ==================================================================
// INIT
// ==================================================================

restoreUIState();

if(window._currentUser){
  initOperatorContext().then(function(){
    setTimeout(initRealtimeListeners,500);
    setTimeout(updateGamificationUI,2000);
    setTimeout(renderHome,2500);
  });
}

console.log('[cockpit-engine v3.0] 7-Layer Architecture loaded — Operator Context, Taxonomy Core, Runtime Deal, Task Execution, Analytics, UI State, Product Intelligence');

})();
