// ==================================================================
// ELUCY COCKPIT ENGINE v9.1 — 18-Layer Architecture
// 1. Operator Context | 2. Taxonomy Core | 3. Runtime Deal Context
// 4. Task Execution | 5. Analytics | 6. UI State | 7. Product Intelligence
// 8. Cadence Engine | 9. Runtime Sync | 10. Taxonomy Loader
// 11. DM Touchpoints | 12. Snapshot Scheduler | 13. V7 Forecast Calculator
// 14. Operator Performance Model | 15. Performance Report V3
// 16. Framework Extractor Engine | 17. Framework UI
// 18. Signal Engine (V8) — detect, score, persist, route to tasks + UI
// Incluir APOS cockpit.html carregar (antes do </body>)
// ==================================================================

(function(){
'use strict';

// == HELPERS =======================================================
function _sb(){ return window.getSB ? window.getSB() : null; }
function _escHtml(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _today(){ return new Date().toISOString().slice(0,10); }
function _now(){ return new Date().toISOString(); }

// UX Writer — normaliza nomes canônicos para exibição visual
// Remove prefixos técnicos [IM], [ON], [SKL], [EV] das linhas de receita
function _fmtLinha(linha){
  if(!linha) return '—';
  return linha.replace(/^\[[\w]+\]\s*/,'').trim();
}
// Returns HTML span with title showing original prefix (e.g. [IM] = Imersão Presencial)
var _PREFIX_LABELS={'IM':'Imersão Presencial','ON':'Online','RF':'Reforma','ED':'Educação','FD':'Field','CS':'Customer Success'};
function _fmtLinhaHtml(linha){
  if(!linha) return '<span>—</span>';
  var m=linha.match(/^\[([\w]+)\]\s*/);
  var label=linha.replace(/^\[[\w]+\]\s*/,'').trim();
  var title=m?(_PREFIX_LABELS[m[1].toUpperCase()]||m[1])+': '+label:label;
  return '<span title="'+_escHtml(title)+'">'+_escHtml(label)+'</span>';
}
// Encurta etapa operacional para chips/badges (valor real preservado em data-val)
function _fmtEtapa(etapa){
  if(!etapa) return '—';
  var map={'Dia 01':'D1','Dia 02':'D2','Dia 03':'D3','Dia 04':'D4','Dia 05':'D5',
    'Entrevista Agendada':'Entrevista','Reagendamento':'Reagend.',
    'Nova Oportunidade':'Nova Oport.','Conectados':'Conect.',
    'Novo Lead':'Novo Lead','Agendamento':'Agend.'};
  return map[etapa]||etapa;
}
// Canal de origem (canal_de_marketing) normalizado para UI
function _fmtOrigem(canalMkt, utm){
  var c=(canalMkt||'').toLowerCase();
  if(c.includes('instagram')||c.includes('ig')||c.includes('social dm')) return 'Instagram';
  if(c.includes('whatsapp')||c.includes('whats')) return 'WhatsApp';
  if(c.includes('field')||c.includes('outbound')||c.includes('ligação')) return 'Ligação';
  if(c.includes('email')||c.includes('e-mail')) return 'E-mail';
  if(c.includes('google')||c.includes('cpc')) return 'Google Ads';
  if(c.includes('meta')||c.includes('facebook')) return 'Meta Ads';
  if(c.includes('evento')) return 'Evento';
  if(c.includes('indicação')||c.includes('indicacao')) return 'Indicação';
  if(c.includes('organic')||c.includes('orgân')) return 'Orgânico';
  // fallback utm_medium
  var u=(utm||'').toLowerCase();
  if(u==='tallis'||u==='nardon'||u==='alfredo') return 'Instagram (DM)';
  if(u.includes('social')) return 'Instagram';
  if(u.includes('whats')) return 'WhatsApp';
  if(u==='cpc'||u.includes('google')) return 'Google Ads';
  return canalMkt||utm||'Direto';
}

// ==================================================================
// LAYER 1 — OPERATOR CONTEXT
// Define o contexto base da sessao. Toda tela usa como chave primaria.
// ==================================================================

const _operatorCtx = {
  email: '',
  qualificador_name: '',
  role: 'sdr',
  meta_mensal: { fups:300, qualificacoes:100, handoffs:40, opp:15 },
  meta_diaria: { fups:15, qualificacoes:5, handoffs:2, opp:1 },
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
  _operatorCtx.meta_diaria.opp=Math.ceil((_operatorCtx.meta_mensal.opp||15)/22);
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
    _operatorCtx.meta_diaria.opp=Math.ceil((_operatorCtx.meta_mensal.opp||15)/22);
    // Persist goal history
    var pk=new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
    sb.from('operator_goals').upsert({
      operator_email:email, period_key:pk,
      fups:_operatorCtx.meta_mensal.fups, qualificacoes:_operatorCtx.meta_mensal.qualificacoes,
      handoffs:_operatorCtx.meta_mensal.handoffs, opp:_operatorCtx.meta_mensal.opp||15,
      updated_at:new Date().toISOString()
    },{onConflict:'operator_email,period_key'}).then(function(){});
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

// Revenue Lines — grupos canônicos reais do G4
// Fonte: production.diamond.funil_comercial.grupo_de_receita (76 linhas → 10 grupos)
var REVENUE_LINES = {
  funil_marketing:  { label:'Funil de Marketing',        base:'qualified',   risk_after:3, line_weight:1.0  },
  turmas:           { label:'Turmas',                    base:'qualified',   risk_after:4, line_weight:1.0  },
  projetos_eventos: { label:'Projetos & Eventos',        base:'qualified',   risk_after:5, line_weight:0.9  },
  social_dm:        { label:'Social DM',                 base:'touchpoints', risk_after:1, line_weight:0.75 },
  social_dm_k:      { label:'Social DM K',               base:'touchpoints', risk_after:1, line_weight:0.70 },
  selfcheckout:     { label:'Self Checkout',             base:'leads',       risk_after:1, line_weight:0.5  },
  reativacao:       { label:'Reativação',                base:'leads',       risk_after:2, line_weight:0.6  },
  expansao:         { label:'Expansão (Farmer/CS Corp)', base:'opportunity', risk_after:7, line_weight:0.9  },
  renovacao:        { label:'Renovação',                 base:'opportunity', risk_after:5, line_weight:0.85 },
  field_sales:      { label:'Field Sales',               base:'meetings',    risk_after:7, line_weight:0.9  },
  aquisicao:        { label:'Time de Vendas - Aquisição',base:'qualified',   risk_after:3, line_weight:1.0  },
  nao_definido:     { label:'Não Definido',              base:'leads',       risk_after:3, line_weight:0.6  }
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

// resolveRevenueLine — mapeia deal para grupo_de_receita canônico do G4
// REGRA 1: se grupo_de_receita vier preenchido do Databricks → usar direto (fonte da verdade)
// REGRA 2: fallback por linha_de_receita_vigente e utm_medium para casos sem grupo
function resolveRevenueLine(deal){
  var lr=(deal.linhaReceita||deal.linha_de_receita_vigente||'').toLowerCase().trim();
  var gr=(deal.grupo_de_receita||deal.grupoReceita||'').toLowerCase().trim();
  var utm=(deal.utm_medium||'').toLowerCase().trim();

  // REGRA 1 — grupo_de_receita direto do Databricks (fonte da verdade)
  if(gr==='funil de marketing')          return 'funil_marketing';
  if(gr==='turmas')                      return 'turmas';
  if(gr==='projetos e eventos')          return 'projetos_eventos';
  if(gr==='selfcheckout')                return 'selfcheckout';
  if(gr==='expansão'||gr==='expansao')   return 'expansao';
  if(gr==='renovação'||gr==='renovacao') return 'renovacao';
  if(gr==='time de vendas - field sales') return 'field_sales';
  if(gr==='time de vendas - aquisição'||gr==='time de vendas - aquisicao') return 'aquisicao';
  if(gr==='não definido'||gr==='nao definido') return 'nao_definido';

  // REGRA 2 — fallback por linha_de_receita_vigente (quando grupo vazio)
  if(lr.includes('[im] social dm')||lr.includes('social dm - perfil k')) {
    return lr.includes('perfil k') ? 'social_dm_k' : 'social_dm';
  }
  if(utm==='tallis'||utm==='nardon'||utm==='alfredo') return 'social_dm';
  if(lr.includes('[im] social'))  return 'social_dm';
  if(lr.includes('reativ'))       return 'aquisicao'; // reativação = time de vendas
  if(lr.includes('abandono')||lr.includes('[on] selfcheckout')||lr.includes('[on] outros')) return 'selfcheckout';
  if(lr.includes('[fs]'))         return 'field_sales';
  if(lr.includes('[skl]'))        return 'nao_definido';
  if(lr.includes('[on]'))         return 'turmas'; // produtos online = turmas
  if(lr.includes('[cm]'))         return 'funil_marketing';
  if(lr.includes('farmer')||lr.includes('cs corporativo')) return 'expansao';
  if(lr.includes('renovaç')||lr.includes('renovac')) return 'renovacao';
  if(lr.includes('gestão e estratégia')||lr.includes('gestao e estrategia')) return 'turmas';
  if(lr.includes('g4 traction')||lr.includes('g4 sales')||lr.includes('g4 frontier')||lr.includes('g4 scale')) return 'turmas';
  if(lr.includes('g4 club')) return 'renovacao';
  if(lr.includes('parceria')||lr.includes('patrocín')||lr.includes('indica')) return 'projetos_eventos';
  if(lr.includes('scale experience')||lr.includes('g4 pelo brasil')||lr.includes('g4 alumni')||lr.includes('g4 valley')) return 'projetos_eventos';

  // Fallback final — nao_definido
  // funil_marketing NÃO é fallback — é um grupo real com leads vindos de campanhas pagas
  // Se o grupo não veio preenchido do Databricks, não assumir que é Funil de Marketing
  return 'nao_definido';
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
  // Enterprise Value (L23)
  if(!deal._enterprise && typeof calcEnterpriseValueV23 === 'function') deal._enterprise = calcEnterpriseValueV23(deal);
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
  dvl_review:      { label:'DVL Review',       icon:'check',  color:'accent' },
  framework_gap_fill:{ label:'Framework Gap',  icon:'target', color:'yellow' },
  authority_confirmation:{ label:'Authority Check', icon:'user', color:'accent' },
  pain_quantification:{ label:'Pain Quantify', icon:'alert',  color:'red' },
  advisor_coaching:   { label:'Advisor Coach',  icon:'user',   color:'yellow' },
  enterprise_review:  { label:'Enterprise 5M+', icon:'target', color:'green' }
};
window.TASK_TYPES = TASK_TYPES;

function buildTaskQueue(filterType, filterRevLine){
  var map = window._COCKPIT_DEAL_MAP||{};
  var tasks = [];
  var focusMode = _operatorCtx.focus_mode||'velocidade';
  var priorityOrder = (FOCUS_MODES[focusMode]||FOCUS_MODES.velocidade).priority;

  Object.keys(map).forEach(function(id){
    var d = map[id];
    if((d.statusDeal||'').toLowerCase()==='perdido'||(d.statusDeal||'').toLowerCase()==='ganho') return;
    enrichDealContext(d);

    // Revenue line filter
    if(filterRevLine){
      var rl = d._revLine || resolveRevenueLine(d);
      if(rl !== filterRevLine) return;
    }

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

// V10: Task Execution Score — mede qualidade de execução de tasks pelo operador
function calcTaskExecutionScore(){
  var map = window._COCKPIT_DEAL_MAP || {};
  var totalTasks = 0, completedTasks = 0, skippedTasks = 0, onTimeTasks = 0, qualityCompleted = 0;
  Object.keys(map).forEach(function(id){
    var d = map[id];
    if(!d._taskHistory) return;
    var history = d._taskHistory;
    if(!Array.isArray(history)) return;
    history.forEach(function(t){
      totalTasks++;
      if(t.status === 'completed') completedTasks++;
      if(t.status === 'skipped') skippedTasks++;
      if(t.completed_on_time) onTimeTasks++;
      if(t.status === 'completed' && t.quality_ok !== false) qualityCompleted++;
    });
  });
  if(totalTasks === 0) return { score: 0.50, completion_rate: 0, on_time_rate: 0, quality_rate: 0, skip_rate: 0 };
  var completion_rate = completedTasks / totalTasks;
  var on_time_rate = completedTasks > 0 ? onTimeTasks / completedTasks : 0;
  var quality_rate = completedTasks > 0 ? qualityCompleted / completedTasks : 0;
  var low_skip_rate = 1 - (skippedTasks / totalTasks);
  var timer_adherence = on_time_rate; // proxy
  var score = +(
    completion_rate * 0.30 +
    on_time_rate * 0.20 +
    quality_rate * 0.25 +
    low_skip_rate * 0.15 +
    timer_adherence * 0.10
  ).toFixed(4);
  return { score: score, completion_rate: +completion_rate.toFixed(4), on_time_rate: +on_time_rate.toFixed(4), quality_rate: +quality_rate.toFixed(4), skip_rate: +(skippedTasks/totalTasks).toFixed(4) };
}
window.calcTaskExecutionScore = calcTaskExecutionScore;

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

  // Stats — by revenue line
  var byRevLine = {};
  tasks.forEach(function(t){
    var rl = t.deal._revLine || resolveRevenueLine(t.deal);
    byRevLine[rl] = (byRevLine[rl]||0)+1;
  });
  var rlKeys = Object.keys(byRevLine).sort(function(a,b){ return (byRevLine[b]||0)-(byRevLine[a]||0); });
  if(rlKeys.length > 1){
    statsHtml += '<div class="task-rl-bar">';
    statsHtml += '<span class="task-rl-label">Linha:</span>';
    statsHtml += '<span class="task-rl-chip on" data-revline="all" onclick="window._filterTaskRevLine(null,this)">Todas</span>';
    rlKeys.forEach(function(rl){
      var rlCfg = REVENUE_LINES[rl]||{label:rl};
      statsHtml += '<span class="task-rl-chip" data-revline="'+_escHtml(rl)+'" onclick="window._filterTaskRevLine(\''+_escHtml(rl).replace(/'/g,"\\'")+'\',this)">'+_escHtml(rlCfg.label)+' <b>'+byRevLine[rl]+'</b></span>';
    });
    statsHtml += '</div>';
  }

  // ── Recomendação de Focus Mode baseada na composição dos deals ──────
  (function(){
    var allDeals = window._COCKPIT_DEAL_MAP ? Object.values(window._COCKPIT_DEAL_MAP) : [];
    if(!allDeals.length) return;
    var active = allDeals.filter(function(d){ var s=(d.statusDeal||'').toLowerCase(); return s!=='perdido'&&s!=='ganho'&&s!=='desqualificado'; });
    // Contagens por critério
    var hotDeals = active.filter(function(d){ return d.tc==='th'; }).length;
    var slaRisk  = active.filter(function(d){ return (d._urgency||0)>=60; }).length;
    var handoffReady = active.filter(function(d){ var f=d.fase||d.fase_atual_no_processo||''; return f.toLowerCase().includes('oportunidade')||f.toLowerCase().includes('handoff'); }).length;
    var dmPending = active.filter(function(d){ var e=d.etapa||d.etapa_atual_no_pipeline||''; return e.toLowerCase().includes('social')||e.toLowerCase().includes('dm'); }).length;
    var coldDeals = active.filter(function(d){ return d.tc==='tc'&&(d.delta||0)>7; }).length;
    // Determinar modo recomendado
    var recMode = 'qualificacao';
    var recLabel = 'Qualificação';
    var recReason = 'Modos de equilíbrio — pipeline sem sinal dominante.';
    var recColor = 'var(--accent2)';
    if(slaRisk >= 3){ recMode='velocidade'; recLabel='Velocidade'; recReason=slaRisk+' deals com SLA em risco — priorize contato imediato.'; recColor='var(--red)'; }
    else if(hotDeals >= 5){ recMode='alta_performance'; recLabel='Alta Performance'; recReason=hotDeals+' deals quentes ativos — máxima conversão agora.'; recColor='var(--green)'; }
    else if(handoffReady >= 3){ recMode='handoff'; recLabel='Handoff'; recReason=handoffReady+' deals prontos para passagem ao Closer.'; recColor='var(--gold)'; }
    else if(dmPending >= 4){ recMode='social_dm'; recLabel='Social DM'; recReason=dmPending+' deals em canais digitais aguardando touchpoint.'; recColor='var(--clay)'; }
    else if(coldDeals >= 6){ recMode='reativacao'; recLabel='Reativação'; recReason=coldDeals+' deals frios (>7d) — reative antes de perder.'; recColor='var(--yellow)'; }
    statsHtml += '<div class="task-rec-banner" style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;margin-bottom:10px;display:flex;align-items:center;gap:10px">'
      + '<span style="font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.6px;font-weight:700;white-space:nowrap">Modo recomendado</span>'
      + '<span style="font-size:12px;font-weight:700;color:'+recColor+'">'+recLabel+'</span>'
      + '<span style="font-size:11px;color:var(--text2);flex:1">'+recReason+'</span>'
      + '</div>';
  })();

  // Task cards
  var cardsHtml = tasks.map(function(t,idx){
    var d = t.deal;
    var cfg = TASK_TYPES[t.taskType]||TASK_TYPES.follow_up;
    var dealStage = d.etapa || d._etapa || d.fase || 'Outro';
    var agingLabel = t.aging && t.aging.isAtRisk ? '<span class="task-aging task-aging-'+t.aging.riskLevel+'">'+t.aging.riskLabel+'</span>' : '';
    var cadBadge = t.cadence ? '<span class="task-cad-badge" title="'+_escHtml(t.cadence.templateName)+'">⚡ '+_escHtml(t.cadence.templateName)+' ('+(t.cadence.stepIndex+1)+'/'+t.cadence.totalSteps+')</span>' : '';
    var dealRevLine = d._revLine || resolveRevenueLine(d);
    return '<div class="task-card'+(t.cadence?' task-card-cad':'')+'" data-task-idx="'+idx+'" data-stage="'+_escHtml(dealStage)+'" data-revline="'+_escHtml(dealRevLine)+'" onclick="window.texOpen('+idx+')">'
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

// Filter tasks by revenue line (client-side show/hide)
window._filterTaskRevLine = function(revLine, el){
  document.querySelectorAll('.task-rl-chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');
  // Also respect active stage filter
  var activeStage = null;
  var stageEl = document.querySelector('.task-stage-chip.on');
  if(stageEl && stageEl.dataset.stage !== 'all') activeStage = stageEl.dataset.stage;

  document.querySelectorAll('.task-card').forEach(function(card){
    var stageMatch = !activeStage || card.dataset.stage === activeStage;
    var rlMatch = !revLine || card.dataset.revline === revLine;
    card.style.display = (stageMatch && rlMatch) ? '' : 'none';
  });
};

// Patch _filterTaskStage to also respect active revenue line filter
var _origFilterTaskStage = window._filterTaskStage;
window._filterTaskStage = function(stage, el){
  document.querySelectorAll('.task-stage-chip').forEach(function(c){ c.classList.remove('on'); });
  if(el) el.classList.add('on');
  var activeRevLine = null;
  var rlEl = document.querySelector('.task-rl-chip.on');
  if(rlEl && rlEl.dataset.revline !== 'all') activeRevLine = rlEl.dataset.revline;

  document.querySelectorAll('.task-card').forEach(function(card){
    var stageMatch = !stage || card.dataset.stage === stage;
    var rlMatch = !activeRevLine || card.dataset.revline === activeRevLine;
    card.style.display = (stageMatch && rlMatch) ? '' : 'none';
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

// Helper: build the deal card HTML — V9 Hierarchy (above-the-fold canonical)
// Bloco 1: Identidade | Bloco 2: Estado | Bloco 3: Prioridade | Bloco 4: Ação | Info-grid colapsado
function _texBuildDealCard(id, d){
  if(!d) return '<div class="task-empty">Deal não encontrado</div>';
  var fmtBRL = window.fmtBRL || function(v){return v?'R$ '+Number(v).toLocaleString('pt-BR'):'—';};
  var barClass=d.tc==='th'?'bf-h':d.tc==='tw'?'bf-w':'bf-c';
  var tgvClass=d.tc==='th'?'tgv-h':d.tc==='tw'?'tgv-w':'tgv-c';
  var tempSub=d.tc==='th'?'Quente — ação imediata':d.tc==='tw'?'Morno — reengajamento':'Frio — risco de perda';
  var buildRecom = window.buildRecomText || function(){return '';};
  var escHtml = window.escHtml || _escHtml;

  // SLA badge color
  var slaCls = d._timeline&&(d._timeline.slaStatus==='overdue'||d._timeline.slaStatus==='critical')?'t-risk':d._timeline&&d._timeline.slaStatus==='at_risk'?'t-stall':'t-gray';
  var slaLabel = d._timeline?d._timeline.slaLabel:'SLA —';

  // Aging badge color
  var agingCls = d._aging&&d._aging.band==='critical'?'t-risk':d._aging&&d._aging.band==='aging'?'t-stall':'t-gray';
  var agingDays = (d.delta||0)+'d';

  // Signal badge
  var signalBadge = d._signal==='BUY'?'<span class="tag t-buy">BUY</span>'
    :d._signal==='RISK'?'<span class="tag t-risk">RISK</span>'
    :d._signal==='STALL'?'<span class="tag t-stall">STALL</span>'
    :d._signal==='CHAMP'?'<span class="tag t-champ">CHAMP</span>'
    :d._signal==='DOME'?'<span class="tag t-stall">IRON DOME</span>':'';

  // Forecast
  var fcScore = d._forecastV6&&d._forecastV6.score!=null?Math.round(d._forecastV6.score*100)+'%':(d._timeline?Math.round((d._timeline.adjustedProbability||0)*100)+'%':'—');
  var fcConf  = d._forecastV6&&d._forecastV6.confidence!=null?'Conf. '+Math.round(d._forecastV6.confidence*100)+'%':'';

  return '<div class="card">'
    // ── BLOCO 1: Identidade ──────────────────────────────────────────
    + '<div class="dch">'
    + '<div class="dca">'+((d.emailLead||d.nome||'?')[0]).toUpperCase()+'</div>'
    + '<div class="dci">'
    + '<div class="dcn">'+escHtml(d.nome||'Lead')+'</div>'
    + '<div class="dcs">'+escHtml(d.cargo||'—')+' · '+escHtml(d.emailLead||d.empresa||'')+'</div>'
    + '<div class="tags-row">'
    + '<span class="tag t-gray">'+escHtml(d.tier||'—')+'</span>'
    + signalBadge
    + '<span class="tag '+slaCls+'">'+escHtml(slaLabel)+'</span>'
    + ((d._urgency||0)>=60?'<span class="tag t-risk">SLA RISCO</span>':'')
    + '</div>'
    + '</div></div>'
    // ── BLOCO 2: Estado (etapa + fase como badges horizontais) ───────
    + '<div class="deal-estado">'
    + '<span class="estado-badge eb-etapa">'+escHtml(_fmtEtapa(d.etapa||d.etapa_atual_no_pipeline||'—'))+'</span>'
    + (d.fase||d.fase_atual_no_processo?'<span class="estado-arrow">›</span><span class="estado-badge eb-fase">'+escHtml(d.fase||d.fase_atual_no_processo)+'</span>':'')
    + '<span class="estado-sep">·</span>'
    + '<span class="estado-badge eb-linha">'+_fmtLinhaHtml(d.linhaReceita||d.linha_de_receita_vigente||'')+'</span>'
    + '</div>'
    // ── BLOCO 3: Prioridade (temperatura + aging lado a lado) ────────
    + '<div class="deal-prior">'
    + '<div class="prior-temp">'
    + '<div class="tg-row"><span class="tg-lbl">Temperatura</span><span class="tgv '+tgvClass+'">'+d.temp+'%</span></div>'
    + '<div class="bar"><div class="bf '+barClass+'" style="width:'+d.temp+'%"></div></div>'
    + '<div class="tg-sub">'+tempSub+'</div>'
    + '</div>'
    + '<div class="prior-aging">'
    + '<div class="tg-lbl">Aging CRM</div>'
    + '<div class="aging-val"><span class="tag '+agingCls+'">'+agingDays+'</span></div>'
    + '<div class="tg-sub">'+(d._aging?d._aging.band:'—')+'</div>'
    + '</div></div>'
    // ── BLOCO 4: Ação (próxima ação + recomendação ELUCY) ────────────
    + '<div class="deal-acao">'
    + '<div class="acao-next"><div class="acao-lbl">Próxima Ação</div><div class="acao-val">'+escHtml(d._nextAction&&d._nextAction.label||d.dd||'—')+'</div>'+(d._timeline?'<div class="acao-sub">'+escHtml(d._timeline.actionLabel||'')+'</div>':'')+'</div>'
    + '<div class="recom"><div class="recom-l">Recomendação ELUCY <span class="elucy-badge">MOTOR ATIVO</span></div>'
    + '<div class="recom-t" id="recom-tex-'+id+'">'+buildRecom(d)+'</div></div>'
    + '</div>'
    // ── Alertas ──────────────────────────────────────────────────────
    + ((d._urgency||0)>=60?'<div class="alrt al-d">SLA em risco — deal sem avanço por '+(d._delta||d.delta||0)+' dias.</div>':'')
    + (d._signal==='DOME'?'<div class="alrt al-w">Iron Dome ativo — +10 dias sem resposta.</div>':'')
    // ── INFO-GRID colapsado por padrão ───────────────────────────────
    + '<div class="info-grid-toggle" onclick="(function(el){var g=el.nextElementSibling;var open=g.style.display!==\'none\';g.style.display=open?\'none\':\'\';el.querySelector(\'.igt-arrow\').textContent=open?\'›\':\' \'})(this)">'
    + '<span class="igt-lbl">Detalhes: Forecast '+fcScore+' · '+escHtml(fmtBRL(d.revenueRaw))+'</span>'
    + '<span class="igt-arrow">›</span>'
    + '</div>'
    + '<div class="info-grid" style="display:none">'
    + '<div class="ic"><div class="ic-l">Etapa Operacional</div><div class="ic-v">'+_escHtml(_fmtEtapa(d.etapa||d.etapa_atual_no_pipeline||''))+'</div><div class="ic-s">'+_escHtml(_fmtOrigem(d.canal_de_marketing||'', d.utm_medium||d.canal||''))+'</div></div>'
    + '<div class="ic"><div class="ic-l">Fase Comercial</div><div class="ic-v">'+_escHtml(d.fase||d.fase_atual_no_processo||'—')+'</div><div class="ic-s">'+_fmtLinhaHtml(d.linhaReceita||d.linha_de_receita_vigente||'')+'</div></div>'
    + '<div class="ic"><div class="ic-l">SLA</div><div class="ic-v" style="color:'+(d._timeline&&(d._timeline.slaStatus==='overdue'||d._timeline.slaStatus==='critical')?'var(--red)':d._timeline&&d._timeline.slaStatus==='at_risk'?'var(--yellow)':'var(--green)')+'">'+slaLabel+'</div><div class="ic-s">'+(d._timeline?(d._timeline.daysToSLA>=0?d._timeline.daysToSLA+'d restantes':Math.abs(d._timeline.daysToSLA)+'d estourado'):'')+'</div></div>'
    + '<div class="ic"><div class="ic-l">Forecast</div><div class="ic-v" style="color:var(--accent2)">'+fcScore+'</div><div class="ic-s">'+fcConf+'</div></div>'
    + '<div class="ic"><div class="ic-l">Valor G4</div><div class="ic-v" style="color:var(--green)">'+fmtBRL(d.revenueRaw)+'</div><div class="ic-s">Time de dados</div></div>'
    + '<div class="ic"><div class="ic-l">Valor ELUCY</div><div class="ic-v" style="color:var(--accent2)">'+fmtBRL(d.elucyValor)+'</div></div>'
    + '</div>'
    + '<div class="row">'
    + '<button class="btn bp" onclick="showCopy(\''+id+'\',this)">Gerar Copy via ELUCY</button>'
    + '<button class="btn bs" id="btn-er-tex-'+id+'" onclick="toggleER(\''+id+'\',this)">ELUCI Report</button>'
    + '<button class="btn bs" data-color="clay" onclick="requestBusinessAnalysis(\''+id+'\',this)" style="border-color:var(--clay);color:var(--clay)">Análise de Mercado</button>'
    + '<button class="wa-conv-btn" onclick="toggleWaPanel(\''+id+'\',this)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Conversa</button>'
    + '<button class="btn bs btn-sm" data-color="green" onclick="requestNotaCRM(\''+id+'\',this)" style="border-color:var(--green);color:var(--green)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Nota CRM</button>'
    + '<button class="btn bs btn-sm" onclick="window.open(\'https://app.hubspot.com/contacts/7186301/record/0-3/'+(d.deal_id||id)+'\',\'_blank\')" style="border-color:#ff7a59;color:#ff7a59"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> HubSpot</button>'
    + '<button class="btn bs btn-sm" onclick="toggleCallPanel(\''+id+'\')" style="border-color:var(--accent2);color:var(--accent2)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.28a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.8 2.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Ligar</button>'
    + '</div>'
    + '<div class="co" id="co-'+id+'" style="'+(d._cachedCopyWA?'':'display:none')+'">'
    + '<div class="co-h"><span class="co-chan">Copy gerada</span>'
    + '<div class="co-tabs"><button class="cotab on" onclick="swTab(\''+id+'\',\'wa\',this)">WhatsApp</button><button class="cotab" onclick="swTab(\''+id+'\',\'crm\',this)">Nota CRM</button></div></div>'
    + '<div class="co-b">'
    + '<div class="co-txt" id="ct-'+id+'-wa" contenteditable="true" spellcheck="false" style="white-space:pre-wrap">'+(d._cachedCopyWA?_escHtml(d._cachedCopyWA):'Gerando copy...')+'</div>'
    + '<div class="co-txt" id="ct-'+id+'-crm" contenteditable="true" spellcheck="false" style="display:none;white-space:pre-wrap">'+(d._cachedCopyCRM?_escHtml(d._cachedCopyCRM):'')+'</div>'
    + '<div class="copy-actions">'
    + '<button class="btn bs btn-sm" onclick="clip(\'ct-'+id+'-wa\')">Copiar</button>'
    + '<button class="btn bs btn-sm" onclick="openWhatsApp(\''+id+'\')" style="border-color:#25d366;color:#25d366"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> WhatsApp</button>'
    + '<button class="btn bs btn-sm" onclick="clip(\'ct-'+id+'-crm\')">Copiar Nota</button>'
    + '</div></div></div>'
    + '<div class="ba" id="nota-'+id+'" style="display:none"></div>'
    + '<div class="wa-panel" id="wa-panel-'+id+'">'
    + '<div class="wa-panel-header"><span class="wa-panel-title">Conversa WhatsApp</span><span id="wa-badge-'+id+'"></span><button class="wa-panel-close" onclick="toggleWaPanel(\''+id+'\')">✕</button></div>'
    + '<div class="wa-chat" id="wa-chat-'+id+'"></div>'
    + '<textarea class="wa-paste-area" id="wa-paste-'+id+'" placeholder="Cole aqui a conversa do WhatsApp..."></textarea>'
    + '<div class="wa-paste-actions"><button class="btn bsuc btn-sm" onclick="processWaConversation(\''+id+'\')">Salvar conversa</button><button class="btn bs btn-sm" onclick="document.getElementById(\'wa-paste-'+id+'\').value=\'\'">Limpar</button><span class="wa-msg-count" id="wa-count-'+id+'"></span></div>'
    + '</div>'
    
    + '<div class="call-panel" id="call-panel-'+id+'">'
    + '<div class="call-panel-header"><span class="call-panel-title">Registrar Chamada</span><button class="call-panel-close" onclick="toggleCallPanel(\''+id+'\')">&#x2715;</button></div>'
    + '<div class="call-panel-body">'
    + '<div class="call-dialer-row">'
    + '<button class="call-dialer-btn" onclick="openHubSpotDialer(\''+id+'\')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.28a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.8 2.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Abrir Discador HubSpot</button>'
    + '<span class="call-attempt-info" id="call-attempts-'+id+'"></span>'
    + '</div>'
    + '<div>'
    + '<div class="call-outcome-label">Resultado da chamada</div>'
    + '<div class="call-outcome-grid">'
    + '<button class="call-outcome-btn" data-outcome="answered" onclick="selectCallOutcome(\''+id+'\',\'answered\',this)">Atendeu</button>'
    + '<button class="call-outcome-btn" data-outcome="meeting_booked" onclick="selectCallOutcome(\''+id+'\',\'meeting_booked\',this)">Reuniao Marcada</button>'
    + '<button class="call-outcome-btn" data-outcome="callback_requested" onclick="selectCallOutcome(\''+id+'\',\'callback_requested\',this)">Pediu Retorno</button>'
    + '<button class="call-outcome-btn" data-outcome="no_answer" onclick="selectCallOutcome(\''+id+'\',\'no_answer\',this)">Nao Atendeu</button>'
    + '<button class="call-outcome-btn" data-outcome="voicemail" onclick="selectCallOutcome(\''+id+'\',\'voicemail\',this)">Caixa Postal</button>'
    + '<button class="call-outcome-btn" data-outcome="busy" onclick="selectCallOutcome(\''+id+'\',\'busy\',this)">Ocupado</button>'
    + '<button class="call-outcome-btn" data-outcome="call_dropped" onclick="selectCallOutcome(\''+id+'\',\'call_dropped\',this)">Chamada Caiu</button>'
    + '<button class="call-outcome-btn" data-outcome="wrong_number" onclick="selectCallOutcome(\''+id+'\',\'wrong_number\',this)">Numero Errado</button>'
    + '</div>'
    + '<div class="call-next-step-row" id="call-next-step-row-'+id+'" style="display:none">'
    + '<div class="call-outcome-label">Proximo passo (obrigatorio para Atendeu)</div>'
    + '<div class="call-outcome-grid" style="grid-template-columns:repeat(2,1fr)">'
    + '<button class="call-outcome-btn" data-nextstep="next_step_defined" onclick="selectCallNextStep(\''+id+'\',\'next_step_defined\',this)">Proximo passo definido</button>'
    + '<button class="call-outcome-btn" data-nextstep="meeting_scheduled" onclick="selectCallNextStep(\''+id+'\',\'meeting_scheduled\',this)">Reuniao marcada</button>'
    + '<button class="call-outcome-btn" data-nextstep="objection_open" onclick="selectCallNextStep(\''+id+'\',\'objection_open\',this)">Objecao aberta</button>'
    + '<button class="call-outcome-btn" data-nextstep="no_next_step" onclick="selectCallNextStep(\''+id+'\',\'no_next_step\',this)">Sem proximo passo</button>'
    + '</div></div></div>'
    + '<textarea class="call-notes-area" id="call-notes-'+id+'" placeholder="Notas da chamada (opcional) — proximo passo, objecao, contexto..."></textarea>'
    + '<div class="call-auto-task" id="call-autotask-'+id+'"></div>'
    + '<div class="call-save-row">'
    + '<button class="btn bsuc btn-sm" onclick="logCallResult(\''+id+'\')">Salvar Chamada</button>'
    + '<button class="btn bs btn-sm" onclick="toggleCallPanel(\''+id+'\')">Cancelar</button>'
    + '</div>'
    + '</div></div>'
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
  try {
    var cardHtml = _texBuildDealCard(t.id, d);
    if(wrap) wrap.innerHTML = cardHtml;
    else console.error('[tex] tex-deal-card element not found');
  } catch(e) {
    console.error('[tex] _texBuildDealCard error:', e);
    if(wrap) wrap.innerHTML = '<div class="card" style="color:var(--red);padding:20px"><b>Erro ao renderizar deal card:</b><br><pre style="white-space:pre-wrap;font-size:11px;margin-top:8px;color:var(--text2)">'+_escHtml(e.message+'\n'+e.stack)+'</pre></div>';
  }

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
  var rlEl = document.querySelector('.task-rl-chip.on');
  var filterRevLine = rlEl && rlEl.dataset.revline !== 'all' ? rlEl.dataset.revline : null;
  _texQueue = buildTaskQueue(filterType, filterRevLine);
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
// SKIP_REASONS: structured skip capture before advancing
var SKIP_REASONS = [
  { id:'no_time',       label:'Sem tempo agora',      icon:'⏱' },
  { id:'wrong_priority',label:'Não é prioridade',     icon:'↓' },
  { id:'waiting_info',  label:'Aguardando info',       icon:'⏳' },
  { id:'already_done',  label:'Já foi tratado',        icon:'✓' },
  { id:'not_relevant',  label:'Não relevante',         icon:'✗' }
];

window.texSkip = function(){
  var overlay = document.getElementById('tex-overlay');
  if(!overlay) return;
  // Show inline skip-reason picker if not already shown
  var existing = document.getElementById('tex-skip-picker');
  if(existing){ existing.remove(); return; }
  var picker = document.createElement('div');
  picker.id = 'tex-skip-picker';
  picker.style.cssText = 'position:absolute;bottom:70px;left:50%;transform:translateX(-50%);background:#111620;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:12px 14px;z-index:200;min-width:260px;box-shadow:0 8px 24px rgba(0,0,0,.6)';
  picker.innerHTML = '<div style="font-size:10px;color:#6b7a90;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;font-weight:700">Motivo do skip</div>'
    + SKIP_REASONS.map(function(r){
        return '<button onclick="window._texConfirmSkip(\''+r.id+'\')" style="display:block;width:100%;text-align:left;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:6px;color:#e8ecf2;font-size:12px;padding:7px 10px;margin-bottom:5px;cursor:pointer;font-family:inherit">'
          +r.icon+' '+r.label+'</button>';
      }).join('');
  overlay.style.position = 'relative';
  overlay.appendChild(picker);
};

window._texConfirmSkip = function(reasonId){
  var picker = document.getElementById('tex-skip-picker');
  if(picker) picker.remove();
  var t = _texQueue[_texIdx];
  if(t){
    var sb = window._sb ? window._sb() : null;
    var opId = window.getOperatorId ? window.getOperatorId() : null;
    if(sb && opId){
      sb.from('deal_tasks')
        .update({ task_status:'skipped', completed_at: new Date().toISOString(), disposition:'skipped_by_operator', skip_reason: reasonId })
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

// Open HubSpot for current task deal
window.texOpenHubSpot = function(){
  var t = _texQueue[_texIdx];
  if(!t || !t.deal) return;
  var dealId = t.deal.deal_id || t.id || '';
  if(dealId) window.open('https://app.hubspot.com/contacts/7186301/record/0-3/' + dealId, '_blank');
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
    if(window.showSyncToast) window.showSyncToast('ok','Fila concluída! Todas as tasks executadas.');
  }
};

// Legacy fallbacks
window.openTaskDeal = function(id){
  // Find task index for this deal
  var filterEl = document.querySelector('.fchip.on');
  var filterType = filterEl && filterEl.dataset.tfilter !== 'all' ? filterEl.dataset.tfilter : null;
  var rlEl2 = document.querySelector('.task-rl-chip.on');
  var filterRL = rlEl2 && rlEl2.dataset.revline !== 'all' ? rlEl2.dataset.revline : null;
  _texQueue = buildTaskQueue(filterType, filterRL);
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
var CHANNEL_ICONS = {whatsapp:'chat',phone:'phone',email:'email',instagram:'instagram'};
var CHANNEL_SVG = {chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.28a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.8 2.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',email:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',instagram:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'};
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
    var icon = CHANNEL_SVG[CHANNEL_ICONS[s.channel]]||CHANNEL_SVG.pin;
    var cls = done ? 'cad-step done' : current ? 'cad-step current' : 'cad-step';
    return '<div class="'+cls+'" title="D'+s.day+': '+_escHtml(s.action)+'">'
      + '<span class="cad-step-icon">'+icon+'</span>'
      + '<span class="cad-step-day">D'+s.day+'</span>'
      + '</div>';
  }).join('');
  var statusLabel = enr.completed ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="10" height="10"><polyline points="20 6 9 17 4 12"/></svg> Completa' : enr.paused ? '⏸ Pausada' : '▶ Ativa';
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
// V9 Operator Score — 7 componentes
// C1 Qualificados (0.18) | C2 Handoff (0.25) | C3 Win Rate (0.25) | C4 Velocidade (0.10)
// C5 DQI (0.10) | C6 Forecast Confidence (0.07) | C7 Framework Coverage (0.05)
async function calcOperatorScore(periodDays){
  var metrics = await loadRealMetrics(periodDays||30);
  if(!metrics) return null;
  var map=window._COCKPIT_DEAL_MAP||{};
  var allDeals=Object.values(map);
  var active=allDeals.filter(function(d){var s=(d.statusDeal||'').toLowerCase();return s!=='perdido'&&s!=='ganho'&&s!=='desqualificado';});

  // C1 — Qualificados (FUPs diários vs meta 15/dia)
  var dailyAvgFups=metrics.fups/Math.max(periodDays||30,1);
  var c1=Math.min(1,dailyAvgFups/15);

  // C2 — Handoff (DVL confirmados vs copies geradas)
  var c2=metrics.copies>0?Math.min(1,metrics.dvl_confirmed/metrics.copies):0;

  // C3 — Win Rate (deals avançados para Agendamento+)
  var advancedDeals=allDeals.filter(function(d){
    var e=(d._etapa||d.etapa||'').toLowerCase();
    return e.includes('agend')||e.includes('entrevista')||e==='conectados';
  }).length;
  var c3=metrics.unique_deals>0?Math.min(1,advancedDeals/metrics.unique_deals):0;

  // C4 — Velocidade (aging médio, ideal ≤5d)
  var totalDelta=active.reduce(function(s,d){return s+(d._delta||d.delta||0);},0);
  var avgDelta=active.length>0?totalDelta/active.length:5;
  var c4=Math.max(0,Math.min(1,1-(avgDelta-1)/14));

  // C5 — DQI (análises + confirmações + correções vs deals)
  var dqiRaw=metrics.analyses+(metrics.dvl_confirmed*2)+(metrics.corrections*0.5);
  var c5=Math.min(1,dqiRaw/Math.max(metrics.unique_deals,1));

  // C6 — Forecast Confidence V7 (média de confiança dos deals scorados)
  var scoredDeals=active.filter(function(d){return d._forecastV6&&d._forecastV6.confidence!=null;});
  var c6=scoredDeals.length>0?Math.min(1,scoredDeals.reduce(function(s,d){return s+d._forecastV6.confidence;},0)/scoredDeals.length):0.5;

  // C7 — Framework Coverage (deals com extração vs deals ativos)
  var fwDeals=active.filter(function(d){return d._frameworkRuntime&&d._frameworkRuntime.qualitative_score!=null;}).length;
  var c7=active.length>0?Math.min(1,fwDeals/active.length):0;

  // V10: Unified 7-component formula (aligned with L14 calcOperatorPerformance)
  var score=Math.round((c1*0.15+c2*0.25+c3*0.10+c4*0.10+c5*0.15+c6*0.15+c7*0.10)*1000);
  return {
    score:score,
    // Unified component names
    volume_score:Math.round(c1*100),
    conversion_score:Math.round(c2*100),
    speed_score:Math.round(c4*100),
    discipline_score:Math.round(c3*100),
    dqi_score:Math.round(c5*100),
    forecast_quality_score:Math.round(c6*100),
    revenue_score:Math.round(c7*100),
    // Legacy aliases
    qualificados_norm:Math.round(c1*100),
    handoff_norm:Math.round(c2*100),
    win_rate:Math.round(c3*100),
    dqi:Math.round(c5*100),
    forecast_conf:Math.round(c6*100),
    framework_cov:Math.round(c7*100),
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

  // V10: Module Friction Score — mede fricção de UX por módulo
  var modules = { home:0, pipeline:0, tasks:0, dm:0, reports:0, intelligence:0 };
  var moduleErrors = { home:0, pipeline:0, tasks:0, dm:0, reports:0, intelligence:0 };
  var totalInteractions = 0;
  // Estimar fricção baseado em patterns de uso observáveis
  var dwellByModule = window._moduleTimers || {};
  Object.keys(modules).forEach(function(mod){
    var dwell = dwellByModule[mod] || 0;
    var errors = moduleErrors[mod] || 0;
    modules[mod] = dwell;
    totalInteractions += dwell;
  });
  // Calcular friction_score geral (alto = mais fricção = ruim)
  var high_dropoff_rate = 0, long_idle_rate = 0, repeat_click_rate = 0, error_rate = 0, backtrack_rate = 0;
  if(totalInteractions > 0){
    // Estimar por ratio de módulos pouco visitados
    var usedModules = Object.keys(modules).filter(function(k){ return modules[k] > 0; }).length;
    high_dropoff_rate = Math.max(0, 1 - (usedModules / 6)); // mais módulos não usados = mais dropoff
    long_idle_rate = window._idleRate || 0.15;
    error_rate = window._errorRate || 0.05;
  }
  var module_friction_score = +(
    high_dropoff_rate * 0.35 +
    long_idle_rate * 0.20 +
    repeat_click_rate * 0.20 +
    error_rate * 0.15 +
    backtrack_rate * 0.10
  ).toFixed(4);
  insights.push({ type:'friction', severity: module_friction_score > 0.40 ? 'warning' : 'info',
    message:'Friction score UX: '+Math.round(module_friction_score*100)+'% — '+(module_friction_score > 0.40 ? 'Módulos subutilizados, simplificar navegação' : 'Navegação fluida'),
    suggestion: module_friction_score > 0.40 ? 'Explorar tabs menos usados (DM, Reports, Intelligence)' : 'Manter uso diversificado dos módulos',
    friction_score: module_friction_score
  });

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
  // OPP mensal — conta deals em fase oportunidade/negociacao no pipe atual
  var metaMensal = _operatorCtx.meta_mensal || {};
  var oppTarget = metaMensal.opp || 15;
  var oppActual = allDeals.filter(function(d){
    var fase = (d._fase || d.fase || d.fase_atual_no_processo || '').toLowerCase();
    return fase === 'oportunidade' || fase.includes('negoc');
  }).length;
  var oppPct = oppTarget > 0 ? Math.min(100, Math.round(oppActual / oppTarget * 100)) : 0;

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
    + '<div class="home-meta"><div class="home-meta-label">OPP Mensal</div><div class="home-meta-value">'+oppActual+' / '+oppTarget+'</div><div class="meta-bar-bg"><div class="meta-bar-fill'+(oppPct>=100?' done':'')+'" style="width:'+oppPct+'%"></div></div></div>'
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

  // BLOCO 3 — Desempenho (V9 Score — 7 componentes)
  html += '<div class="home-block">'
    + '<div class="home-block-title">Meu Desempenho <span style="font-size:9px;color:var(--text2);font-weight:400">Score V9</span></div>'
    + '<div class="home-perf-grid">'
    + '<div class="home-perf-kpi"><div class="home-perf-v" id="home-score">--</div><div class="home-perf-l">Score V9</div></div>'
    + '<div class="home-perf-kpi"><div class="home-perf-v" id="home-streak">--</div><div class="home-perf-l">Streak</div></div>'
    + '<div class="home-perf-kpi"><div class="home-perf-v">'+allDeals.length+'</div><div class="home-perf-l">Ativos</div></div>'
    + '<div class="home-perf-kpi"><div class="home-perf-v">'+atRisk.length+'</div><div class="home-perf-l">Em Risco</div></div>'
    + '</div>'
    + '<div id="home-score-breakdown" style="margin-top:8px"></div>'
    + '</div>';

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

  // BLOCO 5 — Strategic Intelligence (L25)
  var stratIntel = calcStrategicIntelligenceV25();
  var rq = stratIntel.revenue_quality;
  var eq = stratIntel.experience_quality;
  html += '<div class="home-block">'
    + '<div class="home-block-title">Inteligencia Estrategica <span class="home-count">L25</span></div>'
    + '<div class="home-strat-grid">'
    + '<div class="home-strat-card"><div class="home-strat-label">SAL 5M+</div><div class="home-strat-value" style="color:var(--accent2)">'+rq.sal_5m_count+'</div><div class="home-strat-sub">de '+rq.total_deals+' deals ativos</div></div>'
    + '<div class="home-strat-card"><div class="home-strat-label">Pipeline 5M+</div><div class="home-strat-value" style="color:var(--green)">'+fmtBRL(rq.pipeline_5m_value)+'</div><div class="home-strat-sub">receita potencial</div></div>'
    + '<div class="home-strat-card"><div class="home-strat-label">Enterprise Score</div><div class="home-strat-value">'+(rq.avg_enterprise_score||0)+'/100</div><div class="home-strat-sub">media do portfolio</div></div>'
    + '<div class="home-strat-card"><div class="home-strat-label">Framework Coverage</div><div class="home-strat-value" style="color:'+(eq.framework_coverage_pct>=60?'var(--green)':eq.framework_coverage_pct>=30?'var(--yellow)':'var(--red)')+'">'+eq.framework_coverage_pct+'%</div><div class="home-strat-sub">deals com framework >30%</div></div>'
    + '</div>'
    + '<div style="display:flex;gap:10px">'
    + '<div style="flex:1;font-size:11px;color:var(--text2)">Personas: <b style="color:var(--red)">'+rq.by_persona.titan+' Titan</b> · <b style="color:var(--accent2)">'+rq.by_persona.builder+' Builder</b> · <b style="color:var(--yellow)">'+rq.by_persona.executor+' Executor</b></div>'
    + '<div style="font-size:11px">Iron Dome: <b style="color:'+(eq.iron_dome_count>0?'var(--red)':'var(--green)')+'">'+eq.iron_dome_count+'</b> · Handoff Ready: <b style="color:var(--green)">'+eq.handoff_ready_count+'</b></div>'
    + '</div></div>';

  // BLOCO 6 — Trusted Advisor Score (L24)
  var advisorData = calcTrustedAdvisorV24(null, null);
  if(advisorData){
    var taScore = Math.round(advisorData.trusted_advisor_score*100);
    var taColor = taScore>=70?'var(--green)':taScore>=50?'var(--yellow)':'var(--red)';
    var bandLabel = advisorData.band==='trusted'?'Trusted Advisor':advisorData.band==='developing'?'Em Desenvolvimento':'Precisa Atencao';
    var gapLabels = {credibility:'Credibilidade',availability:'Disponibilidade',intimacy:'Intimidade',selfishness:'Egoismo (reduzir)'};
    var gapLabel = gapLabels[advisorData.biggest_gap]||advisorData.biggest_gap;
    // SVG ring
    var circumference = 2 * Math.PI * 26;
    var dashOffset = circumference - (circumference * taScore / 100);
    html += '<div class="home-block">'
      + '<div class="home-block-title">Trusted Advisor Score <span class="home-count">L24</span>'+(advisorData.needs_coaching?'<span style="margin-left:8px;font-size:10px;color:var(--red);font-weight:600">Coaching necessario</span>':'')+'</div>'
      + '<div class="home-advisor-gauge">'
      + '<div class="home-advisor-ring"><svg width="64" height="64"><circle cx="32" cy="32" r="26" stroke="var(--bg4)" stroke-width="5" fill="none"/><circle cx="32" cy="32" r="26" stroke="'+taColor+'" stroke-width="5" fill="none" stroke-dasharray="'+circumference+'" stroke-dashoffset="'+dashOffset+'" stroke-linecap="round"/></svg><span class="home-advisor-ring-val" style="color:'+taColor+'">'+taScore+'</span></div>'
      + '<div class="home-advisor-info"><div class="home-advisor-band" style="color:'+taColor+'">'+bandLabel+'</div><div class="home-advisor-gap">Maior gap: '+gapLabel+'</div></div>'
      + '</div>'
      + '<div class="home-advisor-bars">';
    var bars = [
      {label:'Credibilidade',val:advisorData.credibility_score,w:0.30,color:'var(--accent2)'},
      {label:'Disponibilidade',val:advisorData.availability_score,w:0.20,color:'var(--green)'},
      {label:'Intimidade',val:advisorData.intimacy_score,w:0.30,color:'var(--clay)'},
      {label:'Anti-Egoismo',val:1-advisorData.selfishness_score,w:0.20,color:'var(--yellow)'}
    ];
    bars.forEach(function(b){
      var pct = Math.round(b.val*100);
      html += '<div class="home-advisor-bar">'
        + '<div class="home-advisor-bar-label">'+b.label+' ('+Math.round(b.w*100)+'%)</div>'
        + '<div class="home-advisor-bar-bg"><div class="home-advisor-bar-fill" style="width:'+pct+'%;background:'+b.color+'"></div></div>'
        + '<div class="home-advisor-bar-val" style="color:'+b.color+'">'+pct+'%</div>'
        + '</div>';
    });
    html += '</div></div>';
  }

  wrap.innerHTML = html;

  // Async: load gamification for score/streak + V9 score breakdown
  calcGamification().then(function(gam){
    if(!gam) return;
    var sc=document.getElementById('home-score'); if(sc) sc.textContent=gam.operatorScore||gam.todayScore;
    var sk=document.getElementById('home-streak'); if(sk) sk.textContent=gam.streak+'d';
  });
  calcOperatorScore(30).then(function(ops){
    if(!ops) return;
    var bd=document.getElementById('home-score-breakdown');
    if(!bd) return;
    var comps=[
      {k:'qualificados_norm',l:'Qualif.',w:'18%'},
      {k:'handoff_norm',l:'Handoff',w:'25%'},
      {k:'win_rate',l:'Win Rate',w:'25%'},
      {k:'speed_score',l:'Velocid.',w:'10%'},
      {k:'dqi',l:'DQI',w:'10%'},
      {k:'forecast_conf',l:'Forecast',w:'7%'},
      {k:'framework_cov',l:'Framework',w:'5%'}
    ];
    var html='<div style="display:flex;gap:3px;align-items:flex-end;height:36px">';
    comps.forEach(function(c){
      var v=ops[c.k]||0;
      var col=v>=70?'var(--green)':v>=40?'var(--yellow)':'var(--red)';
      html+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px" title="'+c.l+': '+v+'%">'
        +'<div style="width:100%;background:'+col+';opacity:.85;border-radius:2px 2px 0 0;height:'+Math.max(4,Math.round(v*0.28))+'px"></div>'
        +'<div style="font-size:8px;color:var(--text2);text-align:center;line-height:1.1">'+c.l+'</div>'
        +'</div>';
    });
    html+='</div>';
    bd.innerHTML=html;
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
      setTimeout(function(){ var sh=document.getElementById('screen-home'); if(sh&&sh.classList.contains('on')) renderHome(); },2000);
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

  // ── RESPONSE PROPENSITY (V10) ──
  // Estima chance do lead responder baseado em sinais disponíveis
  var sig = deal._signalRuntime || {};
  var recencyNorm = slaStatus === 'on_track' ? 1.0 : slaStatus === 'at_risk' ? 0.65 : slaStatus === 'overdue' ? 0.40 : 0.20;
  var channelSuccess = deal._dmRuntime ? Math.min(1, (deal._dmRuntime.reply_count || 0) / Math.max(1, deal._dmRuntime.touchpoint_count || 1)) : 0.50;
  var recentReplyRate = deal._dmRuntime ? (deal._dmRuntime.last_reply_days != null && deal._dmRuntime.last_reply_days <= 3 ? 0.80 : 0.30) : 0.40;
  var signalHealth = sig.signal_total != null ? Math.max(0, Math.min(1, (sig.signal_total + 5) / 10)) : 0.50;
  var response_propensity = +(
    recentReplyRate * 0.35 +
    channelSuccess * 0.25 +
    recencyNorm * 0.20 +
    signalHealth * 0.20
  ).toFixed(4);

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
    // V10: Response Propensity
    responsePropensity:response_propensity,
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
    setTimeout(function(){ var sh=document.getElementById('screen-home'); if(sh&&sh.classList.contains('on')) renderHome(); },2500);
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
  whatsapp:  { label:'WhatsApp',  icon:'chat', color:'green' },
  ligacao:   { label:'Ligação',   icon:'phone', color:'accent' },
  email:     { label:'E-mail',    icon:'email', color:'accent2' },
  instagram: { label:'Instagram', icon:'instagram', color:'clay' },
  linkedin:  { label:'LinkedIn',  icon:'linkedin', color:'accent2' },
  tarefa:    { label:'Tarefa',    icon:'clipboard', color:'text2' }
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
buildTaskQueue = function(filterType, filterRevLine){
  var tasks = _origBuildTaskQueue(filterType, filterRevLine);
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

// Inject enterprise tasks (5M+ review + advisor coaching)
var _entBuildTaskQueue = buildTaskQueue;
buildTaskQueue = function(filterType, filterRevLine){
  var tasks = _entBuildTaskQueue(filterType, filterRevLine);
  if(filterType && filterType!=='enterprise_review' && filterType!=='advisor_coaching') return tasks;
  var map = window._COCKPIT_DEAL_MAP||{};
  Object.values(map).forEach(function(d){
    if(!d._enterprise || !d._enterprise.is_5m_plus) return;
    var f=(d.fase||d.fase_atual_no_processo||'').toLowerCase();
    if(f!=='sal' && f!=='conectado') return;
    tasks.push({
      id: (d.deal_id||d.nome)+'_ent_review',
      deal: d,
      taskType: 'enterprise_review',
      label: 'Deal 5M+ (score '+d._enterprise.enterprise_value_score+') — priorizar qualificacao',
      sortPriority: 1,
      urgency: 90
    });
  });
  // Advisor coaching: add one task if score < 0.6
  var advisor = typeof calcTrustedAdvisorV24==='function' ? calcTrustedAdvisorV24(null,null) : null;
  if(advisor && advisor.needs_coaching){
    var gapLabels={credibility:'Credibilidade',availability:'Disponibilidade',intimacy:'Intimidade',selfishness:'Egoismo'};
    tasks.push({
      id: 'advisor_coaching_'+new Date().toISOString().slice(0,10),
      deal: {nome:'Desenvolvimento Pessoal'},
      taskType: 'advisor_coaching',
      label: 'Trusted Advisor Score '+Math.round(advisor.trusted_advisor_score*100)+'% — melhorar '+(gapLabels[advisor.biggest_gap]||''),
      sortPriority: 3,
      urgency: 60
    });
  }
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
        html+='<span class="cad-step-check">'+(done?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>')+'</span>';
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
    enterprise_value_score: d._enterprise ? d._enterprise.enterprise_value_score : null,
    is_5m_plus: d._enterprise ? d._enterprise.is_5m_plus : false,
    enterprise_band: d._enterprise ? d._enterprise.band : null,
    runtime_payload: JSON.stringify({
      oppBreakdown: d._oppBreakdown || null,
      timeline: d._timeline || null,
      tier: d.tier || d._tier || null,
      contact_name: d.contact_name || d.nome || null,
      empresa: d.empresa || null,
      statusDeal: d.statusDeal || null,
      enterprise: d._enterprise || null
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

// V10: DM Momentum Score — mede velocidade e saúde do pipeline DM de um lead
function calcDMMomentumScore(leadId){
  var map = window._COCKPIT_DEAL_MAP || {};
  var deal = null;
  Object.keys(map).forEach(function(id){
    var d = map[id];
    if(d.lead_id === leadId || d.dealId === leadId || id === leadId) deal = d;
  });
  if(!deal) return { score: 0.50, components: {} };
  var dmR = deal._dmRuntime || {};
  var tpCount = dmR.touchpoint_count || 0;
  var replyCount = dmR.reply_count || 0;
  var meetingBooked = dmR.meeting_booked || false;
  var lastReplyDays = dmR.last_reply_days != null ? dmR.last_reply_days : 30;
  var sig = deal._signalRuntime || {};
  var signalHealth = sig.signal_total != null ? Math.max(0, Math.min(1, (sig.signal_total + 5) / 10)) : 0.50;

  // tp_progress_rate: quanto avançou (reply > 0 = progresso)
  var tp_progress_rate = tpCount > 0 ? Math.min(1, replyCount / tpCount) : 0;
  // reply_recency: quão recente é a última resposta
  var reply_recency_score = lastReplyDays <= 1 ? 1.0 : lastReplyDays <= 3 ? 0.75 : lastReplyDays <= 7 ? 0.50 : lastReplyDays <= 14 ? 0.30 : 0.10;
  // meeting_book_rate
  var meeting_book_rate = meetingBooked ? 1.0 : 0;
  // touchpoint_consistency: proporção de tps por semana de idade
  var ageDays = deal._delta || deal.delta || 7;
  var ageWeeks = Math.max(1, Math.floor(ageDays / 7));
  var touchpoint_consistency = Math.min(1, tpCount / (ageWeeks * 2)); // ideal: 2 TPs por semana

  var dm_momentum_score = +(
    tp_progress_rate * 0.35 +
    reply_recency_score * 0.20 +
    meeting_book_rate * 0.20 +
    signalHealth * 0.15 +
    touchpoint_consistency * 0.10
  ).toFixed(4);

  return {
    score: dm_momentum_score,
    components: {
      tp_progress_rate: +tp_progress_rate.toFixed(4),
      reply_recency_score: +reply_recency_score.toFixed(4),
      meeting_book_rate: meeting_book_rate,
      signal_health: +signalHealth.toFixed(4),
      touchpoint_consistency: +touchpoint_consistency.toFixed(4)
    }
  };
}
window.calcDMMomentumScore = calcDMMomentumScore;

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
// LAYER 13 — V7 FORECAST CALCULATOR
// Qualitative Forecast Engine V7: combina quantitativo (stage/aging/velocity)
// com pesos qualitativos (show/note/authority/urgency/behavior/next_step)
// + qualitative_score do Framework Extractor (SPICED/MEDDIC).
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

  // V7: Framework qualitative_score from deal_framework_runtime (SPICED + MEDDIC)
  var framework_qs = 1.0; // default neutral if no extraction yet
  var framework_data = deal._frameworkRuntime || null;
  if(framework_data && typeof framework_data.qualitative_score === 'number'){
    framework_qs = Math.max(0.20, Math.min(1.30, framework_data.qualitative_score));
  }

  var forecast_score_raw = +quantitative_score.toFixed(4);
  var forecast_score_adjusted = +((forecast_score_raw * qualitative_weight * framework_qs) - no_show_penalty).toFixed(4);
  forecast_score_adjusted = Math.max(0, Math.min(1.0, forecast_score_adjusted));

  // --- CONFIDENCE (V10 — 7-component weighted formula) ---
  // 1) Framework Evidence Score (0.28)
  var fc_spiced_cov = (framework_data && framework_data.spiced_coverage) || 0;
  var fc_meddic_cov = (framework_data && framework_data.meddic_coverage) || 0;
  var fc_overall_cov = (framework_data && framework_data.overall_coverage) || 0;
  var fc_next_step = (framework_data && framework_data.next_step_clarity) || 0;
  var fc_authority = (framework_data && framework_data.authority_score) || 0;
  var fc_note_q = (framework_data && framework_data.note_quality_score) || 0;
  var framework_evidence_score =
    (fc_spiced_cov * 0.25) + (fc_meddic_cov * 0.20) + (fc_overall_cov * 0.20) +
    (fc_next_step * 0.15) + (fc_authority * 0.10) + (fc_note_q * 0.10);

  // 2) Source Density Score (0.18)
  var na = deal._noteAnalysis;
  var conf_notes_count = na ? (na.notes_count || na.count || 1) : 0;
  var conf_notes_density = conf_notes_count >= 3 ? 1.00 : conf_notes_count === 2 ? 0.75 : conf_notes_count === 1 ? 0.50 : 0.10;
  var conf_meet_count = deal._meetingCount || 0;
  var conf_meet_density = conf_meet_count >= 2 ? 1.00 : conf_meet_count === 1 ? 0.70 : 0.20;
  var source_density_score = (conf_notes_density * 0.55) + (conf_meet_density * 0.45);

  // 3) Recency Reliability Score (0.16)
  var conf_last_touch = deal._lastTouch ? new Date(deal._lastTouch) : null;
  var conf_days_since = conf_last_touch ? Math.max(0, (Date.now() - conf_last_touch.getTime()) / 86400000) : 30;
  var recency_reliability_score;
  if(conf_days_since <= 1) recency_reliability_score = 1.00;
  else if(conf_days_since <= 3) recency_reliability_score = 0.85;
  else if(conf_days_since <= 7) recency_reliability_score = 0.65;
  else if(conf_days_since <= 14) recency_reliability_score = 0.40;
  else recency_reliability_score = 0.20;

  // 4) Meeting Reliability Score (0.14)
  var conf_shows = (showState === 'show') ? 1 : 0;
  var conf_meet_q = (framework_data && framework_data.meeting_quality_score) || 0;
  var meeting_reliability_score = (Math.min(conf_shows, 1) * 0.60) + (conf_meet_q * 0.40);

  // 5) Signal Stability Score (0.10)
  var sig = deal._signalRuntime || {};
  var sig_pos = sig.positive_score || 0;
  var sig_neg = sig.negative_score || 0;
  var sig_total = sig.signal_total || 0;
  var signal_balance = 1 - Math.min(Math.abs(sig_pos - sig_neg), 1);
  var signal_stability_score =
    (signal_balance * 0.40) +
    ((1 - Math.min(sig_neg, 1)) * 0.30) +
    ((1 - Math.min(Math.abs(sig_total), 1)) * 0.30);

  // 6) Data Trust Contribution (0.10) — from L19 if available
  var conf_data_trust = (deal._dataQuality && deal._dataQuality.data_trust_score) || 0.50;

  // 7) Framework confidence_score (0.04) — from extractor
  var conf_fw_confidence = (framework_data && framework_data.confidence_score) || 0;

  // Final weighted formula
  var forecast_confidence = +(
    (framework_evidence_score * 0.28) +
    (source_density_score * 0.18) +
    (recency_reliability_score * 0.16) +
    (meeting_reliability_score * 0.14) +
    (signal_stability_score * 0.10) +
    (conf_data_trust * 0.10) +
    (conf_fw_confidence * 0.04)
  ).toFixed(4);
  forecast_confidence = Math.min(1, Math.max(0, forecast_confidence));
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

  // V7: Framework-based signals
  if(framework_data){
    if(framework_data.spiced_avg >= 0.70) positive_signals.push('SPICED strong ('+framework_data.spiced_avg.toFixed(2)+')');
    else if(framework_data.spiced_avg > 0 && framework_data.spiced_avg < 0.35) risk_signals.push('SPICED weak ('+framework_data.spiced_avg.toFixed(2)+')');
    if(framework_data.meddic_avg >= 0.70) positive_signals.push('MEDDIC strong ('+framework_data.meddic_avg.toFixed(2)+')');
    else if(framework_data.meddic_avg > 0 && framework_data.meddic_avg < 0.35) risk_signals.push('MEDDIC weak ('+framework_data.meddic_avg.toFixed(2)+')');
    if(framework_data.overall_coverage < 0.30 && framework_data.extraction_count > 0) risk_signals.push('Low framework coverage ('+Math.round(framework_data.overall_coverage*100)+'%)');
    if(framework_data.main_gap_1) risk_signals.push('Gap: '+framework_data.main_gap_1);
  }

  // --- NEXT ACTION DERIVED ---
  var next_action = nba.type || 'follow_up';
  var next_action_reason = nba.label || '';
  if(forecast_score_adjusted < 0.10 && confidence_level !== 'low'){
    next_action = 'forecast_repair'; next_action_reason = 'Forecast muito baixo com confianca '+confidence_level+' — revisar deal';
  }
  // V7: framework gap fills
  if(framework_data && framework_data.overall_coverage < 0.45 && framework_data.extraction_count > 0 && next_action !== 'forecast_repair'){
    if(!framework_data.authority_score || framework_data.authority_score < 0.30){
      next_action = 'authority_confirmation'; next_action_reason = 'Economic buyer nao confirmado — perguntar quem decide';
    } else if(framework_data.spiced_pain < 0.30){
      next_action = 'pain_quantification'; next_action_reason = 'Dor nao quantificada — explorar impacto financeiro';
    } else {
      next_action = 'framework_gap_fill'; next_action_reason = 'Coverage SPICED/MEDDIC baixo — cobrir gaps: '+(framework_data.main_gap_1||'');
    }
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
    // V7 framework data
    framework_qualitative_score: framework_qs,
    spiced_avg: framework_data ? framework_data.spiced_avg : null,
    meddic_avg: framework_data ? framework_data.meddic_avg : null,
    framework_coverage: framework_data ? framework_data.overall_coverage : null,
    framework_confidence: framework_data ? framework_data.confidence_score : null,
    explain_json: {
      quantitative: { stage_prob:stage_prob, aging_factor:aging_factor, velocity_factor:velocity_factor, engagement_factor:engagement_factor },
      qualitative: { show_weight:show_weight, note_weight:note_weight, authority_weight:authority_weight, urgency_weight:urgency_weight, behavior_weight:behavior_weight, next_step_weight:next_step_weight },
      framework: { qualitative_score:framework_qs, spiced_avg:framework_data?framework_data.spiced_avg:null, meddic_avg:framework_data?framework_data.meddic_avg:null, coverage:framework_data?framework_data.overall_coverage:null },
      no_show_penalty: no_show_penalty,
      data_points: data_points,
      signals: { positive:positive_signals, risk:risk_signals }
    }
  };
}
window.calcForecastV7 = calcForecastV6;
window.calcForecastV6 = calcForecastV6; // backward compat

// Attach forecast to enrichDealContext
var _origEnrichDealContext = enrichDealContext;
function enrichDealContextV6(deal){
  _origEnrichDealContext(deal);
  if(!deal._forecastV6) deal._forecastV6 = calcForecastV6(deal);
  // V10: context_confidence — mede completude dos dados derivados do deal
  var cc = (deal._revLine ? 0.10 : 0)
    + ((deal.etapa || deal._etapa) ? 0.10 : 0)
    + ((deal.fase || deal._fase) ? 0.10 : 0)
    + (deal._persona ? 0.10 : 0)
    + (deal._framework ? 0.10 : 0)
    + ((deal._oppValue && deal._oppValue > 0) ? 0.10 : 0)
    + ((deal._nextAction && deal._nextAction.type !== 'follow_up') ? 0.15 : 0)
    + ((deal._dataQuality ? deal._dataQuality.data_trust_score : 0) * 0.25);
  deal._contextConfidence = Math.min(1, Math.max(0, +cc.toFixed(4)));
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
      formula_version: 'v7.0',
      // V6 columns
      forecast_version: 'v7',
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
      // V7 columns
      qualitative_score_v7: f.framework_qualitative_score,
      spiced_avg: f.spiced_avg,
      meddic_avg: f.meddic_avg,
      framework_coverage: f.framework_coverage,
      framework_confidence: f.framework_confidence,
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
      payload: JSON.stringify({ adjusted:f.forecast_score_adjusted, confidence:f.forecast_confidence, framework_qs:f.framework_qualitative_score, version:'v7' })
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

  console.log('[forecast-sync] ' + synced + '/' + rows.length + ' deals forecast synced (v7)');
  return synced;
}
window.syncForecastRuntime = syncForecastRuntime;

// ==================================================================
// LAYER 14 — OPERATOR PERFORMANCE MODEL
// 6 blocos: Volume, Conversao, Velocidade/Disciplina, Qualidade (DQI),
// Forecast Quality, Impacto em Receita. Score final ponderado.
// Spec: 7 perguntas do SDR respondidas com metricas objetivas.
// ==================================================================

// Normalization helper: clamp to [0, 1]
function _norm(val, max){ return Math.max(0, Math.min(1, (val||0) / Math.max(max, 1))); }
function _pct(num, den){ return den > 0 ? num / den : 0; }

async function calcOperatorPerformance(periodType, periodKey){
  var sb = _sb(); if(!sb) return null;
  var email = getOperatorId(); if(!email) return null;
  var map = window._COCKPIT_DEAL_MAP || {};
  var deals = Object.keys(map).map(function(k){ return map[k]; });

  // ---- Fetch activity_log for this operator (current month or period) ----
  var actFilter = {};
  var now = new Date();
  if(!periodType) periodType = 'monthly';
  if(!periodKey) periodKey = now.toISOString().slice(0,7); // 2026-03

  var startDate, endDate;
  if(periodType === 'daily'){
    startDate = periodKey + 'T00:00:00'; endDate = periodKey + 'T23:59:59';
  } else if(periodType === 'weekly'){
    // periodKey = 2026-W13 — approximate start
    startDate = periodKey.replace(/W(\d+)/, function(m,w){
      var d = new Date(parseInt(periodKey), 0, 1 + (parseInt(w)-1)*7);
      return d.toISOString().slice(0,10);
    }) + 'T00:00:00';
    endDate = now.toISOString();
  } else {
    startDate = periodKey + '-01T00:00:00';
    endDate = periodKey + '-31T23:59:59';
  }

  var actRes = await sb.from('activity_log')
    .select('activity_type,deal_id,created_at,metadata')
    .eq('operator_id', email)
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  var activities = (actRes.data || []);

  // ---- Fetch deal_runtime for this operator ----
  var rtRes = await sb.from('deal_runtime')
    .select('deal_id,current_stage,aging_days,risk_state,signal_state,temperature_score,value_score,next_best_action,show_state,last_touch_at')
    .eq('operator_email', email);
  var runtimeDeals = (rtRes.data || []);

  // ---- Fetch forecast_runtime ----
  var fcRes = await sb.from('forecast_runtime')
    .select('deal_id,forecast_score_adjusted,forecast_confidence,forecast_value,confidence_level,note_weight,show_weight,next_step_weight')
    .eq('operator_email', email);
  var forecasts = (fcRes.data || []);

  // ---- Fetch note_analysis for quality ----
  var naRes = await sb.from('note_analysis')
    .select('deal_id,quality_score,sentiment,pain_detected,authority_identified,next_step_clear,advancement_signal')
    .eq('operator_email', email);
  var noteAnalyses = (naRes.data || []);
  var noteByDeal = {};
  noteAnalyses.forEach(function(n){ noteByDeal[n.deal_id] = n; });

  // ---- Fetch deals for conversion data ----
  var dealsRes = await sb.from('deals')
    .select('deal_id,fase_atual_no_processo,etapa_atual_no_pipeline,status_do_deal,revenue,valor_da_oportunidade,created_at_crm')
    .eq('operator_email', email);
  var allDeals = (dealsRes.data || []);

  // ==================================================
  // BLOCO 1: VOLUME OPERACIONAL
  // ==================================================
  var vol = { deals_trabalhados:0, fups:0, dms:0, calls:0, notes:0, analyses:0, copies:0, meetings_booked:0, handoffs:0, meetings_realized:0 };
  var dealsTrabalhados = {};
  activities.forEach(function(a){
    var t = a.activity_type || '';
    if(a.deal_id) dealsTrabalhados[a.deal_id] = true;
    if(t === 'fup_sent' || t === 'task_completed') vol.fups++;
    if(t === 'dm_generated' || t === 'dm_sent') vol.dms++;
    if(t === 'call_logged') vol.calls++;
    if(t === 'note_created') vol.notes++;
    if(t === 'analysis_generated') vol.analyses++;
    if(t === 'copy_generated') vol.copies++;
    if(t === 'meeting_booked') vol.meetings_booked++;
    if(t === 'meeting_realized' || t === 'meeting_completed') vol.meetings_realized++;
    if(t === 'handoff_done') vol.handoffs++;
    if(t === 'deal_opened') dealsTrabalhados[a.deal_id] = true;
  });
  vol.deals_trabalhados = Object.keys(dealsTrabalhados).length;

  // Metas por periodo
  var metaMensal = _operatorCtx.meta_mensal || { fups:300, qualificacoes:100, handoffs:40 };
  var daysInPeriod = periodType === 'daily' ? 1 : periodType === 'weekly' ? 5 : 22;
  var metaFups = Math.ceil(metaMensal.fups / 22 * daysInPeriod);
  var metaQual = Math.ceil(metaMensal.qualificacoes / 22 * daysInPeriod);
  var metaHandoffs = Math.ceil(metaMensal.handoffs / 22 * daysInPeriod);

  var volume_score = +(
    ( _norm(vol.deals_trabalhados, metaQual)
    + _norm(vol.fups, metaFups)
    + _norm(vol.dms, Math.ceil(metaFups * 0.3))
    + _norm(vol.analyses + vol.copies, Math.ceil(metaQual * 0.5))
    + _norm(vol.notes, Math.ceil(metaQual * 0.7))
    ) / 5
  ).toFixed(4);

  // ==================================================
  // BLOCO 2: CONVERSAO
  // ==================================================
  var funnel = { mql:0, sal:0, conectado:0, agendamento:0, show:0, opp:0, won:0, lost:0 };
  allDeals.forEach(function(d){
    var fase = (d.fase_atual_no_processo || '').toLowerCase();
    var etapa = (d.etapa_atual_no_pipeline || '').toLowerCase();
    var status = (d.status_do_deal || '').toLowerCase();
    funnel.mql++;
    if(fase !== 'mql') funnel.sal++;
    if(etapa === 'conectados' || etapa.includes('agend') || etapa.includes('entrevista') || etapa.includes('oportunidade') || etapa.includes('negociacao')) funnel.conectado++;
    if(etapa.includes('agend') || etapa.includes('entrevista') || etapa.includes('oportunidade') || etapa.includes('negociacao')) funnel.agendamento++;
    if(status === 'ganho' || etapa.includes('oportunidade') || etapa.includes('negociacao')) funnel.opp++;
    if(status === 'ganho') funnel.won++;
    if(status === 'perdido') funnel.lost++;
  });
  // Show rate from deal_runtime
  var showCount = 0;
  runtimeDeals.forEach(function(r){
    if(r.show_state === 'attended' || r.show_state === 'completed') showCount++;
  });
  funnel.show = showCount;

  var cr = {
    mql_sal: _pct(funnel.sal, funnel.mql),
    sal_conectado: _pct(funnel.conectado, funnel.sal),
    conectado_agendamento: _pct(funnel.agendamento, funnel.conectado),
    agendamento_show: _pct(funnel.show, funnel.agendamento),
    show_opp: _pct(funnel.opp, Math.max(funnel.show, 1)),
    opp_won: _pct(funnel.won, funnel.opp)
  };

  var conversion_score = +(
    ( Math.min(1, cr.mql_sal) * 0.20
    + Math.min(1, cr.conectado_agendamento) * 0.25
    + Math.min(1, cr.agendamento_show) * 0.30
    + Math.min(1, cr.show_opp) * 0.25
    )
  ).toFixed(4);

  // ==================================================
  // BLOCO 3: VELOCIDADE / DISCIPLINA
  // ==================================================
  var agingSum = 0, agingCount = 0, slaRisk = 0, inactive = 0;
  var touchDelaySum = 0, touchDelayCount = 0;
  runtimeDeals.forEach(function(r){
    if(!r.aging_days && r.aging_days !== 0) return;
    agingSum += r.aging_days; agingCount++;
    var revLine = 'imersao'; // default
    var riskAfter = (REVENUE_LINES[revLine] || {}).risk_after || 3;
    if(r.aging_days > riskAfter * 2) slaRisk++;
    if(!r.last_touch_at) inactive++;
    else {
      var daysSinceTouch = Math.floor((Date.now() - new Date(r.last_touch_at).getTime()) / 86400000);
      if(daysSinceTouch > 3) inactive++;
      touchDelaySum += daysSinceTouch; touchDelayCount++;
    }
  });
  var activeDeals = Math.max(runtimeDeals.length, 1);
  var aging_avg = agingCount > 0 ? +(agingSum / agingCount).toFixed(1) : 0;
  var touch_delay_avg = touchDelayCount > 0 ? +(touchDelaySum / touchDelayCount).toFixed(1) : 0;
  var sla_risk_rate = +(slaRisk / activeDeals).toFixed(4);
  var inactive_rate = +(inactive / activeDeals).toFixed(4);

  // Speed: lower aging = better (normalize inversely, max 30 days = score 0)
  var speed_score = +(1 - _norm(aging_avg, 30)).toFixed(4);
  // Discipline: lower risk/inactive = better
  var discipline_score = +(1 - Math.min(1, (sla_risk_rate * 0.5 + inactive_rate * 0.3 + _norm(aging_avg, 20) * 0.2))).toFixed(4);

  // ==================================================
  // BLOCO 4: QUALIDADE OPERACIONAL (DQI)
  // ==================================================
  var totalActive = Math.max(runtimeDeals.length, 1);
  var qm = { good_notes:0, next_step:0, authority:0, pain:0, meeting_logged:0, no_show_treated:0, handoff_good:0 };

  runtimeDeals.forEach(function(r){
    var na = noteByDeal[r.deal_id];
    if(na){
      if(na.quality_score >= 60) qm.good_notes++;
      if(na.next_step_clear) qm.next_step++;
      if(na.authority_identified) qm.authority++;
      if(na.pain_detected) qm.pain++;
    }
    if(r.next_best_action && r.next_best_action !== 'follow_up') qm.next_step++;
    if(r.show_state === 'attended' || r.show_state === 'completed') qm.meeting_logged++;
    if(r.show_state === 'no_show' && r.next_best_action) qm.no_show_treated++;
  });

  var notes_quality_pct = +(_pct(qm.good_notes, totalActive) * 100).toFixed(1);
  var next_step_pct = +(_pct(qm.next_step, totalActive) * 100).toFixed(1);
  var authority_pct = +(_pct(qm.authority, totalActive) * 100).toFixed(1);
  var pain_pct = +(_pct(qm.pain, totalActive) * 100).toFixed(1);
  var meeting_pct = +(_pct(qm.meeting_logged, totalActive) * 100).toFixed(1);
  var noshow_pct = +(_pct(qm.no_show_treated, Math.max(1, runtimeDeals.filter(function(r){ return r.show_state === 'no_show'; }).length)) * 100).toFixed(1);
  var handoff_pct = +(_pct(vol.handoffs, Math.max(1, funnel.agendamento)) * 100).toFixed(1);

  var dqi = +(
    _pct(notes_quality_pct, 100) * 0.20
    + _pct(next_step_pct, 100) * 0.20
    + _pct(authority_pct, 100) * 0.15
    + _pct(pain_pct, 100) * 0.15
    + _pct(meeting_pct, 100) * 0.10
    + _pct(noshow_pct, 100) * 0.10
    + _pct(handoff_pct, 100) * 0.10
  ).toFixed(4);

  // ==================================================
  // BLOCO 5: FORECAST QUALITY
  // ==================================================
  var fcConfSum = 0, fcCount = 0, inflated = 0, noContext = 0;
  forecasts.forEach(function(f){
    fcConfSum += (f.forecast_confidence || 0); fcCount++;
    if(f.forecast_score_adjusted > 0.60 && f.confidence_level === 'low') inflated++;
    if(f.note_weight === 1.0 && f.next_step_weight === 1.0 && f.show_weight === 1.0) noContext++;
  });
  var fcActive = Math.max(fcCount, 1);
  var forecast_confidence_avg = +(fcConfSum / fcActive).toFixed(4);
  var inflated_pipeline_rate = +(inflated / fcActive).toFixed(4);
  var no_context_rate = +(noContext / fcActive).toFixed(4);

  var forecast_quality_score = +(
    forecast_confidence_avg * 0.35
    + (1 - inflated_pipeline_rate) * 0.25
    + (1 - no_context_rate) * 0.20
    + 0.20 // forecast_error_rate placeholder (requires historical comparison)
  ).toFixed(4);

  // ==================================================
  // BLOCO 6: IMPACTO EM RECEITA
  // ==================================================
  var revenue_influenced = 0, ticket_sum = 0, ticket_count = 0;
  var forecast_value_total = 0;
  allDeals.forEach(function(d){
    var status = (d.status_do_deal || '').toLowerCase();
    var rev = parseFloat(d.revenue || d.valor_da_oportunidade || 0);
    if(status === 'ganho' && rev > 0){ revenue_influenced += rev; ticket_sum += rev; ticket_count++; }
  });
  forecasts.forEach(function(f){ forecast_value_total += (f.forecast_value || 0); });

  var avg_ticket_val = ticket_count > 0 ? +(ticket_sum / ticket_count).toFixed(2) : 0;
  var revenue_per_deal = vol.deals_trabalhados > 0 ? +(revenue_influenced / vol.deals_trabalhados).toFixed(2) : 0;
  var revenue_per_handoff = vol.handoffs > 0 ? +(revenue_influenced / vol.handoffs).toFixed(2) : 0;

  // Normalize revenue metrics (benchmarks: 100k influenced, 5k/deal, 20k/handoff, 15k ticket)
  var revenue_score = +(
    _norm(revenue_influenced, 100000) * 0.40
    + _norm(revenue_per_handoff, 20000) * 0.30
    + _norm(avg_ticket_val, 15000) * 0.15
    + _norm(revenue_per_deal, 5000) * 0.15
  ).toFixed(4);

  // ==================================================
  // BLOCO 7: PIPELINE HYGIENE (V10)
  // ==================================================
  var pipeline_hygiene_score = +(
    (1 - inflated_pipeline_rate) * 0.30
    + (1 - no_context_rate) * 0.25
    + (dqi) * 0.20
    + (_pct(runtimeDeals.filter(function(r){ return r.next_best_action && r.next_best_action !== 'follow_up'; }).length, activeDeals)) * 0.15
    + (_pct(runtimeDeals.filter(function(r){ return r.next_best_action; }).length, activeDeals)) * 0.10
  ).toFixed(4);

  // ==================================================
  // SCORE FINAL (7 componentes ponderados)
  // ==================================================
  var final_score = +(
    (volume_score * 0.15)
    + (conversion_score * 0.25)
    + (speed_score * 0.10)
    + (discipline_score * 0.10)
    + (dqi * 0.15)
    + (forecast_quality_score * 0.15)
    + (revenue_score * 0.10)
  ).toFixed(4);

  // Scale to 0-100
  var final_100 = +(final_score * 100).toFixed(1);

  var performance_band = final_100 >= 90 ? 'elite' : final_100 >= 75 ? 'forte' : final_100 >= 60 ? 'estavel' : final_100 >= 45 ? 'atencao' : 'critico';

  // ==================================================
  // ALERTAS AUTOMATICOS
  // ==================================================
  var alerts = [];
  if(dqi < 0.60) alerts.push({ type:'warning', msg:'DQI abaixo de 60 — melhorar contexto qualitativo dos deals' });
  if(aging_avg > 10) alerts.push({ type:'warning', msg:'Aging medio alto ('+aging_avg+' dias) — acelerar pipeline' });
  if(no_context_rate > 0.50) alerts.push({ type:'warning', msg:'Mais de 50% dos deals sem contexto qualitativo no forecast' });
  if(inactive_rate > 0.30) alerts.push({ type:'warning', msg:'Taxa de inatividade alta ('+Math.round(inactive_rate*100)+'%) — deals sem interacao recente' });
  if(forecast_confidence_avg < 0.40) alerts.push({ type:'warning', msg:'Confianca media do forecast baixa — enriquecer dados dos deals' });
  if(conversion_score < 0.25) alerts.push({ type:'alert', msg:'Conversao critica — revisar abordagem e qualificacao' });
  if(volume_score > 0.80 && conversion_score < 0.30) alerts.push({ type:'insight', msg:'Alta atividade com baixa conversao — foco em qualidade, nao volume' });
  if(speed_score < 0.40) alerts.push({ type:'alert', msg:'Velocidade critica — ativar modo velocidade' });

  var result = {
    operator_email: email,
    period_type: periodType,
    period_key: periodKey,
    // Bloco 1
    volume_score: +volume_score,
    deals_trabalhados: vol.deals_trabalhados,
    fups_count: vol.fups,
    dms_count: vol.dms,
    calls_count: vol.calls,
    notes_count: vol.notes,
    analyses_generated: vol.analyses,
    copies_generated: vol.copies,
    meetings_booked: vol.meetings_booked,
    meetings_realized: vol.meetings_realized,
    handoffs_count: vol.handoffs,
    // Bloco 2
    conversion_score: +conversion_score,
    mql_count: funnel.mql,
    sal_count: funnel.sal,
    opp_count: funnel.opp,
    ganho_count: funnel.won,
    perdido_count: funnel.lost,
    cr_mql_sal: +(cr.mql_sal * 100).toFixed(2),
    cr_sal_conectado: +(cr.sal_conectado * 100).toFixed(2),
    cr_conectado_agendamento: +(cr.conectado_agendamento * 100).toFixed(2),
    cr_agendamento_show: +(cr.agendamento_show * 100).toFixed(2),
    cr_show_opp: +(cr.show_opp * 100).toFixed(2),
    cr_sal_opp: +(cr.opp_won * 100).toFixed(2),
    cr_opp_ganho: +(cr.opp_won * 100).toFixed(2),
    // Bloco 3
    speed_score: +speed_score,
    discipline_score: +discipline_score,
    time_to_first_contact_avg: 0, // requires first_touch tracking
    touch_delay_avg: touch_delay_avg,
    aging_avg: aging_avg,
    sla_risk_rate: +sla_risk_rate,
    sla_risk_count: slaRisk,
    inactive_rate: +inactive_rate,
    // Bloco 4
    dqi: +dqi,
    dqi_score: +(dqi * 100).toFixed(1),
    notes_quality_pct: notes_quality_pct,
    next_step_pct: next_step_pct,
    authority_identified_pct: authority_pct,
    pain_clarity_pct: pain_pct,
    meeting_logging_pct: meeting_pct,
    no_show_treatment_pct: noshow_pct,
    handoff_quality_pct: handoff_pct,
    // Bloco 5
    forecast_quality_score: +forecast_quality_score,
    forecast_confidence_avg: +forecast_confidence_avg,
    inflated_pipeline_rate: +inflated_pipeline_rate,
    no_context_rate: +no_context_rate,
    forecast_error_rate: 0, // requires historical data
    // Bloco 6
    revenue_score: +revenue_score,
    revenue_influenced: revenue_influenced,
    revenue_per_deal: revenue_per_deal,
    revenue_per_handoff: revenue_per_handoff,
    avg_ticket: avg_ticket_val,
    forecast_value_total: forecast_value_total,
    pipeline_value: forecast_value_total,
    ganho_value: revenue_influenced,
    // Bloco 7 — Pipeline Hygiene (V10)
    pipeline_hygiene_score: +pipeline_hygiene_score,
    // Final
    final_score: +final_score,
    overall_score: final_100,
    performance_band: performance_band,
    alerts: alerts,
    formula_version: 'v10.0',
    source: 'cockpit_engine'
  };

  console.log('[performance] ' + email + ' | score: ' + final_100 + ' (' + performance_band + ') | vol:' + volume_score + ' conv:' + conversion_score + ' spd:' + speed_score + ' disc:' + discipline_score + ' dqi:' + dqi + ' fc:' + forecast_quality_score + ' rev:' + revenue_score);
  return result;
}
window.calcOperatorPerformance = calcOperatorPerformance;

// Sync to Supabase operator_efficiency
async function syncOperatorEfficiency(periodType, periodKey){
  var sb = _sb(); if(!sb) return null;
  var perf = await calcOperatorPerformance(periodType, periodKey);
  if(!perf) return null;

  var row = {
    operator_email: perf.operator_email,
    period_type: perf.period_type,
    period_key: perf.period_key,
    // Volume
    volume_score: perf.volume_score,
    deals_trabalhados: perf.deals_trabalhados,
    fups_count: perf.fups_count,
    dms_count: perf.dms_count,
    calls_count: perf.calls_count,
    notes_count: perf.notes_count,
    analyses_generated: perf.analyses_generated,
    copies_generated: perf.copies_generated,
    meetings_booked: perf.meetings_booked,
    meetings_realized: perf.meetings_realized,
    handoffs_count: perf.handoffs_count,
    // Conversion
    conversion_score: perf.conversion_score,
    mql_count: perf.mql_count,
    sal_count: perf.sal_count,
    opp_count: perf.opp_count,
    ganho_count: perf.ganho_count,
    perdido_count: perf.perdido_count,
    cr_mql_sal: perf.cr_mql_sal,
    cr_sal_conectado: perf.cr_sal_conectado,
    cr_sal_opp: perf.cr_sal_opp,
    cr_conectado_agendamento: perf.cr_conectado_agendamento,
    cr_agendamento_show: perf.cr_agendamento_show,
    cr_show_opp: perf.cr_show_opp,
    cr_opp_ganho: perf.cr_opp_ganho,
    // Speed
    speed_score: perf.speed_score,
    discipline_score: perf.discipline_score,
    time_to_first_contact_avg: perf.time_to_first_contact_avg,
    touch_delay_avg: perf.touch_delay_avg,
    aging_avg: perf.aging_avg,
    sla_risk_rate: perf.sla_risk_rate,
    sla_risk_count: perf.sla_risk_count,
    inactive_rate: perf.inactive_rate,
    // DQI
    dqi: perf.dqi,
    dqi_score: perf.dqi_score,
    notes_quality_pct: perf.notes_quality_pct,
    next_step_pct: perf.next_step_pct,
    authority_identified_pct: perf.authority_identified_pct,
    pain_clarity_pct: perf.pain_clarity_pct,
    meeting_logging_pct: perf.meeting_logging_pct,
    no_show_treatment_pct: perf.no_show_treatment_pct,
    handoff_quality_pct: perf.handoff_quality_pct,
    // Forecast
    forecast_quality_score: perf.forecast_quality_score,
    forecast_confidence_avg: perf.forecast_confidence_avg,
    inflated_pipeline_rate: perf.inflated_pipeline_rate,
    no_context_rate: perf.no_context_rate,
    forecast_error_rate: perf.forecast_error_rate,
    // Revenue
    revenue_score: perf.revenue_score,
    revenue_influenced: perf.revenue_influenced,
    revenue_per_deal: perf.revenue_per_deal,
    revenue_per_handoff: perf.revenue_per_handoff,
    avg_ticket: perf.avg_ticket,
    forecast_value_total: perf.forecast_value_total,
    pipeline_value: perf.pipeline_value,
    ganho_value: perf.ganho_value,
    // Final
    final_score: perf.final_score,
    overall_score: perf.overall_score,
    performance_band: perf.performance_band,
    alerts: JSON.stringify(perf.alerts),
    formula_version: perf.formula_version,
    source: perf.source,
    metrics_json: JSON.stringify({
      volume: { deals:perf.deals_trabalhados, fups:perf.fups_count, dms:perf.dms_count, notes:perf.notes_count, analyses:perf.analyses_generated, copies:perf.copies_generated, meetings:perf.meetings_booked, handoffs:perf.handoffs_count },
      funnel: { mql:perf.mql_count, sal:perf.sal_count, opp:perf.opp_count, won:perf.ganho_count, lost:perf.perdido_count },
      speed: { aging_avg:perf.aging_avg, touch_delay:perf.touch_delay_avg, sla_risk:perf.sla_risk_rate, inactive:perf.inactive_rate }
    }),
    pipeline_hygiene_score: perf.pipeline_hygiene_score,
    // Trusted Advisor (L24)
    trusted_advisor_score: (function(){
      var ta = calcTrustedAdvisorV24(perf);
      return ta ? ta.trusted_advisor_score : null;
    })(),
    advisor_band: (function(){
      var ta = calcTrustedAdvisorV24(perf);
      return ta ? ta.band : null;
    })(),
    advisor_json: (function(){
      var ta = calcTrustedAdvisorV24(perf);
      return ta ? JSON.stringify({
        credibility:ta.credibility_score, availability:ta.availability_score,
        intimacy:ta.intimacy_score, selfishness:ta.selfishness_score,
        band:ta.band, gap:ta.biggest_gap, coaching:ta.needs_coaching
      }) : null;
    })(),
    scores_json: JSON.stringify({
      volume:perf.volume_score, conversion:perf.conversion_score, speed:perf.speed_score,
      discipline:perf.discipline_score, dqi:perf.dqi, forecast:perf.forecast_quality_score,
      revenue:perf.revenue_score, pipeline_hygiene:perf.pipeline_hygiene_score, final:perf.final_score
    }),
    updated_at: new Date().toISOString()
  };

  var res = await sb.from('operator_efficiency')
    .upsert(row, { onConflict:'operator_email,period_type,period_key' });
  if(res.error) console.warn('[performance-sync] error:', res.error.message);
  else console.log('[performance-sync] ' + perf.operator_email + ' ' + perf.period_type + ':' + perf.period_key + ' synced (score: ' + perf.overall_score + ')');
  return perf;
}
window.syncOperatorEfficiency = syncOperatorEfficiency;

// ==================================================================
// LAYER 15 — PERFORMANCE REPORT V3
// 8 blocos: Meta, Volume, Conversão, Linha, Velocidade, Qualidade, Forecast, Receita
// ==================================================================

async function calcPerformanceReportV3(periodType, periodKey){
  var sb = window._supabaseClient || (window.supabase && window.supabase.createClient ? null : null);
  if(!sb && window.getSB) sb = window.getSB();
  if(!sb) { console.warn('[perf-v3] no supabase'); return null; }
  var email = _operatorCtx.email;
  var qname = _operatorCtx.qualificador_name;
  if(!email) { console.warn('[perf-v3] no operator email'); return null; }

  periodType = periodType || 'month';
  var now = new Date();
  periodKey = periodKey || now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');

  var map = window._COCKPIT_DEAL_MAP || {};
  var dealIds = Object.keys(map);
  var deals = dealIds.map(function(id){ return map[id]; });

  // ── BLOCK 1: META ──
  var metaM = _operatorCtx.meta_mensal || {};
  var meta = {
    target_sal: metaM.qualificacoes || 100,
    target_opp: metaM.opp || 15,
    target_revenue: 180000
  };

  // ── Fetch activity_log for volume ──
  var monthStart = periodKey + '-01';
  var actData = [];
  try {
    var actRes = await sb.from('activity_log').select('*')
      .eq('operator_email', email)
      .gte('created_at', monthStart + 'T00:00:00')
      .limit(2000);
    if(actRes.data) actData = actRes.data;
  } catch(e){}

  // ── Fetch deal_runtime for speed/quality ──
  var runtimeData = [];
  try {
    var rtRes = await sb.from('deal_runtime').select('*')
      .eq('operator_email', email)
      .limit(500);
    if(rtRes.data) runtimeData = rtRes.data;
  } catch(e){}

  // ── Fetch forecast_runtime ──
  var forecastData = [];
  try {
    var fRes = await sb.from('forecast_runtime').select('*')
      .eq('operator_email', email)
      .limit(500);
    if(fRes.data) forecastData = fRes.data;
  } catch(e){}

  // ── Fetch note_analysis for quality ──
  var noteData = [];
  try {
    var nRes = await sb.from('note_analysis').select('*')
      .eq('operator_email', email)
      .limit(500);
    if(nRes.data) noteData = nRes.data;
  } catch(e){}

  // ── BLOCK 2: VOLUME ──
  var volume = {
    deals_worked: 0, fups_sent: 0, dms_sent: 0,
    analyses_generated: 0, notes_created: 0,
    meetings_booked: 0, handoffs: 0
  };
  var dealsWorkedSet = {};
  actData.forEach(function(a){
    if(a.entity_type === 'deal' && a.entity_id) dealsWorkedSet[a.entity_id] = true;
    var t = a.activity_type || '';
    if(t === 'fup_sent' || t === 'copy_generated') volume.fups_sent++;
    if(t === 'dm_generated' || t === 'dm_sent') volume.dms_sent++;
    if(t === 'analysis_generated') volume.analyses_generated++;
    if(t === 'note_created' || t === 'note_crm_generated') volume.notes_created++;
    if(t === 'meeting_booked') volume.meetings_booked++;
    if(t === 'handoff_done') volume.handoffs++;
  });
  volume.deals_worked = Object.keys(dealsWorkedSet).length;

  // ── BLOCK 3: CONVERSÃO ──
  var funnel = { mql:0, sal:0, connected:0, scheduled:0, show:0, opp:0, won:0, lost:0 };
  deals.forEach(function(d){
    funnel.mql++;
    var etapa = (d.etapa || d.fase || d.fase_atual_no_processo || '').toLowerCase();
    if(etapa.includes('dia ') || etapa.includes('conectad') || etapa.includes('agend') || etapa.includes('entrevista') || etapa.includes('reagend') || etapa.includes('oportunidade') || etapa.includes('negoc')) funnel.sal++;
    if(etapa.includes('conectad')) funnel.connected++;
    if(etapa.includes('agend') || etapa.includes('entrevista') || etapa.includes('reagend')) funnel.scheduled++;
    if(etapa.includes('entrevista')) funnel.show++;
    if(etapa.includes('oportunidade') || etapa.includes('negoc')) funnel.opp++;
    var status = (d.statusDeal || d.status_do_deal || '').toLowerCase();
    if(status === 'ganho' || status === 'won') funnel.won++;
    if(status === 'perdido' || status === 'lost') funnel.lost++;
  });
  var conversion = {
    mql_sal: funnel.mql > 0 ? funnel.sal / funnel.mql : 0,
    sal_connected: funnel.sal > 0 ? funnel.connected / funnel.sal : 0,
    connected_scheduled: funnel.connected > 0 ? funnel.scheduled / funnel.connected : 0,
    scheduled_show: funnel.scheduled > 0 ? funnel.show / funnel.scheduled : 0,
    show_opp: funnel.show > 0 ? funnel.opp / funnel.show : 0,
    opp_won: funnel.opp > 0 ? funnel.won / funnel.opp : 0
  };

  // ── BLOCK 4: EFICIÊNCIA POR LINHA ──
  var linePerf = {};
  deals.forEach(function(d){
    var rl = d._revLine || resolveRevenueLine(d);
    if(!linePerf[rl]) linePerf[rl] = { leads:0, sal:0, connected:0, scheduled:0, show:0, opp:0, won:0, lost:0, tickets:[], aging:[] };
    var lp = linePerf[rl];
    lp.leads++;
    var etapa = (d.etapa || d.fase || '').toLowerCase();
    if(etapa.includes('dia ') || etapa.includes('conectad') || etapa.includes('agend') || etapa.includes('entrevista') || etapa.includes('reagend') || etapa.includes('oportunidade')) lp.sal++;
    if(etapa.includes('conectad')) lp.connected++;
    if(etapa.includes('agend') || etapa.includes('entrevista') || etapa.includes('reagend')) lp.scheduled++;
    if(etapa.includes('entrevista')) lp.show++;
    if(etapa.includes('oportunidade')) lp.opp++;
    var status = (d.statusDeal || d.status_do_deal || '').toLowerCase();
    if(status === 'ganho') lp.won++;
    if(status === 'perdido') lp.lost++;
    if(d.revenueRaw) lp.tickets.push(Number(d.revenueRaw) || 0);
    lp.aging.push(Number(d.delta || d._delta || 0));
  });

  // ── BLOCK 5: VELOCIDADE / DISCIPLINA ──
  var agingArr = deals.map(function(d){ return Number(d.delta || d._delta || 0); });
  var avgAging = agingArr.length > 0 ? agingArr.reduce(function(a,b){return a+b;},0) / agingArr.length : 0;
  var slaRiskCount = deals.filter(function(d){ return (d._urgency || 0) >= 60; }).length;
  var slaRiskRate = deals.length > 0 ? slaRiskCount / deals.length : 0;
  var inactiveCount = runtimeData.filter(function(r){
    if(!r.last_touch_at) return true;
    var diff = (Date.now() - new Date(r.last_touch_at).getTime()) / (1000*60*60*24);
    return diff > 5;
  }).length;
  var inactiveRate = deals.length > 0 ? Math.min(1, inactiveCount / deals.length) : 0;

  var speed = {
    avg_aging_days: Math.round(avgAging * 10) / 10,
    sla_risk_rate: Math.min(1, Math.round(slaRiskRate * 1000) / 1000),
    inactive_rate: Math.round(inactiveRate * 1000) / 1000,
    deals_sla_risk: slaRiskCount,
    deals_inactive: inactiveCount
  };

  // ── BLOCK 6: QUALIDADE OPERACIONAL ──
  var totalDeals = deals.length || 1;
  var dealsWithNote = 0, dealsWithNextStep = 0, dealsWithAuthority = 0, dealsWithPain = 0;
  var dealsWithMeeting = 0, dealsWithNoShowTreated = 0;

  runtimeData.forEach(function(r){
    var payload = r.runtime_payload || {};
    if(typeof payload === 'string') try { payload = JSON.parse(payload); } catch(e){ payload = {}; }
    if(payload.note_quality === 'good') dealsWithNote++;
    if(r.next_best_action) dealsWithNextStep++;
    if(r.persona) dealsWithAuthority++;
    if(payload.pain_detected === 'true' || payload.pain_detected === true) dealsWithPain++;
    if(r.show_state && r.show_state !== 'unknown') dealsWithMeeting++;
    if(r.show_state === 'no_show' && payload.no_show_treated) dealsWithNoShowTreated++;
  });

  var notesQualityRate = Math.min(1, dealsWithNote / totalDeals);
  var nextStepRate = Math.min(1, dealsWithNextStep / totalDeals);
  var authorityRate = Math.min(1, dealsWithAuthority / totalDeals);
  var painRate = Math.min(1, dealsWithPain / totalDeals);
  var meetingRate = Math.min(1, dealsWithMeeting / totalDeals);
  var noShowTreatRate = runtimeData.filter(function(r){return r.show_state==='no_show';}).length > 0
    ? Math.min(1, dealsWithNoShowTreated / runtimeData.filter(function(r){return r.show_state==='no_show';}).length) : 1;

  var dqi = (notesQualityRate * 0.20) + (nextStepRate * 0.20) + (authorityRate * 0.15)
    + (painRate * 0.15) + (meetingRate * 0.10) + (noShowTreatRate * 0.10) + (0.5 * 0.10);
  dqi = Math.min(1, dqi);

  var quality = {
    dqi: Math.round(dqi * 1000) / 1000,
    notes_quality_rate: Math.round(notesQualityRate * 1000) / 1000,
    next_step_rate: Math.round(nextStepRate * 1000) / 1000,
    authority_rate: Math.round(authorityRate * 1000) / 1000,
    pain_rate: Math.round(painRate * 1000) / 1000,
    meeting_logging_rate: Math.round(meetingRate * 1000) / 1000,
    no_show_treatment_rate: Math.round(noShowTreatRate * 1000) / 1000
  };

  // ── BLOCK 7: FORECAST QUALITY ──
  var fcAvg = 0, fcInflated = 0, fcLowCtx = 0, fcTotal = 0, fcValue = 0;
  forecastData.forEach(function(f){
    fcTotal++;
    fcAvg += (f.forecast_confidence || 0);
    fcValue += (f.forecast_value || 0);
    if(f.forecast_score_adjusted < f.forecast_score_raw) fcInflated++;
    if(!f.reason_main || f.reason_main === '') fcLowCtx++;
  });
  var forecastConfidenceAvg = fcTotal > 0 ? fcAvg / fcTotal : 0;
  var inflatedRate = fcTotal > 0 ? fcInflated / fcTotal : 0;
  var lowCtxRate = fcTotal > 0 ? fcLowCtx / fcTotal : 0;
  var forecastQualityScore = (forecastConfidenceAvg * 0.35)
    + ((1 - inflatedRate) * 0.25) + ((1 - lowCtxRate) * 0.20) + (0.8 * 0.20);

  var forecast = {
    forecast_confidence_avg: Math.round(forecastConfidenceAvg * 1000) / 1000,
    inflated_pipeline_rate: Math.round(inflatedRate * 1000) / 1000,
    low_context_rate: Math.round(lowCtxRate * 1000) / 1000,
    forecast_value_total: Math.round(fcValue),
    deals_with_forecast: fcTotal,
    forecast_quality_score: Math.round(forecastQualityScore * 1000) / 1000
  };

  // ── BLOCK 8: RECEITA ──
  var revenueInfluenced = 0;
  deals.forEach(function(d){
    var status = (d.statusDeal || d.status_do_deal || '').toLowerCase();
    if(status === 'ganho' || status === 'won') revenueInfluenced += (Number(d.revenueRaw) || 0);
  });
  var revenue = {
    revenue_influenced: Math.round(revenueInfluenced),
    revenue_per_deal: volume.deals_worked > 0 ? Math.round(revenueInfluenced / volume.deals_worked) : 0,
    revenue_per_handoff: volume.handoffs > 0 ? Math.round(revenueInfluenced / volume.handoffs) : 0,
    forecast_value: Math.round(fcValue)
  };

  // ── SCORES ──
  meta.actual_sal = funnel.sal;
  meta.actual_opp = funnel.opp;
  meta.actual_revenue = revenueInfluenced;
  meta.achievement_rate = meta.target_sal > 0 ? Math.round((funnel.sal / meta.target_sal) * 1000) / 1000 : 0;

  var volumeScore = Math.min(1, (volume.deals_worked / Math.max(totalDeals, 1)) * 0.4
    + (volume.fups_sent / Math.max(totalDeals, 1)) * 0.3
    + Math.min(volume.handoffs / Math.max(meta.target_opp, 1), 1) * 0.3);
  var conversionScore = (conversion.mql_sal * 0.15 + conversion.sal_connected * 0.20
    + conversion.connected_scheduled * 0.20 + conversion.scheduled_show * 0.20
    + conversion.show_opp * 0.15 + conversion.opp_won * 0.10);
  var speedScore = Math.max(0, 1 - (speed.sla_risk_rate * 0.5) - (speed.inactive_rate * 0.3) - (Math.min(avgAging, 15) / 15 * 0.2));
  var qualityScore = dqi;
  var forecastScore = forecastQualityScore;
  var revenueScore = Math.min(1, meta.achievement_rate);

  var finalScore = (volumeScore * 0.15) + (conversionScore * 0.25) + (speedScore * 0.10)
    + (speedScore * 0.10) + (qualityScore * 0.15) + (forecastScore * 0.15) + (revenueScore * 0.10);
  finalScore = Math.round(Math.min(1, finalScore) * 100);

  var band = finalScore >= 90 ? 'elite' : finalScore >= 75 ? 'forte' : finalScore >= 60 ? 'estavel' : finalScore >= 45 ? 'atencao' : 'critico';

  var report = {
    operator_email: email,
    qualificador_name: qname,
    period_type: periodType,
    period_key: periodKey,
    meta: meta,
    volume: volume,
    conversion: conversion,
    funnel: funnel,
    linePerf: linePerf,
    speed: speed,
    quality: quality,
    forecast: forecast,
    revenue: revenue,
    scores: {
      volume: Math.round(volumeScore * 100),
      conversion: Math.round(conversionScore * 100),
      speed: Math.round(speedScore * 100),
      quality: Math.round(qualityScore * 100),
      forecast: Math.round(forecastScore * 100),
      revenue: Math.round(revenueScore * 100),
      final: finalScore
    },
    band: band
  };

  // ── PERSIST ──
  try {
    await sb.from('operator_performance_reports').upsert({
      operator_email: email,
      qualificador_name: qname,
      period_type: periodType,
      period_key: periodKey,
      meta_json: meta,
      volume_json: volume,
      conversion_json: conversion,
      line_efficiency_json: linePerf,
      speed_json: speed,
      quality_json: quality,
      forecast_json: forecast,
      revenue_json: revenue,
      volume_score: volumeScore,
      conversion_score: conversionScore,
      speed_score: speedScore,
      quality_score: qualityScore,
      forecast_score: forecastScore,
      revenue_score: revenueScore,
      final_score: finalScore / 100
    }, { onConflict: 'operator_email,period_type,period_key' });
  } catch(e){ console.warn('[perf-v3] persist error:', e.message); }

  // ── PERSIST LINE PERFORMANCE ──
  try {
    var lineRows = Object.keys(linePerf).map(function(rl){
      var lp = linePerf[rl];
      var avgT = lp.tickets.length > 0 ? lp.tickets.reduce(function(a,b){return a+b;},0) / lp.tickets.length : 0;
      var avgA = lp.aging.length > 0 ? lp.aging.reduce(function(a,b){return a+b;},0) / lp.aging.length : 0;
      return {
        operator_email: email, qualificador_name: qname, revenue_line: rl,
        period_type: periodType, period_key: periodKey,
        leads_count: lp.leads, sal_count: lp.sal, connected_count: lp.connected,
        scheduled_count: lp.scheduled, show_count: lp.show, opp_count: lp.opp,
        won_count: lp.won, lost_count: lp.lost,
        avg_ticket: Math.round(avgT), pipeline_value: Math.round(lp.tickets.reduce(function(a,b){return a+b;},0)),
        won_value: 0, avg_aging_days: Math.round(avgA * 10) / 10,
        cr_mql_sal: lp.leads > 0 ? lp.sal / lp.leads : 0,
        cr_sal_connected: lp.sal > 0 ? lp.connected / lp.sal : 0,
        cr_connected_scheduled: lp.connected > 0 ? lp.scheduled / lp.connected : 0,
        cr_scheduled_show: lp.scheduled > 0 ? lp.show / lp.scheduled : 0,
        cr_show_opp: lp.show > 0 ? lp.opp / lp.show : 0,
        cr_opp_won: lp.opp > 0 ? lp.won / lp.opp : 0
      };
    });
    if(lineRows.length > 0) await sb.from('operator_line_performance').upsert(lineRows);
  } catch(e){ console.warn('[perf-v3] line persist error:', e.message); }

  console.log('[perf-v3] report generated — score: ' + finalScore + ' (' + band + ')');
  return report;
}
window.calcPerformanceReportV3 = calcPerformanceReportV3;

// ── LAYER 15B — NARRATIVE ENGINE ──
// Compara período atual vs anterior e gera narrativas inteligentes
function generatePerformanceNarratives(current, previous){
  var narratives = [];
  if(!current) return narratives;

  var cs = current.scores || {};
  var ps = previous ? (previous.scores || {}) : null;

  function delta(cur, prev){ return prev ? cur - prev : 0; }
  function pctDelta(cur, prev){ return prev && prev > 0 ? Math.round((cur - prev) / prev * 100) : 0; }
  function arrow(d){ return d > 0 ? '↑' : d < 0 ? '↓' : '→'; }
  function arrowColor(d, invert){ var good = invert ? d < 0 : d > 0; return good ? 'var(--green)' : d === 0 ? 'var(--text2)' : 'var(--red)'; }
  function bandEmoji(b){ return b === 'elite' ? '🏆' : b === 'forte' ? '💪' : b === 'estavel' ? '⚡' : b === 'atencao' ? '⚠️' : '🚨'; }

  // 1. Score geral
  var scoreDelta = ps ? delta(cs.final, ps.final) : 0;
  var scoreNarr = 'Score geral: ' + cs.final + '/100 (' + (current.band || '').toUpperCase() + ')';
  if(ps){
    scoreNarr += ' — ' + arrow(scoreDelta) + ' ' + (scoreDelta > 0 ? '+' : '') + scoreDelta + ' pts vs período anterior';
    if(scoreDelta >= 5) scoreNarr += '. Evolução sólida, manter ritmo.';
    else if(scoreDelta <= -5) scoreNarr += '. Queda relevante — revisar disciplina e volume.';
    else scoreNarr += '. Estável.';
  }
  narratives.push({ type:'score', text:scoreNarr, delta:scoreDelta, icon: bandEmoji(current.band) });

  // 2. Volume
  var cv = current.volume || {};
  var pv = previous ? (previous.volume || {}) : null;
  var fupsDelta = pv ? delta(cv.fups_sent, pv.fups_sent) : 0;
  var dealsDelta = pv ? delta(cv.deals_worked, pv.deals_worked) : 0;
  var volText = cv.deals_worked + ' deals trabalhados, ' + cv.fups_sent + ' FUPs, ' + cv.dms_sent + ' DMs';
  if(pv){
    if(fupsDelta > 0) volText += '. FUPs ' + arrow(fupsDelta) + ' +' + fupsDelta + ' — cadência em alta.';
    else if(fupsDelta < 0) volText += '. FUPs ' + arrow(fupsDelta) + ' ' + fupsDelta + ' — atenção ao volume de contatos.';
  }
  if(cv.handoffs > 0) volText += ' ' + cv.handoffs + ' handoff' + (cv.handoffs > 1 ? 's' : '') + ' realizados.';
  narratives.push({ type:'volume', text:volText, delta:fupsDelta, color: arrowColor(fupsDelta) });

  // 3. Conversão
  var cc = current.conversion || {};
  var pc = previous ? (previous.conversion || {}) : null;
  var crMqlSal = Math.round((cc.mql_sal || 0) * 100);
  var crShowOpp = Math.round((cc.show_opp || 0) * 100);
  var convText = 'MQL→SAL: ' + crMqlSal + '%';
  if(pc){
    var prevCrMql = Math.round((pc.mql_sal || 0) * 100);
    var crDelta = crMqlSal - prevCrMql;
    convText += ' (' + arrow(crDelta) + (crDelta > 0 ? '+' : '') + crDelta + 'pp)';
  }
  convText += ', Show→OPP: ' + crShowOpp + '%';
  if(pc){
    var prevShowOpp = Math.round((pc.show_opp || 0) * 100);
    var soDelta = crShowOpp - prevShowOpp;
    convText += ' (' + arrow(soDelta) + (soDelta > 0 ? '+' : '') + soDelta + 'pp)';
    if(soDelta >= 5) convText += '. Qualificação de shows melhorou — frameworks afiados.';
    else if(soDelta <= -5) convText += '. Shows convertendo menos — reforçar SPICED/Challenger antes da reunião.';
  }
  narratives.push({ type:'conversion', text:convText, delta:0, color:'var(--accent)' });

  // 4. Velocidade
  var csp = current.speed || {};
  var psp = previous ? (previous.speed || {}) : null;
  var speedText = 'Aging médio: ' + csp.avg_aging_days + 'd';
  if(psp){
    var ageDelta = delta(csp.avg_aging_days, psp.avg_aging_days);
    speedText += ' (' + arrow(-ageDelta) + Math.abs(ageDelta) + 'd)'; // inverted: less is better
    if(ageDelta > 2) speedText += '. Pipeline envelhecendo — ativar Iron Dome nos deals parados.';
    else if(ageDelta < -1) speedText += '. Pipeline acelerando — bom sinal de fluidez.';
  }
  var slaRate = Math.round((csp.sla_risk_rate || 0) * 100);
  speedText += '. SLA Risk: ' + slaRate + '%';
  if(slaRate > 30) speedText += ' — alto, priorizar deals com SLA estourado.';
  narratives.push({ type:'speed', text:speedText, delta:0, color: arrowColor(-(csp.avg_aging_days - (psp ? psp.avg_aging_days : csp.avg_aging_days))) });

  // 5. Qualidade/DQI
  var cq = current.quality || {};
  var pq = previous ? (previous.quality || {}) : null;
  var dqi = Math.round((cq.dqi || 0) * 100);
  var qualText = 'DQI: ' + dqi + '/100';
  if(pq){
    var dqiPrev = Math.round((pq.dqi || 0) * 100);
    var dqiDelta = dqi - dqiPrev;
    qualText += ' (' + arrow(dqiDelta) + (dqiDelta > 0 ? '+' : '') + dqiDelta + ')';
  }
  // Find weakest quality dimension
  var qualDims = [
    {k:'notes_quality_rate', l:'qualidade de notas'},
    {k:'next_step_rate', l:'próximos passos'},
    {k:'authority_rate', l:'mapeamento de autoridade'},
    {k:'pain_rate', l:'clareza de dor'},
    {k:'no_show_treatment_rate', l:'tratamento de no-show'}
  ];
  var weakest = null; var weakVal = 999;
  qualDims.forEach(function(d){
    var v = (cq[d.k] || 0);
    if(v < weakVal){ weakVal = v; weakest = d; }
  });
  if(weakest && weakVal < 0.5){
    qualText += '. Ponto fraco: ' + weakest.l + ' (' + Math.round(weakVal * 100) + '%) — foco de melhoria.';
  }
  narratives.push({ type:'quality', text:qualText, delta:0, color: dqi >= 70 ? 'var(--green)' : dqi >= 50 ? 'var(--yellow)' : 'var(--red)' });

  // 6. Forecast
  var cfc = current.forecast || {};
  var confAvg = Math.round((cfc.forecast_confidence_avg || 0) * 100);
  var inflated = Math.round((cfc.inflated_pipeline_rate || 0) * 100);
  var fcText = 'Confiança média: ' + confAvg + '%, pipeline inflado: ' + inflated + '%';
  if(inflated > 20) fcText += '. Atenção: mais de 20% do pipeline sem sustentação — recalibrar scores ou adicionar contexto.';
  else if(confAvg >= 70) fcText += '. Forecast saudável — dados suficientes para decisão.';
  narratives.push({ type:'forecast', text:fcText, delta:0, color: confAvg >= 60 ? 'var(--green)' : 'var(--yellow)' });

  // 7. Receita
  var cr = current.revenue || {};
  var pr = previous ? (previous.revenue || {}) : null;
  var revText = 'Receita influenciada: R$ ' + ((cr.revenue_influenced || 0) / 1000).toFixed(0) + 'k';
  if(pr && pr.revenue_influenced > 0){
    var revDelta = pctDelta(cr.revenue_influenced, pr.revenue_influenced);
    revText += ' (' + arrow(revDelta) + (revDelta > 0 ? '+' : '') + revDelta + '%)';
  }
  revText += '. Ticket médio: R$ ' + ((cr.avg_ticket || cr.revenue_per_deal || 0) / 1000).toFixed(1) + 'k';
  narratives.push({ type:'revenue', text:revText, delta:0, color:'var(--green)' });

  // 8. Top insight — puxar a narrativa mais relevante como headline
  var headline = '';
  if(cs.final >= 90) headline = 'Performance elite — você está no top tier. Manter e ensinar o time.';
  else if(cs.final >= 75) headline = 'Performance forte — bom ritmo. Foco nos pontos fracos para subir.';
  else if(cs.final >= 60) headline = 'Performance estável — há espaço pra crescer. Priorize volume e conversão.';
  else if(cs.final >= 45) headline = 'Atenção — resultados abaixo do esperado. Revisar cadência e qualidade.';
  else headline = 'Crítico — ação imediata necessária. Alinhar com líder e reestruturar rotina.';
  narratives.unshift({ type:'headline', text:headline, delta:scoreDelta, icon: bandEmoji(current.band) });

  // V10: Narrative Confidence — quão confiáveis são essas narrativas
  var fc = current.forecast || {};
  var q = current.quality || {};
  var funnel = current.funnel || {};
  var data_trust_avg = (fc.forecast_confidence_avg || 0);
  var attribution_strength = (funnel.won > 0 || funnel.opp > 0) ? 0.70 : 0.30;
  var sample_size_score = Math.min(1, (funnel.mql || 0) / 50); // 50 leads = sample suficiente
  var forecast_confidence_avg = (fc.forecast_confidence_avg || 0);
  var transition_validity_rate = (q.next_step_rate || 0);
  var narrative_confidence = +(
    data_trust_avg * 0.30 +
    attribution_strength * 0.20 +
    sample_size_score * 0.20 +
    forecast_confidence_avg * 0.15 +
    transition_validity_rate * 0.15
  ).toFixed(4);
  // Attach confidence to all narratives
  narratives.forEach(function(n){ n.narrative_confidence = narrative_confidence; });

  return narratives;
}
window.generatePerformanceNarratives = generatePerformanceNarratives;

// Get previous period key for comparison
function _getPrevPeriodKey(periodType, periodKey){
  if(periodType === 'daily'){
    var d = new Date(periodKey + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0,10);
  }
  if(periodType === 'weekly'){
    var parts = periodKey.split('-W');
    var wn = parseInt(parts[1]) - 1;
    if(wn < 1) return (parseInt(parts[0]) - 1) + '-W52';
    return parts[0] + '-W' + String(wn).padStart(2,'0');
  }
  // monthly
  var mp = periodKey.split('-');
  var y = parseInt(mp[0]); var m = parseInt(mp[1]) - 1;
  if(m < 1){ y--; m = 12; }
  return y + '-' + String(m).padStart(2,'0');
}
window._getPrevPeriodKey = _getPrevPeriodKey;

// State for current performance view
var _perfViewState = { periodType:'month', periodKey:null, report:null, prevReport:null };

// ── UI RENDERER V4 (with period selector + narratives) ──
async function renderPerformanceReportV3(report, containerId){
  var el = document.getElementById(containerId || 'perf-report-v3');
  if(!el) return;

  if(report){
    _perfViewState.report = report;
    _perfViewState.periodType = report.period_type || 'month';
    _perfViewState.periodKey = report.period_key;
  }
  if(!_perfViewState.report) return;

  report = _perfViewState.report;
  var s = report.scores || {};
  var bandColors = { elite:'var(--green)', forte:'var(--green)', estavel:'var(--accent)', atencao:'var(--yellow)', critico:'var(--red)' };
  var bandColor = bandColors[report.band] || 'var(--text)';
  var fmtBRL = window.fmtBRL || function(v){return 'R$ '+(v||0).toLocaleString('pt-BR');};
  var narratives = generatePerformanceNarratives(report, _perfViewState.prevReport);
  var prevS = _perfViewState.prevReport ? (_perfViewState.prevReport.scores || {}) : {};

  function _delta(cur, prev){ if(prev == null) return ''; var d = cur - prev; if(d === 0) return ''; return '<span style="font-size:10px;margin-left:4px;color:'+(d>0?'var(--green)':'var(--red)')+'">'+(d>0?'↑':'↓')+Math.abs(d)+'</span>'; }
  function _bar(pct, color){ return '<div class="bar" style="margin-top:4px"><div class="bf" style="width:'+Math.min(100,Math.max(0,pct))+'%;background:'+(color||'var(--accent)')+'"></div></div>'; }
  function _barColor(pct){ return pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)'; }
  var html = '';

  // ── Period Selector ──
  html += '<div style="display:flex;gap:6px;margin-bottom:14px">';
  [['daily','Hoje'],['weekly','Semana'],['month','Mês']].forEach(function(p){
    var active = _perfViewState.periodType === p[0];
    html += '<button class="tag" style="cursor:pointer;'+(active?'background:var(--accent);color:#fff':'')+ '" onclick="switchPerfPeriod(\''+p[0]+'\')">'+p[1]+'</button>';
  });
  html += '</div>';

  // ── BLOCO 1: Hero Card ──
  var bandLabel = { elite:'ELITE', forte:'FORTE', estavel:'ESTÁVEL', atencao:'ATENÇÃO', critico:'CRÍTICO' };
  html += '<section class="card perf-hero">';
  html += '<div style="display:flex;justify-content:space-between;align-items:flex-start">';
  html += '<div>';
  html += '<div class="t-label">Performance V3</div>';
  html += '<div class="t-h1">'+_escHtml(report.qualificador_name || report.operator_email)+'</div>';
  var periodLabels = { daily:'Diário', weekly:'Semanal', month:'Mensal' };
  html += '<div class="t-body-sm" style="color:var(--text2)">'+(report.period_key||'')+' · '+(periodLabels[report.period_type]||report.period_type)+'</div>';
  html += '</div>';
  html += '<div class="tag" style="background:'+bandColor+';color:#fff;font-size:var(--fs-caption);font-weight:700">'+(bandLabel[report.band]||report.band)+'</div>';
  html += '</div>';

  html += '<div class="info-grid" style="margin-top:14px;grid-template-columns:1.2fr .8fr .8fr">';
  html += '<div class="ic"><div class="ic-l">Score Final</div><div class="ic-v" style="font-size:var(--fs-display);font-weight:800">'+s.final+_delta(s.final, prevS.final)+'</div></div>';
  html += '<div class="ic"><div class="ic-l">Forecast Quality</div><div class="ic-v">'+(s.forecast||0)+'</div>'+_bar(s.forecast||0)+'</div>';
  html += '<div class="ic"><div class="ic-l">Pipeline Hygiene</div><div class="ic-v">'+(s.quality||0)+'</div>'+_bar(s.quality||0)+'</div>';
  html += '</div>';
  html += '</section>';

  // ── BLOCO 2: Meta e Progresso ──
  var m = report.meta;
  var salPct = m.target_sal > 0 ? Math.round(m.actual_sal / m.target_sal * 100) : 0;
  var oppPct = m.target_opp > 0 ? Math.round(m.actual_opp / m.target_opp * 100) : 0;
  var revPct = m.target_revenue > 0 ? Math.round((m.actual_revenue||0) / m.target_revenue * 100) : 0;
  var achPct = Math.round((m.achievement_rate||0) * 100);

  html += '<section class="card" style="margin-top:14px">';
  html += '<div class="sec-t">Meta e Progresso</div>';
  html += '<div class="info-grid perf-meta-grid">';
  html += '<div class="ic"><div class="ic-l">SAL</div><div class="ic-v">'+(m.actual_sal||0)+' / '+(m.target_sal||0)+'</div>'+_bar(salPct, _barColor(salPct))+'</div>';
  html += '<div class="ic"><div class="ic-l">OPP</div><div class="ic-v">'+(m.actual_opp||0)+' / '+(m.target_opp||0)+'</div>'+_bar(oppPct, _barColor(oppPct))+'</div>';
  html += '<div class="ic"><div class="ic-l">Receita</div><div class="ic-v">'+fmtBRL(m.actual_revenue||0)+' / '+fmtBRL(m.target_revenue||0)+'</div>'+_bar(revPct, _barColor(revPct))+'</div>';
  html += '<div class="ic"><div class="ic-l">Pace</div><div class="ic-v">'+achPct+'%</div>';
  html += achPct < 70 ? '<div class="tag" style="margin-top:4px;background:var(--red);color:#fff">ATENÇÃO</div>' : achPct < 90 ? '<div class="tag" style="margin-top:4px;background:var(--yellow);color:#000">ALERTA</div>' : '<div class="tag" style="margin-top:4px;background:var(--green);color:#fff">OK</div>';
  html += '</div>';
  html += '</div></section>';

  // ── BLOCO 3: Dimensões do Score (grid 2x4) ──
  html += '<section class="card" style="margin-top:14px">';
  html += '<div class="sec-t">Dimensões do Score</div>';
  html += '<div class="info-grid perf-dimension-grid">';
  var dims = [
    {k:'volume',l:'Volume'},{k:'conversion',l:'Conversão'},{k:'speed',l:'Velocidade'},
    {k:'quality',l:'Qualidade'},{k:'forecast',l:'Forecast'},{k:'revenue',l:'Receita'}
  ];
  dims.forEach(function(dim){
    var val = s[dim.k] || 0;
    var prev = prevS[dim.k];
    html += '<div class="ic"><div class="ic-l">'+dim.l+'</div><div class="ic-v">'+val+_delta(val, prev)+'</div>'+_bar(val, _barColor(val))+'</div>';
  });
  html += '</div></section>';

  // ── BLOCO 4: Narrativas (3 cards lado a lado) ──
  var narrTypes = {
    headline: null,
    bottleneck: { title:'Maior Gargalo', icon:'⚠' },
    leverage: { title:'Maior Alavanca', icon:'⚡' },
    next_action: { title:'Próxima Ação', icon:'→' }
  };
  var narrCards = [];
  narratives.forEach(function(n){
    if(n.type === 'headline') return;
    if(narrCards.length < 3) narrCards.push(n);
  });
  if(narrCards.length){
    html += '<div class="info-grid" style="margin-top:14px;grid-template-columns:repeat('+Math.min(3, narrCards.length)+',1fr);gap:12px">';
    var narrTitles = ['Maior Gargalo','Maior Alavanca','Próxima Ação'];
    narrCards.forEach(function(n, i){
      var typeLabels = { score:'Score', volume:'Volume', conversion:'Conversão', speed:'Velocidade', quality:'Qualidade', forecast:'Forecast', revenue:'Receita' };
      html += '<article class="card">';
      html += '<div class="sec-t">'+(narrTitles[i]||typeLabels[n.type]||n.type)+'</div>';
      html += '<div class="t-h3" style="margin-top:4px">'+(typeLabels[n.type] || n.type)+'</div>';
      html += '<div class="t-body-sm" style="color:var(--text2);margin-top:4px">'+n.text+'</div>';
      html += '</article>';
    });
    html += '</div>';
  }

  // ── BLOCO 5: Funil Visual ──
  var f = report.funnel;
  html += '<section class="card" style="margin-top:14px">';
  html += '<div class="sec-t">Funil</div>';
  var maxF = Math.max(f.mql, 1);
  var funnelStages = [
    {k:'mql',l:'MQL'},{k:'sal',l:'SAL'},{k:'connected',l:'Conect.'},{k:'scheduled',l:'Agend.'},
    {k:'show',l:'Show'},{k:'opp',l:'OPP'},{k:'won',l:'Won'}
  ];
  html += '<div class="tg" style="margin-top:8px">';
  funnelStages.forEach(function(st){
    var val = f[st.k] || 0;
    var pct = Math.round(val / maxF * 100);
    html += '<div class="tg-row" style="align-items:center;gap:8px">';
    html += '<div class="t-label" style="min-width:48px">'+st.l+'</div>';
    html += '<div style="flex:1">'+_bar(pct, 'var(--accent)')+'</div>';
    html += '<div class="tgv" style="min-width:32px;text-align:right">'+val+'</div>';
    html += '</div>';
  });
  html += '</div></section>';

  // ── BLOCO 6: Conversão por Etapa ──
  var c = report.conversion;
  html += '<section class="card" style="margin-top:14px">';
  html += '<div class="sec-t">Conversão por Etapa</div>';
  html += '<div class="info-grid perf-meta-grid" style="margin-top:8px">';
  var prevC = _perfViewState.prevReport ? (_perfViewState.prevReport.conversion || {}) : null;
  [['mql_sal','MQL→SAL'],['sal_connected','SAL→Con.'],['connected_scheduled','Con.→Ag.'],
   ['scheduled_show','Ag.→Show'],['show_opp','Show→OPP'],['opp_won','OPP→Won']].forEach(function(pair){
    var val = Math.round((c[pair[0]] || 0) * 100);
    var prevVal = prevC ? Math.round((prevC[pair[0]] || 0) * 100) : null;
    var dStr = _delta(val, prevVal);
    html += '<div class="ic"><div class="ic-l">'+pair[1]+'</div><div class="ic-v">'+val+'%'+dStr+'</div>'+_bar(val, _barColor(val))+'</div>';
  });
  html += '</div></section>';

  // ── BLOCO 7: Qualidade Operacional ──
  var q = report.quality;
  html += '<section class="card" style="margin-top:14px">';
  html += '<div class="sec-t">Qualidade Operacional · DQI '+Math.round(q.dqi*100)+'</div>';
  html += '<div class="tg" style="margin-top:8px">';
  [['notes_quality_rate','Notes Quality'],['next_step_rate','Next Step'],['authority_rate','Authority'],
   ['pain_rate','Pain Clarity'],['meeting_logging_rate','Meetings'],['no_show_treatment_rate','No-Show']].forEach(function(pair){
    var pct = Math.round((q[pair[0]] || 0) * 100);
    var col = _barColor(pct);
    html += '<div class="tg-row" style="align-items:center;gap:8px">';
    html += '<div class="t-label" style="min-width:100px">'+pair[1]+'</div>';
    html += '<div style="flex:1"><div class="bar"><div class="bf" style="width:'+pct+'%;background:'+col+'"></div></div></div>';
    html += '<div class="tgv" style="min-width:36px;text-align:right">'+pct+'%</div>';
    html += '</div>';
  });
  html += '</div></section>';

  // ── BLOCO 8: Forecast Quality ──
  var fc = report.forecast;
  html += '<section class="card" style="margin-top:14px">';
  html += '<div class="sec-t">Forecast Quality</div>';
  html += '<div class="info-grid perf-meta-grid" style="margin-top:8px">';
  html += '<div class="ic"><div class="ic-l">Confidence</div><div class="ic-v">'+Math.round(fc.forecast_confidence_avg*100)+'%</div>'+_bar(Math.round(fc.forecast_confidence_avg*100))+'</div>';
  html += '<div class="ic"><div class="ic-l">Inflado</div><div class="ic-v">'+Math.round(fc.inflated_pipeline_rate*100)+'%</div>'+_bar(Math.round((1-fc.inflated_pipeline_rate)*100), 'var(--green)')+'</div>';
  html += '<div class="ic"><div class="ic-l">Sem Contexto</div><div class="ic-v">'+Math.round(fc.low_context_rate*100)+'%</div>'+_bar(Math.round((1-fc.low_context_rate)*100), 'var(--green)')+'</div>';
  html += '<div class="ic"><div class="ic-l">Com Forecast</div><div class="ic-v">'+fc.deals_with_forecast+'</div></div>';
  html += '</div></section>';

  // ── BLOCO 9: Receita ──
  var r = report.revenue;
  html += '<section class="card" style="margin-top:14px">';
  html += '<div class="sec-t">Impacto em Receita</div>';
  html += '<div class="info-grid" style="grid-template-columns:repeat(3,1fr);gap:12px;margin-top:8px">';
  html += '<div class="ic"><div class="ic-l">Receita Influenciada</div><div class="ic-v" style="color:var(--green)">'+fmtBRL(r.revenue_influenced)+'</div></div>';
  html += '<div class="ic"><div class="ic-l">Rev/Deal</div><div class="ic-v">'+fmtBRL(r.revenue_per_deal)+'</div></div>';
  html += '<div class="ic"><div class="ic-l">Rev/Handoff</div><div class="ic-v">'+fmtBRL(r.revenue_per_handoff)+'</div></div>';
  html += '</div></section>';

  // ── BLOCO 10: Breakdown Operacional ──
  var v = report.volume;
  html += '<section class="card" style="margin-top:14px">';
  html += '<div class="sec-t">Breakdown Operacional</div>';
  html += '<div class="tg" style="margin-top:8px">';
  [['deals_worked','Deals Trabalhados'],['fups_sent','FUPs'],['dms_sent','DMs'],
   ['analyses_generated','Análises'],['notes_created','Notes'],
   ['meetings_booked','Reuniões'],['handoffs','Handoffs']].forEach(function(pair){
    html += '<div class="tg-row"><div class="t-label">'+pair[1]+'</div><div class="tgv">'+(v[pair[0]]||0)+'</div></div>';
  });
  html += '</div></section>';

  // ── BLOCO 11: Linha de Receita ──
  var lp = report.linePerf;
  var rlKeys = Object.keys(lp).sort(function(a,b){ return (lp[b].leads||0)-(lp[a].leads||0); });
  if(rlKeys.length > 0){
    html += '<section class="card" style="margin-top:14px">';
    html += '<div class="sec-t">Eficiência por Linha de Receita</div>';
    html += '<div style="overflow-x:auto;margin-top:8px">';
    html += '<table class="tg" style="width:100%;border-collapse:collapse;font-size:var(--fs-caption)">';
    html += '<thead><tr style="border-bottom:1px solid var(--border)">';
    ['Linha','Leads','SAL','Con.','Ag.','Show','OPP','Won','CR','Aging'].forEach(function(th){
      html += '<th style="text-align:left;padding:6px 8px;color:var(--text2);font-weight:600">'+th+'</th>';
    });
    html += '</tr></thead><tbody>';
    rlKeys.forEach(function(rl){
      var l = lp[rl];
      var cfg = REVENUE_LINES[rl] || { label: rl };
      var avgA = l.aging.length > 0 ? Math.round(l.aging.reduce(function(a,b){return a+b;},0) / l.aging.length * 10) / 10 : 0;
      var cr = l.leads > 0 ? Math.round(l.sal / l.leads * 100) : 0;
      html += '<tr style="border-bottom:1px solid var(--border)">';
      html += '<td style="padding:6px 8px;font-weight:600">'+_escHtml(cfg.label)+'</td>';
      [l.leads,l.sal,l.connected,l.scheduled,l.show,l.opp,l.won].forEach(function(val){
        html += '<td style="padding:6px 8px">'+val+'</td>';
      });
      html += '<td style="padding:6px 8px;color:'+_barColor(cr)+'">'+cr+'%</td>';
      html += '<td style="padding:6px 8px">'+avgA+'d</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div></section>';
  }

  el.innerHTML = html;
}
window.renderPerformanceReportV3 = renderPerformanceReportV3;

// ── Period Switcher ──
async function switchPerfPeriod(periodType){
  var el = document.getElementById('perf-report-v3');
  if(el) el.innerHTML = '<div style="padding:20px;color:var(--text2)">Calculando '+({daily:'dia',weekly:'semana',month:'mês'}[periodType]||periodType)+'...</div>';

  var now = new Date();
  var periodKey;
  if(periodType === 'daily'){
    periodKey = now.toISOString().slice(0,10);
  } else if(periodType === 'weekly'){
    var oneJan = new Date(now.getFullYear(), 0, 1);
    var wn = Math.ceil(((now - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
    periodKey = now.getFullYear() + '-W' + String(wn).padStart(2,'0');
  } else {
    periodKey = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  }

  _perfViewState.periodType = periodType;
  _perfViewState.periodKey = periodKey;

  // Calculate current period
  var report = null;
  if(window.calcPerformanceReportV3){
    report = await window.calcPerformanceReportV3(periodType, periodKey);
  }
  _perfViewState.report = report;

  // Calculate previous period for comparison
  var prevKey = _getPrevPeriodKey(periodType, periodKey);
  var prevReport = null;
  try {
    if(window.calcPerformanceReportV3){
      prevReport = await window.calcPerformanceReportV3(periodType, prevKey);
    }
  } catch(e){ console.warn('[perf-v4] prev period error:', e.message); }
  _perfViewState.prevReport = prevReport;

  if(report) renderPerformanceReportV3(report);
}
window.switchPerfPeriod = switchPerfPeriod;

// ==================================================================
// LAYER 16 — FRAMEWORK EXTRACTOR ENGINE (V7.1)
// Consolida extrações SPICED/MEDDIC de deal_framework_runtime.
// Calcula qualitative_score para alimentar o Forecast V7.
// Gera tasks automáticas quando gaps são detectados.
// ==================================================================

// Load deal_framework_runtime for all operator deals into _COCKPIT_DEAL_MAP
async function loadFrameworkRuntime(){
  var sb = _sb(); if(!sb) return;
  var email = getOperatorId(); if(!email) return;
  var map = window._COCKPIT_DEAL_MAP || {};
  var dealIds = Object.keys(map);
  if(!dealIds.length) return;

  // Fetch in chunks of 100
  var CHUNK = 100;
  var allRows = [];
  for(var i = 0; i < dealIds.length; i += CHUNK){
    var ids = dealIds.slice(i, i + CHUNK);
    try {
      var res = await sb.from('deal_framework_runtime')
        .select('*')
        .in('deal_id', ids);
      if(res.data) allRows = allRows.concat(res.data);
    } catch(e){ console.warn('[framework] load error:', e.message); }
  }

  // Attach to deal map
  allRows.forEach(function(r){
    if(map[r.deal_id]) map[r.deal_id]._frameworkRuntime = r;
  });

  console.log('[framework] loaded ' + allRows.length + ' deal_framework_runtime rows');
  return allRows.length;
}
window.loadFrameworkRuntime = loadFrameworkRuntime;

// Calculate qualitative_score from framework runtime data
// Formula V7.1:
// qs = (spiced_avg * 0.30) + (meddic_avg * 0.30) + (overall_coverage * 0.15)
//    + (confidence_score * 0.10) + (next_step_clarity * 0.10) + (authority_score * 0.05)
// Clamped [0.20, 1.30]
function calcQualitativeScore(fr){
  if(!fr) return 1.0;
  var qs = (fr.spiced_avg || 0) * 0.30
         + (fr.meddic_avg || 0) * 0.30
         + (fr.overall_coverage || 0) * 0.15
         + (fr.confidence_score || 0) * 0.10
         + (fr.next_step_clarity || 0) * 0.10
         + (fr.authority_score || 0) * 0.05;
  return Math.max(0.20, Math.min(1.30, +qs.toFixed(4)));
}
window.calcQualitativeScore = calcQualitativeScore;

// Consolidate individual framework_extractions into deal_framework_runtime
// Called after a new extraction is saved (e.g. from note_analysis, meeting, cockpit worker)
async function consolidateFrameworkRuntime(dealId){
  var sb = _sb(); if(!sb) return null;

  // Fetch all extractions for this deal
  var res = await sb.from('framework_extractions')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false });
  var extractions = res.data || [];
  if(!extractions.length) return null;

  // Aggregate: take max score per field (most informed extraction wins)
  var sp = { situation:0, pain:0, impact:0, critical_event:0, decision:0 };
  var md = { metrics:0, economic:0, criteria:0, process:0, pain:0, champion:0 };
  var aux = { authority:0, urgency:0, intent:0, next_step:0, objection:0, note_quality:0, meeting_quality:0 };
  var gaps = {};
  var questions = [];
  var confidences = [];

  extractions.forEach(function(ex){
    var s = ex.spiced_json || {};
    if(s.situation && s.situation.score > sp.situation) sp.situation = s.situation.score;
    if(s.pain && s.pain.score > sp.pain) sp.pain = s.pain.score;
    if(s.impact && s.impact.score > sp.impact) sp.impact = s.impact.score;
    if(s.critical_event && s.critical_event.score > sp.critical_event) sp.critical_event = s.critical_event.score;
    if(s.decision && s.decision.score > sp.decision) sp.decision = s.decision.score;

    var m = ex.meddic_json || {};
    if(m.metrics && m.metrics.score > md.metrics) md.metrics = m.metrics.score;
    if(m.economic_buyer && m.economic_buyer.score > md.economic) md.economic = m.economic_buyer.score;
    if(m.decision_criteria && m.decision_criteria.score > md.criteria) md.criteria = m.decision_criteria.score;
    if(m.decision_process && m.decision_process.score > md.process) md.process = m.decision_process.score;
    if(m.identify_pain && m.identify_pain.score > md.pain) md.pain = m.identify_pain.score;
    if(m.champion && m.champion.score > md.champion) md.champion = m.champion.score;

    var a = ex.auxiliary_json || {};
    if((a.authority_score||0) > aux.authority) aux.authority = a.authority_score;
    if((a.urgency_score||0) > aux.urgency) aux.urgency = a.urgency_score;
    if((a.intent_score||0) > aux.intent) aux.intent = a.intent_score;
    if((a.next_step_clarity||0) > aux.next_step) aux.next_step = a.next_step_clarity;
    if((a.objection_score||0) > aux.objection) aux.objection = a.objection_score;
    if((a.note_quality_score||0) > aux.note_quality) aux.note_quality = a.note_quality_score;
    if((a.meeting_quality_score||0) > aux.meeting_quality) aux.meeting_quality = a.meeting_quality_score;

    if(ex.confidence_score) confidences.push(ex.confidence_score);

    // Collect gaps
    (ex.main_gaps || []).forEach(function(g){ gaps[g] = (gaps[g]||0) + 1; });
    // Collect questions (most recent first)
    if(questions.length < 5 && ex.next_best_questions){
      ex.next_best_questions.forEach(function(q){ if(questions.length < 5) questions.push(q); });
    }
  });

  var spiced_avg = +((sp.situation + sp.pain + sp.impact + sp.critical_event + sp.decision) / 5).toFixed(4);
  var meddic_avg = +((md.metrics + md.economic + md.criteria + md.process + md.pain + md.champion) / 6).toFixed(4);

  // Coverage: fields above 0.45 threshold
  var spiced_fields = [sp.situation, sp.pain, sp.impact, sp.critical_event, sp.decision];
  var spiced_coverage = +(spiced_fields.filter(function(v){ return v >= 0.45; }).length / 5).toFixed(4);
  var meddic_fields = [md.metrics, md.economic, md.criteria, md.process, md.pain, md.champion];
  var meddic_coverage = +(meddic_fields.filter(function(v){ return v >= 0.45; }).length / 6).toFixed(4);
  var overall_coverage = +((spiced_coverage + meddic_coverage) / 2).toFixed(4);

  // Confidence: avg of extraction confidences
  var confidence_score = confidences.length > 0
    ? +(confidences.reduce(function(a,b){return a+b;},0) / confidences.length).toFixed(4)
    : 0;

  // Top 3 gaps
  var gapsSorted = Object.keys(gaps).sort(function(a,b){ return gaps[b]-gaps[a]; });

  // Build runtime row
  var row = {
    deal_id: dealId,
    operator_email: extractions[0].operator_email || getOperatorId(),
    spiced_situation: sp.situation,
    spiced_pain: sp.pain,
    spiced_impact: sp.impact,
    spiced_critical_event: sp.critical_event,
    spiced_decision: sp.decision,
    spiced_avg: spiced_avg,
    meddic_metrics: md.metrics,
    meddic_economic: md.economic,
    meddic_criteria: md.criteria,
    meddic_process: md.process,
    meddic_pain: md.pain,
    meddic_champion: md.champion,
    meddic_avg: meddic_avg,
    authority_score: aux.authority,
    urgency_score: aux.urgency,
    intent_score: aux.intent,
    next_step_clarity: aux.next_step,
    objection_score: aux.objection,
    note_quality_score: aux.note_quality,
    meeting_quality_score: aux.meeting_quality,
    spiced_coverage: spiced_coverage,
    meddic_coverage: meddic_coverage,
    overall_coverage: overall_coverage,
    confidence_score: confidence_score,
    main_gap_1: gapsSorted[0] || null,
    main_gap_2: gapsSorted[1] || null,
    main_gap_3: gapsSorted[2] || null,
    recommended_questions: JSON.stringify(questions),
    extraction_count: extractions.length,
    last_source_type: extractions[0].source_type,
    updated_at: new Date().toISOString()
  };

  // V10: Framework Consistency Score
  // Mede concordância entre fontes e recência dos dados
  var sourceTypes = {};
  extractions.forEach(function(ex){ sourceTypes[ex.source_type||'unknown'] = true; });
  var distinctSources = Object.keys(sourceTypes).length;
  // Cross-source agreement: se >1 fonte concorda nas médias (desvio baixo)
  var cross_source_agreement = distinctSources >= 2 ? Math.min(1, 0.50 + (distinctSources - 1) * 0.20) : 0.30;
  // Recency alignment: quão recente é a última extração
  var lastExtMs = new Date(extractions[0].created_at || '').getTime();
  var daysSinceExt = isNaN(lastExtMs) ? 30 : Math.floor((Date.now() - lastExtMs) / 86400000);
  var recency_alignment = daysSinceExt <= 1 ? 1.0 : daysSinceExt <= 3 ? 0.85 : daysSinceExt <= 7 ? 0.65 : daysSinceExt <= 14 ? 0.40 : 0.20;
  // Evidence density
  var evidence_density = Math.min(1, extractions.length / 5);
  var framework_consistency_score = +(
    cross_source_agreement * 0.50 +
    recency_alignment * 0.30 +
    evidence_density * 0.20
  ).toFixed(4);
  row.framework_consistency_score = framework_consistency_score;

  // Calc qualitative_score
  row.qualitative_score = calcQualitativeScore(row);
  row.explain_json = JSON.stringify({
    spiced: sp, meddic: md, auxiliary: aux,
    coverage: { spiced: spiced_coverage, meddic: meddic_coverage, overall: overall_coverage },
    qualitative_score: row.qualitative_score,
    framework_consistency_score: framework_consistency_score,
    extraction_count: extractions.length
  });

  // Upsert
  var upsertRes = await sb.from('deal_framework_runtime').upsert(row, { onConflict: 'deal_id' });
  if(upsertRes.error) console.warn('[framework] consolidation error:', upsertRes.error.message);
  else console.log('[framework] consolidated deal ' + dealId + ' | qs=' + row.qualitative_score + ' coverage=' + overall_coverage);

  // Event
  await sb.from('framework_extraction_events').insert({
    deal_id: dealId,
    event_type: 'consolidation',
    delta_coverage: overall_coverage,
    delta_confidence: confidence_score,
    payload: JSON.stringify({ spiced_avg: spiced_avg, meddic_avg: meddic_avg, qs: row.qualitative_score })
  });

  // Attach to deal map
  var map = window._COCKPIT_DEAL_MAP || {};
  if(map[dealId]) map[dealId]._frameworkRuntime = row;

  return row;
}
window.consolidateFrameworkRuntime = consolidateFrameworkRuntime;

// Save a new framework extraction and re-consolidate
async function saveFrameworkExtraction(dealId, sourceType, sourceId, extractionResult){
  var sb = _sb(); if(!sb) return null;
  var email = getOperatorId();

  var row = {
    deal_id: dealId,
    operator_email: email,
    source_type: sourceType,
    source_id: sourceId,
    framework_version: 'v7.1',
    spiced_json: JSON.stringify(extractionResult.spiced || {}),
    meddic_json: JSON.stringify(extractionResult.meddic || {}),
    auxiliary_json: JSON.stringify(extractionResult.auxiliary || {}),
    coverage_json: JSON.stringify(extractionResult.coverage || {}),
    confidence_score: extractionResult.confidence || 0,
    main_gaps: JSON.stringify(extractionResult.main_gaps || []),
    next_best_questions: JSON.stringify(extractionResult.next_best_questions || []),
    raw_evidence: JSON.stringify(extractionResult.raw_evidence || [])
  };

  var res = await sb.from('framework_extractions').insert([row], { returning: 'representation' });
  if(res.error){ console.warn('[framework] save error:', res.error.message); return null; }

  // Event
  await sb.from('framework_extraction_events').insert({
    deal_id: dealId,
    source_type: sourceType,
    source_id: sourceId,
    event_type: 'extraction',
    payload: JSON.stringify({ source: sourceType, confidence: extractionResult.confidence })
  });

  // Re-consolidate
  return await consolidateFrameworkRuntime(dealId);
}
window.saveFrameworkExtraction = saveFrameworkExtraction;

// Build framework gap tasks for Task Runner
function buildFrameworkGapTasks(){
  var map = window._COCKPIT_DEAL_MAP || {};
  var tasks = [];
  Object.keys(map).forEach(function(id){
    var d = map[id];
    if((d.statusDeal||'').toLowerCase()==='perdido'||(d.statusDeal||'').toLowerCase()==='ganho') return;
    var fr = d._frameworkRuntime;
    if(!fr || fr.extraction_count === 0) return;
    if(fr.overall_coverage >= 0.70) return; // good enough

    var gapType = 'framework_gap_fill';
    var gapLabel = 'Cobrir gaps SPICED/MEDDIC';
    var gapPriority = 'medium';

    if(fr.authority_score < 0.30){
      gapType = 'authority_confirmation'; gapLabel = 'Confirmar economic buyer'; gapPriority = 'high';
    } else if(fr.spiced_pain < 0.30){
      gapType = 'pain_quantification'; gapLabel = 'Quantificar dor e impacto'; gapPriority = 'high';
    } else if(fr.meddic_champion < 0.30){
      gapType = 'framework_gap_fill'; gapLabel = 'Identificar champion interno'; gapPriority = 'medium';
    }

    var question = (fr.recommended_questions && fr.recommended_questions.length > 0)
      ? (typeof fr.recommended_questions === 'string' ? JSON.parse(fr.recommended_questions) : fr.recommended_questions)[0]
      : null;

    tasks.push({
      deal_id: id,
      deal: d,
      type: gapType,
      label: gapLabel,
      priority: gapPriority,
      sublabel: (d.nome||d.lead_name||'')+ ' — ' + (d._revLine||''),
      coverage: fr.overall_coverage,
      question: question,
      gap1: fr.main_gap_1,
      gap2: fr.main_gap_2
    });
  });

  // Sort: high priority first, then by lowest coverage
  tasks.sort(function(a,b){
    var po = { critical:0, high:1, medium:2, low:3 };
    var pa = po[a.priority]||3, pb = po[b.priority]||3;
    if(pa !== pb) return pa - pb;
    return (a.coverage||0) - (b.coverage||0);
  });

  return tasks;
}
window.buildFrameworkGapTasks = buildFrameworkGapTasks;

// ==================================================================
// LAYER 17 — FRAMEWORK UI
// Renderiza aba Framework no Deal Workspace e subtab na Intelligence.
// ==================================================================

function renderFrameworkPanel(dealId, containerId){
  var el = document.getElementById(containerId);
  if(!el) return;
  var map = window._COCKPIT_DEAL_MAP || {};
  var d = map[dealId];
  if(!d){ el.innerHTML = '<p>Deal nao encontrado.</p>'; return; }
  var fr = d._frameworkRuntime;

  if(!fr || fr.extraction_count === 0){
    el.innerHTML = '<div style="padding:16px;text-align:center;opacity:0.6;">Nenhuma extracao de framework ainda.<br>Analise uma nota ou reuniao para iniciar.</div>';
    return;
  }

  function bar(label, score, maxLabel){
    var pct = Math.round((score||0)*100);
    var color = pct >= 70 ? 'var(--color-green,#22c55e)' : pct >= 45 ? 'var(--color-yellow,#eab308)' : 'var(--color-red,#ef4444)';
    var state = pct >= 70 ? 'strong' : pct >= 45 ? 'partial' : pct >= 20 ? 'weak' : 'missing';
    return '<div style="display:flex;align-items:center;gap:8px;margin:3px 0;">'
      + '<span style="width:130px;font-size:12px;">'+_escHtml(label)+'</span>'
      + '<div style="flex:1;height:8px;background:var(--bg-2,#333);border-radius:4px;overflow:hidden;">'
      + '<div style="width:'+pct+'%;height:100%;background:'+color+';border-radius:4px;"></div></div>'
      + '<span style="width:42px;text-align:right;font-size:11px;font-weight:600;">'+pct+'%</span>'
      + '<span style="font-size:10px;opacity:0.6;">'+state+'</span>'
      + '</div>';
  }

  var html = '';

  // Qualitative Score badge
  var qs = fr.qualitative_score || 1.0;
  var qsColor = qs >= 0.80 ? '#22c55e' : qs >= 0.50 ? '#eab308' : '#ef4444';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
  html += '<div><span style="font-size:11px;text-transform:uppercase;opacity:0.5;">Qualitative Score</span><br>';
  html += '<span style="font-size:28px;font-weight:700;color:'+qsColor+';">'+qs.toFixed(2)+'</span></div>';
  html += '<div style="text-align:right;">';
  html += '<span style="font-size:11px;opacity:0.5;">Coverage</span><br>';
  html += '<span style="font-size:20px;font-weight:600;">'+Math.round((fr.overall_coverage||0)*100)+'%</span>';
  html += '</div></div>';

  // SPICED
  html += '<div style="margin-bottom:12px;"><div style="font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:4px;opacity:0.7;">SPICED <span style="float:right;font-weight:400;">avg '+(fr.spiced_avg||0).toFixed(2)+'</span></div>';
  html += bar('Situation', fr.spiced_situation);
  html += bar('Pain', fr.spiced_pain);
  html += bar('Impact', fr.spiced_impact);
  html += bar('Critical Event', fr.spiced_critical_event);
  html += bar('Decision', fr.spiced_decision);
  html += '</div>';

  // MEDDIC
  html += '<div style="margin-bottom:12px;"><div style="font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:4px;opacity:0.7;">MEDDIC <span style="float:right;font-weight:400;">avg '+(fr.meddic_avg||0).toFixed(2)+'</span></div>';
  html += bar('Metrics', fr.meddic_metrics);
  html += bar('Economic Buyer', fr.meddic_economic);
  html += bar('Decision Criteria', fr.meddic_criteria);
  html += bar('Decision Process', fr.meddic_process);
  html += bar('Identify Pain', fr.meddic_pain);
  html += bar('Champion', fr.meddic_champion);
  html += '</div>';

  // Gaps
  if(fr.main_gap_1){
    html += '<div style="margin-bottom:12px;padding:8px;background:var(--bg-2,#222);border-radius:6px;">';
    html += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;opacity:0.5;margin-bottom:4px;">Gaps</div>';
    if(fr.main_gap_1) html += '<div style="font-size:12px;color:var(--color-red,#ef4444);">• '+_escHtml(fr.main_gap_1)+'</div>';
    if(fr.main_gap_2) html += '<div style="font-size:12px;color:var(--color-yellow,#eab308);">• '+_escHtml(fr.main_gap_2)+'</div>';
    if(fr.main_gap_3) html += '<div style="font-size:12px;opacity:0.7;">• '+_escHtml(fr.main_gap_3)+'</div>';
    html += '</div>';
  }

  // Recommended questions
  var rq = fr.recommended_questions;
  if(typeof rq === 'string') try { rq = JSON.parse(rq); } catch(e){ rq = []; }
  if(rq && rq.length){
    html += '<div style="margin-bottom:8px;padding:8px;background:var(--bg-2,#222);border-radius:6px;">';
    html += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;opacity:0.5;margin-bottom:4px;">Perguntas Recomendadas</div>';
    rq.forEach(function(q){
      html += '<div style="font-size:12px;margin:2px 0;">→ '+_escHtml(q)+'</div>';
    });
    html += '</div>';
  }

  // Metadata
  html += '<div style="font-size:10px;opacity:0.4;margin-top:8px;">'+fr.extraction_count+' extracoes | Confianca: '+Math.round((fr.confidence_score||0)*100)+'% | Ultima: '+(fr.last_source_type||'—')+'</div>';

  el.innerHTML = html;
}
window.renderFrameworkPanel = renderFrameworkPanel;

// Intelligence subtab: Framework coverage by operator
async function loadFrameworkIntelligence(){
  var sb = _sb(); if(!sb) return null;
  var email = getOperatorId(); if(!email) return null;

  var res = await sb.from('deal_framework_runtime')
    .select('deal_id,spiced_avg,meddic_avg,overall_coverage,confidence_score,authority_score,spiced_pain,meddic_champion,extraction_count,main_gap_1')
    .eq('operator_email', email);
  var rows = res.data || [];
  if(!rows.length) return { total:0 };

  var total = rows.length;
  var spiced_strong = 0, meddic_strong = 0, low_coverage = 0;
  var gap_freq = {};
  var sum_spiced = 0, sum_meddic = 0, sum_coverage = 0;

  rows.forEach(function(r){
    sum_spiced += (r.spiced_avg||0);
    sum_meddic += (r.meddic_avg||0);
    sum_coverage += (r.overall_coverage||0);
    if(r.spiced_avg >= 0.70) spiced_strong++;
    if(r.meddic_avg >= 0.70) meddic_strong++;
    if(r.overall_coverage < 0.30) low_coverage++;
    if(r.main_gap_1) gap_freq[r.main_gap_1] = (gap_freq[r.main_gap_1]||0) + 1;
  });

  var top_gaps = Object.keys(gap_freq).sort(function(a,b){ return gap_freq[b]-gap_freq[a]; }).slice(0,5);

  return {
    total: total,
    spiced_avg: +(sum_spiced/total).toFixed(4),
    meddic_avg: +(sum_meddic/total).toFixed(4),
    coverage_avg: +(sum_coverage/total).toFixed(4),
    spiced_strong_pct: +(spiced_strong/total).toFixed(4),
    meddic_strong_pct: +(meddic_strong/total).toFixed(4),
    low_coverage_count: low_coverage,
    top_gaps: top_gaps.map(function(g){ return { gap:g, count:gap_freq[g] }; })
  };
}
window.loadFrameworkIntelligence = loadFrameworkIntelligence;

// ==================================================================
// LAYER 18 — SIGNAL ENGINE (V8)
// Detecta, calcula, persiste e roteia sinais por deal.
// Integra com Forecast V7 (signal_total ajusta forecast_score).
// Alimenta Task Runner com filas automáticas por sinal negativo.
// Expõe renderSignalBadge(), loadSignalIntelligence(), calcSignalAlerts().
// ==================================================================

// Signal Registry — pesos e polaridade canônicos (fonte: elucy-signal-engine.md Doc42)
var SIGNAL_REGISTRY = {
  // Behavioral
  lead_replied_fast:      { cat:'behavioral', pol:+1, w:0.10, label:'Respondeu rápido' },
  lead_slow_response:     { cat:'behavioral', pol:-1, w:0.08, label:'Resposta lenta' },
  lead_ghosting:          { cat:'behavioral', pol:-1, w:0.30, label:'Lead sumiu' },
  lead_requested_price:   { cat:'behavioral', pol:+1, w:0.20, label:'Pediu proposta' },
  lead_requested_time:    { cat:'behavioral', pol:-1, w:0.15, label:'Pediu adiamento' },
  lead_no_show:           { cat:'behavioral', pol:-1, w:0.25, label:'No-show' },
  lead_rescheduled:       { cat:'behavioral', pol:-1, w:0.10, label:'Reagendou' },
  lead_engaged_dm:        { cat:'behavioral', pol:+1, w:0.12, label:'Engajou no DM' },
  lead_opened_material:   { cat:'behavioral', pol:+1, w:0.08, label:'Abriu material' },
  lead_asked_references:  { cat:'behavioral', pol:+1, w:0.15, label:'Pediu referências' },
  // Framework
  pain_detected:          { cat:'framework',  pol:+1, w:0.15, label:'Dor identificada' },
  impact_defined:         { cat:'framework',  pol:+1, w:0.12, label:'Impacto definido' },
  critical_event_defined: { cat:'framework',  pol:+1, w:0.18, label:'Evento crítico' },
  economic_buyer_present: { cat:'framework',  pol:+1, w:0.20, label:'Decisor presente' },
  decision_process_known: { cat:'framework',  pol:+1, w:0.10, label:'Processo decisório mapeado' },
  champion_detected:      { cat:'framework',  pol:+1, w:0.15, label:'Champion detectado' },
  metrics_defined:        { cat:'framework',  pol:+1, w:0.10, label:'Métricas definidas' },
  next_step_defined:      { cat:'framework',  pol:+1, w:0.15, label:'Próximo passo claro' },
  pain_missing:           { cat:'framework',  pol:-1, w:0.15, label:'Dor não mapeada' },
  authority_missing:      { cat:'framework',  pol:-1, w:0.20, label:'Decisor não mapeado' },
  no_critical_event:      { cat:'framework',  pol:-1, w:0.15, label:'Sem urgência/evento' },
  champion_missing:       { cat:'framework',  pol:-1, w:0.10, label:'Sem champion interno' },
  // Pipeline
  aging_high:             { cat:'pipeline',   pol:-1, w:0.15, label:'Aging alto' },
  sla_risk:               { cat:'pipeline',   pol:-1, w:0.12, label:'Risco de SLA' },
  stage_stuck:            { cat:'pipeline',   pol:-1, w:0.18, label:'Deal travado' },
  no_touch_recent:        { cat:'pipeline',   pol:-1, w:0.12, label:'Sem toque recente' },
  too_many_touchpoints:   { cat:'pipeline',   pol:-1, w:0.08, label:'Muitos toques sem avanço' },
  fast_progress:          { cat:'pipeline',   pol:+1, w:0.12, label:'Progresso rápido' },
  meeting_scheduled:      { cat:'pipeline',   pol:+1, w:0.15, label:'Reunião agendada' },
  // Quality
  note_good:              { cat:'quality',    pol:+1, w:0.08, label:'Nota de qualidade' },
  note_bad:               { cat:'quality',    pol:-1, w:0.10, label:'Nota fraca' },
  no_note:                { cat:'quality',    pol:-1, w:0.15, label:'Sem notas' },
  no_next_step:           { cat:'quality',    pol:-1, w:0.20, label:'Sem próximo passo' },
  meeting_logged:         { cat:'quality',    pol:+1, w:0.10, label:'Reunião registrada' },
  meeting_missing:        { cat:'quality',    pol:-1, w:0.12, label:'Reunião não registrada' },
  no_show_not_treated:    { cat:'quality',    pol:-1, w:0.20, label:'No-show não tratado' },
  low_context:            { cat:'quality',    pol:-1, w:0.08, label:'Contexto insuficiente' },
  // Forecast
  forecast_high_confidence:{ cat:'forecast',  pol:+1, w:0.10, label:'Alta confiança' },
  forecast_low_confidence: { cat:'forecast',  pol:-1, w:0.15, label:'Baixa confiança' },
  pipeline_inflated:      { cat:'forecast',   pol:-1, w:0.20, label:'Pipeline inflado' },
  forecast_drop:          { cat:'forecast',   pol:-1, w:0.12, label:'Forecast caindo' },
  forecast_up:            { cat:'forecast',   pol:+1, w:0.10, label:'Forecast subindo' },
  qualitative_strong:     { cat:'forecast',   pol:+1, w:0.12, label:'Score qualitativo alto' },
  qualitative_weak:       { cat:'forecast',   pol:-1, w:0.10, label:'Score qualitativo baixo' },
  // Revenue
  high_value_deal:        { cat:'revenue',    pol:+1, w:0.10, label:'Deal alto valor' },
  low_ticket:             { cat:'revenue',    pol:-1, w:0.08, label:'Ticket baixo' },
  high_priority_line:     { cat:'revenue',    pol:+1, w:0.08, label:'Linha prioritária' },
  low_priority_line:      { cat:'revenue',    pol:-1, w:0.05, label:'Linha baixa prioridade' },
  strategic_account:      { cat:'revenue',    pol:+1, w:0.15, label:'Conta estratégica' }
};
window.SIGNAL_REGISTRY = SIGNAL_REGISTRY;

// Mapeamento sinal negativo → tipo de task automática
var SIGNAL_TASK_MAP = {
  no_next_step:          'next_step_fix',
  aging_high:            'fup',
  stage_stuck:           'fup',
  lead_no_show:          'reschedule',
  no_show_not_treated:   'reschedule',
  authority_missing:     'authority_confirmation',
  pain_missing:          'pain_quantification',
  lead_ghosting:         'reativacao',
  forecast_low_confidence: 'forecast_repair',
  no_note:               'note_quality',
  no_touch_recent:       'fup'
};

// Detecta sinais de um deal com base em campos calculados do runtime
function detectSignals(deal){
  var signals = [];
  var fr  = deal._frameworkRuntime || {};
  var fc  = deal._forecastV6 || {};
  var rl  = REVENUE_LINES[deal._revLine] || {};
  var ag  = deal._aging || 0;

  function add(type, extras){
    var def = SIGNAL_REGISTRY[type];
    if(!def) return;
    signals.push(Object.assign({ signal_type: type, deal_id: deal.dealId || deal.deal_id, source:'engine' }, def, extras||{}));
  }

  // == PIPELINE ==
  if(ag > 0 && rl.risk_after && ag > rl.risk_after)   add('aging_high');
  if(ag > 7)                                            add('stage_stuck');
  if(ag > 5 && !deal._lastTouch)                       add('no_touch_recent');

  var tpCount = deal.touchpointCount || 0;
  if(tpCount > 8 && ag > 3)                            add('too_many_touchpoints');
  if(ag <= 2 && (deal._stageDelta||0) >= 1)            add('fast_progress');
  if(deal.meetingStatus === 'scheduled' || deal.reuniao_agendada) add('meeting_scheduled');

  // == FRAMEWORK ==
  if(fr.spiced_pain >= 0.60)       add('pain_detected');
  else if(fr.spiced_pain < 0.25)   add('pain_missing');

  if(fr.spiced_impact >= 0.50)     add('impact_defined');
  if(fr.spiced_critical_event >= 0.50) add('critical_event_defined');
  else if(fr.spiced_critical_event < 0.20) add('no_critical_event');

  if(fr.meddic_economic >= 0.60)   add('economic_buyer_present');
  else if(fr.authority_score < 0.30 || fr.meddic_economic < 0.25) add('authority_missing');

  if(fr.decision_process_known >= 0.50 || fr.meddic_process >= 0.50) add('decision_process_known');
  if(fr.meddic_champion >= 0.55)   add('champion_detected');
  else if(fr.meddic_champion < 0.25) add('champion_missing');

  if(fr.meddic_metrics >= 0.50)    add('metrics_defined');

  if(fr.next_step_clarity >= 0.60) add('next_step_defined');
  else if(fr.next_step_clarity < 0.25) add('no_next_step');

  // == QUALITY ==
  var noteQ = fr.note_quality_score || 0;
  if(noteQ >= 0.70)   add('note_good');
  else if(noteQ > 0 && noteQ < 0.30) add('note_bad');
  else if(noteQ === 0 && fr.extraction_count === 0) add('no_note');

  if(fr.meeting_quality_score >= 0.60)  add('meeting_logged');
  else if(deal._hasMeeting && fr.meeting_quality_score < 0.20) add('meeting_missing');

  if(deal.noShowUnresolved) add('no_show_not_treated');

  var contextFields = ['nome','empresa','cargo','telefone','email','grupo_de_receita','linha_de_receita_vigente'].filter(function(f){ return !!(deal[f]); }).length;
  if(contextFields < 3) add('low_context');

  // == FORECAST ==
  var conf = fc.confidence || fr.confidence_score || 0;
  if(conf >= 0.75)  add('forecast_high_confidence');
  else if(conf < 0.30) add('forecast_low_confidence');

  var qs = fr.qualitative_score || 1.0;
  if(qs >= 0.85)  add('qualitative_strong');
  else if(qs < 0.40) add('qualitative_weak');

  var prevForecast = deal._forecastPrev || 0;
  var currForecast = fc.score || 0;
  if(prevForecast > 0 && currForecast < prevForecast * 0.80) add('forecast_drop');
  if(prevForecast > 0 && currForecast > prevForecast * 1.15) add('forecast_up');

  // == REVENUE ==
  var oppVal = deal._oppValue || deal.opportunityValue || 0;
  if(oppVal > 50000)           add('high_value_deal');
  if(rl.line_weight >= 0.90)   add('high_priority_line');
  else if(rl.line_weight <= 0.60) add('low_priority_line');

  var tier = (deal.tier_da_oportunidade||deal.tier||'').toLowerCase();
  if(tier === 'diamond')       add('strategic_account');

  // == BEHAVIORAL (baseado em meetingStatus e touchpoint patterns) ==
  if((deal.meetingStatus||'') === 'no_show') add('lead_no_show');
  if(deal.leadRequestedPrice)  add('lead_requested_price');
  if(deal.leadGhosting)        add('lead_ghosting');
  if(deal.leadRescheduled)     add('lead_rescheduled');

  // Telemetry: emit signal detection event
  if(signals.length && typeof emitTelemetry === 'function'){
    var sigTypes = signals.map(function(s){ return s.signal_type; });
    emitTelemetry({
      event_type: 'signal_detected',
      deal_id: deal.dealId || deal.deal_id,
      dag_phase: 3,
      layer_processed: 18,
      layer_name: 'Signal V8',
      signal_detected: sigTypes,
      metadata: { count: signals.length, pos: signals.filter(function(s){return s.pol>0}).length, neg: signals.filter(function(s){return s.pol<0}).length }
    });
  }

  return signals;
}
window.detectSignals = detectSignals;

// Calcula score consolidado a partir de lista de sinais
function calcSignalScore(signals){
  var pos = 0, neg = 0;
  var catScores = { behavioral:0, framework:0, pipeline:0, quality:0, forecast:0, revenue:0 };
  var posSignals = [], negSignals = [];

  // V10: Signal Redundancy Dedup — penaliza sinais que sobrepõem framework/forecast
  var frameworkSignals = {};
  var forecastSignals = {};
  signals.forEach(function(s){
    var def = SIGNAL_REGISTRY[s.signal_type];
    if(!def) return;
    if(def.cat === 'framework') frameworkSignals[s.signal_type] = true;
    if(def.cat === 'forecast') forecastSignals[s.signal_type] = true;
  });

  signals.forEach(function(s){
    var def = SIGNAL_REGISTRY[s.signal_type];
    if(!def) return;
    var baseW = def.w || s.weight || 0;
    // V10: Redundancy penalty — sinais pipeline/quality que repetem info de framework/forecast
    var redundancy = 0;
    if(def.cat === 'pipeline' || def.cat === 'quality'){
      if(s.signal_type === 'no_next_step' && frameworkSignals.next_step_defined) redundancy += 0.40;
      if(s.signal_type === 'no_touch_recent' && forecastSignals.forecast_low_confidence) redundancy += 0.30;
      if(s.signal_type === 'no_note' && frameworkSignals.pain_missing) redundancy += 0.25;
    }
    redundancy = Math.min(1, redundancy);
    var w = +(baseW * (1 - redundancy)).toFixed(4);
    s.effective_weight = w;
    var impact = +(w * def.pol).toFixed(4);
    s.impact_score = impact;
    catScores[def.cat] = +(( catScores[def.cat]||0 ) + Math.abs(w) * def.pol).toFixed(4);
    if(def.pol > 0){ pos = +(pos + w).toFixed(4); posSignals.push(s); }
    else            { neg = +(neg + w).toFixed(4); negSignals.push(s); }
  });

  // Normalise category scores [-1, +1]
  Object.keys(catScores).forEach(function(c){
    catScores[c] = +Math.max(-1, Math.min(1, catScores[c])).toFixed(4);
  });

  var total = +Math.max(-1, Math.min(1, pos - neg)).toFixed(4);
  var riskLevel = total >= 0.30 ? 'low' : total >= 0.10 ? 'medium' : total >= -0.10 ? 'high' : 'critical';

  posSignals.sort(function(a,b){ return (b.weight||0)-(a.weight||0); });
  negSignals.sort(function(a,b){ return (b.weight||0)-(a.weight||0); });

  return {
    positive_score: pos,
    negative_score: neg,
    signal_total: total,
    risk_level: riskLevel,
    behavioral_score: catScores.behavioral,
    framework_score:  catScores.framework,
    pipeline_score:   catScores.pipeline,
    quality_score:    catScores.quality,
    forecast_score:   catScores.forecast,
    revenue_score:    catScores.revenue,
    signal_count:     signals.length,
    positive_count:   posSignals.length,
    negative_count:   negSignals.length,
    top_positive_signals: posSignals.slice(0,3).map(function(s){ return { type:s.signal_type, label:SIGNAL_REGISTRY[s.signal_type].label, w:s.weight }; }),
    top_negative_signals: negSignals.slice(0,3).map(function(s){ return { type:s.signal_type, label:SIGNAL_REGISTRY[s.signal_type].label, w:s.weight }; }),
    explain_json: { categories: catScores, positive_total: pos, negative_total: neg }
  };
}
window.calcSignalScore = calcSignalScore;

// Ajuste do Forecast V7 com signal_total
// forecast_adjusted = raw × qualitative_score × (1 + signal_total), clamped [0,1]
function adjustForecastWithSignals(forecastRaw, qualitativeScore, signalTotal){
  var adjusted = (forecastRaw||0) * (qualitativeScore||1.0) * (1 + (signalTotal||0));
  return +Math.max(0, Math.min(1, adjusted)).toFixed(4);
}
window.adjustForecastWithSignals = adjustForecastWithSignals;

// Persiste sinais e runtime no Supabase para um deal
async function persistSignals(dealId, signals, scoreData, operatorEmail){
  var sb = _sb(); if(!sb) return;
  var email = operatorEmail || getOperatorId();

  // Upsert runtime (snapshot consolidado)
  var runtimeRow = Object.assign({ deal_id: dealId, operator_email: email, updated_at: new Date().toISOString() }, scoreData);
  runtimeRow.top_positive_signals = JSON.stringify(scoreData.top_positive_signals||[]);
  runtimeRow.top_negative_signals = JSON.stringify(scoreData.top_negative_signals||[]);
  runtimeRow.explain_json = JSON.stringify(scoreData.explain_json||{});

  var rtRes = await sb.from('deal_signal_runtime').upsert(runtimeRow, { onConflict:'deal_id' });
  if(rtRes.error) console.warn('[signals] runtime upsert error:', rtRes.error.message);

  // Insert individual signals (append-only)
  var rows = signals.map(function(s){
    return {
      deal_id: dealId,
      operator_email: email,
      signal_type: s.signal_type,
      signal_category: s.cat || (SIGNAL_REGISTRY[s.signal_type]||{}).cat || 'pipeline',
      signal_value: s.signal_value || 0,
      weight: s.w || (SIGNAL_REGISTRY[s.signal_type]||{}).w || 0,
      impact_score: s.impact_score || 0,
      description: s.label || (SIGNAL_REGISTRY[s.signal_type]||{}).label || s.signal_type,
      payload: JSON.stringify(s.payload||{}),
      source: s.source || 'engine',
      version: 'v8'
    };
  });

  if(rows.length){
    var insRes = await sb.from('deal_signals').insert(rows);
    if(insRes.error) console.warn('[signals] insert error:', insRes.error.message);
  }
}
window.persistSignals = persistSignals;

// Roda o Signal Engine para todos os deals do operador
// Atualiza _COCKPIT_DEAL_MAP[dealId]._signals e _signalScore
async function runSignalEngine(persist){
  var map = window._COCKPIT_DEAL_MAP || {};
  var email = getOperatorId();
  var tasks = [];

  Object.keys(map).forEach(function(id){
    var d = map[id];
    var status = (d.statusDeal||'').toLowerCase();
    if(status === 'perdido' || status === 'ganho') return; // apenas ativos

    var signals  = detectSignals(d);
    var scoreData = calcSignalScore(signals);

    d._signals    = signals;
    d._signalScore = scoreData;

    // Integrar com forecast V7 se disponível
    if(d._forecastV6 && d._frameworkRuntime){
      d._forecastV6.score_adjusted = adjustForecastWithSignals(
        d._forecastV6.score || 0,
        d._frameworkRuntime.qualitative_score || 1.0,
        scoreData.signal_total
      );
    }

    // Coletar tasks automáticas por sinais negativos
    scoreData.top_negative_signals.forEach(function(ns){
      var taskType = SIGNAL_TASK_MAP[ns.type];
      if(taskType){
        tasks.push({ deal_id:id, deal:d, type:taskType, signal:ns.type, label:ns.label, priority: scoreData.risk_level === 'critical' ? 'critical' : 'high' });
      }
    });

    if(persist){
      persistSignals(id, signals, scoreData, email).catch(function(e){ console.warn('[signals] persist err', e); });
    }
  });

  // Expor tasks para o Task Runner
  window._SIGNAL_TASKS = tasks;
  console.log('[signals] engine ran — '+Object.keys(map).length+' deals, '+tasks.length+' signal tasks');
  return tasks;
}
window.runSignalEngine = runSignalEngine;

// Constrói tasks automáticas do Signal Engine para o Task Runner
function buildSignalTasks(){
  return window._SIGNAL_TASKS || [];
}
window.buildSignalTasks = buildSignalTasks;

// Renderiza badge de sinais para uso no deal card e deal workspace
// Returns HTML string
function renderSignalBadge(deal, compact){
  var sc = deal._signalScore;
  if(!sc) return '';
  var total = sc.signal_total || 0;
  var risk  = sc.risk_level || 'medium';
  var color = risk==='low' ? 'var(--green)' : risk==='medium' ? 'var(--yellow)' : risk==='critical' ? 'var(--red)' : 'var(--red)';
  var bg    = risk==='low' ? 'var(--gdim)' : risk==='medium' ? 'var(--ydim)' : 'var(--rdim)';
  var sign  = total >= 0 ? '+' : '';
  var label = sign + total.toFixed(2);

  if(compact){
    var zapSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="9" height="9"><path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2z"/></svg>'; return '<span style="background:'+bg+';border:1px solid '+color+';border-radius:4px;padding:1px 5px;font-size:10px;font-weight:700;color:'+color+';">⚡'+label+'</span>';
  }

  var html = '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:8px 10px;margin-top:8px;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">';
  html += '<span style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);">Sinais</span>';
  html += '<span style="background:'+bg+';border:1px solid '+color+';border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700;color:'+color+';">'+label+' · '+risk+'</span>';
  html += '</div>';

  sc.top_positive_signals.slice(0,2).forEach(function(s){
    html += '<div style="font-size:11px;color:var(--green);margin:1px 0;">+ '+(s.label||s.type)+'</div>';
  });
  sc.top_negative_signals.slice(0,2).forEach(function(s){
    html += '<div style="font-size:11px;color:var(--red);margin:1px 0;">− '+(s.label||s.type)+'</div>';
  });

  html += '</div>';
  return html;
}
window.renderSignalBadge = renderSignalBadge;

// Renderiza painel completo de sinais no Deal Workspace
function renderSignalPanel(dealId, containerId){
  var el = document.getElementById(containerId);
  if(!el) return;
  var map = window._COCKPIT_DEAL_MAP || {};
  var d = map[dealId];
  if(!d || !d._signalScore){
    el.innerHTML = '<div style="padding:16px;text-align:center;opacity:0.5;font-size:12px;">Nenhum sinal detectado ainda.</div>';
    return;
  }
  var sc = d._signalScore;
  var signals = d._signals || [];
  var total = sc.signal_total || 0;
  var risk  = sc.risk_level || 'medium';
  var riskColor = risk==='low' ? 'var(--green)' : risk==='medium' ? 'var(--yellow)' : 'var(--red)';
  var riskBg    = risk==='low' ? 'var(--gdim)' : risk==='medium' ? 'var(--ydim)' : 'var(--rdim)';
  var sign = total >= 0 ? '+' : '';

  var html = '';

  // Score header
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
  html += '<div>';
  html += '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:2px;">Signal Score</div>';
  html += '<div style="font-size:28px;font-weight:800;color:'+riskColor+';">'+sign+total.toFixed(2)+'</div>';
  html += '</div>';
  html += '<div style="text-align:right;">';
  html += '<div style="background:'+riskBg+';border:1px solid '+riskColor+';border-radius:6px;padding:4px 10px;font-size:12px;font-weight:700;color:'+riskColor+';">'+risk.toUpperCase()+'</div>';
  html += '<div style="font-size:10px;color:var(--text2);margin-top:3px;">'+sc.positive_count+' pos · '+sc.negative_count+' neg</div>';
  html += '</div></div>';

  // Forecast ajustado
  if(d._forecastV6 && d._forecastV6.score_adjusted !== undefined){
    var fa = d._forecastV6.score_adjusted;
    var fr = d._forecastV6.score || 0;
    var delta = fa - fr;
    var ds = delta >= 0 ? '+' : '';
    html += '<div style="background:var(--glass);border:1px solid var(--border);border-radius:6px;padding:8px 10px;margin-bottom:10px;font-size:12px;">';
    html += '<span style="opacity:0.6;">Forecast ajustado: </span><strong>'+Math.round(fa*100)+'%</strong>';
    html += ' <span style="font-size:10px;color:'+(delta>=0?'var(--green)':'var(--red)')+';">('+ds+Math.round(delta*100)+'pp vs raw)</span>';
    html += '</div>';
  }

  // Sinais por categoria
  var cats = { behavioral:'Comportamental', framework:'Framework', pipeline:'Pipeline', quality:'Qualidade', forecast:'Forecast', revenue:'Receita' };
  Object.keys(cats).forEach(function(cat){
    var catSigs = signals.filter(function(s){ return (SIGNAL_REGISTRY[s.signal_type]||{}).cat === cat; });
    if(!catSigs.length) return;
    html += '<div style="margin-bottom:8px;">';
    html += '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);margin-bottom:3px;">'+cats[cat]+'</div>';
    catSigs.forEach(function(s){
      var def = SIGNAL_REGISTRY[s.signal_type];
      if(!def) return;
      var c = def.pol > 0 ? 'var(--green)' : 'var(--red)';
      var pfx = def.pol > 0 ? '+' : '−';
      html += '<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;">';
      html += '<span style="color:'+c+';">'+pfx+' '+_escHtml(def.label)+'</span>';
      html += '<span style="opacity:0.5;">'+def.w.toFixed(2)+'</span>';
      html += '</div>';
    });
    html += '</div>';
  });

  el.innerHTML = html;
}
window.renderSignalPanel = renderSignalPanel;

// Carrega dados agregados de sinais para a aba Intelligence
async function loadSignalIntelligence(){
  var sb = _sb(); if(!sb) return null;
  var email = getOperatorId(); if(!email) return null;

  var res = await sb.from('deal_signal_runtime')
    .select('deal_id,signal_total,risk_level,behavioral_score,framework_score,pipeline_score,quality_score,forecast_score,positive_count,negative_count,signal_count,top_negative_signals,updated_at')
    .eq('operator_email', email);
  var rows = res.data || [];
  if(!rows.length) return { total:0, rows:[] };

  var total = rows.length;
  var riskCounts = { low:0, medium:0, high:0, critical:0 };
  var signalFreq = {};
  var sumTotal = 0;

  rows.forEach(function(r){
    riskCounts[r.risk_level||'medium']++;
    sumTotal += (r.signal_total||0);
    // Top negative signals para frequência
    var negs = typeof r.top_negative_signals === 'string' ? JSON.parse(r.top_negative_signals||'[]') : (r.top_negative_signals||[]);
    negs.forEach(function(s){ signalFreq[s.type] = (signalFreq[s.type]||0) + 1; });
  });

  var topSignals = Object.keys(signalFreq).sort(function(a,b){ return signalFreq[b]-signalFreq[a]; }).slice(0,10);

  return {
    total: total,
    avg_signal_total: +(sumTotal/total).toFixed(4),
    risk_distribution: riskCounts,
    critical_count: riskCounts.critical,
    high_count: riskCounts.high,
    top_negative_signals: topSignals.map(function(t){ return { type:t, label:(SIGNAL_REGISTRY[t]||{}).label||t, count: signalFreq[t] }; }),
    rows: rows
  };
}
window.loadSignalIntelligence = loadSignalIntelligence;

// Alertas automáticos baseados no estado do pipeline
function calcSignalAlerts(intelligenceData){
  if(!intelligenceData || !intelligenceData.total) return [];
  var d = intelligenceData;
  var total = d.total;
  var alerts = [];

  // % de deals sem next step
  var noNextStep = (d.top_negative_signals||[]).find(function(s){ return s.type==='no_next_step'; });
  if(noNextStep && noNextStep.count/total > 0.30){
    alerts.push({ level:'warning', msg:'+'+(Math.round(noNextStep.count/total*100))+'% dos deals sem próximo passo definido' });
  }

  // No-show não tratado
  var noShowUnt = (d.top_negative_signals||[]).find(function(s){ return s.type==='no_show_not_treated'; });
  if(noShowUnt && noShowUnt.count >= 3){
    alerts.push({ level:'danger', msg:noShowUnt.count+' no-shows não tratados — lead perdendo temperatura' });
  }

  // Pipeline médio negativo
  if(d.avg_signal_total < -0.10){
    alerts.push({ level:'danger', msg:'Pipeline em risco — signal médio '+d.avg_signal_total.toFixed(2) });
  }

  // Decisor não mapeado
  var authMiss = (d.top_negative_signals||[]).find(function(s){ return s.type==='authority_missing'; });
  if(authMiss && authMiss.count/total > 0.40){
    alerts.push({ level:'warning', msg:'+'+(Math.round(authMiss.count/total*100))+'% dos deals sem decisor mapeado' });
  }

  // Muitos críticos
  if(d.critical_count >= 3){
    alerts.push({ level:'danger', msg:d.critical_count+' deals em estado crítico — ação imediata necessária' });
  }

  return alerts;
}
window.calcSignalAlerts = calcSignalAlerts;

// ==================================================================
// LAYER 19 — DATA QUALITY ENGINE (V10)
// Mede confiabilidade do deal para forecast, score, analytics e priorização.
// Output: data_trust_score 0-1, data_quality_band (high/medium/low/critical).
// Persiste em deal_data_quality_runtime.
// ==================================================================

function calcDataQualityV19(deal, notesData, meetingsData){
  var fr = deal._frameworkRuntime || {};
  var fc = deal._forecastV6 || {};

  // -- 1) Completeness Score --
  var has = function(v){ return v !== null && v !== undefined && v !== '' && v !== 0; };
  var completeness_score =
    (has(deal.etapa || deal.pipeline_stage || deal._stage) ? 0.10 : 0) +
    (has(deal.statusDeal || deal.deal_status) ? 0.05 : 0) +
    (has(deal._persona || deal.persona) ? 0.10 : 0) +
    (has(deal._framework || fr.framework_version) ? 0.10 : 0) +
    (has(deal._nextAction || deal.next_best_action) ? 0.10 : 0) +
    (has(fr.spiced_coverage) && fr.spiced_coverage > 0 ? 0.15 : 0) +
    (has(fr.overall_coverage) && fr.overall_coverage > 0 ? 0.15 : 0) +
    (has(fc.forecast_confidence) && fc.forecast_confidence > 0 ? 0.15 : 0) +
    ((notesData && notesData.count > 0) ? 0.10 : 0);

  // -- 2) Consistency Score --
  var status = (deal.statusDeal || deal.deal_status || '').toLowerCase();
  var stage = (deal.etapa || deal.pipeline_stage || deal._stage || '').toLowerCase();
  var showState = deal._showState || deal.show_state || '';
  var meetCount = (meetingsData && meetingsData.count) || 0;

  var status_stage_conflict = ((status === 'ganho' || status === 'perdido' || status === 'won' || status === 'lost')
    && stage.indexOf('negoci') < 0 && stage.indexOf('proposta') < 0 && stage.indexOf('ganho') < 0 && stage.indexOf('perdido') < 0
    && stage.length > 0) ? 1 : 0;
  var show_without_meeting = (showState === 'show' && meetCount === 0) ? 1 : 0;
  var high_conf_low_coverage = ((fc.forecast_confidence || 0) > 0.80 && (fr.overall_coverage || 0) < 0.20) ? 1 : 0;
  var advanced_low_authority = ((stage.indexOf('negoci') >= 0 || stage.indexOf('proposta') >= 0 || stage.indexOf('oportunidade') >= 0)
    && (fr.authority_score || 0) < 0.20) ? 1 : 0;

  var consistency_penalty =
    (status_stage_conflict * 0.35) +
    (show_without_meeting * 0.20) +
    (high_conf_low_coverage * 0.25) +
    (advanced_low_authority * 0.20);
  var consistency_score = 1 - Math.min(1, Math.max(0, consistency_penalty));

  // -- 3) Recency Score --
  var lastTouch = deal._lastTouch ? new Date(deal._lastTouch) : null;
  var lastNote = (notesData && notesData.last_at) ? new Date(notesData.last_at) : null;
  var lastMeeting = (meetingsData && meetingsData.last_at) ? new Date(meetingsData.last_at) : null;
  var candidates = [lastTouch, lastNote, lastMeeting].filter(function(d){ return d && !isNaN(d.getTime()); });
  var lastEventAt = candidates.length > 0 ? new Date(Math.max.apply(null, candidates)) : null;
  var daysSince = lastEventAt ? Math.max(0, (Date.now() - lastEventAt.getTime()) / 86400000) : 30;

  var recency_score;
  if(daysSince <= 1) recency_score = 1.00;
  else if(daysSince <= 3) recency_score = 0.85;
  else if(daysSince <= 7) recency_score = 0.65;
  else if(daysSince <= 14) recency_score = 0.40;
  else recency_score = 0.20;

  // -- 4) Evidence Score --
  var nc = (notesData && notesData.count) || 0;
  var mc = meetCount;
  var notes_density = nc >= 3 ? 1.00 : nc === 2 ? 0.75 : nc === 1 ? 0.50 : 0.10;
  var meetings_density = mc >= 2 ? 1.00 : mc === 1 ? 0.70 : 0.20;
  var evidence_score = (notes_density * 0.55) + (meetings_density * 0.45);

  // -- Final Score --
  var data_trust_score = +(
    (completeness_score * 0.30) +
    (consistency_score * 0.30) +
    (recency_score * 0.20) +
    (evidence_score * 0.20)
  ).toFixed(4);
  data_trust_score = Math.min(1, Math.max(0, data_trust_score));

  var band = data_trust_score >= 0.80 ? 'high' : data_trust_score >= 0.60 ? 'medium' : data_trust_score >= 0.40 ? 'low' : 'critical';

  return {
    completeness_score: +completeness_score.toFixed(4),
    consistency_score: +consistency_score.toFixed(4),
    recency_score: +recency_score.toFixed(4),
    evidence_score: +evidence_score.toFixed(4),
    data_trust_score: data_trust_score,
    data_quality_band: band,
    explain_json: JSON.stringify({
      completeness: completeness_score, consistency: consistency_score,
      recency: recency_score, evidence: evidence_score,
      penalties: { status_stage_conflict: status_stage_conflict, show_without_meeting: show_without_meeting,
        high_conf_low_coverage: high_conf_low_coverage, advanced_low_authority: advanced_low_authority },
      days_since_last_event: Math.round(daysSince), notes_count: nc, meetings_count: mc
    })
  };
}
window.calcDataQualityV19 = calcDataQualityV19;

async function syncDataQualityRuntimeV19(){
  var sb = _sb(); if(!sb) return null;
  var email = getOperatorId(); if(!email) return null;
  var map = window._COCKPIT_DEAL_MAP || {};
  var dealIds = Object.keys(map);
  if(!dealIds.length) return null;

  // Batch load notes and meetings counts
  var notesRes = await sb.rpc('get_notes_summary_by_deals', { deal_ids: dealIds }).catch(function(){ return { data: null }; });
  var meetRes = await sb.rpc('get_meetings_summary_by_deals', { deal_ids: dealIds }).catch(function(){ return { data: null }; });

  // Fallback: load from tables directly if RPCs don't exist
  var notesMap = {};
  var meetingsMap = {};

  if(notesRes && notesRes.data){
    (notesRes.data || []).forEach(function(r){ notesMap[r.deal_id] = r; });
  } else {
    var nRes = await sb.from('note_analysis').select('deal_id,created_at').in('deal_id', dealIds);
    (nRes.data || []).forEach(function(r){
      if(!notesMap[r.deal_id]) notesMap[r.deal_id] = { count: 0, last_at: null };
      notesMap[r.deal_id].count++;
      if(!notesMap[r.deal_id].last_at || r.created_at > notesMap[r.deal_id].last_at) notesMap[r.deal_id].last_at = r.created_at;
    });
  }

  if(meetRes && meetRes.data){
    (meetRes.data || []).forEach(function(r){ meetingsMap[r.deal_id] = r; });
  } else {
    var mRes = await sb.from('meetings').select('deal_id,happened_at,status').in('deal_id', dealIds);
    (mRes.data || []).forEach(function(r){
      if(!meetingsMap[r.deal_id]) meetingsMap[r.deal_id] = { count: 0, last_at: null, shows: 0 };
      meetingsMap[r.deal_id].count++;
      if(r.status === 'show') meetingsMap[r.deal_id].shows++;
      if(r.happened_at && (!meetingsMap[r.deal_id].last_at || r.happened_at > meetingsMap[r.deal_id].last_at)) meetingsMap[r.deal_id].last_at = r.happened_at;
    });
  }

  var rows = [];
  dealIds.forEach(function(id){
    var d = map[id];
    if((d.statusDeal||'').toLowerCase()==='perdido'||(d.statusDeal||'').toLowerCase()==='ganho') return;
    var result = calcDataQualityV19(d, notesMap[id] || { count:0, last_at:null }, meetingsMap[id] || { count:0, last_at:null, shows:0 });
    result.deal_id = id;
    result.operator_email = email;
    result.updated_at = new Date().toISOString();
    rows.push(result);
    // Attach to deal map
    d._dataQuality = result;
  });

  if(rows.length){
    var res = await sb.from('deal_data_quality_runtime').upsert(rows, { onConflict: 'deal_id' });
    if(res.error) console.warn('[L19] sync error:', res.error.message);
    else console.log('[L19] Data Quality synced for ' + rows.length + ' deals');
  }
  return rows;
}
window.syncDataQualityRuntimeV19 = syncDataQualityRuntimeV19;

// ==================================================================
// LAYER 20 — TRANSITION RULES ENGINE (V10)
// Valida se o deal pode avançar de estágio com legitimidade.
// Output: transition_readiness_score 0-1, transition_valid boolean.
// Persiste em deal_transition_runtime.
// ==================================================================

function calcTransitionReadinessV20(deal, notesData, meetingsData){
  var fr = deal._frameworkRuntime || {};
  var fc = deal._forecastV6 || {};
  var dq = deal._dataQuality || {};
  var stage = (deal.etapa || deal.pipeline_stage || deal._stage || '').toLowerCase();
  var nc = (notesData && notesData.count) || 0;
  var shows = (meetingsData && meetingsData.shows) || 0;
  var scheduled = (meetingsData && meetingsData.scheduled) || 0;

  // Determine target stage
  var STAGE_ORDER = ['novo lead','dia 01','dia 02','dia 03','dia 04','dia 05','conectados','agendamento','entrevista agendada','nova oportunidade','oportunidade','negociacao','proposta'];
  var currentIdx = -1;
  for(var i=0; i<STAGE_ORDER.length; i++){
    if(stage.indexOf(STAGE_ORDER[i]) >= 0){ currentIdx = i; break; }
  }
  var targetStage = currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1] : '';

  // Readiness formulas by target
  var readiness = 0;
  var targetNorm = targetStage.toLowerCase();

  if(targetNorm === 'conectados'){
    readiness =
      (nc > 0 ? 0.20 : 0) +
      ((fr.next_step_clarity||0) >= 0.30 ? 0.20 : 0) +
      ((fr.note_quality_score||0) >= 0.40 ? 0.20 : 0) +
      ((fr.spiced_coverage||0) >= 0.20 ? 0.20 : 0) +
      ((fc.forecast_confidence||0) >= 0.30 ? 0.20 : 0);
  } else if(targetNorm === 'agendamento'){
    readiness =
      ((fr.next_step_clarity||0) * 0.30) +
      ((fr.authority_score||0) * 0.20) +
      ((fr.spiced_avg||0) * 0.20) +
      ((fr.note_quality_score||0) * 0.10) +
      (Math.min(nc / 3, 1) * 0.10) +
      ((fc.forecast_confidence||0) * 0.10);
  } else if(targetNorm === 'entrevista agendada'){
    var schedReady =
      ((fr.next_step_clarity||0) * 0.30) +
      ((fr.authority_score||0) * 0.20) +
      ((fr.spiced_avg||0) * 0.20) +
      ((fr.note_quality_score||0) * 0.10) +
      (Math.min(nc / 3, 1) * 0.10) +
      ((fc.forecast_confidence||0) * 0.10);
    readiness =
      (schedReady * 0.50) +
      (Math.min(scheduled, 1) * 0.30) +
      ((fr.authority_score||0) * 0.20);
  } else if(targetNorm.indexOf('oportunidade') >= 0){
    readiness =
      ((fr.spiced_avg||0) * 0.22) +
      ((fr.meddic_avg||0) * 0.18) +
      ((fr.authority_score||0) * 0.18) +
      ((fr.next_step_clarity||0) * 0.12) +
      ((fr.overall_coverage||0) * 0.10) +
      (Math.min(shows, 1) * 0.10) +
      ((fr.note_quality_score||0) * 0.05) +
      ((fc.forecast_confidence||0) * 0.05);
  } else if(targetNorm === 'negociacao' || targetNorm === 'proposta'){
    var oppReady =
      ((fr.spiced_avg||0) * 0.22) +
      ((fr.meddic_avg||0) * 0.18) +
      ((fr.authority_score||0) * 0.18) +
      ((fr.next_step_clarity||0) * 0.12) +
      ((fr.overall_coverage||0) * 0.10) +
      (Math.min(shows, 1) * 0.10) +
      ((fr.note_quality_score||0) * 0.05) +
      ((fc.forecast_confidence||0) * 0.05);
    readiness =
      (oppReady * 0.45) +
      ((fr.authority_score||0) * 0.20) +
      ((fr.meddic_avg||0) * 0.15) +
      ((fc.forecast_score_adjusted||0) * 0.10) +
      ((fr.next_step_clarity||0) * 0.10);
  } else {
    // Default: simple readiness for early pipeline (D1-D5)
    readiness =
      (nc > 0 ? 0.30 : 0) +
      ((fr.next_step_clarity||0) >= 0.20 ? 0.30 : 0) +
      ((fc.forecast_confidence||0) >= 0.20 ? 0.20 : 0) +
      (Math.min(nc, 1) * 0.20);
  }

  readiness = Math.min(1, Math.max(0, readiness));

  // Hard blocks
  var blocks = [];
  if((dq.data_trust_score || 0) < 0.40) blocks.push('data_trust_critical');
  var statusLow = (deal.statusDeal||deal.deal_status||'').toLowerCase();
  if(statusLow === 'ganho' || statusLow === 'perdido' || statusLow === 'won' || statusLow === 'lost') blocks.push('deal_closed');
  if((fr.authority_score||0) < 0.20 && (targetNorm.indexOf('oportunidade') >= 0 || targetNorm === 'negociacao'))
    blocks.push('authority_too_low');
  if(shows === 0 && (targetNorm.indexOf('oportunidade') >= 0 || targetNorm === 'negociacao'))
    blocks.push('no_shows');
  if((fr.next_step_clarity||0) < 0.20 && (targetNorm === 'agendamento' || targetNorm === 'entrevista agendada' || targetNorm.indexOf('oportunidade') >= 0))
    blocks.push('no_next_step');

  var valid = blocks.length === 0 && readiness >= 0.40;

  return {
    current_pipeline_stage: stage,
    target_pipeline_stage: targetStage,
    transition_readiness_score: +readiness.toFixed(4),
    transition_valid: valid,
    transition_block_reason: blocks.length > 0 ? blocks.join(', ') : null,
    transition_gap_count: blocks.length,
    gaps_json: JSON.stringify(blocks)
  };
}
window.calcTransitionReadinessV20 = calcTransitionReadinessV20;

async function syncTransitionRuntimeV20(){
  var sb = _sb(); if(!sb) return null;
  var email = getOperatorId(); if(!email) return null;
  var map = window._COCKPIT_DEAL_MAP || {};
  var dealIds = Object.keys(map);
  if(!dealIds.length) return null;

  // Reuse notes/meetings data from L19 if attached
  var rows = [];
  dealIds.forEach(function(id){
    var d = map[id];
    if((d.statusDeal||'').toLowerCase()==='perdido'||(d.statusDeal||'').toLowerCase()==='ganho') return;

    // Use cached data from L19 sync
    var notesData = { count: 0, last_at: null };
    var meetingsData = { count: 0, last_at: null, shows: 0, scheduled: 0 };
    if(d._notesData) notesData = d._notesData;
    if(d._meetingsData) meetingsData = d._meetingsData;

    var result = calcTransitionReadinessV20(d, notesData, meetingsData);
    result.deal_id = id;
    result.operator_email = email;
    result.updated_at = new Date().toISOString();
    rows.push(result);
    d._transition = result;
  });

  if(rows.length){
    var res = await sb.from('deal_transition_runtime').upsert(rows, { onConflict: 'deal_id' });
    if(res.error) console.warn('[L20] sync error:', res.error.message);
    else console.log('[L20] Transition Rules synced for ' + rows.length + ' deals');
  }
  return rows;
}
window.syncTransitionRuntimeV20 = syncTransitionRuntimeV20;

// ==================================================================
// LAYER 21 — PORTFOLIO PRIORITIZATION ENGINE (V10)
// Diz qual deal o SDR deve atacar agora, olhando o pipe inteiro.
// Output: portfolio_priority_score 0-1, portfolio_rank, priority_band.
// Persiste em deal_portfolio_runtime.
// ==================================================================

function calcPortfolioPriorityV21(allDeals){
  if(!allDeals || !allDeals.length) return [];

  // Find max forecast_value for normalization
  var maxForecastValue = 1;
  allDeals.forEach(function(d){
    var fv = (d._forecastV6 && d._forecastV6.forecast_value) || 0;
    if(fv > maxForecastValue) maxForecastValue = fv;
  });

  var RISK_WEIGHT = { critical: 1.0, high: 0.8, medium: 0.5, low: 0.2 };

  var results = allDeals.map(function(d){
    var fc = d._forecastV6 || {};
    var fr = d._frameworkRuntime || {};
    var dq = d._dataQuality || {};
    var tr = d._transition || {};
    var ag = d._aging || 0;

    // 1) Value Leverage Score (0.35)
    var normForecastValue = maxForecastValue > 0 ? (fc.forecast_value || 0) / maxForecastValue : 0;
    var normValueScore = (d._oppValue || 0) / 100;
    var value_leverage_score = (normForecastValue * 0.60) + (normValueScore * 0.40);
    value_leverage_score = Math.min(1, Math.max(0, value_leverage_score));

    // 2) Urgency Score (0.30)
    var riskState = d._riskState || d.risk_state || 'medium';
    var riskW = RISK_WEIGHT[riskState] || 0.5;
    var normAging = Math.min(ag / 14, 1);
    var urgency_score =
      (normAging * 0.40) +
      (riskW * 0.30) +
      ((1 - (fc.forecast_confidence || 0)) * 0.15) +
      ((1 - (fr.next_step_clarity || 0)) * 0.15);
    urgency_score = Math.min(1, Math.max(0, urgency_score));

    // 3) Actionability Score (0.25)
    var actionability_score =
      ((tr.transition_readiness_score || 0) * 0.35) +
      ((fr.authority_score || 0) * 0.15) +
      ((fr.overall_coverage || 0) * 0.15) +
      ((dq.data_trust_score || 0) * 0.15) +
      ((fr.qualitative_score || 1.0) >= 1.0 ? 0.5 : (fr.qualitative_score || 0.5) * 0.10 / 0.10) +
      ((fc.forecast_score_adjusted || 0) * 0.10);
    // Fix actionability qualitative component
    var qs_norm = fr.qualitative_score ? Math.min(1, Math.max(0, (fr.qualitative_score - 0.20) / 1.10)) : 0.5;
    actionability_score =
      ((tr.transition_readiness_score || 0) * 0.35) +
      ((fr.authority_score || 0) * 0.15) +
      ((fr.overall_coverage || 0) * 0.15) +
      ((dq.data_trust_score || 0) * 0.15) +
      (qs_norm * 0.10) +
      ((fc.forecast_score_adjusted || 0) * 0.10);
    actionability_score = Math.min(1, Math.max(0, actionability_score));

    // 4) Neglect Score (0.10)
    var lastActivity = d._lastTouch ? new Date(d._lastTouch) : null;
    var daysSinceActivity = lastActivity ? Math.max(0, (Date.now() - lastActivity.getTime()) / 86400000) : 14;
    var neglect_score;
    if(daysSinceActivity <= 1) neglect_score = 0.10;
    else if(daysSinceActivity <= 3) neglect_score = 0.30;
    else if(daysSinceActivity <= 7) neglect_score = 0.60;
    else neglect_score = 1.00;

    // Final Score
    var portfolio_priority_score = +(
      (value_leverage_score * 0.35) +
      (urgency_score * 0.30) +
      (actionability_score * 0.25) +
      (neglect_score * 0.10)
    ).toFixed(4);
    portfolio_priority_score = Math.min(1, Math.max(0, portfolio_priority_score));

    var priority_band = portfolio_priority_score >= 0.80 ? 'p1' : portfolio_priority_score >= 0.65 ? 'p2' : portfolio_priority_score >= 0.50 ? 'p3' : 'p4';

    // Recommended queue
    var recommended_queue = 'default';
    if(urgency_score >= 0.75 && (fr.next_step_clarity||0) < 0.30) recommended_queue = 'next_step_repair';
    else if((riskState === 'high' || riskState === 'critical') && ag > 5) recommended_queue = 'follow_up';
    else if((tr.transition_readiness_score||0) >= 0.70 && normForecastValue > 0.60) recommended_queue = 'alta_performance';
    else if((fr.overall_coverage||0) < 0.40) recommended_queue = 'framework_gap_fill';

    return {
      deal_id: d.dealId || d.deal_id,
      value_leverage_score: +value_leverage_score.toFixed(4),
      urgency_score: +urgency_score.toFixed(4),
      actionability_score: +actionability_score.toFixed(4),
      neglect_score: +neglect_score.toFixed(4),
      portfolio_priority_score: portfolio_priority_score,
      priority_band: priority_band,
      recommended_queue: recommended_queue,
      explain_json: JSON.stringify({
        value_leverage: value_leverage_score, urgency: urgency_score,
        actionability: actionability_score, neglect: neglect_score,
        risk_state: riskState, aging: ag, forecast_value: fc.forecast_value||0
      })
    };
  });

  // Sort by priority score descending and assign rank
  results.sort(function(a, b){ return b.portfolio_priority_score - a.portfolio_priority_score; });
  results.forEach(function(r, i){ r.portfolio_rank = i + 1; });

  return results;
}
window.calcPortfolioPriorityV21 = calcPortfolioPriorityV21;

async function syncPortfolioRuntimeV21(){
  var sb = _sb(); if(!sb) return null;
  var email = getOperatorId(); if(!email) return null;
  var map = window._COCKPIT_DEAL_MAP || {};

  var activeDeals = [];
  Object.keys(map).forEach(function(id){
    var d = map[id];
    if((d.statusDeal||'').toLowerCase()==='perdido'||(d.statusDeal||'').toLowerCase()==='ganho') return;
    activeDeals.push(d);
  });

  if(!activeDeals.length) return null;
  var results = calcPortfolioPriorityV21(activeDeals);

  var rows = results.map(function(r){
    r.operator_email = email;
    r.updated_at = new Date().toISOString();
    return r;
  });

  // Attach to deal map
  rows.forEach(function(r){
    if(map[r.deal_id]) map[r.deal_id]._portfolio = r;
  });

  if(rows.length){
    var res = await sb.from('deal_portfolio_runtime').upsert(rows, { onConflict: 'deal_id' });
    if(res.error) console.warn('[L21] sync error:', res.error.message);
    else console.log('[L21] Portfolio Priority synced for ' + rows.length + ' deals | P1:' + rows.filter(function(r){return r.priority_band==='p1';}).length + ' P2:' + rows.filter(function(r){return r.priority_band==='p2';}).length);
  }
  return rows;
}
window.syncPortfolioRuntimeV21 = syncPortfolioRuntimeV21;

// ==================================================================
// LAYER 22 — ATTRIBUTION ENGINE (V10)
// Mede o que causou avanço no deal: call, whatsapp, note, framework, meeting, DM.
// Janela de atribuição: 72h.
// Persiste em deal_attribution_events e deal_attribution_runtime.
// ==================================================================

var ACTIVITY_BASE_WEIGHT = {
  call_logged: 0.22, meeting_booked: 0.28, meeting_done: 0.30,
  whatsapp_pasted: 0.10, copy_generated: 0.08, copy_sent_wa: 0.18,
  note_created: 0.10, analysis_generated: 0.12, framework_gap_fill: 0.20,
  dm_touchpoint: 0.16
};
var OUTCOME_WEIGHT = {
  stage_advance: 0.30, forecast_gain: 0.20, meeting_booked: 0.20,
  show_happened: 0.15, opportunity_created: 0.15
};

function calcProximityWeight(hoursApart){
  if(hoursApart <= 6) return 1.00;
  if(hoursApart <= 24) return 0.75;
  if(hoursApart <= 48) return 0.50;
  if(hoursApart <= 72) return 0.25;
  return 0;
}

async function calcAttributionV22(dealId, windowHours){
  var sb = _sb(); if(!sb) return null;
  windowHours = windowHours || 72;

  // Load activities for this deal
  var actRes = await sb.from('activity_log')
    .select('activity_type,created_at,metadata')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(100);
  var activities = actRes.data || [];

  // Load stage history (outcomes: stage_advance)
  var stageRes = await sb.from('deal_stage_history')
    .select('from_stage,to_stage,changed_at')
    .eq('deal_id', dealId)
    .order('changed_at', { ascending: false })
    .limit(50);
  var stageChanges = stageRes.data || [];

  // Load forecast events (outcomes: forecast_gain)
  var fcRes = await sb.from('forecast_events')
    .select('event_type,delta_forecast,created_at')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(50);
  var forecastEvents = fcRes.data || [];

  // Load meetings (outcomes: meeting_booked, show_happened)
  var meetRes = await sb.from('meetings')
    .select('status,happened_at,created_at')
    .eq('deal_id', dealId)
    .limit(50);
  var meetings = meetRes.data || [];

  // Build outcome list
  var outcomes = [];
  stageChanges.forEach(function(sc){
    var oType = 'stage_advance';
    if(sc.to_stage && sc.to_stage.toLowerCase().indexOf('oportunidade') >= 0) oType = 'opportunity_created';
    outcomes.push({ type: oType, at: new Date(sc.changed_at) });
  });
  forecastEvents.forEach(function(fe){
    if((fe.delta_forecast||0) > 0) outcomes.push({ type: 'forecast_gain', at: new Date(fe.created_at) });
  });
  meetings.forEach(function(m){
    if(m.created_at) outcomes.push({ type: 'meeting_booked', at: new Date(m.created_at) });
    if(m.status === 'show' && m.happened_at) outcomes.push({ type: 'show_happened', at: new Date(m.happened_at) });
  });

  if(!outcomes.length || !activities.length) return { events: [], summary: { top_driver: null, advancement_score: 0, diversity_score: 0 } };

  // Calculate attribution for each outcome-activity pair
  var allContributions = [];
  outcomes.forEach(function(outcome){
    var windowActivities = [];
    var outTime = outcome.at.getTime();
    var oWeight = OUTCOME_WEIGHT[outcome.type] || 0.10;

    activities.forEach(function(act){
      var actTime = new Date(act.created_at).getTime();
      var hoursApart = (outTime - actTime) / 3600000;
      if(hoursApart < 0 || hoursApart > windowHours) return;

      var proximity = calcProximityWeight(hoursApart);
      if(proximity === 0) return;

      var actType = act.activity_type || 'unknown';
      var baseW = ACTIVITY_BASE_WEIGHT[actType] || 0.05;
      var contribution = baseW * proximity * oWeight;

      windowActivities.push({
        activity_type: actType,
        activity_at: act.created_at,
        proximity_weight: proximity,
        activity_base_weight: baseW,
        outcome_weight: oWeight,
        attribution_contribution: +contribution.toFixed(6)
      });
    });

    // Normalize within this outcome's window
    var totalContrib = 0;
    windowActivities.forEach(function(wa){ totalContrib += wa.attribution_contribution; });

    windowActivities.forEach(function(wa){
      wa.normalized_attribution = totalContrib > 0 ? +(wa.attribution_contribution / totalContrib).toFixed(6) : 0;
      wa.deal_id = dealId;
      wa.outcome_type = outcome.type;
      wa.outcome_at = outcome.at.toISOString();
      allContributions.push(wa);
    });
  });

  // Aggregate by activity type
  var byType = {};
  var advancementScore = 0;
  allContributions.forEach(function(c){
    if(!byType[c.activity_type]) byType[c.activity_type] = 0;
    byType[c.activity_type] += c.normalized_attribution;
    if(c.outcome_type === 'stage_advance' || c.outcome_type === 'opportunity_created'){
      advancementScore += c.normalized_attribution;
    }
  });

  // Top driver
  var topDriver = null;
  var topVal = 0;
  Object.keys(byType).forEach(function(t){
    if(byType[t] > topVal){ topVal = byType[t]; topDriver = t; }
  });

  // Diversity score
  var significantTypes = Object.keys(byType).filter(function(t){ return byType[t] >= 0.15; });
  var diversityScore = Math.min(1, significantTypes.length / 5);

  return {
    events: allContributions,
    summary: {
      top_attribution_driver: topDriver,
      advancement_attribution_score: +Math.min(1, advancementScore).toFixed(4),
      attribution_diversity_score: +diversityScore.toFixed(4),
      channel_attribution_json: JSON.stringify(byType)
    }
  };
}
window.calcAttributionV22 = calcAttributionV22;

async function syncAttributionRuntimeV22(){
  var sb = _sb(); if(!sb) return null;
  var email = getOperatorId(); if(!email) return null;
  var map = window._COCKPIT_DEAL_MAP || {};
  var dealIds = Object.keys(map);
  if(!dealIds.length) return null;

  var summaries = [];
  // Process in batches to avoid overload (max 20 at a time)
  var batch = dealIds.filter(function(id){
    var d = map[id];
    return !((d.statusDeal||'').toLowerCase()==='perdido'||(d.statusDeal||'').toLowerCase()==='ganho');
  }).slice(0, 20);

  for(var i = 0; i < batch.length; i++){
    var id = batch[i];
    try {
      var result = await calcAttributionV22(id);
      if(result && result.summary){
        var row = {
          deal_id: id,
          operator_email: email,
          top_attribution_driver: result.summary.top_attribution_driver,
          advancement_attribution_score: result.summary.advancement_attribution_score,
          attribution_diversity_score: result.summary.attribution_diversity_score,
          channel_attribution_json: result.summary.channel_attribution_json,
          updated_at: new Date().toISOString()
        };
        summaries.push(row);
        if(map[id]) map[id]._attribution = result.summary;

        // Persist events (last 50 per deal to avoid bloat)
        if(result.events.length > 0){
          var eventRows = result.events.slice(0, 50).map(function(e){
            return {
              deal_id: e.deal_id, outcome_type: e.outcome_type, outcome_at: e.outcome_at,
              activity_type: e.activity_type, activity_at: e.activity_at,
              proximity_weight: e.proximity_weight, activity_base_weight: e.activity_base_weight,
              outcome_weight: e.outcome_weight, attribution_contribution: e.attribution_contribution,
              normalized_attribution: e.normalized_attribution
            };
          });
          await sb.from('deal_attribution_events').insert(eventRows).catch(function(err){ console.warn('[L22] event insert error:', err); });
        }
      }
    } catch(err){
      console.warn('[L22] attribution error for deal ' + id + ':', err);
    }
  }

  if(summaries.length){
    var res = await sb.from('deal_attribution_runtime').upsert(summaries, { onConflict: 'deal_id' });
    if(res.error) console.warn('[L22] sync error:', res.error.message);
    else console.log('[L22] Attribution synced for ' + summaries.length + ' deals');
  }
  return summaries;
}
window.syncAttributionRuntimeV22 = syncAttributionRuntimeV22;

// ==================================================================
// DAG ORCHESTRATOR — Executa as 22 layers na ordem correta sem ciclos
// Fase 1: Base (L1-L3,L6,L8,L10,L11) — já executadas no boot
// Fase 2: Inteligência Estrutural (L16,L18,L19)
// Fase 3: Forecast (L13)
// Fase 4: Governança (L20)
// Fase 5: Priorização (L21)
// Fase 6: Performance (L5,L14,L15,L12,L7)
// Fase 7: Retrospectivo (L22)
// ==================================================================

// ==================================================================
// TELEMETRY EMITTER — emite eventos para elucy_telemetry_events
// Alimenta o Cockpit de Telemetria (telemetry.html) via Realtime
// ==================================================================

var _telemetryQueue = [];
var _telemetryFlushTimer = null;

function emitTelemetry(evt){
  var sb = _sb(); if(!sb) return;
  var base = {
    operator_id: getOperatorId() || 'unknown',
    role: (_operatorCtx.role || 'sdr'),
    created_at: new Date().toISOString()
  };
  var row = Object.assign(base, evt);
  _telemetryQueue.push(row);
  // Batch flush every 500ms to reduce writes
  if(!_telemetryFlushTimer){
    _telemetryFlushTimer = setTimeout(function(){
      _flushTelemetry();
      _telemetryFlushTimer = null;
    }, 500);
  }
}

async function _flushTelemetry(){
  var sb = _sb(); if(!sb || !_telemetryQueue.length) return;
  var batch = _telemetryQueue.splice(0, 50);
  try {
    await sb.from('elucy_telemetry_events').insert(batch);
  } catch(e){ console.warn('[Telemetry] flush error:', e); }
}

window.emitTelemetry = emitTelemetry;

// Instrument a DAG phase step — emits telemetry + measures latency
async function _dagStep(phase, layer, layerName, fn){
  var t0 = Date.now();
  emitTelemetry({ event_type:'dag_step', dag_phase:phase, layer_processed:layer, layer_name:layerName });
  await fn();
  var latency = Date.now() - t0;
  emitTelemetry({ event_type:'dag_step', dag_phase:phase, layer_processed:layer, layer_name:layerName, latency_ms:latency, metadata:{status:'done'} });
}

async function runIntelligenceDAG(){
  console.log('[DAG] Starting 25-Layer Intelligence DAG (9 phases)...');
  var t0 = Date.now();

  try {
    // Phase 2: Data Quality (L19)
    console.log('[DAG] Phase 2: L19 Data Quality...');
    await _dagStep(2, 19, 'Data Quality', syncDataQualityRuntimeV19);

    // Phase 4: Transition Rules (L20)
    console.log('[DAG] Phase 4: L20 Transition Rules...');
    await _dagStep(4, 20, 'Transition Rules', syncTransitionRuntimeV20);

    // Phase 5: Portfolio Prioritization (L21)
    console.log('[DAG] Phase 5: L21 Portfolio Prioritization...');
    await _dagStep(5, 21, 'Portfolio Priority', syncPortfolioRuntimeV21);

    // Phase 7: Attribution (L22)
    console.log('[DAG] Phase 7: L22 Attribution...');
    await _dagStep(7, 22, 'Attribution', syncAttributionRuntimeV22);

    // Phase 8: Enterprise (L23)
    console.log('[DAG] Phase 8: L23 Enterprise Qualification...');
    await _dagStep(8, 23, 'Enterprise Qual', syncEnterpriseRuntimeV23);

    // Phase 9: Strategic Snapshot (L25)
    console.log('[DAG] Phase 9: L25 Strategic Snapshot...');
    await _dagStep(9, 25, 'Strategic Intel', syncStrategicSnapshotV25);

    var totalMs = Date.now() - t0;
    console.log('[DAG] 25-Layer DAG completed in ' + totalMs + 'ms');
    emitTelemetry({ event_type:'dag_complete', dag_phase:9, layer_processed:25, layer_name:'DAG Complete', latency_ms:totalMs });
  } catch(err){
    console.error('[DAG] Error:', err);
    emitTelemetry({ event_type:'dag_error', dag_phase:0, layer_processed:0, layer_name:'ERROR', metadata:{error:String(err)} });
  }
}
window.runIntelligenceDAG = runIntelligenceDAG;

// ==================================================================
// LAYER 23 — ENTERPRISE QUALIFICATION ENGINE
// Separar deals de alto valor (5M+) e priorizar automaticamente
// ==================================================================

var ENTERPRISE_TIERS = {
  'diamond': { revenue_proxy: 0.95, icp_boost: 1.0 },
  'gold':    { revenue_proxy: 0.75, icp_boost: 0.85 },
  'silver':  { revenue_proxy: 0.50, icp_boost: 0.60 },
  'bronze':  { revenue_proxy: 0.25, icp_boost: 0.40 }
};

var HIGH_VALUE_CARGOS = ['ceo','fundador','socio','co-fundador','presidente','coo','cfo','vp','diretor','diretora','partner','managing','c-level'];
var EXPANSION_PRODUCTS = ['imersao presencial','gestao empresarial','g4 scale','harvard','consulting'];

function calcEnterpriseValueV23(deal){
  // 1. Company Revenue Score (0-1) from faixa_de_faturamento or tier
  var faixa = (deal.faixa_de_faturamento||'').toLowerCase();
  var companyRevScore = 0.3; // default
  if(faixa.includes('acima de 500')|| faixa.includes('>500')|| faixa.includes('500m')) companyRevScore = 1.0;
  else if(faixa.includes('100')|| faixa.includes('200')|| faixa.includes('300')|| faixa.includes('400')) companyRevScore = 0.85;
  else if(faixa.includes('50')) companyRevScore = 0.70;
  else if(faixa.includes('20')|| faixa.includes('30')) companyRevScore = 0.55;
  else if(faixa.includes('10')) companyRevScore = 0.40;
  else if(faixa.includes('5')) companyRevScore = 0.30;
  else {
    var tierData = ENTERPRISE_TIERS[(deal.tier||deal._tier||'').toLowerCase()];
    if(tierData) companyRevScore = tierData.revenue_proxy;
  }

  // 2. Founder Seniority Score (0-1) from cargo
  var cargo = (deal.cargo||'').toLowerCase();
  var founderScore = 0.3;
  for(var i=0; i<HIGH_VALUE_CARGOS.length; i++){
    if(cargo.includes(HIGH_VALUE_CARGOS[i])){ founderScore = 0.9; break; }
  }
  if(cargo.includes('gerente')||cargo.includes('head')||cargo.includes('coordenador')) founderScore = 0.6;
  if(cargo.includes('analista')||cargo.includes('assistente')) founderScore = 0.2;

  // 3. Decision Complexity (0-1) — proxy from tier + product
  var linha = (deal.linhaReceita||deal.linha_de_receita_vigente||deal._revLine||'').toLowerCase();
  var complexityScore = 0.4;
  if(linha.includes('imersao')||linha.includes('presencial')) complexityScore = 0.9;
  else if(linha.includes('scale')||linha.includes('harvard')||linha.includes('consulting')) complexityScore = 0.75;
  else if(linha.includes('gestao')) complexityScore = 0.6;
  else if(linha.includes('club')) complexityScore = 0.35;

  // 4. Expansion Potential (0-1) — based on product + tier + recompra signals
  var expansionScore = 0.3;
  var isExpansionProduct = false;
  for(var j=0; j<EXPANSION_PRODUCTS.length; j++){
    if(linha.includes(EXPANSION_PRODUCTS[j].toLowerCase())){ isExpansionProduct = true; break; }
  }
  if(isExpansionProduct && companyRevScore > 0.6) expansionScore = 0.85;
  else if(companyRevScore > 0.7) expansionScore = 0.65;
  else if(companyRevScore > 0.5) expansionScore = 0.45;

  // 5. ICP Fit (0-1)
  var tierData2 = ENTERPRISE_TIERS[(deal.tier||deal._tier||'').toLowerCase()];
  var icpFit = tierData2 ? tierData2.icp_boost : 0.5;
  if(companyRevScore >= 0.7 && founderScore >= 0.6) icpFit = Math.min(1, icpFit + 0.15);

  // 6. Urgency (0-1) from aging + signal
  var aging = deal._delta || deal.delta || 0;
  var urgencyScore = aging <= 3 ? 0.9 : aging <= 7 ? 0.7 : aging <= 14 ? 0.5 : 0.3;
  if(deal._signal === 'HOT') urgencyScore = Math.min(1, urgencyScore + 0.2);

  // Final Enterprise Value Score
  var evs = (
    companyRevScore   * 0.25 +
    founderScore       * 0.15 +
    complexityScore    * 0.15 +
    expansionScore     * 0.20 +
    icpFit             * 0.15 +
    urgencyScore       * 0.10
  );

  var score100 = Math.round(evs * 100);
  var is5MPlus = companyRevScore >= 0.70 && founderScore >= 0.6;
  var band = score100 >= 75 ? 'enterprise' : score100 >= 50 ? 'mid_market' : 'standard';

  return {
    enterprise_value_score: score100,
    company_revenue_score: Math.round(companyRevScore * 100),
    founder_seniority_score: Math.round(founderScore * 100),
    decision_complexity_score: Math.round(complexityScore * 100),
    expansion_potential_score: Math.round(expansionScore * 100),
    icp_fit_score: Math.round(icpFit * 100),
    urgency_score: Math.round(urgencyScore * 100),
    is_5m_plus: is5MPlus,
    band: band,
    priority_boost: score100 >= 75 ? 30 : score100 >= 50 ? 10 : 0
  };
}

window.calcEnterpriseValueV23 = calcEnterpriseValueV23;

async function syncEnterpriseRuntimeV23(){
  var sb = _sb(); if(!sb) return;
  var email = getOperatorId(); if(!email) return;
  var map = window._COCKPIT_DEAL_MAP || {};
  var rows = [];
  Object.keys(map).forEach(function(id){
    var d = map[id];
    if((d.statusDeal||'').toLowerCase()==='perdido'||(d.statusDeal||'').toLowerCase()==='ganho') return;
    var ev = calcEnterpriseValueV23(d);
    d._enterprise = ev; // attach to deal
    rows.push({
      deal_id: id,
      operator_email: email,
      enterprise_value_score: ev.enterprise_value_score,
      company_revenue_score: ev.company_revenue_score,
      founder_seniority_score: ev.founder_seniority_score,
      decision_complexity_score: ev.decision_complexity_score,
      expansion_potential_score: ev.expansion_potential_score,
      icp_fit_score: ev.icp_fit_score,
      urgency_score: ev.urgency_score,
      is_5m_plus: ev.is_5m_plus,
      band: ev.band,
      priority_boost: ev.priority_boost,
      computed_at: new Date().toISOString()
    });
  });
  if(!rows.length) return;
  var res = await sb.from('deal_enterprise_runtime').upsert(rows, {onConflict:'deal_id,operator_email'});
  if(res.error) console.warn('[L23] sync error:', res.error.message);
  else console.log('[L23] Enterprise runtime synced: ' + rows.length + ' deals');
}
window.syncEnterpriseRuntimeV23 = syncEnterpriseRuntimeV23;

// ==================================================================
// LAYER 24 — TRUSTED ADVISOR SCORE
// Mede qualidade da relacao SDR-lead baseado na equacao G4:
// Confianca = (Credibilidade + Disponibilidade + Intimidade) / Egoismo
// ==================================================================

function calcTrustedAdvisorV24(operatorData, deals){
  deals = deals || Object.values(window._COCKPIT_DEAL_MAP||{}).filter(function(d){
    return (d.statusDeal||'').toLowerCase()!=='perdido' && (d.statusDeal||'').toLowerCase()!=='ganho';
  });
  if(!deals.length) return null;

  // ── CREDIBILITY (0.30) ──
  // framework_usage: quanto dos frameworks estao preenchidos
  var fwCoverageSum = 0, fwCount = 0;
  deals.forEach(function(d){
    if(d._frameworkRuntime && d._frameworkRuntime.coverage !== undefined){
      fwCoverageSum += d._frameworkRuntime.coverage;
      fwCount++;
    }
  });
  var framework_usage = fwCount > 0 ? fwCoverageSum / fwCount : 0.2;

  // insight_quality: proxy from notes with substance (>100 chars) + analyses generated
  var notesDeep = 0, notesTotal = 0;
  if(operatorData){
    notesDeep = operatorData.notes_count || 0;
    notesTotal = Math.max(operatorData.deals_trabalhados || 1, 1);
  }
  var insight_quality = Math.min(1, (notesDeep / notesTotal) * 1.2);

  // business_context: proxy from personalized copies vs generic
  var copiesGen = operatorData ? (operatorData.copies_generated||0) : 0;
  var analysesGen = operatorData ? (operatorData.analyses_generated||0) : 0;
  var contextActions = copiesGen + analysesGen;
  var business_context = Math.min(1, contextActions / Math.max(deals.length, 1));

  var credibility = insight_quality * 0.40 + framework_usage * 0.30 + business_context * 0.30;

  // ── AVAILABILITY (0.20) ──
  // response_time: how fast SDR acts after receiving deal
  var avgAging = 0;
  deals.forEach(function(d){ avgAging += (d._delta || d.delta || 0); });
  avgAging = deals.length ? avgAging / deals.length : 10;
  var response_time = avgAging <= 2 ? 0.95 : avgAging <= 5 ? 0.75 : avgAging <= 10 ? 0.50 : 0.25;

  // follow_up_consistency: tasks completed on time
  var tasksCompleted = operatorData ? (operatorData.fups_count||0) + (operatorData.dms_count||0) : 0;
  var followup_consistency = Math.min(1, tasksCompleted / Math.max(deals.length * 2, 1));

  // touchpoint_frequency
  var totalTouchpoints = operatorData ? (operatorData.fups_count||0) + (operatorData.dms_count||0) + (operatorData.calls_count||0) + (operatorData.notes_count||0) : 0;
  var tpPerDeal = totalTouchpoints / Math.max(deals.length, 1);
  var touchpoint_freq = Math.min(1, tpPerDeal / 5); // 5 tp/deal = max

  var availability = response_time * 0.40 + followup_consistency * 0.30 + touchpoint_freq * 0.30;

  // ── INTIMACY (0.30) — most critical ──
  // pain_depth: deals with SPICED P+I filled or Challenger reframe done
  var painDeepCount = 0;
  deals.forEach(function(d){
    if(d._frameworkRuntime){
      var fr = d._frameworkRuntime;
      if((fr.spiced_pain||0) > 0.5 || (fr.challenger_reframe||0) > 0.5 || (fr.spin_problem||0) > 0.5){
        painDeepCount++;
      }
    }
  });
  var pain_depth = deals.length ? painDeepCount / deals.length : 0.2;

  // context_memory: interaction diversity (multiple channels, multiple types)
  var channelDiversity = 0;
  deals.forEach(function(d){
    var channels = {};
    if(d._dmRuntime && d._dmRuntime.touchpoint_count > 0) channels.dm = 1;
    if(d.canal) channels[d.canal] = 1;
    channelDiversity += Math.min(1, Object.keys(channels).length / 3);
  });
  var context_memory = deals.length ? channelDiversity / deals.length : 0.2;

  // personalization: copies generated vs deals (more = more personalized)
  var personalization = Math.min(1, copiesGen / Math.max(deals.length * 0.5, 1));

  // emotional_signal: notes that capture pain/urgency (proxy)
  var emotional_detection = operatorData ? Math.min(1, (operatorData.pain_clarity_pct||0) / 100) : 0.2;

  var intimacy = pain_depth * 0.35 + context_memory * 0.25 + personalization * 0.25 + emotional_detection * 0.15;

  // ── SELFISHNESS (0.20, negativo) ──
  // pitch_ratio: deals where copy was sent without prior note/analysis
  var noCopyWithoutContext = 0;
  deals.forEach(function(d){
    // Deal has copy but no framework/note/analysis = selfish
    if(d._interactions){
      var hasCopy = d._interactions.some(function(i){return i.interaction_type==='copy';});
      var hasContext = d._interactions.some(function(i){return ['analysis','note_crm','enrichment','briefing'].indexOf(i.interaction_type) >= 0;});
      if(hasCopy && !hasContext) noCopyWithoutContext++;
    }
  });
  var pitch_ratio = deals.length ? noCopyWithoutContext / deals.length : 0.3;

  // generic_copy_rate: proxy — low framework coverage = generic approach
  var genericRate = framework_usage < 0.3 ? 0.7 : framework_usage < 0.5 ? 0.4 : 0.15;

  // low_context_actions: actions without prior research
  var lowContextRate = operatorData ? (operatorData.no_context_rate||0.3) : 0.3;

  var selfishness = pitch_ratio * 0.40 + genericRate * 0.30 + lowContextRate * 0.30;

  // ── FINAL SCORE ──
  var trusted_advisor = credibility * 0.30 + availability * 0.20 + intimacy * 0.30 + (1 - selfishness) * 0.20;
  trusted_advisor = Math.max(0, Math.min(1, trusted_advisor));

  var band = trusted_advisor >= 0.80 ? 'exemplar' : trusted_advisor >= 0.65 ? 'trusted' : trusted_advisor >= 0.50 ? 'developing' : 'at_risk';
  var needsCoaching = trusted_advisor < 0.60;
  var biggestGap = 'credibility';
  var minComponent = credibility;
  if(availability < minComponent){ minComponent = availability; biggestGap = 'availability'; }
  if(intimacy < minComponent){ minComponent = intimacy; biggestGap = 'intimacy'; }
  if((1 - selfishness) < minComponent){ biggestGap = 'selfishness'; }

  return {
    trusted_advisor_score: Math.round(trusted_advisor * 100) / 100,
    credibility_score: Math.round(credibility * 100) / 100,
    availability_score: Math.round(availability * 100) / 100,
    intimacy_score: Math.round(intimacy * 100) / 100,
    selfishness_score: Math.round(selfishness * 100) / 100,
    band: band,
    needs_coaching: needsCoaching,
    biggest_gap: biggestGap,
    components: {
      insight_quality: Math.round(insight_quality*100)/100,
      framework_usage: Math.round(framework_usage*100)/100,
      business_context: Math.round(business_context*100)/100,
      response_time: Math.round(response_time*100)/100,
      followup_consistency: Math.round(followup_consistency*100)/100,
      touchpoint_freq: Math.round(touchpoint_freq*100)/100,
      pain_depth: Math.round(pain_depth*100)/100,
      context_memory: Math.round(context_memory*100)/100,
      personalization: Math.round(personalization*100)/100,
      emotional_detection: Math.round(emotional_detection*100)/100,
      pitch_ratio: Math.round(pitch_ratio*100)/100,
      generic_copy_rate: Math.round(genericRate*100)/100,
      low_context_rate: Math.round(lowContextRate*100)/100
    }
  };
}

window.calcTrustedAdvisorV24 = calcTrustedAdvisorV24;

// ==================================================================
// LAYER 25 — STRATEGIC INTELLIGENCE LAYER
// Conecta cockpit -> KPIs estrategicos G4
// ==================================================================

function calcStrategicIntelligenceV25(){
  var map = window._COCKPIT_DEAL_MAP || {};
  var deals = Object.values(map).filter(function(d){
    return (d.statusDeal||'').toLowerCase()!=='perdido' && (d.statusDeal||'').toLowerCase()!=='ganho';
  });

  // Revenue Quality
  var sal5mCount = 0, pipeline5mValue = 0, totalEnterpriseScore = 0;
  var expansionPotential = 0, dealCount = 0;
  deals.forEach(function(d){
    var ev = d._enterprise || calcEnterpriseValueV23(d);
    d._enterprise = ev;
    if(ev.is_5m_plus){
      sal5mCount++;
      pipeline5mValue += (d._oppValue || d.elucyValor || 0);
    }
    totalEnterpriseScore += ev.enterprise_value_score;
    expansionPotential += ev.expansion_potential_score;
    dealCount++;
  });
  var avgEnterpriseScore = dealCount ? Math.round(totalEnterpriseScore / dealCount) : 0;
  var avgExpansion = dealCount ? Math.round(expansionPotential / dealCount) : 0;

  // Framework coverage
  var fwCoveredCount = 0;
  var titanCount=0, builderCount=0, executorCount=0;
  deals.forEach(function(d){
    var p = d._persona || '';
    if(p==='Titan') titanCount++;
    else if(p==='Builder') builderCount++;
    else if(p==='Executor') executorCount++;
    if(d._frameworkRuntime && d._frameworkRuntime.coverage > 0.3) fwCoveredCount++;
  });
  var fwCoveragePct = dealCount ? Math.round((fwCoveredCount/dealCount)*100) : 0;

  // Experience quality
  var totalAging = 0;
  deals.forEach(function(d){ totalAging += (d._delta||d.delta||0); });
  var avgTouchesToResponse = dealCount ? Math.round((totalAging / dealCount) * 10) / 10 : 0;

  // Iron Dome count
  var ironDomeCount = deals.filter(function(d){ return d._signal==='DOME'||(d.delta||0)>10; }).length;
  // Handoff ready
  var handoffReady = deals.filter(function(d){
    var f=(d.fase||'').toLowerCase();
    return f==='oportunidade'||f==='sal';
  }).length;

  return {
    revenue_quality: {
      sal_5m_count: sal5mCount,
      pipeline_5m_value: Math.round(pipeline5mValue),
      avg_enterprise_score: avgEnterpriseScore,
      avg_expansion_potential: avgExpansion,
      total_deals: dealCount,
      by_persona: { titan: titanCount, builder: builderCount, executor: executorCount }
    },
    experience_quality: {
      avg_touches_to_response: avgTouchesToResponse,
      framework_coverage_pct: fwCoveragePct,
      iron_dome_count: ironDomeCount,
      handoff_ready_count: handoffReady
    }
  };
}

window.calcStrategicIntelligenceV25 = calcStrategicIntelligenceV25;

async function syncStrategicSnapshotV25(){
  var sb = _sb(); if(!sb) return;
  var email = getOperatorId(); if(!email) return;
  var intel = calcStrategicIntelligenceV25();
  var advisor = calcTrustedAdvisorV24(null, null);
  var today = new Date().toISOString().slice(0,10);

  var row = {
    snapshot_date: today,
    operator_email: email,
    sal_5m_count: intel.revenue_quality.sal_5m_count,
    pipeline_5m_value: intel.revenue_quality.pipeline_5m_value,
    avg_enterprise_score: intel.revenue_quality.avg_enterprise_score,
    total_deals: intel.revenue_quality.total_deals,
    titan_count: intel.revenue_quality.by_persona.titan,
    builder_count: intel.revenue_quality.by_persona.builder,
    executor_count: intel.revenue_quality.by_persona.executor,
    framework_coverage_pct: intel.experience_quality.framework_coverage_pct,
    iron_dome_count: intel.experience_quality.iron_dome_count,
    handoff_ready_count: intel.experience_quality.handoff_ready_count,
    trusted_advisor_score: advisor ? advisor.trusted_advisor_score : null,
    credibility_score: advisor ? advisor.credibility_score : null,
    availability_score: advisor ? advisor.availability_score : null,
    intimacy_score: advisor ? advisor.intimacy_score : null,
    selfishness_score: advisor ? advisor.selfishness_score : null,
    advisor_band: advisor ? advisor.band : null,
    computed_at: new Date().toISOString()
  };

  var res = await sb.from('strategic_snapshots').upsert([row], {onConflict:'snapshot_date,operator_email'});
  if(res.error) console.warn('[L25] strategic snapshot error:', res.error.message);
  else console.log('[L25] Strategic snapshot saved for ' + today);
}
window.syncStrategicSnapshotV25 = syncStrategicSnapshotV25;

// ==================================================================
// TELEMETRY: Kill Switch listener via cockpit_responses
// Detects governance alerts in responses and emits telemetry events
// ==================================================================

(function initTelemetryResponseListener(){
  var sb = _sb(); if(!sb) return;
  try {
    sb.channel('telemetry-ks')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cockpit_responses'
      }, function(payload){
        var row = payload.new || {};
        var resp = row.response_text || row.response_json || '';
        var respStr = typeof resp === 'string' ? resp : JSON.stringify(resp);
        // Detect governance alerts / kill switch triggers
        var ksPatterns = [
          {re:/titan.*challenger|challenger.*only/i, slug:'titan_challenger_only'},
          {re:/builder.*spiced|spiced.*only/i, slug:'builder_spiced'},
          {re:/executor.*spin|spin.*champion/i, slug:'executor_spin'},
          {re:/tier.?2.*block|bloqueio.*imers/i, slug:'tier2_block_imersao_presencial'},
          {re:/mei.*downgrade|ceo.*mei/i, slug:'ceo_mei_downgrade_authority'},
          {re:/dqi.*over.*revenue|dqi.*superior/i, slug:'dqi_over_revenue'},
          {re:/black.?box|protocolo.*black/i, slug:'black_box_protocol'}
        ];
        ksPatterns.forEach(function(pat){
          if(pat.re.test(respStr)){
            emitTelemetry({
              event_type: 'kill_switch',
              deal_id: row.deal_id || null,
              dag_phase: 0,
              layer_processed: 0,
              layer_name: 'BEG Governor',
              kill_switch_triggered: pat.slug,
              metadata: { request_id: row.request_id }
            });
          }
        });
      })
      .subscribe();
  } catch(e){ console.warn('[Telemetry] KS listener error:', e); }
})();

console.log('[cockpit-engine v11.0] 25-Layer Architecture loaded — L23 Enterprise + L24 Trusted Advisor + L25 Strategic Intelligence + Telemetry Emitter');

})();
