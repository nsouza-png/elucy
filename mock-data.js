// ======================================================================
// ELUCY COCKPIT — MOCK DATA LAYER (MVP)
// Injeta dados simulados para desenvolvimento e demo quando o pipeline
// real nao esta disponivel. Ativado via ?mock=1 na URL ou flag abaixo.
// NUNCA enviar dados reais por aqui. Apenas estrutura simulada.
// ======================================================================

(function(){
'use strict';

// ── Ativa mock automaticamente se pipeline nao carregou em 3s ────────
// Ou forcado via URL: nsouza-png.github.io/elucy/?mock=1
var FORCE_MOCK = location.search.includes('mock=1');

if(!FORCE_MOCK){
  // Aguarda 3s e verifica se o pipeline carregou
  setTimeout(function(){
    var map = window._COCKPIT_DEAL_MAP || {};
    if(Object.keys(map).length === 0){
      console.log('[mock] Pipeline vazio apos 3s — ativando mock data layer');
      _injectMock();
    }
  }, 3000);
  return;
}

// Injeta imediatamente se forcado
console.log('[mock] Mock data layer forcado via URL param');
_injectMock();

// ──────────────────────────────────────────────────────────────────────
function _injectMock(){
  _buildDealMap();
  _mockActivityLog();
  _mockSupabase();
  _showMockBanner();
  // Re-render Intel se ja estiver ativo
  setTimeout(function(){
    if(typeof _intelRender !== 'undefined') _intelRender();
    if(window.renderHome) window.renderHome();
  }, 100);
}

// ── 1. BUILD _COCKPIT_DEAL_MAP ────────────────────────────────────────
function _buildDealMap(){
  var now = new Date('2026-04-04');

  // Templates de deals por segmento
  var templates = [
    // Diamond — Titan persona — alto valor
    {nome:'Rafael Mendonça Lima',cargo:'CEO',tier:'diamond',etapa:'Entrevista Agendada',fase:'Oportunidade',linha:'aquisicao',grupo:'Aquisição',canal:'Outbound',delta:2,revenue:38000,fat:'R$ 50M - R$ 200M',seg:'Tecnologia'},
    {nome:'Carla Bittencourt',cargo:'Sócia ou Fundadora',tier:'diamond',etapa:'Entrevista Agendada',fase:'Oportunidade',linha:'expansao',grupo:'Expansão',canal:'Social DM',delta:4,revenue:45000,fat:'R$ 100M+',seg:'Varejo'},
    {nome:'Thiago Drummond',cargo:'Presidente ou CEO',tier:'diamond',etapa:'Agendamento',fase:'Agendado',linha:'turmas',grupo:'Turmas',canal:'Inbound',delta:1,revenue:32000,fat:'R$ 50M - R$ 200M',seg:'Construção Civil'},
    {nome:'Fernanda Queiroz',cargo:'CEO',tier:'diamond',etapa:'Conectados',fase:'Conectado',linha:'field_sales',grupo:'Field Sales',canal:'Field Sales',delta:6,revenue:41000,fat:'R$ 200M+',seg:'Saúde'},
    {nome:'Eduardo Salomão',cargo:'Sócio ou Fundador',tier:'diamond',etapa:'Reagendamento',fase:'Reagendamento',linha:'aquisicao',grupo:'Aquisição',canal:'Outbound',delta:17,revenue:38000,fat:'R$ 50M - R$ 200M',seg:'Industria'},
    {nome:'Patricia Volpe',cargo:'Presidente ou CEO',tier:'diamond',etapa:'Entrevista Agendada',fase:'Oportunidade',linha:'renovacao',grupo:'Renovação',canal:'CRM',delta:3,revenue:52000,fat:'R$ 100M+',seg:'Educação'},
    {nome:'Marcelo Furtado',cargo:'CEO',tier:'diamond',etapa:'Agendamento',fase:'Agendado',linha:'projetos_eventos',grupo:'Projetos & Eventos',canal:'Outbound',delta:5,revenue:29000,fat:'R$ 50M - R$ 200M',seg:'Agronegócio'},
    {nome:'Isabela Ramos Torres',cargo:'Sócia ou Fundadora',tier:'diamond',etapa:'Conectados',fase:'Conectado',linha:'aquisicao',grupo:'Aquisição',canal:'Social DM',delta:8,revenue:35000,fat:'R$ 100M+',seg:'Financeiro'},
    // Gold — Titan/Builder
    {nome:'Gustavo Paiva Neto',cargo:'Diretor',tier:'gold',etapa:'Entrevista Agendada',fase:'Oportunidade',linha:'turmas',grupo:'Turmas',canal:'Inbound',delta:2,revenue:18000,fat:'R$ 10M - R$ 50M',seg:'Tecnologia'},
    {nome:'Larissa Mendes',cargo:'CEO',tier:'gold',etapa:'Agendamento',fase:'Agendado',linha:'aquisicao',grupo:'Aquisição',canal:'Outbound',delta:4,revenue:15000,fat:'R$ 5M - R$ 10M',seg:'Varejo'},
    {nome:'Diego Cavalcante',cargo:'Sócio ou Fundador',tier:'gold',etapa:'Conectados',fase:'Conectado',linha:'social_dm',grupo:'Social DM',canal:'Social DM',delta:3,revenue:17000,fat:'R$ 10M - R$ 50M',seg:'Serviços'},
    {nome:'Amanda Rocha',cargo:'Diretora Comercial',tier:'gold',etapa:'Reagendamento',fase:'Reagendamento',linha:'reativacao',grupo:'Reativação',canal:'CRM',delta:15,revenue:19000,fat:'R$ 50M - R$ 200M',seg:'Logística'},
    {nome:'Bruno Teixeira',cargo:'CEO',tier:'gold',etapa:'Entrevista Agendada',fase:'Oportunidade',linha:'expansao',grupo:'Expansão',canal:'CRM',delta:2,revenue:22000,fat:'R$ 10M - R$ 50M',seg:'Saúde'},
    {nome:'Juliana Castelo',cargo:'Sócia ou Fundadora',tier:'gold',etapa:'Agendamento',fase:'Agendado',linha:'turmas',grupo:'Turmas',canal:'Inbound',delta:6,revenue:14000,fat:'R$ 5M - R$ 10M',seg:'Educação'},
    {nome:'Felipe Monteiro',cargo:'Presidente',tier:'gold',etapa:'Conectados',fase:'Conectado',linha:'projetos_eventos',grupo:'Projetos & Eventos',canal:'Outbound',delta:9,revenue:16000,fat:'R$ 10M - R$ 50M',seg:'Construção Civil'},
    {nome:'Renata Sobral',cargo:'CEO',tier:'gold',etapa:'Dia 01',fase:'MQL',linha:'aquisicao',grupo:'Aquisição',canal:'Outbound',delta:11,revenue:18000,fat:'R$ 5M - R$ 10M',seg:'Industria'},
    {nome:'Paulo Henrique Vilas',cargo:'Diretor',tier:'gold',etapa:'Entrevista Agendada',fase:'Oportunidade',linha:'field_sales',grupo:'Field Sales',canal:'Field Sales',delta:3,revenue:21000,fat:'R$ 10M - R$ 50M',seg:'Agronegócio'},
    // Silver — Builder persona
    {nome:'Mariana Lopes',cargo:'Gerente',tier:'silver',etapa:'Agendamento',fase:'Agendado',linha:'turmas',grupo:'Turmas',canal:'Inbound',delta:2,revenue:9000,fat:'R$ 1M - R$ 5M',seg:'Tecnologia'},
    {nome:'Roberto Cunha',cargo:'Sócio ou Fundador',tier:'silver',etapa:'Conectados',fase:'Conectado',linha:'social_dm',grupo:'Social DM',canal:'Social DM',delta:5,revenue:8500,fat:'R$ 1M - R$ 5M',seg:'Varejo'},
    {nome:'Camila Faria',cargo:'CEO',tier:'silver',etapa:'Dia 01',fase:'MQL',linha:'aquisicao',grupo:'Aquisição',canal:'Outbound',delta:7,revenue:9500,fat:'R$ 1M - R$ 5M',seg:'Serviços'},
    {nome:'Leonardo Assis',cargo:'Diretor',tier:'silver',etapa:'Entrevista Agendada',fase:'Oportunidade',linha:'renovacao',grupo:'Renovação',canal:'CRM',delta:1,revenue:11000,fat:'R$ 5M - R$ 10M',seg:'Saúde'},
    {nome:'Tatiana Vidal',cargo:'Gerente Comercial',tier:'silver',etapa:'Reagendamento',fase:'Reagendamento',linha:'reativacao',grupo:'Reativação',canal:'CRM',delta:18,revenue:8000,fat:'R$ 1M - R$ 5M',seg:'Logística'},
    {nome:'Henrique Bastos',cargo:'Sócio ou Fundador',tier:'silver',etapa:'Agendamento',fase:'Agendado',linha:'turmas',grupo:'Turmas',canal:'Inbound',delta:4,revenue:9200,fat:'R$ 1M - R$ 5M',seg:'Educação'},
    {nome:'Adriana Pinto',cargo:'CEO',tier:'silver',etapa:'Conectados',fase:'Conectado',linha:'projetos_eventos',grupo:'Projetos & Eventos',canal:'Outbound',delta:6,revenue:10000,fat:'R$ 5M - R$ 10M',seg:'Construção Civil'},
    {nome:'Marcos Alves',cargo:'Diretor',tier:'silver',etapa:'Dia 02',fase:'SAL',linha:'social_dm',grupo:'Social DM',canal:'Social DM',delta:3,revenue:8800,fat:'R$ 1M - R$ 5M',seg:'Industria'},
    {nome:'Priscila Mendonça',cargo:'CEO',tier:'silver',etapa:'Entrevista Agendada',fase:'Oportunidade',linha:'aquisicao',grupo:'Aquisição',canal:'Outbound',delta:2,revenue:9600,fat:'R$ 5M - R$ 10M',seg:'Financeiro'},
    // Bronze — Executor persona
    {nome:'Gabriel Novaes',cargo:'Gerente',tier:'bronze',etapa:'Dia 01',fase:'MQL',linha:'aquisicao',grupo:'Aquisição',canal:'Outbound',delta:4,revenue:4500,fat:'Até R$ 1M',seg:'Tecnologia'},
    {nome:'Nathalia Costa',cargo:'Coordenadora',tier:'bronze',etapa:'Dia 02',fase:'SAL',linha:'turmas',grupo:'Turmas',canal:'Inbound',delta:2,revenue:4000,fat:'Até R$ 1M',seg:'Varejo'},
    {nome:'Vinicius Correia',cargo:'Gerente',tier:'bronze',etapa:'Conectados',fase:'Conectado',linha:'social_dm',grupo:'Social DM',canal:'Social DM',delta:8,revenue:3800,fat:'Até R$ 1M',seg:'Serviços'},
    {nome:'Leticia Campos',cargo:'Sócia ou Fundadora',tier:'bronze',etapa:'Dia 03',fase:'MQL',linha:'selfcheckout',grupo:'Self Checkout',canal:'Self Checkout',delta:3,revenue:3500,fat:'Até R$ 1M',seg:'Saúde'},
    {nome:'Andre Freitas',cargo:'Gerente Comercial',tier:'bronze',etapa:'Reagendamento',fase:'Reagendamento',linha:'reativacao',grupo:'Reativação',canal:'CRM',delta:16,revenue:4200,fat:'Até R$ 1M',seg:'Logística'},
    {nome:'Sabrina Luz',cargo:'Coordenadora',tier:'bronze',etapa:'Agendamento',fase:'Agendado',linha:'turmas',grupo:'Turmas',canal:'Inbound',delta:5,revenue:4800,fat:'R$ 1M - R$ 5M',seg:'Educação'},
    {nome:'Carlos Batista',cargo:'Gerente',tier:'bronze',etapa:'Dia 01',fase:'MQL',linha:'aquisicao',grupo:'Aquisição',canal:'Outbound',delta:9,revenue:3900,fat:'Até R$ 1M',seg:'Construção Civil'},
    {nome:'Joana Maciel',cargo:'CEO',tier:'bronze',etapa:'Conectados',fase:'Conectado',linha:'social_dm_segment_k',grupo:'Social DM K',canal:'Social DM',delta:6,revenue:4100,fat:'Até R$ 1M',seg:'Industria'},
    {nome:'Rodrigo Lacerda',cargo:'Gerente',tier:'bronze',etapa:'Dia 02',fase:'SAL',linha:'aquisicao',grupo:'Aquisição',canal:'Outbound',delta:4,revenue:4300,fat:'Até R$ 1M',seg:'Agronegócio'},
    // Deals fechados (ganho/perdido) para histórico Bowtie / Three Es
    {nome:'Sandra Mota',cargo:'CEO',tier:'gold',etapa:'Won',fase:'Won',statusDeal:'ganho',linha:'turmas',grupo:'Turmas',canal:'Inbound',delta:0,revenue:16000,fat:'R$ 10M - R$ 50M',seg:'Tecnologia'},
    {nome:'Flavio Ribeiro',cargo:'Diretor',tier:'silver',etapa:'Lost',fase:'Lost',statusDeal:'perdido',linha:'aquisicao',grupo:'Aquisição',canal:'Outbound',delta:0,revenue:9000,fat:'R$ 1M - R$ 5M',seg:'Varejo',motivoLost:'Sem budget'},
    {nome:'Cristiane Melo',cargo:'Sócia ou Fundadora',tier:'diamond',etapa:'Won',fase:'Won',statusDeal:'ganho',linha:'renovacao',grupo:'Renovação',canal:'CRM',delta:0,revenue:42000,fat:'R$ 100M+',seg:'Saúde'},
    {nome:'Alexandre Dias',cargo:'Presidente',tier:'gold',etapa:'Won',fase:'Won',statusDeal:'ganho',linha:'expansao',grupo:'Expansão',canal:'CRM',delta:0,revenue:23000,fat:'R$ 50M - R$ 200M',seg:'Financeiro'},
    {nome:'Roberta Nunes',cargo:'Gerente',tier:'bronze',etapa:'Lost',fase:'Lost',statusDeal:'perdido',linha:'social_dm',grupo:'Social DM',canal:'Social DM',delta:0,revenue:3800,fat:'Até R$ 1M',seg:'Serviços',motivoLost:'Timing'},
    {nome:'Danilo Pires',cargo:'CEO',tier:'silver',etapa:'Won',fase:'Won',statusDeal:'ganho',linha:'turmas',grupo:'Turmas',canal:'Inbound',delta:0,revenue:10500,fat:'R$ 5M - R$ 10M',seg:'Construção Civil'},
    {nome:'Viviane Torres',cargo:'Diretora',tier:'gold',etapa:'Won',fase:'Won',statusDeal:'ganho',linha:'projetos_eventos',grupo:'Projetos & Eventos',canal:'Outbound',delta:0,revenue:19500,fat:'R$ 10M - R$ 50M',seg:'Agronegócio'},
    {nome:'Mateus Carvalho',cargo:'Gerente',tier:'bronze',etapa:'Lost',fase:'Lost',statusDeal:'perdido',linha:'aquisicao',grupo:'Aquisição',canal:'Outbound',delta:0,revenue:4000,fat:'Até R$ 1M',seg:'Logística',motivoLost:'Concorrência'},
    {nome:'Erica Fontes',cargo:'Sócia ou Fundadora',tier:'diamond',etapa:'Won',fase:'Won',statusDeal:'ganho',linha:'field_sales',grupo:'Field Sales',canal:'Field Sales',delta:0,revenue:47000,fat:'R$ 200M+',seg:'Educação'},
    {nome:'Sergio Leal',cargo:'Presidente',tier:'silver',etapa:'Lost',fase:'Lost',statusDeal:'perdido',linha:'reativacao',grupo:'Reativação',canal:'CRM',delta:0,revenue:9200,fat:'R$ 1M - R$ 5M',seg:'Industria',motivoLost:'Sem budget'}
  ];

  if(!window._COCKPIT_DEAL_MAP) window._COCKPIT_DEAL_MAP = {};

  templates.forEach(function(t, idx){
    var id = 'mock-' + idx;
    var emailLead = (t.nome.toLowerCase().replace(/\s+/g,'.').replace(/[ãâàáä]/g,'a').replace(/[êé]/g,'e').replace(/[íî]/g,'i').replace(/[óô]/g,'o').replace(/[úù]/g,'u').replace(/[ç]/g,'c')) + '@empresa.com.br';
    var status = t.statusDeal || 'ativo';
    var isAtRisk = (t.delta || 0) > 10;
    var irondome = (t.delta || 0) > 14;
    var tierMap = {diamond:'Titan',gold:'Titan',silver:'Builder',bronze:'Executor'};

    var deal = {
      // Identidade
      id: id, deal_id: 'deal-mock-' + idx,
      nome: t.nome, contact_name: t.nome, nomeNegocio: t.nome,
      empresa: emailLead, emailLead: emailLead,
      cargo: t.cargo,
      // Taxonomia
      tier: t.tier, _tier: t.tier,
      etapa: t.etapa, _etapa: t.etapa, etapa_atual_no_pipeline: t.etapa,
      fase: t.fase, _fase: t.fase, fase_atual_no_processo: t.fase,
      statusDeal: status, status_do_deal: status,
      motivoLost: t.motivoLost || '',
      // Revenue
      linhaReceita: t.linha, linha_de_receita_vigente: t.linha,
      grupo_de_receita: t.grupo,
      _revLine: t.linha,
      revenueRaw: t.revenue, revenue: t.revenue,
      elucyValor: t.revenue,
      valor_da_oportunidade: t.revenue,
      // Canal
      canal: t.canal, canal_de_marketing: t.canal,
      utm_medium: t.canal.toLowerCase().replace(/\s/g,'_'),
      // Aging
      delta: t.delta, _delta: t.delta,
      _aging: {band: t.delta<=2?'fresh':t.delta<=5?'normal':t.delta<=10?'aging':'critical', days: t.delta, isAtRisk: isAtRisk, riskLevel: isAtRisk?'high':'normal'},
      // Perfil empresa
      faixa_de_faturamento: t.fat || '',
      p_segmento: t.seg || '',
      faixaFunc: '',
      // Scores simulados
      _forecastV6: { score: t.tier==='diamond'?0.72:t.tier==='gold'?0.58:t.tier==='silver'?0.44:0.31, confidence: 0.65, band: t.tier==='diamond'?'A':'B' },
      _dataQuality: { data_trust_score: t.tier==='diamond'?0.82:t.tier==='gold'?0.68:t.tier==='silver'?0.55:0.41, completeness: 0.75, consistency: 0.80, recency: 0.70, evidence: 0.60 },
      _frameworkRuntime: { qualitative_score: t.tier==='diamond'?0.78:t.tier==='gold'?0.62:0.48, coverage_pct: t.tier==='diamond'?80:t.tier==='gold'?65:50 },
      _trustedAdvisor: { score: t.tier==='diamond'?0.75:t.tier==='gold'?0.60:0.45 },
      _spinAudit: { applicable: true, score: t.tier==='diamond'?0.77:t.tier==='gold'?0.61:0.46 },
      _signal: irondome?'DOME':isAtRisk?'RISK':t.delta<=3?'BUY':'STALL',
      _urgency: t.tier==='diamond'?(irondome?95:80):t.tier==='gold'?65:45,
      _persona: tierMap[t.tier] || 'Builder',
      _touchpoints: Math.floor(3 + Math.random()*8),
      p_negociacoes_ganhas: status==='ganho'?1:0,
      p_receita_total: status==='ganho'?t.revenue:0,
      p_cluster_rfm: t.tier==='diamond'?'Champions':t.tier==='gold'?'Loyal':t.tier==='silver'?'Potential':'At Risk',
      operator_email: window._currentUserEmail || 'n.souza@g4educacao.com',
      qualificador_name: 'Nathan Souza',
      proprietario_name: 'Nathan Souza',
      created_at_crm: new Date(now - t.delta * 86400000).toISOString(),
      createdAtCrm: new Date(now - t.delta * 86400000).toISOString(),
      closed_at: status==='ganho'||status==='perdido' ? new Date(now - 2 * 86400000).toISOString() : '',
      // Bowtie / GTM
      _bowtiegLeg: t.grupo.toLowerCase().includes('expan')||t.grupo.toLowerCase().includes('renov')||t.grupo.toLowerCase().includes('reativ')||t.linha==='g4_tools' ? (t.linha==='expansao'||t.linha==='g4_tools'?'EXP':'RET') : 'ACQ',
      _intentSignal: { reciprocidade: Math.random()*0.3+0.5, curiosidade: Math.random()*0.3+0.5, confianca: Math.random()*0.3+0.4 },
      _trustedAdvisorScore: t.tier==='diamond'?75:t.tier==='gold'?60:45,
      temp: t.tier==='diamond'?85:t.tier==='gold'?65:t.tier==='silver'?48:32,
      tc: t.tier==='diamond'?'hot':t.tier==='gold'?'warm':'cold',
      tl: t.tier==='diamond'?'Hot':t.tier==='gold'?'Warm':'Cold',
      dd: t.delta > 7 ? '⚠ '+t.delta+'d' : t.delta+'d'
    };

    window._COCKPIT_DEAL_MAP[id] = deal;
  });

  // Expoe _allDeals para compatibilidade
  window._allDeals = Object.values(window._COCKPIT_DEAL_MAP);
  console.log('[mock] _COCKPIT_DEAL_MAP populado com', Object.keys(window._COCKPIT_DEAL_MAP).length, 'deals');
}

// ── 2. MOCK ACTIVITY LOG ──────────────────────────────────────────────
function _mockActivityLog(){
  var activities = [];
  var types = ['copy_generated','copy_sent_wa','analysis_generated','dvl_confirmed','note_crm_copied','dm_generated','enrichment_added'];
  var dealIds = Object.keys(window._COCKPIT_DEAL_MAP || {});
  var now = new Date('2026-04-04');

  // Gera 180 atividades nos ultimos 30 dias
  for(var i=0; i<180; i++){
    var daysAgo = Math.floor(Math.random() * 30);
    var date = new Date(now - daysAgo * 86400000);
    var type = types[Math.floor(Math.random() * types.length)];
    var dealId = dealIds[Math.floor(Math.random() * dealIds.length)];
    activities.push({
      activity_type: type,
      deal_id: dealId,
      metadata: {},
      created_at: date.toISOString()
    });
  }

  // Substitui _loadActivity no analytics-engine pelo mock
  window._MOCK_ACTIVITY_LOG = activities;
}

// ── 3. MOCK SUPABASE SHIM ─────────────────────────────────────────────
// Intercept getSB() para retornar um objeto fake que serve os dados mock
function _mockSupabase(){
  var _realGetSB = window.getSB;

  window.getSB = function(){
    var real = _realGetSB ? _realGetSB() : null;
    if(real) return real; // usa real se disponivel

    // Retorna fake minimal para analytics
    return {
      from: function(table){
        return {
          select: function(){ return this; },
          eq: function(){ return this; },
          gte: function(){ return this; },
          order: function(){ return this; },
          limit: function(){ return this; },
          maybeSingle: function(){ return Promise.resolve({data:null,error:null}); },
          then: function(cb){ return Promise.resolve({data:window._MOCK_ACTIVITY_LOG||[],error:null}).then(cb); }
        };
      },
      auth: { getSession: function(){ return Promise.resolve({data:{session:null}}); } }
    };
  };
}

// ── Patch _loadActivity no analytics-engine para usar mock ────────────
// Aguarda o analytics-engine carregar e substitui _loadActivity
(function patchAnalytics(){
  function tryPatch(){
    if(window.AnalyticsEngine && window._MOCK_ACTIVITY_LOG){
      // Injetamos o mock diretamente no cache interno
      // O analytics-engine usa _activityCache — precisamos setar via closure
      // Como nao temos acesso direto, sobrescrevemos o from('activity_log')
      // que ja foi tratado no mock supabase shim acima
      console.log('[mock] AnalyticsEngine disponivel — mock ativo');
    } else {
      setTimeout(tryPatch, 200);
    }
  }
  setTimeout(tryPatch, 500);
})();

// ── 4. BANNER MVP ─────────────────────────────────────────────────────
function _showMockBanner(){
  // Remove banner anterior se existir
  var old = document.getElementById('mock-banner');
  if(old) old.remove();

  var b = document.createElement('div');
  b.id = 'mock-banner';
  b.innerHTML = '⚡ MODO MVP — Dados simulados (45 deals) · <a href="javascript:void(0)" onclick="document.getElementById(\'mock-banner\').remove()" style="color:var(--accent);text-decoration:none">Fechar</a>';
  b.style.cssText = 'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);color:var(--amber,#f59e0b);font-size:11px;padding:6px 16px;border-radius:20px;z-index:9999;backdrop-filter:blur(8px);white-space:nowrap;';
  document.body.appendChild(b);
}

})();
