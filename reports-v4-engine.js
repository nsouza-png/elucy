// ============================================================================
// REPORTS V4 ENGINE — Pre-Vendas Intelligence Layer
// Fonte de dados: Supabase direto (deals + deal_runtime + deal_stage_history)
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
  function _today() { return new Date().toISOString().slice(0, 10); }
  function _monthStart() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

  // Sem cache — dados sempre frescos do Supabase em tempo real
  function _cacheGet(key) { return null; }
  function _cacheSet(key, data) { }

  // ============================================================================
  // DATA LAYER — busca dados direto do Supabase (não depende de _COCKPIT_DEAL_MAP)
  // ============================================================================

  // Busca todos os deals do operador direto do Supabase (inclui Ganho/Perdido do mês)
  async function fetchDeals(operatorEmail) {
    var cached = _cacheGet('deals_' + (operatorEmail || 'all'));
    if (cached) return cached;

    var sb = _sb();
    if (!sb) return [];
    try {
      var q = sb.from('deals').select(
        'deal_id,fase_atual_no_processo,etapa_atual_no_pipeline,tier_da_oportunidade,' +
        'delta_t,qualificador_name,proprietario_name,linha_de_receita_vigente,' +
        'grupo_de_receita,created_at_crm,canal_de_marketing,utm_medium,' +
        'revenue,valor_da_oportunidade,cargo,p_segmento,perfil,' +
        'faixa_de_faturamento,faixa_de_funcionarios,operator_email'
      ).limit(2000);
      if (operatorEmail) q = q.eq('operator_email', operatorEmail);
      var res = await q;
      var data = res.data || [];
      _cacheSet('deals_' + (operatorEmail || 'all'), data);
      return data;
    } catch (e) { return []; }
  }

  // Conta OPP geradas no mês via deal_stage_history (source=databricks)
  async function fetchOppEventsThisMonth(operatorEmail) {
    var cacheKey = 'opp_events_' + (operatorEmail || 'all');
    var cached = _cacheGet(cacheKey);
    if (cached != null) return cached;

    try {
      var sb = _sb();
      if (!sb) return null;
      var monthStart = _monthStart();
      var q = sb.from('deal_stage_history')
        .select('deal_id', { count: 'exact', head: true })
        .eq('to_stage', 'Oportunidade')
        .eq('source', 'databricks')
        .gte('changed_at', monthStart);
      if (operatorEmail) q = q.eq('changed_by', operatorEmail);
      var res = await q;
      if (res.error) return null;
      _cacheSet(cacheKey, res.count);
      return res.count;
    } catch (e) { return null; }
  }

  // Busca Δt médios de deal_runtime (calculados pelo PS1 do Databricks)
  async function fetchDeltaTRuntime(operatorEmail) {
    var cacheKey = 'dt_runtime_' + (operatorEmail || 'all');
    var cached = _cacheGet(cacheKey);
    if (cached) return cached;

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

      var result = {
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

      // Agrupa Δt médio por linha de receita
      res.data.forEach(function (r) {
        var line = r.linha_de_receita_vigente || 'nao_definido';
        if (!result.byLine[line]) result.byLine[line] = { dt_vals: [], samples: 0, stalled: 0 };
        var dt = parseFloat(r.dt_sal_conectado);
        if (!isNaN(dt) && dt > 0) result.byLine[line].dt_vals.push(dt);
        result.byLine[line].samples++;
        if (r.stall_flag === true) result.byLine[line].stalled++;
      });

      _cacheSet(cacheKey, result);
      return result;
    } catch (e) { return null; }
  }

  // ============================================================================
  // CALC LAYER — processa os dados brutos
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
    if (STAGE_MAP[f]) return STAGE_MAP[f];
    for (var k in STAGE_MAP) { if (f.indexOf(k) !== -1) return STAGE_MAP[k]; }
    return 'MQL';
  }

  function calcFunnel(deals) {
    var counts = {};
    STAGES.forEach(function (s) { counts[s] = 0; });
    counts['Perdido'] = 0;

    deals.forEach(function (d) {
      var mapped = _mapStage(d.fase_atual_no_processo);
      var order = STAGE_ORDER[mapped] != null ? STAGE_ORDER[mapped] : 0;
      STAGES.forEach(function (s) { if (STAGE_ORDER[s] <= order) counts[s]++; });
      if (mapped === 'Perdido') counts['Perdido']++;
    });

    var crs = [];
    for (var i = 1; i < STAGES.length; i++) {
      crs.push({ from: STAGES[i - 1], to: STAGES[i], rate: _pct(counts[STAGES[i]], counts[STAGES[i - 1]]) });
    }
    return { stages: STAGES, counts: counts, conversions: crs, total: deals.length, lost: counts['Perdido'] };
  }

  function calcDailyVolume(deals) {
    var monthStart = _monthStart();
    var byDay = {};

    deals.forEach(function (d) {
      var created = (d.created_at_crm || '').slice(0, 10);
      if (!created || created < monthStart) return;
      if (!byDay[created]) byDay[created] = { mql: 0, sal: 0, opp: 0, won: 0 };
      var fase = (d.fase_atual_no_processo || '').toLowerCase();
      byDay[created].mql++;
      if (fase.indexOf('sal') !== -1 || fase.indexOf('conectad') !== -1 || fase.indexOf('agendament') !== -1 ||
        fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1)
        byDay[created].sal++;
      if (fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1)
        byDay[created].opp++;
      if (fase.indexOf('ganho') !== -1) byDay[created].won++;
    });

    var days = Object.keys(byDay).sort().map(function (d) {
      return { date: d, label: d.slice(8, 10) + '/' + d.slice(5, 7), mql: byDay[d].mql, sal: byDay[d].sal, opp: byDay[d].opp, won: byDay[d].won };
    });
    return { days: days, monthStart: monthStart };
  }

  function calcEfficiencyByQualifier(deals) {
    var byQ = {};
    deals.forEach(function (d) {
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
      var line = d.linha_de_receita_vigente || d.grupo_de_receita || 'nao_definido';
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
      html += '<div style="flex:1;height:' + hMql + 'px;background:var(--accent);border-radius:2px 2px 0 0;min-height:2px" title="MQL:' + d.mql + '"></div>';
      html += '<div style="flex:1;height:' + hSal + 'px;background:var(--accent2);border-radius:2px 2px 0 0;min-height:2px" title="SAL:' + d.sal + '"></div>';
      html += '<div style="flex:1;height:' + hOpp + 'px;background:var(--green);border-radius:2px 2px 0 0;min-height:2px" title="OPP:' + d.opp + '"></div>';
      html += '</div><div style="font-size:8px;color:var(--text2)">' + d.label + '</div></div>';
    });
    html += '</div><div style="display:flex;gap:12px;justify-content:center;margin-top:4px">';
    html += '<span style="font-size:9px;color:var(--text2)"><span style="display:inline-block;width:8px;height:8px;background:var(--accent);border-radius:2px;margin-right:3px"></span>MQL</span>';
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

  function renderLineTable(data) {
    if (!data || !data.rows || !data.rows.length) return '<div style="color:var(--text2);font-size:11px">Sem dados</div>';
    var maxTotal = Math.max.apply(null, data.rows.map(function (r) { return r.total; })) || 1;
    var html = '';
    data.rows.forEach(function (r) {
      var pct = Math.round((r.total / maxTotal) * 100);
      html += '<div class="fr"><div class="fl" style="width:160px">' + r.name + '</div>';
      html += '<div class="fb-bg"><div class="fb-f" style="width:' + Math.max(pct, 3) + '%">';
      html += '<span class="fb-v">' + r.total + '</span></div></div>';
      html += '<span class="fp" style="width:60px">' + r.winRate + '% WR</span></div>';
    });
    return html;
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
    if (dt.avg_velocity_score != null) {
      var vs = Math.round(dt.avg_velocity_score * 100);
      var vsColor = vs >= 60 ? 'var(--green)' : vs >= 30 ? 'var(--accent)' : 'var(--red)';
      html += '<div style="margin-top:8px;font-size:11px;color:var(--text2)">Velocity Score médio: <strong style="color:' + vsColor + '">' + vs + '%</strong>';
      html += ' · <span style="color:var(--red)">' + dt.stall_count + ' stalled</span> / ' + dt.total + ' deals</div>';
    }
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

  // ============================================================================
  // MASTER RENDER — busca dados do Supabase e monta o painel
  // ============================================================================
  async function renderReportsV4(containerId) {
    var el = document.getElementById(containerId || 'screen-reports-v4');
    if (!el) return;

    el.innerHTML = '<div style="font-size:12px;color:var(--text2);padding:40px;text-align:center">Carregando dados do Supabase...</div>';

    var email = _opEmail();

    // Busca tudo em paralelo direto do Supabase
    var results = await Promise.all([
      fetchDeals(email),
      fetchOppEventsThisMonth(email),
      fetchDeltaTRuntime(email)
    ]);

    var deals = results[0];
    var oppGeradas = results[1];
    var dtRuntime = results[2];

    if (!deals || !deals.length) {
      el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text2)">'
        + '<div style="font-size:16px;margin-bottom:8px">Sem dados disponíveis</div>'
        + '<div style="font-size:12px">Aguarde o sync diário (7h30) ou execute o sync manual.</div>'
        + '</div>';
      return;
    }

    // Calcula todos os blocos com os dados carregados
    var funnel = calcFunnel(deals);
    var daily = calcDailyVolume(deals);
    var efficiency = calcEfficiencyByQualifier(deals);
    var pipeline = calcPipelineByLine(deals);
    var profile = calcClientProfile(deals);
    var channel = calcChannelForecast(deals);

    var lastSync = new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

    var html = '';

    // Header
    html += '<div style="margin-bottom:16px;display:flex;align-items:flex-end;justify-content:space-between">';
    html += '<div><div style="font-size:18px;font-weight:800;color:var(--text);margin-bottom:3px">Pre-Vendas Intelligence</div>';
    html += '<div style="font-size:12px;color:var(--text2)">Tempo real · Databricks → Supabase · ' + deals.length + ' deals · ' + lastSync + '</div></div>';
    if (dtRuntime) {
      var stallPct = dtRuntime.total ? Math.round(dtRuntime.stall_count / dtRuntime.total * 100) : 0;
      html += '<div style="font-size:11px;color:var(--text2);text-align:right">';
      html += '<span style="color:var(--accent);font-weight:700">' + dtRuntime.total + '</span> com velocity · ';
      html += '<span style="color:var(--red);font-weight:700">' + dtRuntime.stall_count + '</span> stalled (' + stallPct + '%)';
      html += '</div>';
    }
    html += '</div>';

    // KPI Row: 7 KPIs
    var oppGeradasVal = oppGeradas != null ? oppGeradas : funnel.counts['Oportunidade'];
    html += '<div class="kpi-g" style="grid-template-columns:repeat(7,1fr);margin-bottom:14px">';
    html += '<div class="kpi"><div class="kpi-l">MQL</div><div class="kpi-v">' + _fmt(funnel.counts['MQL']) + '</div></div>';
    html += '<div class="kpi"><div class="kpi-l">SAL</div><div class="kpi-v">' + _fmt(funnel.counts['SAL']) + '</div></div>';
    html += '<div class="kpi" title="OPP geradas no mês — eventos Databricks"><div class="kpi-l">OPP Geradas</div><div class="kpi-v" style="color:var(--accent)">' + _fmt(oppGeradasVal) + '</div></div>';
    html += '<div class="kpi" title="Deals em fase OPP/Negoc agora"><div class="kpi-l">OPP Ativas</div><div class="kpi-v">' + _fmt(funnel.counts['Oportunidade']) + '</div></div>';
    html += '<div class="kpi"><div class="kpi-l">Won</div><div class="kpi-v">' + _fmt(funnel.counts['Ganho']) + '</div></div>';
    html += '<div class="kpi"><div class="kpi-l">CR MQL→OPP</div><div class="kpi-v">' + _pct(oppGeradasVal, funnel.counts['MQL']) + '%</div></div>';
    html += '<div class="kpi"><div class="kpi-l">Perdidos</div><div class="kpi-v" style="color:var(--red)">' + _fmt(funnel.lost) + '</div></div>';
    html += '</div>';

    // Velocity Δt row (dados reais deal_runtime)
    if (dtRuntime) {
      function _dtFmt(v) { return v != null ? v + 'd' : '—'; }
      html += '<div class="kpi-g" style="grid-template-columns:repeat(6,1fr);margin-bottom:14px;background:var(--bg3);border-radius:var(--r2);padding:8px">';
      var dts = [
        ['Δt SAL→Conectado', dtRuntime.dt_sal_conectado],
        ['Δt Conectado→Agend', dtRuntime.dt_conectado_agendado],
        ['Δt Agend→OPP', dtRuntime.dt_agendado_opp],
        ['Δt OPP→Negoc', dtRuntime.dt_opp_negociacao],
        ['Δt Negoc→Ganho', dtRuntime.dt_negociacao_ganho]
      ];
      dts.forEach(function (dt) {
        var v = dt[1]; var color = v == null ? 'var(--text2)' : v <= 3 ? 'var(--green)' : v <= 7 ? 'var(--accent)' : 'var(--red)';
        html += '<div class="kpi" style="background:transparent"><div class="kpi-l" style="color:var(--text2)">' + dt[0] + '</div>';
        html += '<div class="kpi-v" style="font-size:14px;color:' + color + '">' + _dtFmt(v) + '</div></div>';
      });
      if (dtRuntime.avg_velocity_score != null) {
        var vs = Math.round(dtRuntime.avg_velocity_score * 100);
        var vsColor = vs >= 60 ? 'var(--green)' : vs >= 30 ? 'var(--accent)' : 'var(--red)';
        html += '<div class="kpi" style="background:transparent"><div class="kpi-l" style="color:var(--text2)">Velocity Score</div>';
        html += '<div class="kpi-v" style="font-size:14px;color:' + vsColor + '">' + vs + '%</div></div>';
      }
      html += '</div>';
    }

    // Row 1: Funil + Volume Diário
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">';
    html += '<div class="ch"><div class="ch-t">Funil do Operador</div>' + renderFunnelBars(funnel) + '</div>';
    html += '<div class="ch"><div class="ch-t">Volume Diario — Mes Atual</div>' + renderDailyChart(daily) + '</div>';
    html += '</div>';

    // Row 2: Pipeline por Linha + Canal
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">';
    html += '<div class="ch"><div class="ch-t">Pipeline por Linha de Receita</div>' + renderLineTable(pipeline) + '</div>';
    html += '<div class="ch"><div class="ch-t">Forecast por Canal</div>' + renderChannelBars(channel) + '</div>';
    html += '</div>';

    // Row 3: Eficiência por Qualificador (full width)
    html += '<div class="ch" style="margin-bottom:12px"><div class="ch-t">Eficiencia por Qualificador</div>' + renderEfficiencyTable(efficiency) + '</div>';

    // Row 4: Perfil de Cliente + Velocity
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">';
    html += '<div class="ch"><div class="ch-t">Perfil de Cliente — Quem Converte</div>' + renderClientProfile(profile) + '</div>';
    html += '<div class="ch"><div class="ch-t">Velocidade (Δt) por Transição</div>' + renderVelocityFromRuntime(dtRuntime) + '</div>';
    html += '</div>';

    el.innerHTML = html;
  }

  // ============================================================================
  // EXPORT
  // ============================================================================
  window.ReportsV4 = {
    renderReportsV4: renderReportsV4,
    fetchDeals: fetchDeals,
    fetchOppEventsThisMonth: fetchOppEventsThisMonth,
    fetchDeltaTRuntime: fetchDeltaTRuntime,
    calcFunnel: calcFunnel,
    calcDailyVolume: calcDailyVolume,
    calcEfficiencyByQualifier: calcEfficiencyByQualifier,
    calcPipelineByLine: calcPipelineByLine,
    calcClientProfile: calcClientProfile,
    calcChannelForecast: calcChannelForecast
  };

})();
