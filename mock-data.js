// ======================================================================
// ELUCY COCKPIT — MOCK DATA LAYER v2
// Expoe window._injectMockDeals() — chamado pelo Intel auto-load quando
// Supabase nao responde. Tambem disponivel via ?mock=1 na URL.
// ======================================================================
(function(){
'use strict';

// ── Dataset de deals simulados ────────────────────────────────────────
var MOCK_DEALS = [
  // Diamond (8 ativos)
  {n:'Rafael Mendonça Lima',   c:'CEO',              t:'diamond', e:'Entrevista Agendada', f:'Oportunidade', s:'ativo',  l:'aquisicao',        g:'Aquisição',          ch:'Outbound',   d:2,  r:38000, fat:'R$ 50M - R$ 200M', seg:'Tecnologia'},
  {n:'Carla Bittencourt',      c:'Sócia ou Fundadora',t:'diamond',e:'Entrevista Agendada', f:'Oportunidade', s:'ativo',  l:'expansao',         g:'Expansão',           ch:'Social DM',  d:4,  r:45000, fat:'R$ 100M+',         seg:'Varejo'},
  {n:'Thiago Drummond',        c:'Presidente ou CEO', t:'diamond',e:'Agendamento',          f:'Agendado',     s:'ativo',  l:'turmas',           g:'Turmas',             ch:'Inbound',    d:1,  r:32000, fat:'R$ 50M - R$ 200M', seg:'Construção Civil'},
  {n:'Fernanda Queiroz',       c:'CEO',              t:'diamond', e:'Conectados',           f:'Conectado',    s:'ativo',  l:'field_sales',      g:'Field Sales',        ch:'Field Sales',d:6,  r:41000, fat:'R$ 200M+',         seg:'Saúde'},
  {n:'Eduardo Salomão',        c:'Sócio ou Fundador', t:'diamond',e:'Reagendamento',        f:'Reagendamento',s:'ativo',  l:'aquisicao',        g:'Aquisição',          ch:'Outbound',   d:17, r:38000, fat:'R$ 50M - R$ 200M', seg:'Industria'},
  {n:'Patricia Volpe',         c:'Presidente ou CEO', t:'diamond',e:'Entrevista Agendada',  f:'Oportunidade', s:'ativo',  l:'renovacao',        g:'Renovação',          ch:'CRM',        d:3,  r:52000, fat:'R$ 100M+',         seg:'Educação'},
  {n:'Marcelo Furtado',        c:'CEO',              t:'diamond', e:'Agendamento',          f:'Agendado',     s:'ativo',  l:'projetos_eventos', g:'Projetos & Eventos', ch:'Outbound',   d:5,  r:29000, fat:'R$ 50M - R$ 200M', seg:'Agronegócio'},
  {n:'Isabela Ramos Torres',   c:'Sócia ou Fundadora',t:'diamond',e:'Conectados',           f:'Conectado',    s:'ativo',  l:'aquisicao',        g:'Aquisição',          ch:'Social DM',  d:8,  r:35000, fat:'R$ 100M+',         seg:'Financeiro'},
  // Gold (9 ativos)
  {n:'Gustavo Paiva Neto',     c:'Diretor',           t:'gold',   e:'Entrevista Agendada',  f:'Oportunidade', s:'ativo',  l:'turmas',           g:'Turmas',             ch:'Inbound',    d:2,  r:18000, fat:'R$ 10M - R$ 50M',  seg:'Tecnologia'},
  {n:'Larissa Mendes',         c:'CEO',               t:'gold',   e:'Agendamento',          f:'Agendado',     s:'ativo',  l:'aquisicao',        g:'Aquisição',          ch:'Outbound',   d:4,  r:15000, fat:'R$ 5M - R$ 10M',   seg:'Varejo'},
  {n:'Diego Cavalcante',       c:'Sócio ou Fundador', t:'gold',   e:'Conectados',           f:'Conectado',    s:'ativo',  l:'social_dm',        g:'Social DM',          ch:'Social DM',  d:3,  r:17000, fat:'R$ 10M - R$ 50M',  seg:'Serviços'},
  {n:'Amanda Rocha',           c:'Diretora Comercial',t:'gold',   e:'Reagendamento',        f:'Reagendamento',s:'ativo',  l:'reativacao',       g:'Reativação',         ch:'CRM',        d:15, r:19000, fat:'R$ 50M - R$ 200M', seg:'Logística'},
  {n:'Bruno Teixeira',         c:'CEO',               t:'gold',   e:'Entrevista Agendada',  f:'Oportunidade', s:'ativo',  l:'expansao',         g:'Expansão',           ch:'CRM',        d:2,  r:22000, fat:'R$ 10M - R$ 50M',  seg:'Saúde'},
  {n:'Juliana Castelo',        c:'Sócia ou Fundadora',t:'gold',   e:'Agendamento',          f:'Agendado',     s:'ativo',  l:'turmas',           g:'Turmas',             ch:'Inbound',    d:6,  r:14000, fat:'R$ 5M - R$ 10M',   seg:'Educação'},
  {n:'Felipe Monteiro',        c:'Presidente',        t:'gold',   e:'Conectados',           f:'Conectado',    s:'ativo',  l:'projetos_eventos', g:'Projetos & Eventos', ch:'Outbound',   d:9,  r:16000, fat:'R$ 10M - R$ 50M',  seg:'Construção Civil'},
  {n:'Renata Sobral',          c:'CEO',               t:'gold',   e:'Dia 01',               f:'MQL',          s:'ativo',  l:'aquisicao',        g:'Aquisição',          ch:'Outbound',   d:11, r:18000, fat:'R$ 5M - R$ 10M',   seg:'Industria'},
  {n:'Paulo Henrique Vilas',   c:'Diretor',           t:'gold',   e:'Entrevista Agendada',  f:'Oportunidade', s:'ativo',  l:'field_sales',      g:'Field Sales',        ch:'Field Sales',d:3,  r:21000, fat:'R$ 10M - R$ 50M',  seg:'Agronegócio'},
  // Silver (9 ativos)
  {n:'Mariana Lopes',          c:'Gerente',           t:'silver', e:'Agendamento',          f:'Agendado',     s:'ativo',  l:'turmas',           g:'Turmas',             ch:'Inbound',    d:2,  r:9000,  fat:'R$ 1M - R$ 5M',    seg:'Tecnologia'},
  {n:'Roberto Cunha',          c:'Sócio ou Fundador', t:'silver', e:'Conectados',           f:'Conectado',    s:'ativo',  l:'social_dm',        g:'Social DM',          ch:'Social DM',  d:5,  r:8500,  fat:'R$ 1M - R$ 5M',    seg:'Varejo'},
  {n:'Camila Faria',           c:'CEO',               t:'silver', e:'Dia 01',               f:'MQL',          s:'ativo',  l:'aquisicao',        g:'Aquisição',          ch:'Outbound',   d:7,  r:9500,  fat:'R$ 1M - R$ 5M',    seg:'Serviços'},
  {n:'Leonardo Assis',         c:'Diretor',           t:'silver', e:'Entrevista Agendada',  f:'Oportunidade', s:'ativo',  l:'renovacao',        g:'Renovação',          ch:'CRM',        d:1,  r:11000, fat:'R$ 5M - R$ 10M',   seg:'Saúde'},
  {n:'Tatiana Vidal',          c:'Gerente Comercial', t:'silver', e:'Reagendamento',        f:'Reagendamento',s:'ativo',  l:'reativacao',       g:'Reativação',         ch:'CRM',        d:18, r:8000,  fat:'R$ 1M - R$ 5M',    seg:'Logística'},
  {n:'Henrique Bastos',        c:'Sócio ou Fundador', t:'silver', e:'Agendamento',          f:'Agendado',     s:'ativo',  l:'turmas',           g:'Turmas',             ch:'Inbound',    d:4,  r:9200,  fat:'R$ 1M - R$ 5M',    seg:'Educação'},
  {n:'Adriana Pinto',          c:'CEO',               t:'silver', e:'Conectados',           f:'Conectado',    s:'ativo',  l:'projetos_eventos', g:'Projetos & Eventos', ch:'Outbound',   d:6,  r:10000, fat:'R$ 5M - R$ 10M',   seg:'Construção Civil'},
  {n:'Marcos Alves',           c:'Diretor',           t:'silver', e:'Dia 02',               f:'SAL',          s:'ativo',  l:'social_dm',        g:'Social DM',          ch:'Social DM',  d:3,  r:8800,  fat:'R$ 1M - R$ 5M',    seg:'Industria'},
  {n:'Priscila Mendonça',      c:'CEO',               t:'silver', e:'Entrevista Agendada',  f:'Oportunidade', s:'ativo',  l:'aquisicao',        g:'Aquisição',          ch:'Outbound',   d:2,  r:9600,  fat:'R$ 5M - R$ 10M',   seg:'Financeiro'},
  // Bronze (9 ativos)
  {n:'Gabriel Novaes',         c:'Gerente',           t:'bronze', e:'Dia 01',               f:'MQL',          s:'ativo',  l:'aquisicao',        g:'Aquisição',          ch:'Outbound',   d:4,  r:4500,  fat:'Até R$ 1M',        seg:'Tecnologia'},
  {n:'Nathalia Costa',         c:'Coordenadora',      t:'bronze', e:'Dia 02',               f:'SAL',          s:'ativo',  l:'turmas',           g:'Turmas',             ch:'Inbound',    d:2,  r:4000,  fat:'Até R$ 1M',        seg:'Varejo'},
  {n:'Vinicius Correia',       c:'Gerente',           t:'bronze', e:'Conectados',           f:'Conectado',    s:'ativo',  l:'social_dm',        g:'Social DM',          ch:'Social DM',  d:8,  r:3800,  fat:'Até R$ 1M',        seg:'Serviços'},
  {n:'Leticia Campos',         c:'Sócia ou Fundadora',t:'bronze', e:'Dia 03',               f:'MQL',          s:'ativo',  l:'selfcheckout',     g:'Self Checkout',      ch:'Self Checkout',d:3, r:3500,  fat:'Até R$ 1M',        seg:'Saúde'},
  {n:'Andre Freitas',          c:'Gerente Comercial', t:'bronze', e:'Reagendamento',        f:'Reagendamento',s:'ativo',  l:'reativacao',       g:'Reativação',         ch:'CRM',        d:16, r:4200,  fat:'Até R$ 1M',        seg:'Logística'},
  {n:'Sabrina Luz',            c:'Coordenadora',      t:'bronze', e:'Agendamento',          f:'Agendado',     s:'ativo',  l:'turmas',           g:'Turmas',             ch:'Inbound',    d:5,  r:4800,  fat:'R$ 1M - R$ 5M',    seg:'Educação'},
  {n:'Carlos Batista',         c:'Gerente',           t:'bronze', e:'Dia 01',               f:'MQL',          s:'ativo',  l:'aquisicao',        g:'Aquisição',          ch:'Outbound',   d:9,  r:3900,  fat:'Até R$ 1M',        seg:'Construção Civil'},
  {n:'Joana Maciel',           c:'CEO',               t:'bronze', e:'Conectados',           f:'Conectado',    s:'ativo',  l:'social_dm_segment_k',g:'Social DM K',     ch:'Social DM',  d:6,  r:4100,  fat:'Até R$ 1M',        seg:'Industria'},
  {n:'Rodrigo Lacerda',        c:'Gerente',           t:'bronze', e:'Dia 02',               f:'SAL',          s:'ativo',  l:'aquisicao',        g:'Aquisição',          ch:'Outbound',   d:4,  r:4300,  fat:'Até R$ 1M',        seg:'Agronegócio'},
  // Fechados — ganho/perdido (para Bowtie, Three Es, GTM)
  {n:'Sandra Mota',            c:'CEO',               t:'gold',   e:'Won', f:'Won',         s:'ganho',        l:'turmas',          g:'Turmas',          ch:'Inbound',    d:0, r:16000, fat:'R$ 10M - R$ 50M',  seg:'Tecnologia'},
  {n:'Flavio Ribeiro',         c:'Diretor',           t:'silver', e:'Lost',f:'Lost',        s:'perdido',      l:'aquisicao',       g:'Aquisição',       ch:'Outbound',   d:0, r:9000,  fat:'R$ 1M - R$ 5M',    seg:'Varejo',      ml:'Sem budget'},
  {n:'Cristiane Melo',         c:'Sócia ou Fundadora',t:'diamond',e:'Won', f:'Won',         s:'ganho',        l:'renovacao',       g:'Renovação',       ch:'CRM',        d:0, r:42000, fat:'R$ 100M+',         seg:'Saúde'},
  {n:'Alexandre Dias',         c:'Presidente',        t:'gold',   e:'Won', f:'Won',         s:'ganho',        l:'expansao',        g:'Expansão',        ch:'CRM',        d:0, r:23000, fat:'R$ 50M - R$ 200M', seg:'Financeiro'},
  {n:'Roberta Nunes',          c:'Gerente',           t:'bronze', e:'Lost',f:'Lost',        s:'perdido',      l:'social_dm',       g:'Social DM',       ch:'Social DM',  d:0, r:3800,  fat:'Até R$ 1M',        seg:'Serviços',    ml:'Timing'},
  {n:'Danilo Pires',           c:'CEO',               t:'silver', e:'Won', f:'Won',         s:'ganho',        l:'turmas',          g:'Turmas',          ch:'Inbound',    d:0, r:10500, fat:'R$ 5M - R$ 10M',   seg:'Construção Civil'},
  {n:'Viviane Torres',         c:'Diretora',          t:'gold',   e:'Won', f:'Won',         s:'ganho',        l:'projetos_eventos',g:'Projetos & Eventos',ch:'Outbound', d:0, r:19500, fat:'R$ 10M - R$ 50M',  seg:'Agronegócio'},
  {n:'Mateus Carvalho',        c:'Gerente',           t:'bronze', e:'Lost',f:'Lost',        s:'perdido',      l:'aquisicao',       g:'Aquisição',       ch:'Outbound',   d:0, r:4000,  fat:'Até R$ 1M',        seg:'Logística',   ml:'Concorrência'},
  {n:'Erica Fontes',           c:'Sócia ou Fundadora',t:'diamond',e:'Won', f:'Won',         s:'ganho',        l:'field_sales',     g:'Field Sales',     ch:'Field Sales',d:0, r:47000, fat:'R$ 200M+',         seg:'Educação'},
  {n:'Sergio Leal',            c:'Presidente',        t:'silver', e:'Lost',f:'Lost',        s:'perdido',      l:'reativacao',      g:'Reativação',      ch:'CRM',        d:0, r:9200,  fat:'R$ 1M - R$ 5M',    seg:'Industria',   ml:'Sem budget'}
];

// ── Activity log mock (180 eventos / 30 dias) ─────────────────────────
var ACT_TYPES = ['copy_generated','copy_sent_wa','analysis_generated','dvl_confirmed','note_crm_copied','dm_generated','enrichment_added','copy_sent_ig'];
var ACT_WEIGHTS = [30, 20, 25, 10, 15, 12, 8, 10]; // probabilidade relativa

function _pickWeighted(items, weights){
  var total = weights.reduce(function(a,b){return a+b;},0);
  var r = Math.random() * total;
  var sum = 0;
  for(var i=0;i<items.length;i++){ sum+=weights[i]; if(r<sum) return items[i]; }
  return items[0];
}

function _buildActivityLog(dealIds){
  var acts = [];
  var base = new Date('2026-04-04');
  for(var i=0;i<200;i++){
    var daysAgo = Math.floor(Math.random()*30);
    var dt = new Date(base - daysAgo*86400000);
    acts.push({
      activity_type: _pickWeighted(ACT_TYPES, ACT_WEIGHTS),
      deal_id: dealIds[Math.floor(Math.random()*dealIds.length)],
      metadata: {},
      created_at: dt.toISOString()
    });
  }
  return acts;
}

// ── Constrói um dealObj completo a partir de um template ──────────────
function _buildDeal(t, idx){
  var id = 'mock-' + idx;
  var slug = (t.n||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'.');
  var email = slug + '@empresa.com.br';
  var isAtRisk = (t.d||0) > 10;
  var isDome   = (t.d||0) > 14;
  var personaMap = {diamond:'Titan', gold:'Titan', silver:'Builder', bronze:'Executor'};
  var bowtieMap  = {
    expansao:'EXP', renovacao:'RET', reativacao:'RET', g4_tools:'EXP',
    turmas:'ACQ', aquisicao:'ACQ', field_sales:'ACQ', social_dm:'ACQ',
    social_dm_segment_k:'ACQ', projetos_eventos:'ACQ', selfcheckout:'ACQ'
  };
  var scoreBase = {diamond:0.78, gold:0.62, silver:0.50, bronze:0.36};
  var base = scoreBase[t.t] || 0.50;
  var now = new Date('2026-04-04');

  return {
    id: id, deal_id: 'deal-'+id,
    nome: t.n, contact_name: t.n, nomeNegocio: t.n,
    empresa: email, emailLead: email,
    cargo: t.c,
    tier: t.t, _tier: t.t,
    etapa: t.e, _etapa: t.e, etapa_atual_no_pipeline: t.e,
    fase: t.f, _fase: t.f, fase_atual_no_processo: t.f,
    statusDeal: t.s, status_do_deal: t.s,
    motivoLost: t.ml || '',
    linhaReceita: t.l, linha_de_receita_vigente: t.l, _revLine: t.l,
    grupo_de_receita: t.g,
    canal: t.ch, canal_de_marketing: t.ch,
    utm_medium: t.ch.toLowerCase().replace(/[\s\/]/g,'_'),
    utm_source: t.ch.toLowerCase().includes('social')?'instagram':'google',
    utm_campaign: '',
    delta: t.d, _delta: t.d,
    revenueRaw: t.r, revenue: t.r, elucyValor: t.r,
    valor_da_oportunidade: t.r,
    faixa_de_faturamento: t.fat||'',
    p_segmento: t.seg||'',
    p_negociacoes_ganhas: t.s==='ganho'?1:0,
    p_receita_total: t.s==='ganho'?t.r:0,
    p_cluster_rfm: {diamond:'Champions',gold:'Loyal',silver:'Potential',bronze:'At Risk'}[t.t]||'Potential',
    p_pa_cliente: '',
    _aging: {
      band: t.d<=2?'fresh':t.d<=5?'normal':t.d<=10?'aging':'critical',
      days: t.d, isAtRisk: isAtRisk, riskLevel: isAtRisk?'high':'normal'
    },
    temp: {diamond:85, gold:65, silver:48, bronze:32}[t.t]||50,
    tc: {diamond:'hot',gold:'warm',silver:'warm',bronze:'cold'}[t.t]||'cold',
    tl: {diamond:'Hot',gold:'Warm',silver:'Warm',bronze:'Cold'}[t.t]||'Cold',
    dd: t.d>7?'⚠ '+t.d+'d':t.d+'d',
    _signal: isDome?'DOME':isAtRisk?'RISK':t.d<=3?'BUY':'STALL',
    _urgency: {diamond:isDome?95:80, gold:65, silver:50, bronze:35}[t.t]||50,
    _persona: personaMap[t.t]||'Builder',
    _touchpoints: 3 + Math.floor(Math.random()*7),
    _bowtiegLeg: bowtieMap[t.l]||'ACQ',
    _forecastV6:      { score: base+0.05, confidence: 0.65, band: t.t==='diamond'?'A':'B' },
    _dataQuality:     { data_trust_score: base+0.04, completeness: base+0.02, consistency: base+0.07, recency: base-0.02, evidence: base-0.05 },
    _frameworkRuntime:{ qualitative_score: base, coverage_pct: Math.round((base+0.02)*100) },
    _trustedAdvisor:  { score: base+0.02 },
    _spinAudit:       { applicable: true, score: base+0.01 },
    _intentSignal:    { reciprocidade: base+0.10, curiosidade: base+0.05, confianca: base },
    qualificador_name: 'Nathan Souza',
    proprietario_name: 'Nathan Souza',
    operator_email: window._currentUserEmail||'n.souza@g4educacao.com',
    created_at_crm: new Date(now - t.d*86400000).toISOString(),
    createdAtCrm:   new Date(now - t.d*86400000).toISOString(),
    closed_at: (t.s==='ganho'||t.s==='perdido')?new Date(now-2*86400000).toISOString():'',
    conta_founder: ''
  };
}

// ── Funcao principal exposta globalmente ──────────────────────────────
window._injectMockDeals = function(){
  window._COCKPIT_DEAL_MAP = window._COCKPIT_DEAL_MAP || {};

  // Nao reinjeta se ja tem dados reais
  var existing = Object.keys(window._COCKPIT_DEAL_MAP);
  if(existing.length > 0 && !existing[0].startsWith('mock-')) return;

  MOCK_DEALS.forEach(function(t, i){
    var deal = _buildDeal(t, i);
    window._COCKPIT_DEAL_MAP[deal.id] = deal;
  });

  var ids = Object.keys(window._COCKPIT_DEAL_MAP);
  window._MOCK_ACTIVITY_LOG = _buildActivityLog(ids);
  window._MOCK_READY = true;
  window._allDeals = Object.values(window._COCKPIT_DEAL_MAP);

  console.log('[mock] Injetado: ' + ids.length + ' deals + 200 atividades');
  _showMockBanner();
};

// ── Banner MVP ────────────────────────────────────────────────────────
function _showMockBanner(){
  var old = document.getElementById('mock-mvp-banner');
  if(old) old.remove();
  var b = document.createElement('div');
  b.id = 'mock-mvp-banner';
  b.innerHTML = '⚡ MVP — dados simulados (45 deals) &nbsp;·&nbsp; <a href="javascript:void(0)" onclick="document.getElementById(\'mock-mvp-banner\').remove()" style="color:inherit;opacity:.6">fechar</a>';
  b.style.cssText = [
    'position:fixed','bottom:14px','left:50%','transform:translateX(-50%)',
    'background:rgba(245,158,11,0.12)','border:1px solid rgba(245,158,11,0.35)',
    'color:#f59e0b','font-size:11px','padding:5px 18px','border-radius:20px',
    'z-index:9999','backdrop-filter:blur(6px)','white-space:nowrap','pointer-events:auto'
  ].join(';');
  if(document.body) document.body.appendChild(b);
  else document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(b); });
}

