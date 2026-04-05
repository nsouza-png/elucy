// ============================================================================
// REPORTS V4 ENGINE — Pre-Vendas Intelligence Layer
// Fonte de dados:
//   - Databricks (funil_comercial): Δt oficiais, métricas agregadas, CRs
//   - Supabase (deals + deal_stage_history): contagens event-based do mês
// NÃO depende de _COCKPIT_DEAL_MAP — funciona independente do pipeline tab
// ============================================================================

(function () {
  'use strict';

  // --- Helpers ---
  function _sb() { return window.getSB ? window.getSB() : null; }
  function _opEmail() { return window.getOperatorId ? window.getOperatorId() : null; }
  function _pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 : 0; }
  function _fmt(n) { return n != null ? n.toLocaleString('pt-BR') : '—'; }
  function _fmtBRL(n) { return n != null ? 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'; }
  function _fmtDays(n) { return (n != null && !isNaN(n)) ? (Math.round(n * 10) / 10) + 'd' : '—'; }
  function _today() { return new Date().toISOString().slice(0, 10); }
  function _monthStart() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

  // Sem cache — dados sempre frescos em tempo real
  function _cacheGet(key) { return null; }
  function _cacheSet(key, data) { }

  // ============================================================================
  // PERIOD STATE — controla janela de tempo ativa em toda a tab Pre-Vendas
  // ============================================================================

  var _period = { preset: '30d', from: null, to: null };

  function _periodDates() {
    if (_period.preset === 'custom' && _period.from && _period.to) {
      return { from: _period.from, to: _period.to };
    }
    var to = new Date();
    var from = new Date();
    if (_period.preset === '7d')  from.setDate(from.getDate() - 7);
    else if (_period.preset === '90d') from.setDate(from.getDate() - 90);
    else from.setDate(from.getDate() - 30); // default 30d
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }

  function _periodNextDay(dateStr) {
    var d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  function _periodLabel() {
    var p = _periodDates();
    var fmt = function(s) { return s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4); };
    if (_period.preset !== 'custom') return _period.preset + ' · ' + fmt(p.from) + ' → ' + fmt(p.to);
    return fmt(p.from) + ' → ' + fmt(p.to);
  }

  // ============================================================================
  // DATABRICKS DATA LAYER — métricas analíticas oficiais do funil_comercial
  // Usa o mesmo padrão do cockpit: Bearer token em localStorage('elucy_db_token')
  // ============================================================================

  var _DB_ENDPOINT = 'https://dbc-8acefaf9-a170.cloud.databricks.com/api/2.0/sql/statements';
  var _DB_WAREHOUSE = 'bbae754ea44f67e0';

  function _dbToken() { return localStorage.getItem('elucy_db_token') || null; }
  function _qualName() { return localStorage.getItem('elucy_qualificador_name') || null; }

  // Executa SQL no Databricks com poll automático. Retorna array de objetos {col: val}.
  async function _dbQuery(sql) {
    var token = _dbToken();
    if (!token) return null; // sem token → sem dados Databricks
    try {
      var resp = await fetch(_DB_ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: sql, warehouse_id: _DB_WAREHOUSE, wait_timeout: '30s', on_wait_timeout: 'CONTINUE' })
      });
      if (!resp.ok) return null;
      var data = await resp.json();
      // Poll se ainda rodando
      var attempts = 0;
      while (data.status && (data.status.state === 'PENDING' || data.status.state === 'RUNNING') && attempts < 15) {
        await new Promise(function (r) { setTimeout(r, 2000); });
        var pr = await fetch(_DB_ENDPOINT + '/' + data.statement_id, { headers: { 'Authorization': 'Bearer ' + token } });
        data = await pr.json();
        attempts++;
      }
      if (!data.result || !data.manifest) return null;
      var cols = (data.manifest.schema && data.manifest.schema.columns || []).map(function (c) { return c.name; });
      var rows = data.result.data_array || [];
      return rows.map(function (row) {
        var obj = {};
        cols.forEach(function (c, i) { obj[c] = row[i]; });
        return obj;
      });
    } catch (e) { return null; }
  }

  // Busca métricas agregadas do funil_comercial para o qualificador — usa período ativo
  async function fetchDatabricksMetrics(qualName) {
    var qn = qualName || _qualName();
    if (!qn) return null;
    var pd = _periodDates();
    var monthStart = pd.from;
    var nextMonth = _periodNextDay(pd.to);

    var sql = `
      SELECT
        COUNT(DISTINCT CASE WHEN event = 'MQL'          THEN deal_id END) AS mql_count,
        COUNT(DISTINCT CASE WHEN event = 'SAL'          THEN deal_id END) AS sal_count,
        COUNT(DISTINCT CASE WHEN event = 'Agendado'     THEN deal_id END) AS agendamento_count,
        COUNT(DISTINCT CASE WHEN event = 'Oportunidade' THEN deal_id END) AS opp_count,
        COUNT(DISTINCT CASE WHEN event = 'Negociação'   THEN deal_id END) AS negociacao_count,
        COUNT(DISTINCT CASE WHEN event = 'Ganho'        THEN deal_id END) AS won_count,
        COUNT(DISTINCT CASE WHEN event = 'Perdido'      THEN deal_id END) AS lost_count,
        ROUND(AVG(CASE WHEN event = 'Ganho' AND delta_t > 0 AND delta_t < 365 THEN delta_t END), 1) AS avg_delta_t_ganho,
        ROUND(AVG(CASE WHEN event = 'Oportunidade' AND delta_t > 0 AND delta_t < 180 THEN delta_t END), 1) AS avg_delta_t_opp,
        ROUND(AVG(CASE WHEN event = 'Agendado' AND delta_t > 0 AND delta_t < 180 THEN delta_t END), 1) AS avg_delta_t_agendado,
        ROUND(AVG(CASE WHEN event = 'SAL' AND delta_t > 0 AND delta_t < 180 THEN delta_t END), 1) AS avg_delta_t_sal,
        ROUND(SUM(CASE WHEN event = 'Ganho' THEN revenue END), 0)                          AS receita_won,
        ROUND(AVG(CASE WHEN event = 'Ganho' AND revenue > 0 THEN revenue END), 0)          AS ticket_medio,
        ROUND(SUM(CASE WHEN event = 'Oportunidade' THEN valor_da_oportunidade END), 0)     AS pipeline_value
      FROM production.diamond.funil_comercial
      WHERE qualificador_name = '${qn}'
        AND event_timestamp >= CAST('${monthStart} 00:00:00' AS TIMESTAMP)
        AND event_timestamp <  CAST('${nextMonth} 00:00:00' AS TIMESTAMP)
    `;

    var rows = await _dbQuery(sql.trim());
    if (!rows || !rows.length) return null;
    var r = rows[0];

    function _n(v) { return v != null && v !== '' ? parseFloat(v) : null; }
    function _i(v) { return v != null && v !== '' ? parseInt(v, 10) : 0; }

    var mql = _i(r.mql_count);
    var sal = _i(r.sal_count);
    var agend = _i(r.agendamento_count);
    var opp = _i(r.opp_count);
    var neg = _i(r.negociacao_count);
    var won = _i(r.won_count);
    var lost = _i(r.lost_count);

    return {
      mql_validos: mql,
      sal_count: sal,
      agendamento_count: agend,
      opp_count: opp,
      negociacao_count: neg,
      won_count: won,
      lost_count: lost,
      dt_mql_sal: _n(r.avg_delta_t_sal),
      dt_sal_conectado: null,
      dt_conectado_agendado: null,
      dt_agendado_oportunidade: _n(r.avg_delta_t_opp),
      dt_oportunidade_negociacao: null,
      dt_negociacao_ganho: _n(r.avg_delta_t_ganho),
      dt_agendado: _n(r.avg_delta_t_agendado),
      cr_mql_sal:   mql  ? _pct(sal,  mql)  : null,
      cr_sal_agend: sal  ? _pct(agend, sal)  : null,
      cr_agend_opp: agend ? _pct(opp,  agend) : null,
      cr_opp_won:   opp  ? _pct(won,  opp)  : null,
      cr_mql_opp:   mql  ? _pct(opp,  mql)  : null,
      receita_won: _n(r.receita_won),
      ticket_medio: _n(r.ticket_medio),
      pipeline_value: _n(r.pipeline_value),
      _source: 'databricks'
    };
  }

  async function fetchDatabricksLineBreakdown(qualName) {
    var qn = qualName || _qualName();
    if (!qn) return null;
    var pd = _periodDates();
    var monthStart = pd.from;
    var nextMonth = _periodNextDay(pd.to);
    var sql = `
      SELECT
        COALESCE(linha_de_receita_vigente, 'Não Definido') AS linha,
        COUNT(DISTINCT CASE WHEN event = 'MQL' THEN deal_id END)          AS mql,
        COUNT(DISTINCT CASE WHEN event = 'SAL' THEN deal_id END)          AS sal,
        COUNT(DISTINCT CASE WHEN event = 'Oportunidade' THEN deal_id END) AS opp,
        COUNT(DISTINCT CASE WHEN event = 'Ganho' THEN deal_id END)        AS won,
        COUNT(DISTINCT CASE WHEN event = 'Perdido' THEN deal_id END)      AS lost,
        ROUND(SUM(CASE WHEN event = 'Ganho' THEN revenue END), 0)         AS receita
      FROM production.diamond.funil_comercial
      WHERE qualificador_name = '${qn}'
        AND event_timestamp >= CAST('${monthStart} 00:00:00' AS TIMESTAMP)
        AND event_timestamp <  CAST('${nextMonth} 00:00:00' AS TIMESTAMP)
      GROUP BY 1
      ORDER BY mql DESC
      LIMIT 20
    `;
    var rows = await _dbQuery(sql.trim());
    if (!rows) return null;
    return rows.map(function (r) {
      var mql = parseInt(r.mql || 0, 10);
      var won = parseInt(r.won || 0, 10);
      var lost = parseInt(r.lost || 0, 10);
      var opp = parseInt(r.opp || 0, 10);
      return {
        name: r.linha,
        total: mql,
        sal: parseInt(r.sal || 0, 10),
        opp: opp, won: won, lost: lost,
        value: parseFloat(r.receita || 0),
        winRate: (won + lost) ? _pct(won, won + lost) : 0,
        cr_opp: mql ? _pct(opp, mql) : 0
      };
    }).filter(function(r) { return r.total > 0; });
  }

  async function fetchDatabricksDtByLine(qualName) {
    var qn = qualName || _qualName();
    if (!qn) return null;
    var pd = _periodDates();
    var monthStart = pd.from;
    var nextMonth = _periodNextDay(pd.to);
    var sql = `
      SELECT
        COALESCE(linha_de_receita_vigente, 'Não Definido') AS linha,
        COUNT(DISTINCT CASE WHEN event = 'MQL' THEN deal_id END) AS mql,
        ROUND(AVG(CASE WHEN event = 'SAL'          AND delta_t > 0 AND delta_t < 180 THEN delta_t END), 1) AS dt_mql_sal,
        ROUND(AVG(CASE WHEN event = 'Agendado'     AND delta_t > 0 AND delta_t < 180 THEN delta_t END), 1) AS dt_sal_agendado,
        ROUND(AVG(CASE WHEN event = 'Oportunidade' AND delta_t > 0 AND delta_t < 180 THEN delta_t END), 1) AS dt_agendado_opp,
        ROUND(AVG(CASE WHEN event = 'Ganho'        AND delta_t > 0 AND delta_t < 365 THEN delta_t END), 1) AS dt_negoc_ganho
      FROM production.diamond.funil_comercial
      WHERE qualificador_name = '${qn}'
        AND event_timestamp >= CAST('${monthStart} 00:00:00' AS TIMESTAMP)
        AND event_timestamp <  CAST('${nextMonth} 00:00:00' AS TIMESTAMP)
      GROUP BY 1
      HAVING mql >= 3
      ORDER BY mql DESC
      LIMIT 10
    `;
    var rows = await _dbQuery(sql.trim());
    return rows;
  }

  // ============================================================================
  // DATA LAYER — Supabase
  // created_at_crm pode ser nulo — usa synced_at como fallback de data de entrada
  // ============================================================================

  async function fetchDeals(operatorEmail) {
    var cached = _cacheGet('deals_' + (operatorEmail || 'all'));
    if (cached) return cached;

    var sb = _sb();
    if (!sb) return [];
    try {
      var q = sb.from('deals').select(
        'deal_id,fase_atual_no_processo,etapa_atual_no_pipeline,tier_da_oportunidade,' +
        'delta_t,qualificador_name,proprietario_name,linha_de_receita_vigente,' +
        'grupo_de_receita,created_at_crm,synced_at,canal_de_marketing,utm_medium,' +
        'revenue,valor_da_oportunidade,cargo,p_segmento,perfil,' +
        'faixa_de_faturamento,faixa_de_funcionarios,operator_email'
      ).limit(2000);
      if (operatorEmail) q = q.eq('operator_email', operatorEmail);
      var res = await q;
      var data = (res.data || []).map(function(d) {
        // Normaliza data de entrada: created_at_crm preferido, synced_at como fallback
        d._entry_date = (d.created_at_crm || d.synced_at || '').slice(0, 10);
        return d;
      });
      _cacheSet('deals_' + (operatorEmail || 'all'), data);
      return data;
    } catch (e) { return []; }
  }

  async function fetchOppEventsThisMonth(operatorEmail) {
    try {
      var sb = _sb();
      if (!sb) return null;
      var pd = _periodDates();
      var q = sb.from('deal_stage_history')
        .select('deal_id', { count: 'exact', head: true })
        .eq('to_stage', 'Oportunidade')
        .eq('source', 'databricks')
        .gte('changed_at', pd.from)
        .lte('changed_at', pd.to);
      if (operatorEmail) q = q.eq('changed_by', operatorEmail);
      var res = await q;
      if (res.error) return null;
      return res.count;
    } catch (e) { return null; }
  }

  async function fetchWonEventsThisMonth(operatorEmail) {
    try {
      var sb = _sb();
      if (!sb) return null;
      var pd = _periodDates();
      var q = sb.from('deal_stage_history')
        .select('deal_id', { count: 'exact', head: true })
        .eq('to_stage', 'Ganho')
        .eq('source', 'databricks')
        .gte('changed_at', pd.from)
        .lte('changed_at', pd.to);
      if (operatorEmail) q = q.eq('changed_by', operatorEmail);
      var res = await q;
      if (res.error) return null;
      return res.count;
    } catch (e) { return null; }
  }

  async function fetchDeltaTRuntime(operatorEmail) {
    try {
      var sb = _sb();
      if (!sb) return null;
      var q = sb.from('deal_runtime').select(
        'dt_sal_conectado,dt_conectado_agendado,dt_agendado_opp,' +
        'dt_opp_negociacao,dt_negociacao_ganho,velocity_score,stall_flag,linha_de_receita_vigente'
      );
      if (operatorEmail) q = q.eq('operator_email', operatorEmail);
      var res = await q.limit(2000);
      if (res.error || !res.data || !res.data.length) return null;

      function _avgField(field) {
        var vals = res.data.map(function (r) { return parseFloat(r[field]); }).filter(function (v) { return !isNaN(v) && v > 0; });
        return vals.length ? Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length * 10) / 10 : null;
      }

      return {
        dt_sal_conectado: _avgField('dt_sal_conectado'),
        dt_conectado_agendado: _avgField('dt_conectado_agendado'),
        dt_agendado_opp: _avgField('dt_agendado_opp'),
        dt_opp_negociacao: _avgField('dt_opp_negociacao'),
        dt_negociacao_ganho: _avgField('dt_negociacao_ganho'),
        avg_velocity_score: _avgField('velocity_score'),
        stall_count: res.data.filter(function (r) { return r.stall_flag === true; }).length,
        total: res.data.length,
        byLine: {}
      };
    } catch (e) { return null; }
  }

  // ============================================================================
  // CALC LAYER
  // ============================================================================

  var STAGE_MAP = {
    'mql': 'MQL', 'sal': 'SAL', 'conectado': 'SAL', 'conectados': 'SAL',
    'agendamento': 'Agendamento', 'agendado': 'Agendamento',
    'oportunidade': 'Oportunidade', 'opp': 'Oportunidade',
    'negociacao': 'Negociacao', 'negociação': 'Negociacao',
    'ganho': 'Ganho', 'won': 'Ganho', 'perdido': 'Perdido'
  };
  var STAGES = ['MQL', 'SAL', 'Agendamento', 'Oportunidade', 'Negociacao', 'Ganho'];
  var STAGE_ORDER = {};
  STAGES.forEach(function (s, i) { STAGE_ORDER[s] = i; });
  STAGE_ORDER['Perdido'] = 99;

  function _mapStage(fase) {
    var f = (fase || '').toLowerCase().trim();
    if (!f) return null;
    if (STAGE_MAP[f]) return STAGE_MAP[f];
    for (var k in STAGE_MAP) { if (f.indexOf(k) !== -1) return STAGE_MAP[k]; }
    return null;
  }

  function calcFunnel(deals) {
    var counts = {};
    STAGES.forEach(function (s) { counts[s] = 0; });
    counts['Perdido'] = 0;
    var oppAtivas = 0;

    deals.forEach(function (d) {
      var mapped = _mapStage(d.fase_atual_no_processo);
      if (mapped === null) return;
      if (mapped === 'Perdido') { counts['Perdido']++; return; }
      counts['MQL']++;
      if (['SAL', 'Agendamento', 'Oportunidade', 'Negociacao', 'Ganho'].indexOf(mapped) !== -1) counts['SAL']++;
      if (['Agendamento', 'Oportunidade', 'Negociacao', 'Ganho'].indexOf(mapped) !== -1) counts['Agendamento']++;
      if (mapped === 'Oportunidade' || mapped === 'Negociacao') {
        counts['Oportunidade']++;
        oppAtivas++;
      }
      if (mapped === 'Negociacao') counts['Negociacao']++;
      if (mapped === 'Ganho') counts['Ganho']++;
    });

    var crs = [];
    for (var i = 1; i < STAGES.length; i++) {
      crs.push({ from: STAGES[i - 1], to: STAGES[i], rate: _pct(counts[STAGES[i]], counts[STAGES[i - 1]]) });
    }
    return { stages: STAGES, counts: counts, conversions: crs, total: deals.length, lost: counts['Perdido'], oppAtivas: oppAtivas };
  }

  function calcDailyVolume(deals) {
    var monthStart = _monthStart();
    var byDay = {};

    // Volume diário = todos os deals que entraram no mês, independente de fase
    // created_at_crm pode ser nulo — usa _entry_date (synced_at como fallback)
    deals.forEach(function (d) {
      var created = d._entry_date || (d.created_at_crm || d.synced_at || '').slice(0, 10);
      if (!created || created < monthStart) return;
      if (!byDay[created]) byDay[created] = { entrada: 0, sal: 0, opp: 0, won: 0 };
      byDay[created].entrada++;
      var fase = (d.fase_atual_no_processo || '').toLowerCase();
      if (fase.indexOf('sal') !== -1 || fase.indexOf('conectad') !== -1 || fase.indexOf('agendament') !== -1 ||
        fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1)
        byDay[created].sal++;
      if (fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1)
        byDay[created].opp++;
      if (fase.indexOf('ganho') !== -1) byDay[created].won++;
    });

    var days = Object.keys(byDay).sort().map(function (d) {
      return { date: d, label: d.slice(8, 10) + '/' + d.slice(5, 7), mql: byDay[d].entrada, sal: byDay[d].sal, opp: byDay[d].opp, won: byDay[d].won };
    });
    return { days: days, monthStart: monthStart };
  }

  function calcEfficiencyByQualifier(deals) {
    var byQ = {};
    deals.forEach(function (d) {
      if (_mapStage(d.fase_atual_no_processo) === null) return;
      var qName = d.qualificador_name || 'Sem Qualificador';
      if (!byQ[qName]) byQ[qName] = { mql: 0, sal: 0, opp: 0, won: 0, lost: 0, revenue: 0 };
      var q = byQ[qName];
      var fase = (d.fase_atual_no_processo || '').toLowerCase();
      q.mql++;
      if (fase.indexOf('sal') !== -1 || fase.indexOf('conectad') !== -1 || fase.indexOf('agendament') !== -1 ||
        fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) q.sal++;
      if (fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) q.opp++;
      if (fase.indexOf('ganho') !== -1) { q.won++; q.revenue += parseFloat(d.revenue || d.valor_da_oportunidade || 0); }
      if (fase.indexOf('perdido') !== -1) q.lost++;
    });

    var rows = Object.keys(byQ).map(function (name) {
      var q = byQ[name];
      return { name: name, mql: q.mql, sal: q.sal, opp: q.opp, won: q.won, lost: q.lost, revenue: q.revenue,
        cr_mql_sal: _pct(q.sal, q.mql), cr_sal_opp: _pct(q.opp, q.sal),
        cr_opp_won: _pct(q.won, q.opp), cr_mql_won: _pct(q.won, q.mql) };
    });
    rows.sort(function (a, b) { return b.opp - a.opp; });
    var totals = rows.reduce(function (acc, r) {
      return { mql: acc.mql + r.mql, sal: acc.sal + r.sal, opp: acc.opp + r.opp, won: acc.won + r.won, revenue: acc.revenue + r.revenue };
    }, { mql: 0, sal: 0, opp: 0, won: 0, revenue: 0 });
    totals.cr_mql_sal = _pct(totals.sal, totals.mql);
    totals.cr_sal_opp = _pct(totals.opp, totals.sal);
    totals.cr_opp_won = _pct(totals.won, totals.opp);
    return { rows: rows, totals: totals };
  }

  function calcPipelineByLine(deals) {
    var byLine = {};
    deals.forEach(function (d) {
      if (_mapStage(d.fase_atual_no_processo) === null) return;
      var line = d.linha_de_receita_vigente || d.grupo_de_receita || 'Não Definido';
      if (!byLine[line]) byLine[line] = { total: 0, sal: 0, opp: 0, won: 0, lost: 0, value: 0 };
      var bl = byLine[line];
      var fase = (d.fase_atual_no_processo || '').toLowerCase();
      bl.total++;
      if (fase.indexOf('sal') !== -1 || fase.indexOf('conectad') !== -1 || fase.indexOf('agendament') !== -1 ||
        fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) bl.sal++;
      if (fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) bl.opp++;
      if (fase.indexOf('ganho') !== -1) { bl.won++; bl.value += parseFloat(d.revenue || d.valor_da_oportunidade || 0); }
      if (fase.indexOf('perdido') !== -1) bl.lost++;
    });
    var rows = Object.keys(byLine).map(function (name) {
      var l = byLine[name];
      return { name: name, total: l.total, sal: l.sal, opp: l.opp, won: l.won, lost: l.lost,
        value: l.value, winRate: _pct(l.won, l.won + l.lost) };
    });
    rows.sort(function (a, b) { return b.total - a.total; });
    return { rows: rows };
  }

  function calcClientProfile(deals) {
    var won = deals.filter(function (d) { return (d.fase_atual_no_processo || '').toLowerCase().indexOf('ganho') !== -1; });
    function _countField(arr, field) {
      var counts = {};
      arr.forEach(function (d) { var v = d[field] || 'Não informado'; counts[v] = (counts[v] || 0) + 1; });
      return Object.keys(counts).map(function (k) { return { label: k, count: counts[k] }; })
        .sort(function (a, b) { return b.count - a.count; }).slice(0, 8);
    }
    return {
      totalDeals: deals.length, wonDeals: won.length,
      byCargo: { won: _countField(won, 'cargo') },
      bySegmento: { won: _countField(won, 'p_segmento') },
      byPerfil: { won: _countField(won, 'perfil') },
      byFaturamento: { won: _countField(won, 'faixa_de_faturamento') }
    };
  }

  function calcChannelForecast(deals) {
    var byCh = {};
    deals.forEach(function (d) {
      if (_mapStage(d.fase_atual_no_processo) === null) return;
      var ch = d.canal_de_marketing || d.utm_medium || 'Outro';
      if (!byCh[ch]) byCh[ch] = { total: 0, opp: 0, won: 0, value: 0, oppValue: 0 };
      var bc = byCh[ch];
      var fase = (d.fase_atual_no_processo || '').toLowerCase();
      var val = parseFloat(d.valor_da_oportunidade || d.revenue || 0);
      bc.total++; bc.value += val;
      if (fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) {
        bc.opp++; bc.oppValue += val;
      }
      if (fase.indexOf('ganho') !== -1) bc.won++;
    });
    var rows = Object.keys(byCh).map(function (name) {
      var c = byCh[name];
      return { name: name, total: c.total, opp: c.opp, won: c.won, value: c.value, oppValue: c.oppValue,
        cr_opp: _pct(c.opp, c.total), cr_won: _pct(c.won, c.opp) };
    });
    rows.sort(function (a, b) { return b.oppValue - a.oppValue; });
    return { rows: rows };
  }

  // ============================================================================
  // STEP 3 — DATABRICKS MACRO (toda a operação, sem filtro de qualificador)
  // ============================================================================

  async function fetchDatabricksMacro() {
    var pd = _periodDates();
    var monthStart = pd.from;
    var nextMonth = _periodNextDay(pd.to);
    var sql = `
      SELECT
        COUNT(DISTINCT CASE WHEN event = 'MQL'          THEN deal_id END) AS mql_count,
        COUNT(DISTINCT CASE WHEN event = 'SAL'          THEN deal_id END) AS sal_count,
        COUNT(DISTINCT CASE WHEN event = 'Agendado'     THEN deal_id END) AS agendamento_count,
        COUNT(DISTINCT CASE WHEN event = 'Oportunidade' THEN deal_id END) AS opp_count,
        COUNT(DISTINCT CASE WHEN event = 'Ganho'        THEN deal_id END) AS won_count,
        COUNT(DISTINCT CASE WHEN event = 'Perdido'      THEN deal_id END) AS lost_count,
        ROUND(AVG(CASE WHEN event = 'SAL'          AND delta_t > 0 AND delta_t < 180 THEN delta_t END), 1) AS avg_dt_sal,
        ROUND(AVG(CASE WHEN event = 'Agendado'     AND delta_t > 0 AND delta_t < 180 THEN delta_t END), 1) AS avg_dt_agendado,
        ROUND(AVG(CASE WHEN event = 'Oportunidade' AND delta_t > 0 AND delta_t < 180 THEN delta_t END), 1) AS avg_dt_opp,
        ROUND(AVG(CASE WHEN event = 'Ganho'        AND delta_t > 0 AND delta_t < 365 THEN delta_t END), 1) AS avg_dt_ganho
      FROM production.diamond.funil_comercial
      WHERE event_timestamp >= CAST('${monthStart} 00:00:00' AS TIMESTAMP)
        AND event_timestamp <  CAST('${nextMonth} 00:00:00' AS TIMESTAMP)
    `;
    var rows = await _dbQuery(sql.trim());
    if (!rows || !rows.length) return null;
    var r = rows[0];
    function _i(v) { return v != null && v !== '' ? parseInt(v, 10) : 0; }
    function _n(v) { return v != null && v !== '' ? parseFloat(v) : null; }
    var mql = _i(r.mql_count), sal = _i(r.sal_count), agend = _i(r.agendamento_count);
    var opp = _i(r.opp_count), won = _i(r.won_count), lost = _i(r.lost_count);
    return {
      mql: mql, sal: sal, agend: agend, opp: opp, won: won, lost: lost,
      cr_mql_sal: mql ? _pct(sal, mql) : null,
      cr_sal_agend: sal ? _pct(agend, sal) : null,
      cr_agend_opp: agend ? _pct(opp, agend) : null,
      cr_opp_won: opp ? _pct(won, opp) : null,
      dt_mql_sal: _n(r.avg_dt_sal),
      dt_agendado: _n(r.avg_dt_agendado),
      dt_opp: _n(r.avg_dt_opp),
      dt_ganho: _n(r.avg_dt_ganho),
      _source: 'databricks_macro'
    };
  }

  // ============================================================================
  // STEP 1 — METAS DO OPERADOR (Supabase goals_current_period)
  // ============================================================================

  async function fetchGoals(operatorEmail) {
    try {
      var sb = _sb();
      if (!sb || !operatorEmail) return null;
      var res = await sb.from('goals_current_period')
        .select('meta_opp_mensal,meta_sal,meta_mql,meta_cr_mql_sal,meta_cr_sal_opp,meta_cr_opp_won,linhas_atribuidas')
        .eq('operator_email', operatorEmail)
        .single();
      if (res.error || !res.data) return null;
      return res.data;
    } catch(e) { return null; }
  }

  // ============================================================================
  // STEP 4 — BENCHMARK (fórmula híbrida: macro da operação vs individual)
  // ============================================================================

  function calcBenchmark(opMetrics, macroMetrics, goals) {
    if (!opMetrics || !macroMetrics) return null;
    // Benchmark = média ponderada: 70% macro operação + 30% meta configurada (se existir)
    function _bench(macroVal, goalVal) {
      if (goalVal != null && goalVal > 0) return Math.round(macroVal * 0.7 + goalVal * 0.3);
      return macroVal;
    }
    return {
      cr_mql_sal:   _bench(macroMetrics.cr_mql_sal,   goals && goals.meta_cr_mql_sal),
      cr_sal_opp:   _bench(macroMetrics.cr_agend_opp,  goals && goals.meta_cr_sal_opp),
      cr_opp_won:   _bench(macroMetrics.cr_opp_won,    goals && goals.meta_cr_opp_won),
      meta_opp:     goals && goals.meta_opp_mensal ? parseInt(goals.meta_opp_mensal, 10) : null,
      linhas_atribuidas: goals && goals.linhas_atribuidas ? goals.linhas_atribuidas : null
    };
  }

  // ============================================================================
  // STEP 7 — QUALITY DATA LAYER
  // ============================================================================

  async function fetchQualityRuntime(operatorEmail) {
    try {
      var sb = _sb();
      if (!sb) return null;
      var q = sb.from('deal_data_quality_runtime').select(
        'deal_id,operator_email,dqi_score,completeness_score,consistency_score,' +
        'recency_score,evidence_score,linha_de_receita_vigente,grupo_de_receita,' +
        'l19_completude,l19_consistencia,l19_recencia,l19_evidencia,dqi_band,updated_at'
      ).limit(500);
      if (operatorEmail) q = q.eq('operator_email', operatorEmail);
      var res = await q;
      return res.data || [];
    } catch(e) { return []; }
  }

  async function fetchTransitionRuntime(operatorEmail) {
    try {
      var sb = _sb();
      if (!sb) return null;
      var q = sb.from('deal_transition_runtime').select(
        'deal_id,operator_email,block_reason,block_category,is_blocked,' +
        'next_action,next_action_due,stall_days,linha_de_receita_vigente'
      ).eq('is_blocked', true).limit(200);
      if (operatorEmail) q = q.eq('operator_email', operatorEmail);
      var res = await q;
      return res.data || [];
    } catch(e) { return []; }
  }

  function calcQualityStats(qualityRows) {
    if (!qualityRows || !qualityRows.length) return null;
    function _avg(field) {
      var vals = qualityRows.map(function(r) { return parseFloat(r[field]); }).filter(function(v) { return !isNaN(v); });
      return vals.length ? Math.round(vals.reduce(function(a,b){return a+b;},0) / vals.length * 100) / 100 : null;
    }
    var bands = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    qualityRows.forEach(function(r) { var b = (r.dqi_band||'').toUpperCase(); if (bands[b]!=null) bands[b]++; });
    return {
      total: qualityRows.length,
      avg_dqi: _avg('dqi_score'),
      avg_completeness: _avg('completeness_score'),
      avg_consistency: _avg('consistency_score'),
      avg_recency: _avg('recency_score'),
      avg_evidence: _avg('evidence_score'),
      bands: bands
    };
  }

  function calcBlockReasons(blockedRows) {
    if (!blockedRows || !blockedRows.length) return [];
    var byReason = {};
    blockedRows.forEach(function(r) {
      var key = r.block_reason || r.block_category || 'Sem motivo';
      if (!byReason[key]) byReason[key] = { reason: key, count: 0, deals: [] };
      byReason[key].count++;
      if (r.deal_id) byReason[key].deals.push(r.deal_id);
    });
    return Object.values(byReason).sort(function(a,b){return b.count-a.count;});
  }

  // ============================================================================
  // RENDER LAYER
  // ============================================================================

  function renderFunnelBars(data) {
    if (!data || !data.stages) return '<div style="color:var(--text2);font-size:11px">Sem dados</div>';
    var maxVal = Math.max.apply(null, data.stages.map(function (s) { return data.counts[s] || 0; })) || 1;
    var html = '';
    var colors = ['var(--accent)', 'var(--accent2)', '#48bb78', '#ed8936', '#6c7ae0', '#38b2ac'];
    data.stages.forEach(function (stage, i) {
      var count = data.counts[stage] || 0;
      var pct = Math.round((count / maxVal) * 100);
      var cr = data.conversions[i - 1] ? data.conversions[i - 1].rate + '%' : '';
      html += '<div class="fr"><div class="fl">' + stage + '</div>';
      html += '<div class="fb-bg"><div class="fb-f" style="width:' + Math.max(pct, 3) + '%;background:' + (colors[i % colors.length]) + '">';
      html += '<span class="fb-v">' + _fmt(count) + '</span></div></div>';
      html += '<span class="fp">' + (cr || '') + '</span></div>';
    });
    return html;
  }

  function renderDailyChart(data) {
    if (!data || !data.days || !data.days.length) return '<div style="color:var(--text2);font-size:11px">Sem dados no periodo</div>';
    var maxVal = Math.max.apply(null, data.days.map(function (d) { return d.mql; })) || 1;
    var html = '<div style="display:flex;align-items:flex-end;gap:3px;height:140px;padding:8px 0">';
    data.days.forEach(function (d) {
      var hMql = Math.max(Math.round((d.mql / maxVal) * 100), 2);
      var hSal = Math.max(Math.round((d.sal / maxVal) * 100), 1);
      var hOpp = Math.max(Math.round((d.opp / maxVal) * 100), 1);
      html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0">';
      html += '<div style="font-size:9px;color:var(--text2);font-weight:700">' + d.mql + '</div>';
      html += '<div style="display:flex;gap:1px;width:100%;align-items:flex-end;height:100px">';
      html += '<div style="flex:1;height:' + hMql + 'px;background:var(--accent);border-radius:2px 2px 0 0;min-height:2px" title="Entrada:' + d.mql + '"></div>';
      html += '<div style="flex:1;height:' + hSal + 'px;background:var(--accent2);border-radius:2px 2px 0 0;min-height:2px" title="SAL:' + d.sal + '"></div>';
      html += '<div style="flex:1;height:' + hOpp + 'px;background:var(--green);border-radius:2px 2px 0 0;min-height:2px" title="OPP:' + d.opp + '"></div>';
      html += '</div><div style="font-size:8px;color:var(--text2)">' + d.label + '</div></div>';
    });
    html += '</div><div style="display:flex;gap:12px;justify-content:center;margin-top:4px">';
    html += '<span style="font-size:9px;color:var(--text2)"><span style="display:inline-block;width:8px;height:8px;background:var(--accent);border-radius:2px;margin-right:3px"></span>Entrada</span>';
    html += '<span style="font-size:9px;color:var(--text2)"><span style="display:inline-block;width:8px;height:8px;background:var(--accent2);border-radius:2px;margin-right:3px"></span>SAL</span>';
    html += '<span style="font-size:9px;color:var(--text2)"><span style="display:inline-block;width:8px;height:8px;background:var(--green);border-radius:2px;margin-right:3px"></span>OPP</span>';
    html += '</div>';
    return html;
  }

  function renderEfficiencyTable(data) {
    if (!data || !data.rows || !data.rows.length) return '<div style="color:var(--text2);font-size:11px">Sem dados</div>';
    var html = '<div style="overflow-x:auto"><table class="intel-table">';
    html += '<thead><tr><th>Qualificador</th><th style="text-align:right">#MQL</th><th style="text-align:right">#SAL</th>';
    html += '<th style="text-align:right">%M→S</th><th style="text-align:right">#OPP</th><th style="text-align:right">%S→O</th>';
    html += '<th style="text-align:right">#Won</th><th style="text-align:right">%O→W</th><th style="text-align:right">Receita</th></tr></thead><tbody>';
    var myEmail = (_opEmail() || '').toLowerCase();
    data.rows.forEach(function (r) {
      if (r.mql < 3) return;
      var isMe = r.name && myEmail && r.name.toLowerCase().indexOf(myEmail.split('@')[0]) !== -1;
      var style = isMe ? ' style="background:var(--bg4);font-weight:700"' : '';
      var crColor = function (v) { return v >= 40 ? 'var(--green)' : v >= 25 ? 'var(--yellow)' : 'var(--red)'; };
      html += '<tr' + style + '>';
      html += '<td>' + r.name + '</td>';
      html += '<td style="text-align:right">' + _fmt(r.mql) + '</td>';
      html += '<td style="text-align:right">' + _fmt(r.sal) + '</td>';
      html += '<td style="text-align:right;color:' + crColor(r.cr_mql_sal) + '">' + r.cr_mql_sal + '%</td>';
      html += '<td style="text-align:right">' + _fmt(r.opp) + '</td>';
      html += '<td style="text-align:right;color:' + crColor(r.cr_sal_opp) + '">' + r.cr_sal_opp + '%</td>';
      html += '<td style="text-align:right">' + _fmt(r.won) + '</td>';
      html += '<td style="text-align:right;color:' + crColor(r.cr_opp_won) + '">' + r.cr_opp_won + '%</td>';
      html += '<td style="text-align:right">' + _fmtBRL(r.revenue) + '</td>';
      html += '</tr>';
    });
    var t = data.totals;
    html += '<tr style="font-weight:800;border-top:2px solid var(--border)">';
    html += '<td>TOTAL</td><td style="text-align:right">' + _fmt(t.mql) + '</td>';
    html += '<td style="text-align:right">' + _fmt(t.sal) + '</td>';
    html += '<td style="text-align:right">' + t.cr_mql_sal + '%</td>';
    html += '<td style="text-align:right">' + _fmt(t.opp) + '</td>';
    html += '<td style="text-align:right">' + t.cr_sal_opp + '%</td>';
    html += '<td style="text-align:right">' + _fmt(t.won) + '</td>';
    html += '<td style="text-align:right">' + t.cr_opp_won + '%</td>';
    html += '<td style="text-align:right">' + _fmtBRL(t.revenue) + '</td>';
    html += '</tr></tbody></table></div>';
    return html;
  }

  // ── STEP 6 — Render Efficiency Table with benchmark highlight ──
  function renderEfficiencyTableWithBenchmark(data, benchmark) {
    if (!data || !data.rows || !data.rows.length) return '<div style="color:var(--text2);font-size:11px">Sem dados</div>';
    var html = '<div style="overflow-x:auto"><table class="intel-table">';
    html += '<thead><tr><th>Qualificador</th><th style="text-align:right">#MQL</th><th style="text-align:right">#SAL</th>';
    html += '<th style="text-align:right">CR M→S</th><th style="text-align:right">#OPP</th><th style="text-align:right">CR S→O</th>';
    html += '<th style="text-align:right">#Won</th><th style="text-align:right">CR O→W</th><th style="text-align:right">Receita</th></tr></thead><tbody>';
    var myEmail = (_opEmail() || '').toLowerCase();
    var bm = benchmark || {};
    function _crColor(v, bv) {
      if (v == null) return 'var(--text2)';
      if (bv && v >= bv) return 'var(--green)';
      if (bv && v >= bv * 0.7) return 'var(--accent)';
      return 'var(--red)';
    }
    data.rows.forEach(function(r) {
      if (r.mql < 3) return;
      var isMe = r.name && myEmail && r.name.toLowerCase().indexOf(myEmail.split('@')[0]) !== -1;
      var style = isMe ? ' style="background:var(--bg4);font-weight:700"' : '';
      html += '<tr' + style + '>';
      html += '<td>' + r.name + (isMe ? ' <span style="font-size:9px;color:var(--accent)">▶ você</span>' : '') + '</td>';
      html += '<td style="text-align:right">' + _fmt(r.mql) + '</td>';
      html += '<td style="text-align:right">' + _fmt(r.sal) + '</td>';
      html += '<td style="text-align:right;color:' + _crColor(r.cr_mql_sal, bm.cr_mql_sal) + '">' + r.cr_mql_sal + '%</td>';
      html += '<td style="text-align:right">' + _fmt(r.opp) + '</td>';
      html += '<td style="text-align:right;color:' + _crColor(r.cr_sal_opp, bm.cr_sal_opp) + '">' + r.cr_sal_opp + '%</td>';
      html += '<td style="text-align:right">' + _fmt(r.won) + '</td>';
      html += '<td style="text-align:right;color:' + _crColor(r.cr_opp_won, bm.cr_opp_won) + '">' + r.cr_opp_won + '%</td>';
      html += '<td style="text-align:right">' + _fmtBRL(r.revenue) + '</td>';
      html += '</tr>';
    });
    var t = data.totals;
    html += '<tr style="font-weight:800;border-top:2px solid var(--border);background:var(--bg3)">';
    html += '<td>OPERAÇÃO</td><td style="text-align:right">' + _fmt(t.mql) + '</td>';
    html += '<td style="text-align:right">' + _fmt(t.sal) + '</td>';
    html += '<td style="text-align:right">' + t.cr_mql_sal + '%</td>';
    html += '<td style="text-align:right">' + _fmt(t.opp) + '</td>';
    html += '<td style="text-align:right">' + t.cr_sal_opp + '%</td>';
    html += '<td style="text-align:right">' + _fmt(t.won) + '</td>';
    html += '<td style="text-align:right">' + t.cr_opp_won + '%</td>';
    html += '<td style="text-align:right">' + _fmtBRL(t.revenue) + '</td>';
    html += '</tr>';
    if (bm.cr_mql_sal != null) {
      html += '<tr style="font-size:10px;color:var(--text2);border-top:1px dashed var(--border)">';
      html += '<td style="color:var(--text3)">Benchmark</td>';
      html += '<td colspan="2"></td>';
      html += '<td style="text-align:right;color:var(--text2)">' + bm.cr_mql_sal + '%</td>';
      html += '<td></td>';
      html += '<td style="text-align:right;color:var(--text2)">' + (bm.cr_sal_opp||'—') + '%</td>';
      html += '<td></td>';
      html += '<td style="text-align:right;color:var(--text2)">' + (bm.cr_opp_won||'—') + '%</td>';
      html += '<td></td></tr>';
    }
    html += '</tbody></table></div>';
    return html;
  }

  // ── STEP 7 — renderQualityTab ──
  function renderQualityTab(containerId, qualityRows, blockedRows, stats) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!qualityRows || !qualityRows.length) {
      el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text2)">Sem dados de Quality Runtime. Tabela deal_data_quality_runtime vazia para este operador.</div>';
      return;
    }

    var html = '';

    // KPI cards Quality
    if (stats) {
      var dqiColor = stats.avg_dqi >= 0.7 ? 'var(--green)' : stats.avg_dqi >= 0.5 ? 'var(--accent)' : 'var(--red)';
      html += '<div class="kpi-g" style="grid-template-columns:repeat(5,1fr);margin-bottom:14px">';
      html += '<div class="kpi"><div class="kpi-l">DQI Médio</div><div class="kpi-v" style="color:' + dqiColor + '">' + (stats.avg_dqi != null ? Math.round(stats.avg_dqi*100) + '%' : '—') + '</div></div>';
      html += '<div class="kpi"><div class="kpi-l">Completude</div><div class="kpi-v">' + (stats.avg_completeness != null ? Math.round(stats.avg_completeness*100) + '%' : '—') + '</div></div>';
      html += '<div class="kpi"><div class="kpi-l">Consistência</div><div class="kpi-v">' + (stats.avg_consistency != null ? Math.round(stats.avg_consistency*100) + '%' : '—') + '</div></div>';
      html += '<div class="kpi"><div class="kpi-l">Recência</div><div class="kpi-v">' + (stats.avg_recency != null ? Math.round(stats.avg_recency*100) + '%' : '—') + '</div></div>';
      html += '<div class="kpi"><div class="kpi-l">Evidência</div><div class="kpi-v">' + (stats.avg_evidence != null ? Math.round(stats.avg_evidence*100) + '%' : '—') + '</div></div>';
      html += '</div>';

      // Bands
      var bands = stats.bands;
      var totalBands = Object.values(bands).reduce(function(a,b){return a+b;},0) || 1;
      html += '<div class="ch" style="margin-bottom:12px"><div class="ch-t">Distribuição por Band DQI</div>';
      html += '<div style="display:flex;gap:8px;align-items:stretch;margin-top:8px">';
      var bandColors = {A:'var(--green)',B:'#48bb78',C:'var(--accent)',D:'var(--yellow)',E:'var(--red)'};
      ['A','B','C','D','E'].forEach(function(b) {
        var pct = Math.round((bands[b]||0)/totalBands*100);
        var color = bandColors[b];
        html += '<div style="flex:1;text-align:center;background:var(--bg3);border-radius:8px;padding:10px 6px">';
        html += '<div style="font-size:18px;font-weight:800;color:'+color+'">' + (bands[b]||0) + '</div>';
        html += '<div style="font-size:9px;color:var(--text2);margin-top:2px">Band ' + b + '</div>';
        html += '<div style="font-size:10px;font-weight:700;color:'+color+'">' + pct + '%</div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // Tabela leads nomeados
    html += '<div class="ch" style="margin-bottom:12px"><div class="ch-t">Leads por Dimensão L19 <span style="font-size:9px;color:var(--text2)">(Supabase Runtime)</span></div>';
    html += '<div style="overflow-x:auto"><table class="intel-table"><thead><tr>';
    html += '<th>Deal</th><th>Linha</th><th>Compl.</th><th>Cons.</th><th>Recência</th><th>Evidência</th><th>DQI</th><th>Band</th>';
    html += '</tr></thead><tbody>';
    qualityRows.slice(0, 50).forEach(function(r) {
      function _sc(v) {
        var pct = v != null ? Math.round(parseFloat(v)*100) : null;
        var color = pct == null ? 'var(--text2)' : pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--accent)' : 'var(--red)';
        return '<td style="text-align:right;color:' + color + '">' + (pct != null ? pct + '%' : '—') + '</td>';
      }
      var dqi = r.dqi_score != null ? Math.round(parseFloat(r.dqi_score)*100) : null;
      var dqiColor = dqi == null ? 'var(--text2)' : dqi >= 70 ? 'var(--green)' : dqi >= 50 ? 'var(--accent)' : 'var(--red)';
      var band = (r.dqi_band || '—').toUpperCase();
      var bandColors = {A:'var(--green)',B:'#48bb78',C:'var(--accent)',D:'var(--yellow)',E:'var(--red)'};
      html += '<tr>';
      html += '<td style="font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (r.deal_id||'—') + '</td>';
      html += '<td style="font-size:10px;color:var(--text2)">' + (r.linha_de_receita_vigente||r.grupo_de_receita||'—') + '</td>';
      html += _sc(r.completeness_score) + _sc(r.consistency_score) + _sc(r.recency_score) + _sc(r.evidence_score);
      html += '<td style="text-align:right;font-weight:700;color:' + dqiColor + '">' + (dqi != null ? dqi + '%' : '—') + '</td>';
      html += '<td style="text-align:center"><span style="font-size:10px;font-weight:800;color:' + (bandColors[band]||'var(--text2)') + '">' + band + '</span></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';

    // Block reasons
    if (blockedRows && blockedRows.length) {
      var reasons = calcBlockReasons(blockedRows);
      html += '<div class="ch" style="margin-bottom:12px"><div class="ch-t">Motivos de Bloqueio L20 <span style="font-size:9px;color:var(--red)">' + blockedRows.length + ' deals bloqueados</span></div>';
      html += '<div style="overflow-x:auto"><table class="intel-table"><thead><tr><th>Motivo</th><th style="text-align:right">Qtd</th></tr></thead><tbody>';
      reasons.slice(0, 10).forEach(function(r) {
        html += '<tr><td>' + r.reason + '</td><td style="text-align:right;font-weight:700;color:var(--red)">' + r.count + '</td></tr>';
      });
      html += '</tbody></table>';
      // Insight automático
      if (reasons.length) {
        html += '<div style="margin-top:8px;padding:10px;background:rgba(239,68,68,.08);border-radius:6px;border-left:3px solid var(--red);font-size:11px;color:var(--text)">';
        html += '<strong>Principal bloqueio:</strong> ' + reasons[0].reason + ' (' + reasons[0].count + ' deals). ';
        if (reasons.length > 1) html += 'Segundo: ' + reasons[1].reason + ' (' + reasons[1].count + ').';
        html += '</div>';
      }
      html += '</div>';
    } else {
      html += '<div style="padding:12px;background:rgba(86,229,169,.08);border-radius:6px;border-left:3px solid var(--green);font-size:11px;color:var(--text)">';
      html += 'Nenhum deal bloqueado no período. Qualidade operacional OK.';
      html += '</div>';
    }

    el.innerHTML = html;
  }

  // ── renderPipelineTab — conteúdo da tab PIPELINE ──
  function renderPipelineTab(containerId, dbMetrics, dbLines, deals, macroMetrics, benchmark) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var html = '';

    // Owner bar — linhas ativas do operador (detectadas dos deals ativos)
    var linesByDeal = {};
    if (deals && deals.length) {
      deals.forEach(function(d) {
        var line = d.linha_de_receita_vigente || d.grupo_de_receita || 'Não Definido';
        if (!linesByDeal[line]) linesByDeal[line] = 0;
        linesByDeal[line]++;
      });
    }
    var linhaEntries = Object.keys(linesByDeal).sort(function(a,b){return linesByDeal[b]-linesByDeal[a];});
    if (linhaEntries.length) {
      html += '<div style="margin-bottom:12px"><div style="font-size:10px;font-weight:700;color:var(--text2);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">Linhas Ativas</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
      linhaEntries.forEach(function(l) {
        html += '<span style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);font-size:11px;font-weight:600;color:var(--text)">' + l + ' <span style="color:var(--accent)">' + linesByDeal[l] + '</span></span>';
      });
      html += '</div></div>';
    }

    // Funil do operador (Supabase deals)
    if (deals && deals.length) {
      var funnel = calcFunnel(deals);
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">';
      html += '<div class="ch"><div class="ch-t">Funil do Operador <span style="font-size:9px;color:var(--text2)">(Supabase)</span></div>' + renderFunnelBars(funnel) + '</div>';

      // OPPs por Grupo de Origem
      var byGrupo = {};
      deals.forEach(function(d) {
        var fase = (d.fase_atual_no_processo||'').toLowerCase();
        if (fase.indexOf('oportunidade') === -1 && fase.indexOf('negociac') === -1 && fase.indexOf('ganho') === -1) return;
        var grp = d.grupo_de_receita || 'Grupo F';
        if (!byGrupo[grp]) byGrupo[grp] = 0;
        byGrupo[grp]++;
      });
      var grupoEntries = Object.keys(byGrupo).sort(function(a,b){return byGrupo[b]-byGrupo[a];});
      var maxGrupo = Math.max.apply(null, Object.values(byGrupo)) || 1;
      if (grupoEntries.length) {
        html += '<div class="ch"><div class="ch-t">OPPs por Grupo de Origem</div>';
        grupoEntries.forEach(function(g) {
          var pct = Math.round((byGrupo[g]/maxGrupo)*100);
          html += '<div class="fr"><div class="fl" style="width:100px;font-size:11px">' + g + '</div>';
          html += '<div class="fb-bg"><div class="fb-f" style="width:'+Math.max(pct,3)+'%;background:var(--accent2)">';
          html += '<span class="fb-v">' + byGrupo[g] + '</span></div></div></div>';
        });
        html += '</div>';
      } else {
        html += '<div class="ch"><div class="ch-t">OPPs por Grupo de Origem</div><div style="color:var(--text2);font-size:11px">Sem OPPs no pipeline</div></div>';
      }
      html += '</div>';
    }

    // Pipeline por Linha (Databricks)
    if (dbLines && dbLines.length) {
      var maxMql = Math.max.apply(null, dbLines.map(function(r){return r.total;})) || 1;
      html += '<div class="ch" style="margin-bottom:12px"><div class="ch-t">Tabela Linhas Ativas × Origem <span style="font-size:9px;padding:2px 5px;border-radius:4px;background:var(--accent);color:#000;margin-left:4px;font-weight:700">DB</span></div>';
      html += '<table class="intel-table"><thead><tr><th>Linha</th><th style="text-align:right">MQL</th><th style="text-align:right">SAL</th><th style="text-align:right">OPP</th><th style="text-align:right">Won</th><th style="text-align:right">CR M→O</th></tr></thead><tbody>';
      dbLines.forEach(function(r) {
        var crColor = r.cr_opp >= (benchmark && benchmark.cr_mql_sal ? benchmark.cr_mql_sal*0.5 : 20) ? 'var(--green)' : 'var(--accent)';
        html += '<tr><td>' + r.name + '</td>';
        html += '<td style="text-align:right">' + r.total + '</td>';
        html += '<td style="text-align:right">' + r.sal + '</td>';
        html += '<td style="text-align:right">' + r.opp + '</td>';
        html += '<td style="text-align:right">' + r.won + '</td>';
        html += '<td style="text-align:right;color:' + crColor + '">' + r.cr_opp + '%</td></tr>';
      });
      html += '</tbody></table></div>';
    }

    // Comparativo vs operação completa (macro benchmark)
    if (macroMetrics && dbMetrics) {
      html += '<div class="ch" style="margin-bottom:12px"><div class="ch-t">Comparativo vs Operação</div>';
      html += '<table class="intel-table"><thead><tr><th>Métrica</th><th style="text-align:right">Você</th><th style="text-align:right">Operação</th><th style="text-align:right">Δ</th></tr></thead><tbody>';
      var comparisons = [
        ['CR MQL→SAL', dbMetrics.cr_mql_sal, macroMetrics.cr_mql_sal],
        ['CR SAL→Agend', dbMetrics.cr_sal_agend, macroMetrics.cr_sal_agend],
        ['CR Agend→OPP', dbMetrics.cr_agend_opp, macroMetrics.cr_agend_opp],
        ['CR OPP→Won', dbMetrics.cr_opp_won, macroMetrics.cr_opp_won]
      ];
      comparisons.forEach(function(c) {
        var you = c[1], op = c[2];
        if (you == null && op == null) return;
        var delta = (you != null && op != null) ? Math.round((you - op) * 10) / 10 : null;
        var deltaColor = delta == null ? 'var(--text2)' : delta >= 0 ? 'var(--green)' : 'var(--red)';
        html += '<tr><td>' + c[0] + '</td>';
        html += '<td style="text-align:right;font-weight:700">' + (you != null ? you + '%' : '—') + '</td>';
        html += '<td style="text-align:right;color:var(--text2)">' + (op != null ? op + '%' : '—') + '</td>';
        html += '<td style="text-align:right;font-weight:700;color:' + deltaColor + '">' + (delta != null ? (delta >= 0 ? '+' : '') + delta + 'pp' : '—') + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }

    el.innerHTML = html;
  }

  function renderClientProfile(data) {
    if (!data || !data.wonDeals) return '<div style="color:var(--text2);font-size:11px">Sem dados de conversão</div>';
    function _renderDim(title, items, total) {
      var html = '<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">' + title + '</div>';
      items.slice(0, 5).forEach(function (item) {
        var pct = Math.round((item.count / total) * 100);
        html += '<div class="fr"><div class="fl" style="width:140px;font-size:11px">' + item.label + '</div>';
        html += '<div class="fb-bg" style="height:14px"><div class="fb-f" style="width:' + Math.max(pct, 2) + '%;height:100%">';
        html += '<span class="fb-v" style="font-size:9px">' + item.count + '</span></div></div>';
        html += '<span class="fp">' + pct + '%</span></div>';
      });
      html += '</div>';
      return html;
    }
    var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    html += '<div>' + _renderDim('Cargo (Won)', data.byCargo.won, data.wonDeals || 1);
    html += _renderDim('Segmento (Won)', data.bySegmento.won, data.wonDeals || 1) + '</div>';
    html += '<div>' + _renderDim('Perfil ICP (Won)', data.byPerfil.won, data.wonDeals || 1);
    html += _renderDim('Faturamento (Won)', data.byFaturamento.won, data.wonDeals || 1) + '</div>';
    html += '</div>';
    return html;
  }

  function renderVelocityFromRuntime(dt) {
    if (!dt) return '<div style="color:var(--text2);font-size:11px">Sem dados de velocity</div>';
    function _dtFmt(v) { return v != null ? v + 'd' : '—'; }
    function _dtColor(v) { return v == null ? '' : v <= 3 ? 'color:var(--green)' : v <= 7 ? 'color:var(--yellow)' : 'color:var(--red)'; }
    var html = '<table class="intel-table" style="width:100%"><thead><tr>';
    html += '<th>Transição</th><th style="text-align:right">Média</th></tr></thead><tbody>';
    var transitions = [
      ['SAL → Conectado', dt.dt_sal_conectado],
      ['Conectado → Agend', dt.dt_conectado_agendado],
      ['Agend → OPP', dt.dt_agendado_opp],
      ['OPP → Negoc', dt.dt_opp_negociacao],
      ['Negoc → Ganho', dt.dt_negociacao_ganho]
    ];
    transitions.forEach(function (t) {
      html += '<tr><td>' + t[0] + '</td><td style="text-align:right;font-weight:700;' + _dtColor(t[1]) + '">' + _dtFmt(t[1]) + '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  function renderChannelBars(data) {
    if (!data || !data.rows || !data.rows.length) return '<div style="color:var(--text2);font-size:11px">Sem dados</div>';
    var maxVal = Math.max.apply(null, data.rows.map(function (r) { return r.oppValue; })) || 1;
    var html = '';
    data.rows.slice(0, 10).forEach(function (r) {
      var pct = Math.round((r.oppValue / maxVal) * 100);
      html += '<div class="fr"><div class="fl" style="width:140px">' + r.name + '</div>';
      html += '<div class="fb-bg"><div class="fb-f" style="width:' + Math.max(pct, 3) + '%;background:linear-gradient(90deg,var(--green),var(--accent))">';
      html += '<span class="fb-v">' + _fmtBRL(r.oppValue) + '</span></div></div>';
      html += '<span class="fp" style="width:50px">' + r.opp + ' opp</span></div>';
    });
    return html;
  }

  function renderVelocitySection(dbMetrics, dtRuntime, dbDtByLine) {
    var hasDatabricks = dbMetrics && dbMetrics._source === 'databricks';
    var html = '';

    var sourceBadge = hasDatabricks
      ? '<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:var(--accent);color:#000;margin-left:6px">Databricks</span>'
      : '<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:var(--border);color:var(--text2);margin-left:6px">Supabase Runtime</span>';

    if (hasDatabricks) {
      var transitions = [
        ['MQL → SAL', dbMetrics.dt_mql_sal],
        ['SAL → Agendado', dbMetrics.dt_agendado],
        ['Agendado → OPP', dbMetrics.dt_agendado_oportunidade],
        ['Negoc → Ganho', dbMetrics.dt_negociacao_ganho]
      ];

      function _dtColor(v) { return v == null ? '' : v <= 3 ? 'color:var(--green)' : v <= 7 ? 'color:var(--accent)' : 'color:var(--red)'; }

      html += '<div class="ch-t">Velocidade (Δt) por Transição' + sourceBadge + '</div>';
      html += '<table class="intel-table" style="width:100%"><thead><tr><th>Transição</th><th style="text-align:right">Média (dias)</th></tr></thead><tbody>';
      transitions.forEach(function (t) {
        html += '<tr><td>' + t[0] + '</td><td style="text-align:right;font-weight:700;' + _dtColor(t[1]) + '">' + _fmtDays(t[1]) + '</td></tr>';
      });
      html += '</tbody></table>';

      html += '<div style="margin-top:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px">';
      var crItems = [
        ['CR01 MQL→SAL', dbMetrics.cr_mql_sal],
        ['CR02 SAL→Agend', dbMetrics.cr_sal_agend],
        ['CR03 Agend→OPP', dbMetrics.cr_agend_opp],
        ['CR04 OPP→Won', dbMetrics.cr_opp_won]
      ];
      crItems.forEach(function (c) {
        var v = c[1];
        var color = v == null ? 'var(--text2)' : v >= 40 ? 'var(--green)' : v >= 20 ? 'var(--accent)' : 'var(--red)';
        html += '<div style="background:var(--bg3);border-radius:6px;padding:8px;text-align:center">';
        html += '<div style="font-size:9px;color:var(--text2);margin-bottom:4px">' + c[0] + '</div>';
        html += '<div style="font-size:16px;font-weight:800;color:' + color + '">' + (v != null ? v + '%' : '—') + '</div>';
        html += '</div>';
      });
      html += '</div>';

      if (dbMetrics.receita_won != null || dbMetrics.ticket_medio != null) {
        html += '<div style="margin-top:8px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px">';
        html += '<div style="background:var(--bg3);border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:var(--text2);margin-bottom:3px">Receita Won</div><div style="font-size:13px;font-weight:800;color:var(--green)">' + _fmtBRL(dbMetrics.receita_won) + '</div></div>';
        html += '<div style="background:var(--bg3);border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:var(--text2);margin-bottom:3px">Ticket Médio</div><div style="font-size:13px;font-weight:800;color:var(--text)">' + _fmtBRL(dbMetrics.ticket_medio) + '</div></div>';
        html += '<div style="background:var(--bg3);border-radius:6px;padding:8px;text-align:center"><div style="font-size:9px;color:var(--text2);margin-bottom:3px">Pipeline OPP</div><div style="font-size:13px;font-weight:800;color:var(--accent)">' + _fmtBRL(dbMetrics.pipeline_value) + '</div></div>';
        html += '</div>';
      }

      if (dbDtByLine && dbDtByLine.length) {
        html += '<div style="margin-top:12px"><div style="font-size:10px;font-weight:700;color:var(--text2);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">Δt por Linha de Receita</div>';
        html += '<table class="intel-table" style="width:100%"><thead><tr><th>Linha</th><th style="text-align:right">MQL</th><th style="text-align:right">→SAL</th><th style="text-align:right">→Agd</th><th style="text-align:right">→OPP</th></tr></thead><tbody>';
        dbDtByLine.forEach(function (r) {
          function _dtC(v) { return !v ? '' : parseFloat(v) <= 3 ? 'color:var(--green)' : parseFloat(v) <= 7 ? 'color:var(--accent)' : 'color:var(--red)'; }
          html += '<tr><td>' + r.linha + '</td>';
          html += '<td style="text-align:right">' + (r.mql || '—') + '</td>';
          html += '<td style="text-align:right;font-weight:700;' + _dtC(r.dt_mql_sal) + '">' + _fmtDays(r.dt_mql_sal ? parseFloat(r.dt_mql_sal) : null) + '</td>';
          html += '<td style="text-align:right;font-weight:700;' + _dtC(r.dt_sal_agendado) + '">' + _fmtDays(r.dt_sal_agendado ? parseFloat(r.dt_sal_agendado) : null) + '</td>';
          html += '<td style="text-align:right;font-weight:700;' + _dtC(r.dt_agendado_opp) + '">' + _fmtDays(r.dt_agendado_opp ? parseFloat(r.dt_agendado_opp) : null) + '</td>';
          html += '</tr>';
        });
        html += '</tbody></table></div>';
      }
    } else {
      html += '<div class="ch-t">Velocidade (Δt) por Transição' + sourceBadge + '</div>';
      if (!dtRuntime) {
        html += '<div style="color:var(--text2);font-size:11px;padding:12px 0">Token Databricks não configurado. Configure em Configurações → Conexões para ver os Δt oficiais.</div>';
      } else {
        html += renderVelocityFromRuntime(dtRuntime);
      }
    }
    return html;
  }

  // ============================================================================
  // MASTER RENDER
  // ============================================================================
  // Resolve qualificador_name via Databricks lookup quando não está em cache
  async function _resolveQualName(email) {
    var cached = _qualName();
    if (cached) return cached;
    if (!_dbToken() || !email) return null;
    var prefix = email.split('@')[0].toLowerCase();
    var segments = prefix.replace(/[._]/g, ' ').trim().split(' ').filter(function(s) { return s.length >= 4; });
    if (!segments.length) return null;
    var likeParts = segments.map(function(s) { return "LOWER(qualificador_name) LIKE '%" + s + "%'"; }).join(' OR ');
    var sql = "SELECT DISTINCT qualificador_name FROM production.diamond.funil_comercial WHERE (" + likeParts + ") AND qualificador_name IS NOT NULL LIMIT 5";
    var rows = await _dbQuery(sql);
    if (!rows || !rows.length) return null;
    var nome = rows[0].qualificador_name;
    if (nome) {
      try { localStorage.setItem('elucy_qualificador_name', nome); } catch(e) {}
    }
    return nome || null;
  }

  async function renderReportsV4(containerId) {
    var el = document.getElementById(containerId || 'screen-reports-v4');
    if (!el) return;

    var hasDbToken = !!_dbToken();
    el.innerHTML = '<div style="font-size:12px;color:var(--text2);padding:40px;text-align:center">Carregando dados'
      + (hasDbToken ? ' do Databricks...' : '...') + '</div>';

    // Atualiza label do period bar
    var labelEl = document.getElementById('bp-period-label');
    if (labelEl) labelEl.textContent = _periodLabel();

    var email = _opEmail();
    var qualName = hasDbToken ? (await _resolveQualName(email)) : null;
    var lastSync = new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

    var results = await Promise.all([
      hasDbToken ? fetchDatabricksMetrics(qualName) : Promise.resolve(null),
      hasDbToken ? fetchDatabricksLineBreakdown(qualName) : Promise.resolve(null),
      hasDbToken ? fetchDatabricksDtByLine(qualName) : Promise.resolve(null),
      fetchOppEventsThisMonth(email),
      fetchDeals(email),
      hasDbToken ? fetchDatabricksMacro() : Promise.resolve(null),
      fetchGoals(email)
    ]);

    var dbMetrics  = results[0];
    var dbLines    = results[1];
    var dbDtByLine = results[2];
    var oppSB      = results[3];
    var deals      = results[4];
    var macroMetrics = results[5];
    var goals      = results[6];
    var benchmark  = calcBenchmark(dbMetrics, macroMetrics, goals);

    if (!dbMetrics && (!deals || !deals.length)) {
      el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text2)">'
        + '<div style="font-size:16px;margin-bottom:8px">Configure o Databricks para ver as métricas</div>'
        + '<div style="font-size:12px">Vá em Configurações → Conexões → Personal Access Token do Databricks.</div>'
        + '</div>';
      return;
    }

    var profile = deals && deals.length ? calcClientProfile(deals) : null;
    var daily   = deals && deals.length ? calcDailyVolume(deals)   : null;

    var html = '';

    // ── HEADER ──
    var dataSource = dbMetrics ? 'Databricks' : 'Supabase';
    html += '<div style="margin-bottom:14px;display:flex;align-items:flex-end;justify-content:space-between">';
    html += '<div><div style="font-size:17px;font-weight:800;color:var(--text);margin-bottom:2px">Performance</div>';
    html += '<div style="font-size:11px;color:var(--text2)">' + dataSource + ' · ' + _periodLabel() + ' · ' + lastSync + '</div></div>';
    if (dbMetrics && dbMetrics.receita_won) {
      html += '<div style="font-size:11px;color:var(--text2);text-align:right">';
      html += 'Receita won: <span style="color:var(--green);font-weight:700">' + _fmtBRL(dbMetrics.receita_won) + '</span>';
      html += ' · Ticket: <span style="font-weight:700">' + _fmtBRL(dbMetrics.ticket_medio) + '</span>';
      html += '</div>';
    }
    html += '</div>';

    if (dbMetrics) {
      var mql  = dbMetrics.mql_validos;
      var sal  = dbMetrics.sal_count;
      var opp  = dbMetrics.opp_count;
      var won  = dbMetrics.won_count;
      var lost = dbMetrics.lost_count;
      var agend = dbMetrics.agendamento_count;
      var oppGeradasVal = (oppSB != null && oppSB > 0) ? oppSB : opp;

      // ── HERO META OPP ──
      if (benchmark && benchmark.meta_opp != null) {
        var metaOpp = benchmark.meta_opp;
        var heroPct = Math.min(Math.round((oppGeradasVal / metaOpp) * 100), 100);
        var heroColor = heroPct >= 100 ? 'var(--green)' : heroPct >= 70 ? 'var(--accent)' : 'var(--red)';
        var linhasAtiv = benchmark.linhas_atribuidas;
        html += '<div style="background:var(--bg3);border-radius:var(--r2);padding:16px;margin-bottom:14px;border:1px solid var(--border)">';
        html += '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">';
        html += '<div>';
        html += '<div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Meta OPPs do Mês</div>';
        html += '<div style="font-size:38px;font-weight:800;color:' + heroColor + ';line-height:1">' + oppGeradasVal;
        html += '<span style="font-size:18px;color:var(--text2);font-weight:600">/' + metaOpp + '</span></div>';
        html += '</div>';
        html += '<div style="text-align:right">';
        html += '<div style="font-size:28px;font-weight:800;color:' + heroColor + '">' + heroPct + '%</div>';
        html += '<div style="font-size:10px;color:var(--text2)">de realização</div>';
        html += '</div></div>';
        // Progress bar
        html += '<div style="height:6px;background:var(--bg4);border-radius:3px;overflow:hidden;margin-bottom:10px">';
        html += '<div style="height:100%;width:' + heroPct + '%;background:' + heroColor + ';border-radius:3px;transition:width .5s"></div>';
        html += '</div>';
        // Linhas ativas chips
        if (linhasAtiv && Array.isArray(linhasAtiv) && linhasAtiv.length) {
          html += '<div style="display:flex;flex-wrap:wrap;gap:5px">';
          linhasAtiv.forEach(function(l) {
            html += '<span style="padding:2px 9px;border-radius:5px;font-size:10px;font-weight:700;background:rgba(255,193,116,.12);color:var(--accent);border:1px solid rgba(255,193,116,.3)">' + l + '</span>';
          });
          html += '</div>';
        }
        html += '</div>';
      }

      // ── KPI ROW ──
      var crMqlOpp = mql ? _pct(oppGeradasVal, mql) : 0;
      html += '<div class="kpi-g" style="grid-template-columns:repeat(6,1fr);margin-bottom:14px">';
      html += '<div class="kpi"><div class="kpi-l">MQL</div><div class="kpi-v">' + _fmt(mql) + '</div></div>';
      html += '<div class="kpi"><div class="kpi-l">SAL</div><div class="kpi-v">' + _fmt(sal) + '</div></div>';
      html += '<div class="kpi"><div class="kpi-l">Agendamentos</div><div class="kpi-v">' + _fmt(agend) + '</div></div>';
      html += '<div class="kpi"><div class="kpi-l">OPP Geradas</div><div class="kpi-v" style="color:var(--accent)">' + _fmt(oppGeradasVal) + '</div></div>';
      html += '<div class="kpi"><div class="kpi-l">Won</div><div class="kpi-v" style="color:var(--green)">' + _fmt(won) + '</div></div>';
      html += '<div class="kpi"><div class="kpi-l">CR MQL→OPP</div><div class="kpi-v">' + crMqlOpp + '%</div></div>';
      html += '</div>';

      // ── CRs vs Benchmark ──
      var bmLabel = benchmark ? 'vs Benchmark' : 'CRs Oficiais';
      html += '<div style="margin-bottom:14px"><div style="font-size:10px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">' + bmLabel + '</div>';
      html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">';
      var crDefs = [
        ['CR01 MQL→SAL', dbMetrics.cr_mql_sal, benchmark && benchmark.cr_mql_sal],
        ['CR02 SAL→Agend', dbMetrics.cr_sal_agend, null],
        ['CR03 Agend→OPP', dbMetrics.cr_agend_opp, benchmark && benchmark.cr_sal_opp],
        ['CR04 OPP→Won', dbMetrics.cr_opp_won, benchmark && benchmark.cr_opp_won]
      ];
      crDefs.forEach(function(c) {
        var v = c[1], bv = c[2];
        var color = v == null ? 'var(--text2)' : (bv && v >= bv) ? 'var(--green)' : (bv && v >= bv*0.7) ? 'var(--accent)' : 'var(--red)';
        if (v == null) color = 'var(--text2)';
        html += '<div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center">';
        html += '<div style="font-size:9px;color:var(--text2);margin-bottom:4px">' + c[0] + '</div>';
        html += '<div style="font-size:22px;font-weight:800;color:' + color + '">' + (v != null ? v + '%' : '—') + '</div>';
        if (bv != null) html += '<div style="font-size:9px;color:var(--text2);margin-top:2px">meta: ' + bv + '%</div>';
        html += '</div>';
      });
      html += '</div></div>';

      // ── Δt + SLA side-by-side ──
      var dbDts = [
        ['MQL→SAL', dbMetrics.dt_mql_sal],
        ['SAL→Agend', dbMetrics.dt_agendado],
        ['Agend→OPP', dbMetrics.dt_agendado_oportunidade],
        ['Neg→Won', dbMetrics.dt_negociacao_ganho]
      ];
      var anyDt = dbDts.some(function(d) { return d[1] != null; });
      if (anyDt) {
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">';
        html += '<div class="ch"><div class="ch-t">Velocidade (Δt)</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:6px">';
        dbDts.forEach(function(dt) {
          var v = dt[1];
          var color = v == null ? 'var(--text2)' : v <= 3 ? 'var(--green)' : v <= 7 ? 'var(--accent)' : 'var(--red)';
          html += '<div style="background:var(--bg3);border-radius:6px;padding:8px;text-align:center">';
          html += '<div style="font-size:9px;color:var(--text2);margin-bottom:3px">Δt ' + dt[0] + '</div>';
          html += '<div style="font-size:16px;font-weight:800;color:' + color + '">' + _fmtDays(v) + '</div></div>';
        });
        html += '</div></div>';
        html += '<div class="ch">' + renderVelocitySection(dbMetrics, null, dbDtByLine) + '</div>';
        html += '</div>';
      }

      // ── Volume Diário ──
      if (daily && daily.days && daily.days.length) {
        html += '<div class="ch" style="margin-bottom:12px"><div class="ch-t">Volume Diário de Entrada</div>' + renderDailyChart(daily) + '</div>';
      }

      // ── Tabela comparativa operação (STEP 6 — renderEfficiencyTableWithBenchmark) ──
      if (deals && deals.length) {
        var effData = calcEfficiencyByQualifier(deals);
        if (effData && effData.rows && effData.rows.length) {
          html += '<div class="ch" style="margin-bottom:12px"><div class="ch-t">Eficiência por Qualificador</div>' + renderEfficiencyTableWithBenchmark(effData, benchmark) + '</div>';
        }
      }

    } else {
      // ── SEM DATABRICKS ──
      html += '<div style="padding:16px;background:var(--bg3);border-radius:var(--r2);margin-bottom:14px;border:1px solid var(--border)">';
      html += '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">Token Databricks não configurado</div>';
      html += '<div style="font-size:11px;color:var(--text2)">Configure em Configurações → Conexões para ver MQL, SAL, CRs, Δt e receita.</div>';
      if (oppSB != null) html += '<div style="margin-top:8px;font-size:12px">OPP Geradas (Supabase): <strong style="color:var(--accent)">' + _fmt(oppSB) + '</strong></div>';
      html += '</div>';
    }

    if (profile && profile.wonDeals > 0) {
      html += '<div class="ch" style="margin-bottom:12px"><div class="ch-t">Perfil de Cliente — Quem Converteu</div>' + renderClientProfile(profile) + '</div>';
    }

    el.innerHTML = html;

    // Pré-renderiza as outras tabs em background se dados disponíveis
    if (deals && deals.length) {
      setTimeout(function() {
        renderPipelineTab('bp-pipeline-content', dbMetrics, dbLines, deals, macroMetrics, benchmark);
      }, 100);
    }
  }

  // ============================================================================
  // STEP 1 — PERIOD CONTROLS + SUB-TAB SWITCHER (chamados pelo HTML)
  // ============================================================================

  function setPeriod(preset, btn) {
    _period = { preset: preset, from: null, to: null };
    // Atualiza UI dos botões de período
    document.querySelectorAll('.bp-period-btn').forEach(function(b) { b.classList.remove('on'); });
    if (btn) btn.classList.add('on');
    // Fecha custom range se aberto
    var cr = document.getElementById('bp-custom-range');
    if (cr) cr.style.display = 'none';
    // Re-renderiza tab ativa
    _refreshActiveBpTab();
  }

  function applyCustomPeriod() {
    var from = document.getElementById('bp-date-from');
    var to   = document.getElementById('bp-date-to');
    if (!from || !to || !from.value || !to.value) return;
    _period = { preset: 'custom', from: from.value, to: to.value };
    var btn = document.getElementById('bp-custom-btn');
    document.querySelectorAll('.bp-period-btn').forEach(function(b) { b.classList.remove('on'); });
    if (btn) btn.classList.add('on');
    _refreshActiveBpTab();
  }

  var _activeBpTab = 'performance';

  function setBpTab(tab, btn) {
    _activeBpTab = tab;
    // Atualiza UI dos sub-tabs
    document.querySelectorAll('.bp-stab').forEach(function(b) {
      b.classList.toggle('on', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });
    // Mostra/oculta panels
    ['performance','pipeline','quality'].forEach(function(t) {
      var panel = document.getElementById('bp-panel-' + t);
      if (panel) panel.style.display = t === tab ? '' : 'none';
    });
    // Carrega conteúdo se ainda não carregado
    _refreshActiveBpTab();
  }

  // Memoize dos dados carregados para evitar re-fetch ao trocar tab
  var _cachedData = null;

  function _refreshActiveBpTab() {
    if (_activeBpTab === 'performance') {
      renderReportsV4('screen-reports-v4');
    } else if (_activeBpTab === 'pipeline') {
      _loadPipelineTabData();
    } else if (_activeBpTab === 'quality') {
      _loadQualityTabData();
    }
  }

  async function _loadPipelineTabData() {
    var email = _opEmail();
    var hasDb = !!_dbToken();
    var qualName = hasDb ? (await _resolveQualName(email)) : null;
    var results = await Promise.all([
      hasDb ? fetchDatabricksMetrics(qualName) : Promise.resolve(null),
      hasDb ? fetchDatabricksLineBreakdown(qualName) : Promise.resolve(null),
      fetchDeals(email),
      hasDb ? fetchDatabricksMacro() : Promise.resolve(null),
      fetchGoals(email)
    ]);
    var bm = calcBenchmark(results[0], results[3], results[4]);
    renderPipelineTab('bp-pipeline-content', results[0], results[1], results[2], results[3], bm);
  }

  async function _loadQualityTabData() {
    var email = _opEmail();
    var results = await Promise.all([
      fetchQualityRuntime(email),
      fetchTransitionRuntime(email)
    ]);
    var qualityRows = results[0];
    var blockedRows = results[1];
    var stats = calcQualityStats(qualityRows);
    renderQualityTab('bp-quality-content', qualityRows, blockedRows, stats);
  }

  // ============================================================================
  // EXPORT
  // ============================================================================
  window.ReportsV4 = {
    renderReportsV4: renderReportsV4,
    setPeriod: setPeriod,
    applyCustomPeriod: applyCustomPeriod,
    setBpTab: setBpTab,
    fetchDeals: fetchDeals,
    fetchOppEventsThisMonth: fetchOppEventsThisMonth,
    fetchWonEventsThisMonth: fetchWonEventsThisMonth,
    fetchDeltaTRuntime: fetchDeltaTRuntime,
    fetchDatabricksMetrics: fetchDatabricksMetrics,
    fetchDatabricksLineBreakdown: fetchDatabricksLineBreakdown,
    fetchDatabricksDtByLine: fetchDatabricksDtByLine,
    fetchDatabricksMacro: fetchDatabricksMacro,
    fetchGoals: fetchGoals,
    fetchQualityRuntime: fetchQualityRuntime,
    fetchTransitionRuntime: fetchTransitionRuntime,
    calcFunnel: calcFunnel,
    calcDailyVolume: calcDailyVolume,
    calcEfficiencyByQualifier: calcEfficiencyByQualifier,
    calcPipelineByLine: calcPipelineByLine,
    calcClientProfile: calcClientProfile,
    calcChannelForecast: calcChannelForecast,
    calcBenchmark: calcBenchmark,
    calcQualityStats: calcQualityStats,
    calcBlockReasons: calcBlockReasons,
    renderQualityTab: renderQualityTab,
    renderPipelineTab: renderPipelineTab
  };

})();
