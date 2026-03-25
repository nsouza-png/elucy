// ==================================================================
// ELUCY COCKPIT ENGINE v6.0 — 13-Layer Architecture
// 1. Operator Context | 2. Taxonomy Core | 3. Runtime Deal Context
// 4. Task Execution | 5. Analytics | 6. UI State | 7. Product Intelligence
// 8. Cadence Engine | 9. Runtime Sync | 10. Taxonomy Loader
// 11. DM Touchpoints | 12. Snapshot Scheduler | 13. V6 Forecast Calculator
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
  // Load cadence enrollments after operator context is ready
  cadenceLoadAll();
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
  // Resolve delta real antes de aging/opp (usa created_at como fallback)
  if(!deal._delta&&!deal.delta) deal._delta = resolveRealDelta(deal);
  deal.delta = deal._delta || deal.delta || 0;
  if(!deal._aging) deal._aging = calcAgingRisk(deal);
  if(!deal._oppValue){
    var ov = calcOpportunityValue(deal);
    deal._oppValue = ov.value;
    deal._oppBreakdown = ov.breakdown;
  }
  deal._persona = resolvePersona(deal.tier||deal._tier);
  deal._framework = resolveFramework(deal.tier||deal._tier);
  // Timeline Intelligence — métricas temporais completas
  deal._timeline = calcTimelineIntelligence(deal);
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

    // Check if deal has active cadence — cadence overrides default _nextAction
    var cadStep = cadenceGetCurrentStep(id);
    var action, isCadence = false;
    if(cadStep){
      var channelIcon = (CHANNEL_ICONS[cadStep.step.channel]||'') + ' ';
      action = {
        type: cadStep.step.taskType,
        label: channelIcon + cadStep.step.action,
        priority: cadStep.overdue ? 'critical' : 'high'
      };
      isCadence = true;
    } else {
      action = d._nextAction;
    }
    if(!action) return;
    if(filterType && action.type !== filterType) return;
    var priorityIdx = priorityOrder.indexOf(action.type);
    var sortPriority = priorityIdx >= 0 ? priorityIdx : 99;
    // Cadence tasks get priority boost (always above non-cadence of same type)
    if(isCadence) sortPriority = Math.max(0, sortPriority - 1);
    tasks.push({
      id: id,
      deal: d,
      taskType: action.type,
      label: action.label,
      priority: action.priority,
      sortPriority: sortPriority,
      urgency: d._urgency||0,
      aging: d._aging,
      cadence: isCadence ? cadStep : null
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

  // Stats header — by type
  var byType = {};
  tasks.forEach(function(t){ byType[t.taskType] = (byType[t.taskType]||0)+1; });
  var statsHtml = '<div class="task-stats">';
  Object.keys(byType).forEach(function(type){
    var cfg = TASK_TYPES[type]||TASK_TYPES.follow_up;
    statsHtml += '<span class="task-stat-chip task-c-'+cfg.color+'">' + cfg.label + ' <b>' + byType[type] + '</b></span>';
  });
  statsHtml += '</div>';

  // Stats — by pipeline stage
  var byStage = {};
  var STAGE_ORDER = ['SAL','Conectados','Agendamento','Negociacao','Oportunidade'];
  tasks.forEach(function(t){
    var stage = t.deal.etapa || t.deal._etapa || t.deal.fase || 'Outro';
    byStage[stage] = (byStage[stage]||0)+1;
  });
  var stageKeys = Object.keys(byStage).sort(function(a,b){
    var ia=STAGE_ORDER.indexOf(a), ib=STAGE_ORDER.indexOf(b);
    if(ia<0) ia=99; if(ib<0) ib=99;
    return ia-ib;
  });
  statsHtml += '<div class="task-stage-bar">';
  statsHtml += '<span class="task-stage-label">Pipeline:</span>';
  statsHtml += '<span class="task-stage-chip on" data-stage="all" onclick="window._filterTaskStage(null,this)">Todas</span>';
  stageKeys.forEach(function(stage){
    statsHtml += '<span class="task-stage-chip" data-stage="'+_escHtml(stage)+'" onclick="window._filterTaskStage(\''+_escHtml(stage).replace(/'/g,"\\'")+'\',this)">'+_escHtml(stage)+' <b>'+byStage[stage]+'</b></span>';
  });
  statsHtml += '</div>';

  // Task cards
  var cardsHtml = tasks.map(function(t,idx){
    var d = t.deal;
    var cfg = TASK_TYPES[t.taskType]||TASK_TYPES.follow_up;
    var dealStage = d.etapa || d._etapa || d.fase || 'Outro';
    var agingLabel = t.aging && t.aging.isAtRisk ? '<span class="task-aging task-aging-'+t.aging.riskLevel+'">'+t.aging.riskLabel+'</span>' : '';
    var cadBadge = t.cadence ? '<span class="task-cad-badge" title="'+_escHtml(t.cadence.templateName)+'">⚡ '+_escHtml(t.cadence.templateName)+' ('+(t.cadence.stepIndex+1)+'/'+t.cadence.totalSteps+')</span>' : '';
    return '<div class="task-card'+(t.cadence?' task-card-cad':'')+'" data-task-idx="'+idx+'" data-stage="'+_escHtml(dealStage)+'" onclick="window.texOpen('+idx+')">'
      + '<div class="task-card-top">'
      + '<span class="task-type-badge task-c-'+cfg.color+'">'+cfg.label+'</span>'
      + '<span class="task-priority task-p-'+t.priority+'">'+t.priority+'</span>'
      + cadBadge
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
      + '</div>'
      + '</div>';
  }).join('');

  wrap.innerHTML = statsHtml + '<div class="task-cards">' + cardsHtml + '</div>';

  // Update counter
  var counter = document.getElementById('task-count');
  if(counter) counter.textContent = tasks.length;
}
window.renderTaskRunner = renderTaskRunner;

// Filter tasks by pipeline stage (client-side show/hide)
window._filterTaskStage = function(stage, el){
  // Toggle chip highlight
  document.querySelectorAll('.task-stage-chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');

  // Show/hide task cards
  document.querySelectorAll('.task-card').forEach(function(card){
    if(!stage){
      card.style.display='';
    } else {
      card.style.display = card.dataset.stage === stage ? '' : 'none';
    }
  });
};

// ==================================================================
// TASK EXECUTION MODE (HubSpot-style)
// Overlay com deal card expandido + navegação ← → + disposição + timer
// ==================================================================
var _texQueue = [];    // current filtered task queue
var _texIdx = 0;       // current index in queue
var _texTimer = null;   // interval id
var _texSeconds = 0;    // elapsed seconds
var _texDisposition = null; // selected disposition

// Helper: build the deal card HTML (reuses selectLiveDeal template)
function _texBuildDealCard(id, d){
  if(!d) return '<div class="task-empty">Deal não encontrado</div>';
  var fmtBRL = window.fmtBRL || function(v){return v?'R$ '+Number(v).toLocaleString('pt-BR'):'—';};
  var barClass=d.tc==='th'?'bf-h':d.tc==='tw'?'bf-w':'bf-c';
  var tgvClass=d.tc==='th'?'tgv-h':d.tc==='tw'?'tgv-w':'tgv-c';
  var tempSub=d.tc==='th'?'Quente — ação imediata':d.tc==='tw'?'Morno — reengajamento':'Frio — risco de perda';
  var buildRecom = window.buildRecomText || function(){return '';};
  var escHtml = window.escHtml || _escHtml;
  return '<div class="card">'
    + '<div class="dch">'
    + '<div class="dca">'+((d.emailLead||d.nome||'?')[0]).toUpperCase()+'</div>'
    + '<div class="dci">'
    + '<div class="dcn">'+escHtml(d.nome||'Lead')+'</div>'
    + '<div class="dcs">'+escHtml(d.cargo||'—')+' · '+escHtml(d.emailLead||d.empresa||'')+'</div>'
    + '<div class="tags-row">'
    + '<span class="tag t-gray">'+escHtml(d.tier||'—')+'</span>'
    + '<span class="tag t-gray">'+escHtml(d.etapa||d.fase||'')+'</span>'
    + (d._signal==='BUY'?'<span class="tag t-buy">BUY</span>':d._signal==='RISK'?'<span class="tag t-risk">RISK</span>':d._signal==='STALL'?'<span class="tag t-stall">STALL</span>':d._signal==='CHAMP'?'<span class="tag t-champ">CHAMP</span>':d._signal==='DOME'?'<span class="tag t-stall">IRON DOME</span>':'')
    + ((d._urgency||0)>=60?'<span class="tag t-risk">SLA RISCO</span>':'')
    + '</div></div></div>'
    + '<div class="tg">'
    + '<div class="tg-row"><span class="tg-lbl">Temperatura do Deal</span><span class="tgv '+tgvClass+'">'+d.temp+'</span></div>'
    + '<div class="bar"><div class="bf '+barClass+'" style="width:'+d.temp+'%"></div></div>'
    + '<div class="tg-sub">'+tempSub+'</div></div>'
    + '<div class="info-grid">'
    + '<div class="ic"><div class="ic-l">Etapa</div><div class="ic-v">'+escHtml(d.etapa||d.fase||'')+'</div><div class="ic-s">'+(d.fase?'Fase: '+d.fase+' · ':'')+d.delta+' dias no CRM</div></div>'
    + '<div class="ic"><div class="ic-l">Canal</div><div class="ic-v">'+escHtml(d.canal||'')+'</div><div class="ic-s">'+escHtml(d.linhaReceita||d.utm_medium||'—')+'</div></div>'
    + '<div class="ic"><div class="ic-l">Dia FUP</div><div class="ic-v">'+escHtml(d.dd||'')+'</div><div class="ic-s">'+(d._timeline?d._timeline.actionLabel:'')+'</div></div>'
    + '<div class="ic"><div class="ic-l">SLA</div><div class="ic-v" style="color:'+(d._timeline&&(d._timeline.slaStatus==='overdue'||d._timeline.slaStatus==='critical')?'var(--red)':d._timeline&&d._timeline.slaStatus==='at_risk'?'var(--yellow)':'var(--green)')+'">'+((d._timeline?d._timeline.slaLabel:'—'))+'</div><div class="ic-s">'+(d._timeline?(d._timeline.daysToSLA>=0?d._timeline.daysToSLA+'d restantes':Math.abs(d._timeline.daysToSLA)+'d estourado'):'')+'</div></div>'
    + '<div class="ic"><div class="ic-l">Valor G4</div><div class="ic-v" style="color:var(--green)">'+fmtBRL(d.revenueRaw)+'</div></div>'
    + '<div class="ic"><div class="ic-l">Valor ELUCY</div><div class="ic-v" style="color:var(--accent2)">'+fmtBRL(d.elucyValor)+'</div></div>'
    + '</div>'
    + '<div class="recom"><div class="recom-l">Recomendação ELUCY <span class="elucy-badge">MOTOR ATIVO</span></div>'
    + '<div class="recom-t" id="recom-tex-'+id+'">'+buildRecom(d)+'</div></div>'
    + ((d._urgency||0)>=60?'<div class="alrt al-d">SLA em risco — deal sem avanço por '+(d._delta||d.delta||0)+' dias.</div>':'')
    + (d._signal==='DOME'?'<div class="alrt al-w">Iron Dome ativo — +10 dias sem resposta.</div>':'')
    + '<div class="row">'
    + '<button class="btn bp" onclick="showCopy(\''+id+'\',this)">Gerar Copy via ELUCY</button>'
    + '<button class="btn bs" id="btn-er-tex-'+id+'" onclick="toggleER(\''+id+'\',this)">ELUCI Report</button>'
    + '<button class="btn bs" data-color="clay" onclick="requestBusinessAnalysis(\''+id+'\',this)" style="border-color:var(--clay);color:var(--clay)">Análise de Mercado</button>'
    + '<button class="wa-conv-btn" onclick="toggleWaPanel(\''+id+'\',this)">💬 Conversa</button>'
    + '<button class="btn bs btn-sm" data-color="green" onclick="requestNotaCRM(\''+id+'\',this)" style="border-color:var(--green);color:var(--green)">📝 Nota CRM</button>'
    + '</div>'
    + '<div class="ba" id="nota-'+id+'" style="display:none"></div>'
    + '<div class="wa-panel" id="wa-panel-'+id+'">'
    + '<div class="wa-panel-header"><span class="wa-panel-title">Conversa WhatsApp</span><span id="wa-badge-'+id+'"></span><button class="wa-panel-close" onclick="toggleWaPanel(\''+id+'\')">✕</button></div>'
    + '<div class="wa-chat" id="wa-chat-'+id+'"></div>'
    + '<textarea class="wa-paste-area" id="wa-paste-'+id+'" placeholder="Cole aqui a conversa do WhatsApp..."></textarea>'
    + '<div class="wa-paste-actions"><button class="btn bsuc btn-sm" onclick="processWaConversation(\''+id+'\')">Salvar conversa</button><button class="btn bs btn-sm" onclick="document.getElementById(\'wa-paste-'+id+'\').value=\'\'">Limpar</button><span class="wa-msg-count" id="wa-count-'+id+'"></span></div>'
    + '</div>'
    + '<div class="er" id="er-'+id+'" style="display:none"><div class="er-loading" style="display:none"></div></div>'
    + '<div class="ba" id="ba-'+id+'" style="display:none"></div>'
    + '</div>';
}

function _texUpdateUI(){
  if(!_texQueue.length) return;
  var t = _texQueue[_texIdx];
  var d = t.deal;
  var cfg = TASK_TYPES[t.taskType]||TASK_TYPES.follow_up;

  // Nav counter + progress
  var el=document.getElementById;
  document.getElementById('tex-counter').textContent = (_texIdx+1)+' de '+_texQueue.length;
  document.getElementById('tex-task-label').textContent = cfg.label + ' · ' + (d.nome||d.emailLead||'Lead');
  document.getElementById('tex-progress-fill').style.width = Math.round((_texIdx+1)/_texQueue.length*100)+'%';
  document.getElementById('tex-type-label').textContent = cfg.label + ' · ' + (t.priority||'').toUpperCase();

  // Arrow states
  document.getElementById('tex-prev').disabled = (_texIdx <= 0);
  document.getElementById('tex-next').disabled = (_texIdx >= _texQueue.length - 1);

  // Deal card
  var wrap = document.getElementById('tex-deal-card');
  wrap.innerHTML = _texBuildDealCard(t.id, d);

  // Load cached outputs if remote
  if(window.IS_REMOTE && window.loadDealCache) window.loadDealCache(d.deal_id || t.id, t.id);
  if(window.IS_REMOTE && window.loadWaConversations) window.loadWaConversations(d.deal_id || t.id, t.id);

  // Reset disposition
  _texDisposition = null;
  document.querySelectorAll('.tex-disp-btn').forEach(function(b){b.classList.remove('on');});

  // Reset timer
  _texSeconds = 0;
  _texUpdateTimer();
}

function _texUpdateTimer(){
  var m = Math.floor(_texSeconds/60);
  var s = _texSeconds%60;
  var el = document.getElementById('tex-timer');
  if(el) el.textContent = (m<10?'0':'')+m+':'+(s<10?'0':'')+s;
}

function _texStartTimer(){
  if(_texTimer) clearInterval(_texTimer);
  _texSeconds = 0;
  _texTimer = setInterval(function(){
    _texSeconds++;
    _texUpdateTimer();
  }, 1000);
}

function _texStopTimer(){
  if(_texTimer){ clearInterval(_texTimer); _texTimer=null; }
}

// Open execution mode at given task index
window.texOpen = function(idx){
  var filterEl = document.querySelector('.fchip.on');
  var filterType = filterEl && filterEl.dataset.tfilter !== 'all' ? filterEl.dataset.tfilter : null;
  _texQueue = buildTaskQueue(filterType);
  if(!_texQueue.length) return;
  _texIdx = Math.min(idx, _texQueue.length - 1);
  document.getElementById('tex-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  _texUpdateUI();
  _texStartTimer();
};

// Navigate ← →
window.texNav = function(dir){
  var newIdx = _texIdx + dir;
  if(newIdx < 0 || newIdx >= _texQueue.length) return;
  _texIdx = newIdx;
  _texUpdateUI();
  _texStartTimer();
};

// Close execution mode
window.texClose = function(){
  document.getElementById('tex-overlay').classList.remove('open');
  document.body.style.overflow = '';
  _texStopTimer();
};

// Keyboard shortcuts
document.addEventListener('keydown', function(e){
  var overlay = document.getElementById('tex-overlay');
  if(!overlay || !overlay.classList.contains('open')) return;
  if(e.key==='Escape') window.texClose();
  if(e.key==='ArrowLeft') window.texNav(-1);
  if(e.key==='ArrowRight') window.texNav(1);
});

// Select disposition
window.texDisp = function(btn){
  document.querySelectorAll('.tex-disp-btn').forEach(function(b){b.classList.remove('on');});
  btn.classList.add('on');
  _texDisposition = btn.dataset.disp;
};

// Skip: go to next without logging
window.texSkip = function(){
  var t = _texQueue[_texIdx];
  // V5: persist skip to deal_tasks
  if(t){
    var sb = window._sb ? window._sb() : null;
    var opId = window.getOperatorId ? window.getOperatorId() : null;
    if(sb && opId){
      sb.from('deal_tasks')
        .update({ task_status:'skipped', completed_at: new Date().toISOString(), disposition:'skipped_by_operator' })
        .eq('deal_id', t.deal.deal_id || t.id)
        .eq('operator_email', opId)
        .eq('task_type', t.taskType)
        .in('task_status', ['pending','ready','in_progress'])
        .then(function(res){ if(res.error) console.warn('[task-persist] skip error:', res.error.message); });
    }
  }
  if(_texIdx < _texQueue.length - 1){
    _texIdx++;
    _texUpdateUI();
    _texStartTimer();
  } else {
    window.texClose();
    if(window.showSyncToast) window.showSyncToast('ok','Fila concluída!');
  }
};

// Complete: log disposition + advance
window.texComplete = function(){
  var t = _texQueue[_texIdx];
  if(!t) return;

  // Log to Supabase activity_log
  var sb = window._sb ? window._sb() : null;
  var opId = window.getOperatorId ? window.getOperatorId() : null;
  if(sb && opId){
    sb.from('activity_log').insert({
      operator_id: opId,
      action: 'task_completed',
      target_id: t.deal.deal_id || t.id,
      metadata: JSON.stringify({
        taskType: t.taskType,
        disposition: _texDisposition,
        elapsed_seconds: _texSeconds,
        dealName: t.deal.nome
      })
    }).then(function(){});
  }

  // Log to deal_interactions if disposition set
  if(sb && opId && _texDisposition){
    sb.from('deal_interactions').insert({
      deal_id: t.deal.deal_id || t.id,
      operator_id: opId,
      interaction_type: 'task_disposition',
      content: JSON.stringify({
        taskType: t.taskType,
        disposition: _texDisposition,
        elapsed_seconds: _texSeconds
      })
    }).then(function(){});
  }

  // V5: persist completion to deal_tasks
  if(sb && opId){
    sb.from('deal_tasks')
      .update({
        task_status: 'completed',
        completed_at: new Date().toISOString(),
        disposition: _texDisposition || 'resolved',
        result_payload: JSON.stringify({ elapsed_seconds: _texSeconds, dealName: t.deal.nome })
      })
      .eq('deal_id', t.deal.deal_id || t.id)
      .eq('operator_email', opId)
      .eq('task_type', t.taskType)
      .in('task_status', ['pending','ready','in_progress'])
      .then(function(res){ if(res.error) console.warn('[task-persist] complete error:', res.error.message); });
  }

  // Advance cadence step if this task is from a cadence
  if(t.cadence) window.cadenceAdvance(t.id);

  if(window.showSyncToast) window.showSyncToast('ok','Task concluída: '+(t.deal.nome||''));

  // Advance or close
  if(_texIdx < _texQueue.length - 1){
    _texIdx++;
    _texUpdateUI();
    _texStartTimer();
  } else {
    window.texClose();
    if(window.showSyncToast) window.showSyncToast('ok','🎉 Fila concluída! Todas as tasks executadas.');
  }
};

// Legacy fallbacks
window.openTaskDeal = function(id){
  // Find task index for this deal
  var filterEl = document.querySelector('.fchip.on');
  var filterType = filterEl && filterEl.dataset.tfilter !== 'all' ? filterEl.dataset.tfilter : null;
  _texQueue = buildTaskQueue(filterType);
  for(var i=0;i<_texQueue.length;i++){
    if(_texQueue[i].id === id){ window.texOpen(i); return; }
  }
  // Fallback: open in pipeline
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
  window.texOpen(currentIdx+1);
};

// ==================================================================
// CADENCE ENGINE — Sequências multi-canal com steps programados
// Templates pré-definidos por tier/canal. Enrollment persistido no elucy_cache.
// ==================================================================

var CADENCE_TEMPLATES = {
  'prospecao-padrao': {
    name: 'Prospecção Padrão',
    description: 'Cadência 14 dias — WhatsApp + Ligação + Email',
    steps: [
      { day:0,  channel:'whatsapp', action:'Primeiro contato WhatsApp', taskType:'follow_up' },
      { day:1,  channel:'phone',    action:'Ligação de apresentação', taskType:'follow_up' },
      { day:2,  channel:'whatsapp', action:'FUP WhatsApp — reforço', taskType:'follow_up' },
      { day:4,  channel:'email',    action:'Email com material', taskType:'follow_up' },
      { day:6,  channel:'phone',    action:'Ligação de follow-up', taskType:'follow_up' },
      { day:8,  channel:'whatsapp', action:'WhatsApp — última tentativa', taskType:'follow_up' },
      { day:10, channel:'instagram',action:'Social DM — abordagem founder', taskType:'social_dm' },
      { day:14, channel:'phone',    action:'Ligação final — break up', taskType:'follow_up' }
    ]
  },
  'prospecao-rapida': {
    name: 'Prospecção Rápida',
    description: 'Cadência 7 dias — alta frequência para leads quentes',
    steps: [
      { day:0,  channel:'whatsapp', action:'Primeiro contato imediato', taskType:'follow_up' },
      { day:0,  channel:'phone',    action:'Ligação mesmo dia', taskType:'follow_up' },
      { day:1,  channel:'whatsapp', action:'FUP WhatsApp', taskType:'follow_up' },
      { day:2,  channel:'phone',    action:'Segunda ligação', taskType:'follow_up' },
      { day:3,  channel:'whatsapp', action:'WhatsApp com gatilho', taskType:'follow_up' },
      { day:5,  channel:'email',    action:'Email break up', taskType:'follow_up' },
      { day:7,  channel:'phone',    action:'Última tentativa', taskType:'follow_up' }
    ]
  },
  'reativacao': {
    name: 'Reativação',
    description: 'Cadência 21 dias — leads frios/stall',
    steps: [
      { day:0,  channel:'whatsapp', action:'Reativação WhatsApp — novo contexto', taskType:'reativacao' },
      { day:3,  channel:'email',    action:'Email com case/resultado', taskType:'reativacao' },
      { day:6,  channel:'instagram',action:'Social DM — tom founder', taskType:'social_dm' },
      { day:10, channel:'phone',    action:'Ligação de reengajamento', taskType:'reativacao' },
      { day:14, channel:'whatsapp', action:'WhatsApp — oferta especial', taskType:'reativacao' },
      { day:21, channel:'email',    action:'Email break up final', taskType:'reativacao' }
    ]
  },
  'social-dm': {
    name: 'Social Selling',
    description: 'Cadência 10 dias — Instagram + WhatsApp intercalado',
    steps: [
      { day:0,  channel:'instagram',action:'DM de abertura — perfil', taskType:'social_dm' },
      { day:2,  channel:'instagram',action:'DM de valor — conteúdo', taskType:'social_dm' },
      { day:4,  channel:'whatsapp', action:'WhatsApp — ponte do IG', taskType:'follow_up' },
      { day:6,  channel:'instagram',action:'DM — prova social', taskType:'social_dm' },
      { day:8,  channel:'phone',    action:'Ligação — fechamento', taskType:'follow_up' },
      { day:10, channel:'whatsapp', action:'WhatsApp — última chance', taskType:'follow_up' }
    ]
  },
  'handoff-prep': {
    name: 'Pré-Handoff',
    description: 'Cadência 5 dias — preparar lead para closer',
    steps: [
      { day:0,  channel:'whatsapp', action:'Confirmar interesse e dados', taskType:'handoff_prep' },
      { day:1,  channel:'email',    action:'Enviar material preparatório', taskType:'handoff_prep' },
      { day:2,  channel:'phone',    action:'Ligação de alinhamento', taskType:'handoff_prep' },
      { day:3,  channel:'whatsapp', action:'Confirmar agendamento', taskType:'agendamento' },
      { day:5,  channel:'whatsapp', action:'Lembrete dia da reunião', taskType:'agendamento' }
    ]
  }
};
window.CADENCE_TEMPLATES = CADENCE_TEMPLATES;

// In-memory enrollment state: { dealId: { template, startDate, currentStep, paused, completedSteps:[] } }
var _cadenceEnrollments = {};
var _cadenceLoaded = false;

// Load enrollments from Supabase elucy_cache
async function cadenceLoadAll(){
  var sb = _sb(); if(!sb) return;
  var opId = getOperatorId(); if(!opId) return;
  try{
    var {data} = await sb.from('elucy_cache')
      .select('deal_id,report')
      .eq('operator_email', opId)
      .like('deal_id', '_cad_%');
    if(data && data.length){
      data.forEach(function(row){
        var realId = row.deal_id.replace('_cad_','');
        try{ _cadenceEnrollments[realId] = JSON.parse(row.report); }catch(e){}
      });
    }
    _cadenceLoaded = true;
  }catch(e){ console.warn('cadenceLoadAll error:', e); }
}
window.cadenceLoadAll = cadenceLoadAll;

// Save single enrollment to Supabase
async function cadenceSave(dealId){
  var sb = _sb(); if(!sb) return;
  var opId = getOperatorId(); if(!opId) return;
  var enrollment = _cadenceEnrollments[dealId];
  if(!enrollment) return;
  try{
    await sb.from('elucy_cache').upsert({
      deal_id: '_cad_'+dealId,
      operator_email: opId,
      report: JSON.stringify(enrollment),
      updated_at: _now()
    }, { onConflict:'deal_id,operator_email' });
  }catch(e){ console.warn('cadenceSave error:', e); }
}

// Enroll a deal into a cadence
window.cadenceEnroll = function(dealId, templateKey){
  var tmpl = CADENCE_TEMPLATES[templateKey];
  if(!tmpl){ console.warn('Cadence template not found:', templateKey); return; }
  _cadenceEnrollments[dealId] = {
    template: templateKey,
    templateName: tmpl.name,
    startDate: _today(),
    currentStep: 0,
    paused: false,
    completedSteps: []
  };
  cadenceSave(dealId);
  // Re-render tasks if visible
  if(window.renderTaskRunner) window.renderTaskRunner();
  if(window.showSyncToast) window.showSyncToast('ok','Cadência "'+tmpl.name+'" iniciada');
};

// Pause/resume cadence
window.cadenceTogglePause = function(dealId){
  var enr = _cadenceEnrollments[dealId];
  if(!enr) return;
  enr.paused = !enr.paused;
  cadenceSave(dealId);
  if(window.showSyncToast) window.showSyncToast('ok', enr.paused?'Cadência pausada':'Cadência retomada');
};

// Complete current step and advance
window.cadenceAdvance = function(dealId){
  var enr = _cadenceEnrollments[dealId];
  if(!enr) return;
  var tmpl = CADENCE_TEMPLATES[enr.template];
  if(!tmpl) return;
  enr.completedSteps.push({ step:enr.currentStep, completedAt:_now() });
  if(enr.currentStep < tmpl.steps.length - 1){
    enr.currentStep++;
  } else {
    enr.completed = true;
    enr.completedAt = _now();
  }
  cadenceSave(dealId);
};

// Remove enrollment
window.cadenceRemove = function(dealId){
  delete _cadenceEnrollments[dealId];
  var sb = _sb(); if(!sb) return;
  var opId = getOperatorId(); if(!opId) return;
  sb.from('elucy_cache').delete()
    .eq('deal_id','_cad_'+dealId)
    .eq('operator_email',opId)
    .then(function(){});
  if(window.showSyncToast) window.showSyncToast('ok','Cadência removida');
};

// Get current step info for a deal (used by task queue)
function cadenceGetCurrentStep(dealId){
  var enr = _cadenceEnrollments[dealId];
  if(!enr || enr.paused || enr.completed) return null;
  var tmpl = CADENCE_TEMPLATES[enr.template];
  if(!tmpl) return null;
  var step = tmpl.steps[enr.currentStep];
  if(!step) return null;
  // Check if today is the right day for this step
  var start = new Date(enr.startDate+'T00:00:00');
  var today = new Date(_today()+'T00:00:00');
  var daysSinceStart = Math.floor((today - start)/(1000*60*60*24));
  if(daysSinceStart < step.day) return null; // Not yet time for this step
  return {
    step: step,
    stepIndex: enr.currentStep,
    totalSteps: tmpl.steps.length,
    templateName: tmpl.name,
    daysSinceStart: daysSinceStart,
    overdue: daysSinceStart > step.day
  };
}

// Get enrollment info for UI display
window.cadenceGetInfo = function(dealId){
  var enr = _cadenceEnrollments[dealId];
  if(!enr) return null;
  var tmpl = CADENCE_TEMPLATES[enr.template];
  return {
    enrollment: enr,
    template: tmpl,
    currentStep: cadenceGetCurrentStep(dealId),
    progress: tmpl ? Math.round(enr.completedSteps.length / tmpl.steps.length * 100) : 0
  };
};

// Channel icons for UI
var CHANNEL_ICONS = {whatsapp:'💬',phone:'📞',email:'📧',instagram:'📸'};
window.CHANNEL_ICONS = CHANNEL_ICONS;

// Build cadence enrollment UI (for deal cards)
window.cadenceBuildUI = function(dealId){
  var info = window.cadenceGetInfo(dealId);
  if(!info){
    // Not enrolled — show enroll button with template picker
    var opts = Object.keys(CADENCE_TEMPLATES).map(function(k){
      var t = CADENCE_TEMPLATES[k];
      return '<option value="'+k+'">'+_escHtml(t.name)+' — '+t.steps.length+' steps</option>';
    }).join('');
    return '<div class="cad-enroll">'
      + '<select class="cad-select" id="cad-sel-'+dealId+'">'+opts+'</select>'
      + '<button class="btn bs btn-sm" onclick="window.cadenceEnroll(\''+dealId+'\',document.getElementById(\'cad-sel-'+dealId+'\').value)">▶ Iniciar Cadência</button>'
      + '</div>';
  }
  // Enrolled — show progress
  var enr = info.enrollment;
  var tmpl = info.template;
  var steps = tmpl ? tmpl.steps : [];
  var stepHtml = steps.map(function(s, i){
    var done = enr.completedSteps.some(function(c){ return c.step===i; });
    var current = i === enr.currentStep && !enr.completed;
    var icon = CHANNEL_ICONS[s.channel]||'📌';
    var cls = done ? 'cad-step done' : current ? 'cad-step current' : 'cad-step';
    return '<div class="'+cls+'" title="D'+s.day+': '+_escHtml(s.action)+'">'
      + '<span class="cad-step-icon">'+icon+'</span>'
      + '<span class="cad-step-day">D'+s.day+'</span>'
      + '</div>';
  }).join('');
  var statusLabel = enr.completed ? '✅ Completa' : enr.paused ? '⏸ Pausada' : '▶ Ativa';
  return '<div class="cad-progress">'
    + '<div class="cad-header">'
    + '<span class="cad-name">'+_escHtml(tmpl?tmpl.name:enr.template)+'</span>'
    + '<span class="cad-status">'+statusLabel+'</span>'
    + '</div>'
    + '<div class="cad-steps">'+stepHtml+'</div>'
    + '<div class="cad-actions">'
    + (enr.completed?'':('<button class="btn bs btn-sm" onclick="window.cadenceTogglePause(\''+dealId+'\')">'+(enr.paused?'▶ Retomar':'⏸ Pausar')+'</button>'))
    + '<button class="btn bs btn-sm" style="border-color:var(--red);color:var(--red)" onclick="if(confirm(\'Remover cadência?\'))window.cadenceRemove(\''+dealId+'\')">✕ Remover</button>'
    + '</div>'
    + '</div>';
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
// LAYER 8 — TIMELINE INTELLIGENCE ENGINE
// Extrai métricas temporais do event stream do funil_comercial.
// Cada deal tem N eventos (MQL, SAL, Conectado, task, call...).
// O sync traz apenas o último snapshot; este motor reconstroi
// inteligência a partir de created_at, event_timestamp e delta_t.
// ==================================================================

// Resolve delta real: Databricks delta_t > calc via created_at_crm > 0
function resolveRealDelta(deal){
  var d=parseInt(deal.delta_t||deal.delta||deal._delta)||0;
  if(!d){
    var crmDate=deal.created_at_crm||deal.createdAtCrm||deal.created_at||'';
    if(crmDate){ var dt=new Date(crmDate); if(!isNaN(dt)){ d=Math.max(0,Math.floor((Date.now()-dt.getTime())/86400000)); } }
  }
  return d;
}
window.resolveRealDelta = resolveRealDelta;

// Calcula todas as métricas temporais derivadas de um deal
function calcTimelineIntelligence(deal){
  var now=Date.now();
  var created=deal.created_at_crm||deal.createdAtCrm||deal.created_at||'';
  var createdMs=created?new Date(created).getTime():0;
  var closedAt=deal.closed_at||'';
  var closedMs=closedAt?new Date(closedAt).getTime():0;
  var delta=resolveRealDelta(deal);
  var etapa=(deal.etapa||deal.etapa_atual_no_pipeline||deal._etapa||'').toLowerCase();
  var fase=(deal.fase||deal.fase_atual_no_processo||deal._fase||'').toLowerCase();
  var status=(deal.statusDeal||deal.status_do_deal||'').toLowerCase();
  var revLine=deal._revLine||resolveRevenueLine(deal);
  var lc=REVENUE_LINES[revLine]||REVENUE_LINES.imersao;

  // ── IDADE DO DEAL ──
  var ageDays=delta;
  var ageWeeks=Math.floor(ageDays/7);
  var ageBucket=ageDays<=3?'fresh':ageDays<=7?'active':ageDays<=14?'warm':ageDays<=21?'cooling':'stale';

  // ── VELOCIDADE DE PROGRESSÃO ──
  // Mapa de ordem de etapas do SDR
  var ETAPA_ORDER={'novo lead':1,'dia 01':2,'dia 02':3,'dia 03':4,'dia 04':5,'dia 05':6,'dia 06':7,'conectados':8,'agendamento':9,'reagendamento':10,'entrevista agendada':11};
  var currentStageOrder=ETAPA_ORDER[etapa]||0;
  // Velocidade: etapas avançadas / dias. Mais alto = mais rápido
  var velocity=ageDays>0&&currentStageOrder>0?Math.round(currentStageOrder/ageDays*100)/100:0;
  // Benchmark médio: ~1 etapa a cada 2 dias = 0.5
  var velocityLabel=velocity>=1.0?'Acelerado':velocity>=0.5?'Normal':velocity>=0.2?'Lento':'Parado';
  var velocityScore=velocity>=1.0?100:velocity>=0.5?75:velocity>=0.2?50:velocity>0?25:0;

  // ── SLA E RISCO TEMPORAL ──
  var riskAfter=lc.risk_after||3;
  var daysOverSLA=Math.max(0,ageDays-riskAfter);
  var slaStatus=ageDays<=riskAfter?'on_track':ageDays<=riskAfter*2?'at_risk':ageDays<=riskAfter*3?'overdue':'critical';
  var slaLabel=slaStatus==='on_track'?'No prazo':slaStatus==='at_risk'?'Atenção':slaStatus==='overdue'?'Atrasado':'Crítico';
  // Dias restantes estimados até SLA (negativo = já passou)
  var daysToSLA=riskAfter-ageDays;

  // ── JANELA DE AÇÃO (Action Window) ──
  // Quanto tempo o SDR tem antes de o deal esfriar demais
  var actionWindowDays=Math.max(0,riskAfter*2-ageDays);
  var actionUrgency=actionWindowDays<=0?'expired':actionWindowDays<=1?'today':actionWindowDays<=3?'this_week':'comfortable';
  var actionLabel=actionUrgency==='expired'?'Janela fechada':actionUrgency==='today'?'Agir HOJE':actionUrgency==='this_week'?'Esta semana':'Confortável';

  // ── TEMPO NA ETAPA ATUAL ──
  // Se delta_t do Databricks é entre transições, usa ele; senão estima via idade total
  var daysInCurrentStage=parseInt(deal.delta_t)||0;
  if(!daysInCurrentStage) daysInCurrentStage=ageDays; // fallback: todo tempo na mesma etapa
  var stageStagnation=daysInCurrentStage>riskAfter*2?'stagnant':daysInCurrentStage>riskAfter?'slow':'healthy';

  // ── PROBABILIDADE DE CONVERSÃO DECAÍDA POR TEMPO ──
  var baseProbability=STAGE_PROB[etapa]||0.10;
  // Decai exponencialmente após SLA: prob * e^(-0.05 * daysOverSLA)
  var timeDecay=daysOverSLA>0?Math.exp(-0.05*daysOverSLA):1.0;
  var adjustedProbability=Math.round(baseProbability*timeDecay*1000)/1000;
  // Probability trend: se delta estiver crescendo sem avançar de etapa
  var probTrend=timeDecay>=0.9?'stable':timeDecay>=0.7?'declining':timeDecay>=0.4?'dropping':'collapsing';

  // ── DATA DE CRIAÇÃO FORMATADA ──
  var createdDate='';
  var createdAgo='';
  if(createdMs){
    var cd=new Date(createdMs);
    createdDate=cd.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
    createdAgo=ageDays===0?'hoje':ageDays===1?'ontem':ageDays+'d atrás';
  }

  // ── DATA DE FECHAMENTO (se deal fechado) ──
  var closedDate='';
  var timeToClose=0;
  if(closedMs&&createdMs){
    closedDate=new Date(closedMs).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
    timeToClose=Math.floor((closedMs-createdMs)/86400000);
  }

  // ── PREVISÃO DE FECHAMENTO (se deal aberto) ──
  // Baseado na velocidade atual + etapas restantes até Entrevista Agendada
  var etapasRestantes=Math.max(0,11-currentStageOrder); // 11 = Entrevista Agendada
  var estimatedDaysToClose=velocity>0?Math.round(etapasRestantes/velocity):etapasRestantes*3;
  var estimatedCloseDate='';
  if(status!=='perdido'&&status!=='ganho'&&createdMs){
    var ecd=new Date(now+estimatedDaysToClose*86400000);
    estimatedCloseDate=ecd.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
  }

  // ── MELHOR HORÁRIO PARA CONTATO (baseado no created_at) ──
  var bestContactHour='';
  if(createdMs){
    var h=new Date(createdMs).getHours();
    bestContactHour=h<12?'Manhã ('+h+'h criado)':'Tarde ('+(h>18?h-12:h)+'h criado)';
  }

  // ── DIA DA SEMANA DE CRIAÇÃO ──
  var createdDayOfWeek='';
  if(createdMs){
    var days=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    createdDayOfWeek=days[new Date(createdMs).getDay()];
  }

  // ── SCORE COMPOSTO DE TIMING ──
  // 0-100: combina velocidade, SLA, probabilidade ajustada, janela de ação
  var timingScore=Math.round(
    velocityScore*0.25 +
    (slaStatus==='on_track'?100:slaStatus==='at_risk'?60:slaStatus==='overdue'?30:10)*0.25 +
    (adjustedProbability*100/0.55)*0.25 + // normalizado pelo max (entrevista agendada = 0.55)
    (actionUrgency==='comfortable'?100:actionUrgency==='this_week'?70:actionUrgency==='today'?40:10)*0.25
  );
  timingScore=Math.min(100,Math.max(0,timingScore));

  // ── NEXT ACTION TEMPORAL ──
  var nextActionTemporal='';
  if(status==='perdido'||status==='ganho'){
    nextActionTemporal='Deal fechado em '+closedDate;
  } else if(actionUrgency==='expired'){
    nextActionTemporal='Janela expirada ('+ageDays+'d). Considerar reativação ou perda.';
  } else if(actionUrgency==='today'){
    nextActionTemporal='URGENTE: última janela. Contato imediato.';
  } else if(slaStatus==='overdue'){
    nextActionTemporal='SLA estourado há '+daysOverSLA+'d. Priorizar.';
  } else if(slaStatus==='at_risk'){
    nextActionTemporal='SLA em '+Math.abs(daysToSLA)+'d. Agendar ação.';
  } else if(velocityLabel==='Parado'){
    nextActionTemporal='Sem avanço de etapa. Mudar abordagem.';
  } else {
    nextActionTemporal='No ritmo. Próxima ação em ~'+Math.max(1,daysToSLA)+'d.';
  }

  return {
    // Idade
    ageDays:ageDays, ageWeeks:ageWeeks, ageBucket:ageBucket,
    // Velocidade
    velocity:velocity, velocityLabel:velocityLabel, velocityScore:velocityScore,
    currentStageOrder:currentStageOrder,
    // SLA
    riskAfter:riskAfter, daysOverSLA:daysOverSLA, daysToSLA:daysToSLA,
    slaStatus:slaStatus, slaLabel:slaLabel,
    // Janela de ação
    actionWindowDays:actionWindowDays, actionUrgency:actionUrgency, actionLabel:actionLabel,
    // Estagnação
    daysInCurrentStage:daysInCurrentStage, stageStagnation:stageStagnation,
    // Probabilidade
    baseProbability:baseProbability, timeDecay:timeDecay,
    adjustedProbability:adjustedProbability, probTrend:probTrend,
    // Datas
    createdDate:createdDate, createdAgo:createdAgo,
    closedDate:closedDate, timeToClose:timeToClose,
    estimatedCloseDate:estimatedCloseDate, estimatedDaysToClose:estimatedDaysToClose,
    // Padrões de contato
    bestContactHour:bestContactHour, createdDayOfWeek:createdDayOfWeek,
    // Score
    timingScore:timingScore,
    // Ação
    nextActionTemporal:nextActionTemporal
  };
}
window.calcTimelineIntelligence = calcTimelineIntelligence;

// Versão batch: calcula para todos os deals e retorna analytics agregados
function calcPipelineTimingAnalytics(allDeals){
  if(!allDeals||!allDeals.length) return null;
  var timelines=allDeals.map(function(d){ return calcTimelineIntelligence(d); });
  var open=timelines.filter(function(t){ return t.ageBucket!=='closed'; });
  var avgAge=open.length?Math.round(open.reduce(function(s,t){return s+t.ageDays;},0)/open.length):0;
  var avgVelocity=open.length?Math.round(open.reduce(function(s,t){return s+t.velocity;},0)/open.length*100)/100:0;
  var avgTimingScore=open.length?Math.round(open.reduce(function(s,t){return s+t.timingScore;},0)/open.length):0;
  var slaBreaches=open.filter(function(t){return t.slaStatus==='overdue'||t.slaStatus==='critical';}).length;
  var actionToday=open.filter(function(t){return t.actionUrgency==='today'||t.actionUrgency==='expired';}).length;
  var stagnant=open.filter(function(t){return t.stageStagnation==='stagnant';}).length;
  var byBucket={fresh:0,active:0,warm:0,cooling:0,stale:0};
  open.forEach(function(t){ byBucket[t.ageBucket]=(byBucket[t.ageBucket]||0)+1; });
  var bySLA={on_track:0,at_risk:0,overdue:0,critical:0};
  open.forEach(function(t){ bySLA[t.slaStatus]=(bySLA[t.slaStatus]||0)+1; });
  var avgProbability=open.length?Math.round(open.reduce(function(s,t){return s+t.adjustedProbability;},0)/open.length*1000)/1000:0;
  return {
    totalDeals:allDeals.length, openDeals:open.length,
    avgAge:avgAge, avgVelocity:avgVelocity, avgTimingScore:avgTimingScore,
    avgAdjustedProbability:avgProbability,
    slaBreaches:slaBreaches, actionToday:actionToday, stagnantDeals:stagnant,
    byAgeBucket:byBucket, bySLA:bySLA
  };
}
window.calcPipelineTimingAnalytics = calcPipelineTimingAnalytics;

// ==================================================================
// INIT
// ==================================================================

restoreUIState();

if(window._currentUser){
  initOperatorContext().then(function(){
    setTimeout(initRealtimeListeners,500);
    setTimeout(updateGamificationUI,2000);
    setTimeout(renderHome,2500);
    // Load cadence enrollments after operator context is ready
    setTimeout(function(){
      if(window.loadCadenceEnrollments) loadCadenceEnrollments().then(function(){ loadCadenceSteps(); });
    },1500);
  });
}

// ==================================================================
// LAYER 8 — CADENCE ENGINE
// Templates de cadência multi-canal, enrollment por deal, step tracking.
// Cadências geram tasks diárias que alimentam o Task Runner (Layer 4).
// ==================================================================

var CADENCE_CHANNELS = {
  whatsapp:  { label:'WhatsApp',  icon:'💬', color:'green' },
  ligacao:   { label:'Ligação',   icon:'📞', color:'accent' },
  email:     { label:'E-mail',    icon:'📧', color:'accent2' },
  instagram: { label:'Instagram', icon:'📱', color:'clay' },
  linkedin:  { label:'LinkedIn',  icon:'🔗', color:'accent2' },
  tarefa:    { label:'Tarefa',    icon:'📋', color:'text2' }
};

// Default cadence templates by tier/persona
var DEFAULT_CADENCES = [
  {
    id: 'cad_titan_hot',
    name: 'Titan Hot — Imersão Presencial',
    tier: 'diamond,gold',
    persona: 'Titan',
    totalDays: 14,
    steps: [
      { day:1, channel:'whatsapp', action:'Apresentação + link calendly', auto:false },
      { day:1, channel:'ligacao',  action:'Call de conexão (60s max)', auto:false },
      { day:2, channel:'whatsapp', action:'FUP: enviou link? Viu material?', auto:false },
      { day:3, channel:'instagram',action:'DM Founder — tensão de inação', auto:false },
      { day:4, channel:'ligacao',  action:'Call decisivo — agenda ou descarta', auto:false },
      { day:5, channel:'whatsapp', action:'Último toque — deadline 24h', auto:false },
      { day:7, channel:'email',    action:'Breakup email — encerramento elegante', auto:false },
      { day:10,channel:'instagram',action:'Reengajamento leve — conteúdo de valor', auto:false },
      { day:14,channel:'whatsapp', action:'Último contato — arquivo ou reativa', auto:false }
    ]
  },
  {
    id: 'cad_builder_warm',
    name: 'Builder Warm — Digital/Harvard',
    tier: 'silver,gold',
    persona: 'Builder',
    totalDays: 12,
    steps: [
      { day:1, channel:'whatsapp', action:'Apresentação SPICED — situação + impacto', auto:false },
      { day:2, channel:'email',    action:'Caso de sucesso do segmento', auto:false },
      { day:3, channel:'ligacao',  action:'Call SPICED — Critical Event', auto:false },
      { day:4, channel:'whatsapp', action:'FUP com dados personalizado', auto:false },
      { day:6, channel:'linkedin', action:'Conexão + mensagem de valor', auto:false },
      { day:8, channel:'ligacao',  action:'Call decisivo', auto:false },
      { day:10,channel:'whatsapp', action:'Último toque', auto:false },
      { day:12,channel:'email',    action:'Breakup email', auto:false }
    ]
  },
  {
    id: 'cad_executor_cold',
    name: 'Executor Cold — Reativação',
    tier: 'bronze,silver',
    persona: 'Executor',
    totalDays: 21,
    steps: [
      { day:1, channel:'whatsapp', action:'Reativação — nova abordagem', auto:false },
      { day:3, channel:'ligacao',  action:'Call SPIN — identificar dor atual', auto:false },
      { day:5, channel:'email',    action:'Conteúdo educativo', auto:false },
      { day:7, channel:'whatsapp', action:'FUP + pergunta aberta', auto:false },
      { day:10,channel:'instagram',action:'Engajamento social leve', auto:false },
      { day:14,channel:'ligacao',  action:'Última tentativa de call', auto:false },
      { day:17,channel:'whatsapp', action:'Mensagem de encerramento', auto:false },
      { day:21,channel:'email',    action:'Breakup definitivo', auto:false }
    ]
  },
  {
    id: 'cad_fast_agendamento',
    name: 'Fast Track — Agendamento Rápido',
    tier: 'diamond,gold,silver',
    persona: 'any',
    totalDays: 5,
    steps: [
      { day:1, channel:'whatsapp', action:'Envio de link para agendar', auto:false },
      { day:1, channel:'ligacao',  action:'Call imediato', auto:false },
      { day:2, channel:'whatsapp', action:'FUP: conseguiu agendar?', auto:false },
      { day:3, channel:'ligacao',  action:'Segunda tentativa de call', auto:false },
      { day:4, channel:'instagram',action:'DM Founder como último recurso', auto:false },
      { day:5, channel:'whatsapp', action:'Deadline final — agora ou arquivo', auto:false }
    ]
  },
  {
    id: 'cad_no_show',
    name: 'No-Show Recovery',
    tier: 'any',
    persona: 'any',
    totalDays: 7,
    steps: [
      { day:1, channel:'whatsapp', action:'Reagendamento imediato — tom empático', auto:false },
      { day:1, channel:'ligacao',  action:'Call para reagendar (até 2h após no-show)', auto:false },
      { day:2, channel:'whatsapp', action:'FUP com nova data sugerida', auto:false },
      { day:3, channel:'email',    action:'Email formal com opções de horário', auto:false },
      { day:5, channel:'ligacao',  action:'Última tentativa de call', auto:false },
      { day:7, channel:'whatsapp', action:'Encerramento ou downsell', auto:false }
    ]
  }
];
window.DEFAULT_CADENCES = DEFAULT_CADENCES;
window.CADENCE_CHANNELS = CADENCE_CHANNELS;

// In-memory enrollment state: { dealId: { cadenceId, startDate, currentStep, status, completedSteps:[] } }
var _cadenceEnrollments = {};

// Load enrollments from Supabase on init
async function loadCadenceEnrollments(){
  var sb=_sb(); if(!sb) return;
  var opId=getOperatorId(); if(!opId) return;
  try{
    var {data}=await sb.from('deal_interactions')
      .select('deal_id,content,created_at')
      .eq('operator_id',opId)
      .eq('interaction_type','cadence_enrollment')
      .order('created_at',{ascending:false});
    if(!data) return;
    // Latest enrollment per deal wins
    var seen={};
    data.forEach(function(row){
      if(seen[row.deal_id]) return;
      seen[row.deal_id]=true;
      try{
        var c=JSON.parse(row.content);
        if(c.status!=='cancelled'){
          _cadenceEnrollments[row.deal_id]=c;
        }
      }catch(e){}
    });
    console.log('[cadence] Loaded '+Object.keys(_cadenceEnrollments).length+' enrollments');
  }catch(e){ console.warn('[cadence] load error:',e); }
}

// Load completed steps
async function loadCadenceSteps(){
  var sb=_sb(); if(!sb) return;
  var opId=getOperatorId(); if(!opId) return;
  try{
    var {data}=await sb.from('deal_interactions')
      .select('deal_id,content')
      .eq('operator_id',opId)
      .eq('interaction_type','cadence_step_done');
    if(!data) return;
    data.forEach(function(row){
      try{
        var c=JSON.parse(row.content);
        var e=_cadenceEnrollments[row.deal_id];
        if(e && c.stepIdx!=null){
          if(!e.completedSteps) e.completedSteps=[];
          if(e.completedSteps.indexOf(c.stepIdx)<0) e.completedSteps.push(c.stepIdx);
        }
      }catch(ex){}
    });
  }catch(e){}
}

// Enroll a deal in a cadence
async function enrollDealInCadence(dealId, cadenceId){
  var cadence=DEFAULT_CADENCES.find(function(c){return c.id===cadenceId;});
  if(!cadence) return;
  var enrollment={
    cadenceId: cadenceId,
    cadenceName: cadence.name,
    startDate: new Date().toISOString().slice(0,10),
    currentStep: 0,
    status: 'active',
    completedSteps: [],
    totalSteps: cadence.steps.length
  };
  _cadenceEnrollments[dealId]=enrollment;

  // Persist to Supabase
  var sb=_sb(); var opId=getOperatorId();
  if(sb && opId){
    await sb.from('deal_interactions').insert({
      deal_id: dealId,
      operator_id: opId,
      interaction_type: 'cadence_enrollment',
      content: JSON.stringify(enrollment)
    });
  }
  if(window.showSyncToast) window.showSyncToast('ok','Cadência "'+cadence.name+'" iniciada');
  return enrollment;
}

// Mark a step as done
async function completeCadenceStep(dealId, stepIdx){
  var enrollment=_cadenceEnrollments[dealId];
  if(!enrollment) return;
  if(!enrollment.completedSteps) enrollment.completedSteps=[];
  if(enrollment.completedSteps.indexOf(stepIdx)<0) enrollment.completedSteps.push(stepIdx);
  enrollment.currentStep=Math.max(enrollment.currentStep, stepIdx+1);

  // Check if cadence is complete
  var cadence=DEFAULT_CADENCES.find(function(c){return c.id===enrollment.cadenceId;});
  if(cadence && enrollment.completedSteps.length >= cadence.steps.length){
    enrollment.status='completed';
  }

  var sb=_sb(); var opId=getOperatorId();
  if(sb && opId){
    await sb.from('deal_interactions').insert({
      deal_id: dealId,
      operator_id: opId,
      interaction_type: 'cadence_step_done',
      content: JSON.stringify({ stepIdx:stepIdx, cadenceId:enrollment.cadenceId })
    });
  }
}

// Cancel enrollment
async function cancelCadenceEnrollment(dealId){
  if(!_cadenceEnrollments[dealId]) return;
  _cadenceEnrollments[dealId].status='cancelled';
  var sb=_sb(); var opId=getOperatorId();
  if(sb && opId){
    await sb.from('deal_interactions').insert({
      deal_id: dealId,
      operator_id: opId,
      interaction_type: 'cadence_enrollment',
      content: JSON.stringify(_cadenceEnrollments[dealId])
    });
  }
  delete _cadenceEnrollments[dealId];
  if(window.showSyncToast) window.showSyncToast('ok','Cadência cancelada');
}

// Get today's cadence tasks (integrates with Task Runner)
function getCadenceTasks(){
  var today=new Date().toISOString().slice(0,10);
  var tasks=[];
  Object.keys(_cadenceEnrollments).forEach(function(dealId){
    var enrollment=_cadenceEnrollments[dealId];
    if(enrollment.status!=='active') return;
    var cadence=DEFAULT_CADENCES.find(function(c){return c.id===enrollment.cadenceId;});
    if(!cadence) return;
    var startDate=new Date(enrollment.startDate);
    var todayDate=new Date(today);
    var daysSinceStart=Math.floor((todayDate-startDate)/(1000*60*60*24))+1;

    cadence.steps.forEach(function(step, idx){
      // Show step if: it's today's step (or overdue) AND not completed
      if(step.day<=daysSinceStart && (enrollment.completedSteps||[]).indexOf(idx)<0){
        var deal=(window._COCKPIT_DEAL_MAP||{})[dealId];
        if(!deal) return;
        var ch=CADENCE_CHANNELS[step.channel]||CADENCE_CHANNELS.tarefa;
        tasks.push({
          id: dealId,
          deal: deal,
          taskType: 'cadence',
          label: ch.label+': '+step.action,
          priority: step.day<daysSinceStart?'critical':'high',
          sortPriority: step.day<daysSinceStart?0:1,
          urgency: step.day<daysSinceStart?90:60,
          cadenceStep: idx,
          cadenceId: enrollment.cadenceId,
          cadenceName: cadence.name,
          stepChannel: step.channel,
          stepAction: step.action,
          stepDay: step.day,
          daysSinceStart: daysSinceStart
        });
      }
    });
  });
  return tasks;
}
window.getCadenceTasks = getCadenceTasks;

// Inject cadence tasks into buildTaskQueue
var _origBuildTaskQueue = buildTaskQueue;
buildTaskQueue = function(filterType){
  var tasks = _origBuildTaskQueue(filterType);
  // Add cadence tasks
  var cadTasks = getCadenceTasks();
  if(filterType && filterType!=='cadence') return tasks; // non-cadence filter active
  cadTasks.forEach(function(ct){ tasks.push(ct); });
  // Re-sort by priority
  tasks.sort(function(a,b){
    if(a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
    return (b.urgency||0) - (a.urgency||0);
  });
  return tasks;
};
window.buildTaskQueue = buildTaskQueue;

// Render cadence enrollment modal for a deal
function renderCadenceModal(dealId){
  var deal=(window._COCKPIT_DEAL_MAP||{})[dealId];
  if(!deal) return;
  var enrollment=_cadenceEnrollments[dealId];
  var escH=window.escHtml||_escHtml;

  var html='<div class="cad-modal-overlay" id="cad-modal" onclick="if(event.target===this)this.remove()">';
  html+='<div class="cad-modal">';
  html+='<div class="cad-modal-header">';
  html+='<span class="cad-modal-title">Cadências — '+escH(deal.nome||'Lead')+'</span>';
  html+='<button class="tex-close" onclick="document.getElementById(\'cad-modal\').remove()">✕</button>';
  html+='</div>';

  if(enrollment && enrollment.status==='active'){
    // Show current enrollment progress
    var cadence=DEFAULT_CADENCES.find(function(c){return c.id===enrollment.cadenceId;});
    if(cadence){
      html+='<div class="cad-active">';
      html+='<div class="cad-active-name">'+escH(cadence.name)+'</div>';
      html+='<div class="cad-active-progress">'+((enrollment.completedSteps||[]).length)+' de '+cadence.steps.length+' steps concluídos</div>';
      html+='<div class="cad-progress-bar"><div class="cad-progress-fill" style="width:'+Math.round((enrollment.completedSteps||[]).length/cadence.steps.length*100)+'%"></div></div>';
      html+='<div class="cad-steps">';
      cadence.steps.forEach(function(step,idx){
        var done=(enrollment.completedSteps||[]).indexOf(idx)>=0;
        var ch=CADENCE_CHANNELS[step.channel]||CADENCE_CHANNELS.tarefa;
        var startDate=new Date(enrollment.startDate);
        var stepDate=new Date(startDate.getTime()+(step.day-1)*86400000);
        var dateStr=stepDate.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
        html+='<div class="cad-step'+(done?' done':'')+'" onclick="'+(done?'':'window.cadCompleteStep(\''+dealId+'\','+idx+')')+'">';
        html+='<span class="cad-step-check">'+(done?'✅':'⬜')+'</span>';
        html+='<span class="cad-step-day">D'+step.day+' ('+dateStr+')</span>';
        html+='<span class="cad-step-ch" style="color:var(--'+ch.color+')">'+ch.icon+' '+ch.label+'</span>';
        html+='<span class="cad-step-action">'+escH(step.action)+'</span>';
        html+='</div>';
      });
      html+='</div>';
      html+='<button class="tex-act tex-act-skip" style="margin-top:12px;width:100%" onclick="window.cadCancel(\''+dealId+'\');document.getElementById(\'cad-modal\').remove()">Cancelar cadência</button>';
      html+='</div>';
    }
  } else {
    // Show cadence picker
    html+='<div class="cad-picker-label">Escolha uma cadência para iniciar:</div>';
    html+='<div class="cad-picker">';
    DEFAULT_CADENCES.forEach(function(c){
      var matchesTier=c.tier==='any'||(deal.tier&&c.tier.indexOf((deal.tier||'').toLowerCase())>=0);
      var matchesPersona=c.persona==='any'||(deal._persona&&c.persona===deal._persona);
      var recommended=matchesTier&&matchesPersona;
      html+='<div class="cad-option'+(recommended?' recommended':'')+'" onclick="window.cadEnroll(\''+dealId+'\',\''+c.id+'\');document.getElementById(\'cad-modal\').remove()">';
      html+='<div class="cad-option-name">'+escH(c.name)+(recommended?' <span class="cad-rec-badge">RECOMENDADA</span>':'')+'</div>';
      html+='<div class="cad-option-meta">'+c.steps.length+' steps · '+c.totalDays+' dias</div>';
      html+='<div class="cad-option-steps">';
      c.steps.forEach(function(s){
        var ch=CADENCE_CHANNELS[s.channel]||CADENCE_CHANNELS.tarefa;
        html+='<span class="cad-mini-step" style="color:var(--'+ch.color+')">D'+s.day+' '+ch.icon+'</span>';
      });
      html+='</div></div>';
    });
    html+='</div>';
  }
  html+='</div></div>';

  // Remove existing modal if any
  var old=document.getElementById('cad-modal');
  if(old) old.remove();
  document.body.insertAdjacentHTML('beforeend',html);
}
window.renderCadenceModal = renderCadenceModal;
window.cadEnroll = function(dealId,cadenceId){
  enrollDealInCadence(dealId,cadenceId).then(function(){
    if(window.renderTaskRunner) window.renderTaskRunner();
  });
};
window.cadCompleteStep = function(dealId,stepIdx){
  completeCadenceStep(dealId,stepIdx).then(function(){
    renderCadenceModal(dealId); // refresh modal
    if(window.renderTaskRunner) window.renderTaskRunner();
  });
};
window.cadCancel = function(dealId){
  cancelCadenceEnrollment(dealId).then(function(){
    if(window.renderTaskRunner) window.renderTaskRunner();
  });
};

// Add cadence type to TASK_TYPES
TASK_TYPES.cadence = { label:'Cadência', icon:'seq', color:'accent2' };

// Export cadence functions
window.loadCadenceEnrollments = loadCadenceEnrollments;
window.loadCadenceSteps = loadCadenceSteps;
window.enrollDealInCadence = enrollDealInCadence;
window.completeCadenceStep = completeCadenceStep;
window.cancelCadenceEnrollment = cancelCadenceEnrollment;

// Init cadences after operator loads
var _origBoot = window._bootEngine;

// ==================================================================
// LAYER 9 — RUNTIME SYNC
// Persiste enrichDealContext() em deal_runtime (Supabase)
// Regra V5: toda UI avançada lê de deal_runtime, não de deals
// ==================================================================

var STAGE_ORDER_MAP = {
  'novo lead':0,'dia 01':1,'dia 02':2,'dia 03':3,'dia 04':4,'dia 05':5,'dia 06':6,
  'conectados':7,'agendamento':8,'reagendamento':9,'entrevista agendada':10,
  'negociacao':11,'oportunidade':12,'ganho':13,'perdido':14
};

function _dealToRuntime(id, d, email){
  var etapa = (d.etapa||d._etapa||'').toLowerCase();
  var aging = d._aging || {};
  var nba = d._nextAction || {};
  return {
    deal_id: id,
    operator_email: email,
    current_stage: d.etapa || d._etapa || d.fase || null,
    current_stage_order: STAGE_ORDER_MAP[etapa] != null ? STAGE_ORDER_MAP[etapa] : 99,
    revenue_line: d._revLine || d.linhaReceita || null,
    channel: d.canal || d.utm_medium || null,
    persona: d._persona || null,
    framework_in_use: d._framework || null,
    aging_days: d._delta || d.delta || 0,
    aging_band: aging.riskLevel === 'critical' ? 'critical' : aging.isAtRisk ? 'red' : (d._delta||0) > 3 ? 'yellow' : 'green',
    risk_state: aging.riskLevel || 'none',
    signal_state: d._signal || 'NEUTRAL',
    temperature_score: d._temp || d.temp || 0,
    urgency_score: d._urgency || 0,
    value_score: d._oppValue || d.elucyValor || 0,
    priority_score: d._urgency || 0,
    touchpoint_state: null,
    fup_state: 'none',
    show_state: 'unknown',
    last_touch_at: d.last_interaction_at || null,
    last_touch_type: null,
    next_best_action: nba.type || null,
    nba_reason: nba.label || null,
    runtime_payload: JSON.stringify({
      oppBreakdown: d._oppBreakdown || null,
      timeline: d._timeline || null,
      tier: d.tier || d._tier || null,
      contact_name: d.contact_name || d.nome || null,
      empresa: d.empresa || null,
      statusDeal: d.statusDeal || null
    })
  };
}

async function syncDealRuntime(){
  var sb = _sb(); if(!sb) return;
  var email = getOperatorId(); if(!email) return;
  var map = window._COCKPIT_DEAL_MAP || {};
  var keys = Object.keys(map);
  if(!keys.length) return;

  var rows = [];
  keys.forEach(function(id){
    var d = map[id];
    enrichDealContext(d);
    rows.push(_dealToRuntime(id, d, email));
  });

  // Upsert in chunks of 50
  var CHUNK = 50;
  var synced = 0;
  for(var i = 0; i < rows.length; i += CHUNK){
    var chunk = rows.slice(i, i + CHUNK);
    try {
      var res = await sb.from('deal_runtime')
        .upsert(chunk, { onConflict: 'deal_id,operator_email' });
      if(res.error) console.warn('[runtime-sync] chunk error:', res.error.message);
      else synced += chunk.length;
    } catch(e){
      console.warn('[runtime-sync] chunk exception:', e.message);
    }
  }
  console.log('[runtime-sync] ' + synced + '/' + rows.length + ' deals synced to deal_runtime');
  return synced;
}

window.syncDealRuntime = syncDealRuntime;

// ==================================================================
// LAYER 10 — TAXONOMY LOADER (V5)
// Carrega taxonomy do Supabase, fallback para hardcoded
// ==================================================================

async function loadTaxonomy(){
  var sb = _sb(); if(!sb) return;
  try {
    // Revenue Lines
    var rl = await sb.from('taxonomy_revenue_lines').select('line_slug,line_label,base_metric,risk_after_days,line_weight').eq('is_active',true);
    if(rl.data && rl.data.length){
      rl.data.forEach(function(r){
        REVENUE_LINES[r.line_slug] = { label:r.line_label, base:r.base_metric, risk_after:r.risk_after_days, line_weight:r.line_weight };
      });
      console.log('[taxonomy] revenue_lines loaded: '+rl.data.length);
    }
    // Kill Switches
    var ks = await sb.from('kill_switches').select('switch_slug,is_enabled');
    if(ks.data && ks.data.length){
      ks.data.forEach(function(k){ KILL_SWITCHES[k.switch_slug] = k.is_enabled; });
      console.log('[taxonomy] kill_switches loaded: '+ks.data.length);
    }
    // Focus Modes
    var fm = await sb.from('focus_modes').select('mode_slug,mode_label,icon,priority_task_types').eq('is_active',true);
    if(fm.data && fm.data.length){
      fm.data.forEach(function(f){
        FOCUS_MODES[f.mode_slug] = { label:f.mode_label, icon:f.icon, priority:f.priority_task_types||[] };
      });
      console.log('[taxonomy] focus_modes loaded: '+fm.data.length);
    }
  } catch(e){ console.warn('[taxonomy] load error:', e.message); }
}
window.loadTaxonomy = loadTaxonomy;

// ==================================================================
// LAYER 11 — DM TOUCHPOINTS MIGRATION (V5)
// Usa social_dm_touchpoints em vez de deal_interactions para DMs
// ==================================================================

var _origSaveDMTouchpoint = window.saveDMTouchpoint || saveDMTouchpoint;
async function saveDMTouchpointV5(leadId, tpType, description, channel, framework){
  var sb = _sb(); if(!sb) return _origSaveDMTouchpoint(leadId, tpType, description);
  var opId = getOperatorId(); if(!opId) return;
  // Count existing touchpoints for this lead
  var countRes = await sb.from('social_dm_touchpoints').select('id', {count:'exact'}).eq('lead_id', leadId);
  var tpNumber = (countRes.count || 0) + 1;
  var res = await sb.from('social_dm_touchpoints').insert({
    lead_id: leadId,
    operator_email: opId,
    touchpoint_number: tpNumber,
    touchpoint_type: tpType || 'outbound_dm',
    channel: channel || 'instagram',
    direction: 'outbound',
    content_preview: (description||'').substring(0,200),
    copy_framework: framework || null
  });
  if(res.error) console.warn('[dm-tp] insert error:', res.error.message);
}
// Override global
if(typeof saveDMTouchpoint === 'function') saveDMTouchpoint = saveDMTouchpointV5;
window.saveDMTouchpoint = saveDMTouchpointV5;

// ==================================================================
// LAYER 12 — SNAPSHOT SCHEDULER (V5)
// Gera daily snapshot local e envia ao analytics_snapshots
// ==================================================================

async function syncDailySnapshot(){
  var sb = _sb(); if(!sb) return;
  var email = getOperatorId(); if(!email) return;
  var map = window._COCKPIT_DEAL_MAP || {};
  var keys = Object.keys(map);
  if(!keys.length) return;
  var today = new Date().toISOString().slice(0,10);
  var stats = { total:0, critical:0, high:0, medium:0, none:0,
    dome:0, hot:0, warm:0, neutral:0,
    sumAging:0, sumTemp:0, sumValue:0, sumUrgency:0, sumPriority:0 };
  keys.forEach(function(id){
    var d = map[id];
    if((d.statusDeal||'').toLowerCase()==='perdido'||(d.statusDeal||'').toLowerCase()==='ganho') return;
    enrichDealContext(d);
    stats.total++;
    var risk = (d._aging||{}).riskLevel||'none';
    if(risk==='critical') stats.critical++; else if(risk==='high') stats.high++;
    else if(risk==='medium') stats.medium++; else stats.none++;
    var sig = d._signal||'NEUTRAL';
    if(sig==='DOME') stats.dome++; else if(sig==='HOT') stats.hot++;
    else if(sig==='WARM') stats.warm++; else stats.neutral++;
    stats.sumAging += d._delta||0;
    stats.sumTemp += d._temp||0;
    stats.sumValue += d._oppValue||0;
    stats.sumUrgency += d._urgency||0;
    stats.sumPriority += d._urgency||0;
  });
  if(!stats.total) return;
  var row = {
    snapshot_date: today, period_type:'daily', operator_email:email,
    revenue_line:null, stage:null, channel:null,
    total_deals: stats.total,
    risk_critical:stats.critical, risk_high:stats.high, risk_medium:stats.medium, risk_none:stats.none,
    signal_dome:stats.dome, signal_hot:stats.hot, signal_warm:stats.warm, signal_neutral:stats.neutral,
    avg_aging_days: +(stats.sumAging/stats.total).toFixed(1),
    avg_temperature: +(stats.sumTemp/stats.total).toFixed(1),
    avg_value_score: +(stats.sumValue/stats.total).toFixed(2),
    avg_urgency: +(stats.sumUrgency/stats.total).toFixed(1),
    avg_priority: +(stats.sumPriority/stats.total).toFixed(1),
    pipeline_value: stats.sumValue,
    formula_version:'v5.0', source:'cockpit_engine'
  };
  var res = await sb.from('analytics_snapshots').upsert(row, {onConflict:'snapshot_date,period_type,operator_email,revenue_line,stage,channel'});
  if(res.error) console.warn('[snapshot] upsert error:', res.error.message);
  else console.log('[snapshot] daily snapshot synced for '+email);
}
window.syncDailySnapshot = syncDailySnapshot;

// ==================================================================
// LAYER 13 — V6 FORECAST CALCULATOR
// Qualitative Forecast Engine: combina quantitativo (stage/aging/velocity)
// com pesos qualitativos (show/note/authority/urgency/behavior/next_step)
// Gera forecast_score_adjusted, confidence, e explainability completa.
// Sync resultado para forecast_runtime + forecast_events no Supabase.
// ==================================================================

function calcForecastV6(deal){
  var etapa = (deal.etapa||deal._etapa||'').toLowerCase();
  var aging = deal._aging || calcAgingRisk(deal);
  var delta = deal._delta || deal.delta || 0;
  var revLine = deal._revLine || resolveRevenueLine(deal);
  var lc = REVENUE_LINES[revLine] || REVENUE_LINES.imersao;
  var ra = lc.risk_after;

  // --- QUANTITATIVE BASELINE ---
  var stage_prob = STAGE_PROB[etapa] || 0.10;
  var aging_factor = delta > ra*4 ? 0.40 : delta > ra*3 ? 0.55 : delta > ra*2 ? 0.70 : delta > ra ? 0.85 : 1.0;
  var velocity_factor = 1.0;
  if(deal._timeline){
    var tl = deal._timeline;
    if(tl.avgDaysPerStage < 2) velocity_factor = 1.15;
    else if(tl.avgDaysPerStage < 4) velocity_factor = 1.05;
    else if(tl.avgDaysPerStage > 10) velocity_factor = 0.80;
    else if(tl.avgDaysPerStage > 7) velocity_factor = 0.90;
  }
  var engagement_factor = 1.0;
  var tp = deal._touchpoints || 0;
  if(tp >= 5) engagement_factor = 1.15;
  else if(tp >= 3) engagement_factor = 1.05;
  else if(tp === 0) engagement_factor = 0.70;

  var quantitative_score = +(stage_prob * aging_factor * velocity_factor * engagement_factor).toFixed(4);

  // --- QUALITATIVE WEIGHTS (V6) ---
  // Each weight defaults to 1.0, adjusted by signals detected in meetings/notes/runtime
  var show_weight = 1.0;
  var note_weight = 1.0;
  var authority_weight = 1.0;
  var urgency_weight = 1.0;
  var behavior_weight = 1.0;
  var next_step_weight = 1.0;
  var no_show_penalty = 0;
  var positive_signals = [];
  var risk_signals = [];

  // Show weight: based on meeting attendance
  var showState = (deal._showState || deal.show_state || 'unknown').toLowerCase();
  if(showState === 'attended' || showState === 'completed'){
    show_weight = 1.20; positive_signals.push('Meeting attended');
  } else if(showState === 'no_show'){
    show_weight = 0.50; no_show_penalty = 0.15; risk_signals.push('No-show detected');
  } else if(showState === 'rescheduled'){
    show_weight = 0.85; risk_signals.push('Meeting rescheduled');
  }

  // Note weight: based on note_analysis quality/sentiment
  if(deal._noteAnalysis){
    var na = deal._noteAnalysis;
    if(na.quality_score >= 70){ note_weight = 1.20; positive_signals.push('High quality notes ('+na.quality_score+')'); }
    else if(na.quality_score >= 40) note_weight = 1.0;
    else if(na.quality_score > 0){ note_weight = 0.80; risk_signals.push('Low quality notes'); }
    if(na.sentiment === 'positive'){ note_weight *= 1.10; positive_signals.push('Positive sentiment'); }
    else if(na.sentiment === 'negative'){ note_weight *= 0.80; risk_signals.push('Negative sentiment'); }
    if(na.advancement_signal) positive_signals.push('Advancement signal detected');
    if(na.pain_detected) positive_signals.push('Pain confirmed');
  }

  // Authority weight: based on cargo/decision_maker
  var cargo = (deal.cargo || '').toLowerCase();
  if(cargo.includes('ceo') || cargo.includes('presidente') || cargo.includes('fundador') || cargo.includes('socio')){
    authority_weight = 1.25; positive_signals.push('C-Level authority');
    // Kill switch: CEO de MEI downgrade
    if((deal.faturamento||deal.porte||'').toLowerCase().includes('mei')){
      authority_weight = 0.70; risk_signals.push('CEO MEI authority downgrade');
    }
  } else if(cargo.includes('diretor') || cargo.includes('vp')){
    authority_weight = 1.15; positive_signals.push('Director-level authority');
  } else if(cargo.includes('gerente')){
    authority_weight = 0.95;
  } else if(cargo.includes('coordenador') || cargo.includes('analista')){
    authority_weight = 0.75; risk_signals.push('Low authority level');
  }

  // Urgency weight: based on aging + signal state
  var signal = deal._signal || 'NEUTRAL';
  if(signal === 'HOT'){ urgency_weight = 1.20; positive_signals.push('HOT signal'); }
  else if(signal === 'DOME'){ urgency_weight = 0.60; risk_signals.push('Iron Dome active'); }
  else if(signal === 'WARM') urgency_weight = 1.05;
  if(aging.riskLevel === 'critical'){ urgency_weight *= 0.70; risk_signals.push('Critical aging ('+delta+' days)'); }
  else if(aging.riskLevel === 'high'){ urgency_weight *= 0.85; risk_signals.push('High aging risk'); }

  // Behavior weight: event_skipped + touchpoint engagement
  var skipped = String(deal.event_skipped || deal.eventSkipped || '').toLowerCase() === 'true';
  if(!skipped){ behavior_weight = 1.10; positive_signals.push('No events skipped'); }
  else { behavior_weight = 0.85; risk_signals.push('Event skipped'); }
  if(tp >= 5) behavior_weight *= 1.10;
  else if(tp === 0){ behavior_weight *= 0.70; risk_signals.push('Zero touchpoints'); }

  // Next step weight: based on _nextAction clarity
  var nba = deal._nextAction || {};
  if(nba.priority === 'critical'){ next_step_weight = 0.80; risk_signals.push('Critical next action needed'); }
  else if(nba.type === 'handoff_prep'){ next_step_weight = 1.15; positive_signals.push('Ready for handoff'); }
  else if(nba.type === 'agendamento'){ next_step_weight = 1.10; positive_signals.push('Meeting scheduling phase'); }

  // Clamp weights to [0.3, 1.5]
  function clamp(v){ return Math.max(0.3, Math.min(1.5, v)); }
  show_weight = clamp(show_weight);
  note_weight = clamp(+note_weight.toFixed(4));
  authority_weight = clamp(authority_weight);
  urgency_weight = clamp(+urgency_weight.toFixed(4));
  behavior_weight = clamp(+behavior_weight.toFixed(4));
  next_step_weight = clamp(next_step_weight);
  no_show_penalty = Math.min(0.30, Math.max(0, no_show_penalty));

  // --- COMBINED SCORE ---
  var qualitative_weight = +(show_weight * note_weight * authority_weight * urgency_weight * behavior_weight * next_step_weight).toFixed(4);
  qualitative_weight = Math.max(0.10, Math.min(2.50, qualitative_weight));

  var forecast_score_raw = +quantitative_score.toFixed(4);
  var forecast_score_adjusted = +((forecast_score_raw * qualitative_weight) - no_show_penalty).toFixed(4);
  forecast_score_adjusted = Math.max(0, Math.min(1.0, forecast_score_adjusted));

  // --- CONFIDENCE ---
  var data_points = 0;
  if(deal._noteAnalysis) data_points += 2;
  if(showState !== 'unknown') data_points += 2;
  if(tp > 0) data_points += Math.min(3, tp);
  if(deal._timeline && deal._timeline.stagesVisited > 1) data_points += 1;
  if(cargo) data_points += 1;
  // confidence: 0-1 based on data richness
  var forecast_confidence = +(Math.min(1.0, data_points / 10)).toFixed(4);
  var confidence_level = forecast_confidence >= 0.7 ? 'high' : forecast_confidence >= 0.4 ? 'medium' : 'low';

  // --- FORECAST VALUE ---
  var tier = (deal.tier || deal._tier || '').toLowerCase();
  var ticket = TIER_BASE[tier] || 6000;
  var forecast_value = Math.round(ticket * forecast_score_adjusted);

  // --- REASON ---
  var reason_main = '';
  var reason_secondary = '';
  if(forecast_score_adjusted >= 0.60) reason_main = 'Deal com alta probabilidade — sinais qualitativos fortes';
  else if(forecast_score_adjusted >= 0.35) reason_main = 'Deal em zona de trabalho — qualificacao em andamento';
  else if(forecast_score_adjusted >= 0.15) reason_main = 'Deal com risco — sinais fracos ou aging alto';
  else reason_main = 'Deal com baixa probabilidade — considerar reativacao ou loss';
  if(risk_signals.length) reason_secondary = 'Riscos: ' + risk_signals.slice(0,3).join(', ');
  else if(positive_signals.length) reason_secondary = 'Destaques: ' + positive_signals.slice(0,3).join(', ');

  // --- NEXT ACTION DERIVED ---
  var next_action = nba.type || 'follow_up';
  var next_action_reason = nba.label || '';
  if(forecast_score_adjusted < 0.10 && confidence_level !== 'low'){
    next_action = 'forecast_repair'; next_action_reason = 'Forecast muito baixo com confianca '+confidence_level+' — revisar deal';
  }

  return {
    stage_probability_v6: stage_prob,
    quantitative_score: quantitative_score,
    qualitative_weight: qualitative_weight,
    show_weight: show_weight,
    note_weight: note_weight,
    authority_weight: authority_weight,
    urgency_weight: urgency_weight,
    no_show_penalty: no_show_penalty,
    behavior_weight: behavior_weight,
    next_step_weight: next_step_weight,
    forecast_score_raw: forecast_score_raw,
    forecast_score_adjusted: forecast_score_adjusted,
    forecast_confidence: forecast_confidence,
    confidence_level: confidence_level,
    forecast_value: forecast_value,
    reason_main: reason_main,
    reason_secondary: reason_secondary,
    positive_signals: positive_signals,
    risk_signals: risk_signals,
    next_action: next_action,
    next_action_reason: next_action_reason,
    explain_json: {
      quantitative: { stage_prob:stage_prob, aging_factor:aging_factor, velocity_factor:velocity_factor, engagement_factor:engagement_factor },
      qualitative: { show_weight:show_weight, note_weight:note_weight, authority_weight:authority_weight, urgency_weight:urgency_weight, behavior_weight:behavior_weight, next_step_weight:next_step_weight },
      no_show_penalty: no_show_penalty,
      data_points: data_points,
      signals: { positive:positive_signals, risk:risk_signals }
    }
  };
}
window.calcForecastV6 = calcForecastV6;

// Attach forecast to enrichDealContext
var _origEnrichDealContext = enrichDealContext;
function enrichDealContextV6(deal){
  _origEnrichDealContext(deal);
  if(!deal._forecastV6) deal._forecastV6 = calcForecastV6(deal);
  return deal;
}
window.enrichDealContext = enrichDealContextV6;

// Sync forecast_runtime for all active deals
async function syncForecastRuntime(){
  var sb = _sb(); if(!sb) return;
  var email = getOperatorId(); if(!email) return;
  var map = window._COCKPIT_DEAL_MAP || {};
  var keys = Object.keys(map);
  if(!keys.length) return;

  var rows = [];
  var events = [];
  keys.forEach(function(id){
    var d = map[id];
    if((d.statusDeal||'').toLowerCase()==='perdido'||(d.statusDeal||'').toLowerCase()==='ganho') return;
    enrichDealContextV6(d);
    var f = d._forecastV6; if(!f) return;

    rows.push({
      deal_id: id,
      operator_email: email,
      stage_probability: f.stage_probability_v6,
      aging_factor: f.explain_json.quantitative.aging_factor,
      velocity_factor: f.explain_json.quantitative.velocity_factor,
      engagement_factor: f.explain_json.quantitative.engagement_factor,
      quantitative_score: f.quantitative_score,
      qualitative_score: f.qualitative_weight,
      raw_score: f.forecast_score_raw,
      adjusted_score: f.forecast_score_adjusted,
      confidence_level: f.confidence_level,
      data_points_count: f.explain_json.data_points,
      predicted_outcome: f.forecast_score_adjusted >= 0.50 ? 'likely_win' : f.forecast_score_adjusted >= 0.25 ? 'working' : 'at_risk',
      predicted_value: f.forecast_value,
      formula_version: 'v6.0',
      // V6 columns
      forecast_version: 'v6',
      stage_probability_v6: f.stage_probability_v6,
      qualitative_weight: f.qualitative_weight,
      show_weight: f.show_weight,
      note_weight: f.note_weight,
      authority_weight: f.authority_weight,
      urgency_weight: f.urgency_weight,
      no_show_penalty: f.no_show_penalty,
      behavior_weight: f.behavior_weight,
      next_step_weight: f.next_step_weight,
      forecast_score_raw: f.forecast_score_raw,
      forecast_score_adjusted: f.forecast_score_adjusted,
      forecast_confidence: f.forecast_confidence,
      forecast_value: f.forecast_value,
      reason_main: f.reason_main,
      reason_secondary: f.reason_secondary,
      positive_signals: JSON.stringify(f.positive_signals),
      risk_signals: JSON.stringify(f.risk_signals),
      next_action: f.next_action,
      next_action_reason: f.next_action_reason,
      explain_json: JSON.stringify(f.explain_json),
      updated_at: new Date().toISOString()
    });

    // Forecast event for audit trail
    events.push({
      deal_id: id,
      event_type: 'forecast_calc',
      source_entity: 'cockpit_engine',
      source_id: email,
      delta_forecast: f.forecast_score_adjusted,
      reason: f.reason_main,
      payload: JSON.stringify({ adjusted:f.forecast_score_adjusted, confidence:f.forecast_confidence, version:'v6' })
    });
  });

  // Upsert forecast_runtime in chunks
  var CHUNK = 50;
  var synced = 0;
  for(var i = 0; i < rows.length; i += CHUNK){
    var chunk = rows.slice(i, i + CHUNK);
    try {
      var res = await sb.from('forecast_runtime').upsert(chunk, { onConflict:'deal_id,operator_email' });
      if(res.error) console.warn('[forecast-sync] chunk error:', res.error.message);
      else synced += chunk.length;
    } catch(e){ console.warn('[forecast-sync] exception:', e.message); }
  }

  // Insert forecast_events (audit — no upsert, always append)
  if(events.length){
    for(var j = 0; j < events.length; j += CHUNK){
      var evChunk = events.slice(j, j + CHUNK);
      try {
        await sb.from('forecast_events').insert(evChunk);
      } catch(e){ console.warn('[forecast-events] insert error:', e.message); }
    }
  }

  console.log('[forecast-sync] ' + synced + '/' + rows.length + ' deals forecast synced (v6)');
  return synced;
}
window.syncForecastRuntime = syncForecastRuntime;

console.log('[cockpit-engine v6.0] 13-Layer Architecture loaded — V6 Forecast Engine');

})();