// ── Patch analytics-engine: _loadActivity usa mock quando disponivel ─
// Aguarda analytics-engine estar pronto e injeta shim no cache interno
(function patchAnalytics(){
  function tryPatch(){
    if(!window.AnalyticsEngine){ setTimeout(tryPatch, 300); return; }
    // Sobrescreve getSB para servir activity_log mock
    var _realGetSB = window.getSB;
    window.getSB = function(){
      var sb = _realGetSB ? _realGetSB() : null;
      if(sb) return sb;
      if(!window._MOCK_READY) return null;
      // Retorna shim minimal com suporte a from('activity_log')
      return {
        from: function(table){
          var self = {
            _filters: {},
            select: function(){ return self; },
            eq:     function(){ return self; },
            gte:    function(){ return self; },
            lte:    function(){ return self; },
            order:  function(){ return self; },
            limit:  function(){ return self; },
            maybeSingle: function(){ return Promise.resolve({data:null,error:null}); },
            then: function(cb){
              var data = table==='activity_log' ? (window._MOCK_ACTIVITY_LOG||[]) : [];
              return Promise.resolve({data:data,error:null}).then(cb);
            }
          };
          return self;
        },
        auth: { getSession: function(){ return Promise.resolve({data:{session:null}}); } }
      };
    };
    console.log('[mock] AnalyticsEngine patched');
  }
  setTimeout(tryPatch, 400);
})();

// ── Auto-inject: sempre que nao ha dados reais apos 2.5s ──────────────
// Garante que Intel nunca fica em branco mesmo sem Supabase/deals reais
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    // Injeta apenas se nao ha dados reais carregados
    var map = window._COCKPIT_DEAL_MAP;
    var keys = map ? Object.keys(map) : [];
    var hasReal = keys.length > 0 && !keys[0].startsWith('mock-');
    if(!hasReal){
      window._injectMockDeals();
      // Re-render Intel se estiver ativo
      var si = document.getElementById('screen-intelligence');
      if(si && si.classList.contains('on') && typeof _intelRender !== 'undefined'){
        setTimeout(function(){ _intelRender(); }, 100);
      }
    }
  }, 1800);
});

// ── Auto-inject imediato se ?mock=1 na URL ───────────────────────────
if(location.search.indexOf('mock=1') >= 0){
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      window._injectMockDeals();
      if(typeof _intelRender !== 'undefined') _intelRender();
    }, 600);
  });
}

})();
