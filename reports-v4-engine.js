// ============================================================================
// REPORTS V4 ENGINE — Pre-Vendas Intelligence Layer
// Cockpit Elucy — camada de indicadores operacionais de pre-vendas
// Substitui dashboards manuais do HubSpot por dados Databricks via Supabase
// ============================================================================

(function () {
  'use strict';

  // --- Helpers ---
  function _sb() { return window.getSB ? window.getSB() : null; }
  function _opEmail() { return window.getOperatorId ? window.getOperatorId() : null; }
  function _deals() { return window._COCKPIT_DEAL_MAP || {}; }
  function _pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 : 0; }
  function _fmt(n) { return n != null ? n.toLocaleString('pt-BR') : '—'; }
  function _fmtBRL(n) { return n != null ? 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'; }
  function _today() { return new Date().toISOString().slice(0, 10); }
  function _monthStart() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

  // --- Cache layer (localStorage, 30min TTL) ---
  var CACHE_TTL = 30 * 60 * 1000;
  function _cacheGet(key) {
    try {
      var raw = localStorage.getItem('rv4_' + key);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CACHE_TTL) { localStorage.removeItem('rv4_' + key); return null; }
      return obj.data;
    } catch (e) { return null; }
  }
  function _cacheSet(key, data) {
    try { localStorage.setItem('rv4_' + key, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) { /* quota */ }
  }

  // ============================================================================
  // BLOCO 1 — Funil do Operador (MQL→SAL→Conectado→Agendado→Opp→Won)
  // ============================================================================
  function calcOperatorFunnel(operatorEmail) {
    var deals = Object.values(_deals());
    var email = operatorEmail || _opEmail();
    if (email) {
      deals = deals.filter(function (d) {
        return (d.operator_email || '').toLowerCase() === email.toLowerCase();
      });
    }

    var STAGES = ['MQL', 'SAL', 'Conectados', 'Agendamento', 'Oportunidade', 'Negociacao', 'Ganho'];
    var STAGE_MAP = {
      'mql': 'MQL', 'sal': 'SAL', 'conectado': 'Conectados', 'conectados': 'Conectados',
      'agendamento': 'Agendamento', 'agendado': 'Agendamento',
      'oportunidade': 'Oportunidade', 'opp': 'Oportunidade',
      'negociacao': 'Negociacao', 'negociação': 'Negociacao',
      'ganho': 'Ganho', 'won': 'Ganho', 'perdido': 'Perdido'
    };

    var counts = {};
    STAGES.forEach(function (s) { counts[s] = 0; });
    counts['Perdido'] = 0;

    var stageOrder = {};
    STAGES.forEach(function (s, i) { stageOrder[s] = i; });
    stageOrder['Perdido'] = 99;

    deals.forEach(function (d) {
      var fase = (d.fase_atual_no_processo || d.fase || '').toLowerCase().trim();
      var mapped = STAGE_MAP[fase];
      if (!mapped) {
        // try partial match
        for (var k in STAGE_MAP) {
          if (fase.indexOf(k) !== -1) { mapped = STAGE_MAP[k]; break; }
        }
      }
      if (!mapped) mapped = 'MQL';

      // count at current stage AND all prior stages (funnel logic)
      var currentOrder = stageOrder[mapped] != null ? stageOrder[mapped] : 0;
      STAGES.forEach(function (s) {
        if (stageOrder[s] <= currentOrder) counts[s]++;
      });
      if (mapped === 'Perdido') counts['Perdido']++;
    });

    // Conversion rates
    var crs = [];
    for (var i = 1; i < STAGES.length; i++) {
      crs.push({
        from: STAGES[i - 1],
        to: STAGES[i],
        rate: _pct(counts[STAGES[i]], counts[STAGES[i - 1]])
      });
    }

    return { stages: STAGES, counts: counts, conversions: crs, total: deals.length, lost: counts['Perdido'] };
  }

  // ============================================================================
  // BLOCO 2 — Volume Diário (MQL/SAL/Opp por dia no mês)
  // ============================================================================
  function calcDailyVolume(operatorEmail) {
    var deals = Object.values(_deals());
    var email = operatorEmail || _opEmail();
    if (email) {
      deals = deals.filter(function (d) {
        return (d.operator_email || '').toLowerCase() === email.toLowerCase();
      });
    }

    var monthStart = _monthStart();
    var byDay = {};

    deals.forEach(function (d) {
      var created = (d.created_at_crm || d.created_at || '').slice(0, 10);
      if (created < monthStart) return;

      if (!byDay[created]) byDay[created] = { mql: 0, sal: 0, opp: 0, won: 0 };

      byDay[created].mql++;

      var fase = (d.fase_atual_no_processo || d.fase || '').toLowerCase();
      if (fase.indexOf('sal') !== -1 || fase.indexOf('conectad') !== -1 || fase.indexOf('agendament') !== -1 ||
          fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) {
        byDay[created].sal++;
      }
      if (fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) {
        byDay[created].opp++;
      }
      if (fase.indexOf('ganho') !== -1 || fase === 'won') {
        byDay[created].won++;
      }
    });

    // Sort by date
    var days = Object.keys(byDay).sort();
    var result = days.map(function (d) {
      return { date: d, label: d.slice(8, 10) + '/' + d.slice(5, 7), mql: byDay[d].mql, sal: byDay[d].sal, opp: byDay[d].opp, won: byDay[d].won };
    });

    return { days: result, monthStart: monthStart };
  }

  // ============================================================================
  // BLOCO 3 — Eficiência por Qualificador (tabela "Taxas Serginho")
  // ============================================================================
  function calcQualifierEfficiency() {
    var deals = Object.values(_deals());
    var byQ = {};

    deals.forEach(function (d) {
      var qName = d.qualificador_name || 'Sem Qualificador';
      if (!byQ[qName]) byQ[qName] = { mql: 0, sal: 0, connected: 0, scheduled: 0, opp: 0, won: 0, lost: 0, revenue: 0 };

      var fase = (d.fase_atual_no_processo || d.fase || '').toLowerCase();
      var q = byQ[qName];

      q.mql++;
      if (fase.indexOf('sal') !== -1 || fase.indexOf('conectad') !== -1 || fase.indexOf('agendament') !== -1 ||
          fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) q.sal++;
      if (fase.indexOf('conectad') !== -1 || fase.indexOf('agendament') !== -1 ||
          fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) q.connected++;
      if (fase.indexOf('agendament') !== -1 || fase.indexOf('oportunidade') !== -1 ||
          fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) q.scheduled++;
      if (fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) q.opp++;
      if (fase.indexOf('ganho') !== -1 || fase === 'won') {
        q.won++;
        q.revenue += parseFloat(d.revenue || d.valor_da_oportunidade || 0);
      }
      if (fase.indexOf('perdido') !== -1 || fase === 'lost') q.lost++;
    });

    // Build sorted array
    var rows = Object.keys(byQ).map(function (name) {
      var q = byQ[name];
      return {
        name: name,
        mql: q.mql,
        sal: q.sal,
        connected: q.connected,
        scheduled: q.scheduled,
        opp: q.opp,
        won: q.won,
        lost: q.lost,
        revenue: q.revenue,
        cr_mql_sal: _pct(q.sal, q.mql),
        cr_sal_opp: _pct(q.opp, q.sal),
        cr_opp_won: _pct(q.won, q.opp),
        cr_mql_won: _pct(q.won, q.mql)
      };
    });

    // Sort by OPP conversion descending
    rows.sort(function (a, b) { return b.cr_sal_opp - a.cr_sal_opp; });

    // Totals
    var totals = rows.reduce(function (acc, r) {
      acc.mql += r.mql; acc.sal += r.sal; acc.opp += r.opp; acc.won += r.won; acc.revenue += r.revenue;
      return acc;
    }, { mql: 0, sal: 0, opp: 0, won: 0, revenue: 0 });
    totals.cr_mql_sal = _pct(totals.sal, totals.mql);
    totals.cr_sal_opp = _pct(totals.opp, totals.sal);
    totals.cr_opp_won = _pct(totals.won, totals.opp);

    return { rows: rows, totals: totals };
  }

  // ============================================================================
  // BLOCO 4 — Pipeline por Linha de Receita
  // ============================================================================
  function calcPipelineByLine() {
    var deals = Object.values(_deals());
    var byLine = {};

    deals.forEach(function (d) {
      var line = d._revLine || (window.resolveRevenueLine ? window.resolveRevenueLine(d) : null) || 'nao_definido';
      if (!byLine[line]) byLine[line] = { total: 0, sal: 0, opp: 0, won: 0, lost: 0, value: 0, byStage: {} };

      var bl = byLine[line];
      var fase = (d.fase_atual_no_processo || d.fase || '').toLowerCase();
      var etapa = d.etapa_atual_no_pipeline || fase;

      bl.total++;
      if (!bl.byStage[etapa]) bl.byStage[etapa] = 0;
      bl.byStage[etapa]++;

      if (fase.indexOf('sal') !== -1 || fase.indexOf('conectad') !== -1 || fase.indexOf('agendament') !== -1 ||
          fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) bl.sal++;
      if (fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) bl.opp++;
      if (fase.indexOf('ganho') !== -1) { bl.won++; bl.value += parseFloat(d.revenue || d.valor_da_oportunidade || 0); }
      if (fase.indexOf('perdido') !== -1) bl.lost++;
    });

    var rows = Object.keys(byLine).map(function (name) {
      var l = byLine[name];
      return {
        name: name, total: l.total, sal: l.sal, opp: l.opp, won: l.won, lost: l.lost,
        value: l.value, winRate: _pct(l.won, l.won + l.lost), byStage: l.byStage
      };
    });
    rows.sort(function (a, b) { return b.total - a.total; });

    return { rows: rows };
  }

  // ============================================================================
  // BLOCO 5 — Perfil de Cliente (quem converte)
  // ============================================================================
  function calcClientProfile() {
    var deals = Object.values(_deals());
    var won = deals.filter(function (d) {
      var fase = (d.fase_atual_no_processo || d.fase || '').toLowerCase();
      return fase.indexOf('ganho') !== -1 || fase === 'won';
    });
    var all = deals;

    function _countField(arr, field) {
      var counts = {};
      arr.forEach(function (d) {
        var v = d[field] || 'Não informado';
        if (!counts[v]) counts[v] = 0;
        counts[v]++;
      });
      return Object.keys(counts).map(function (k) { return { label: k, count: counts[k] }; })
        .sort(function (a, b) { return b.count - a.count; })
        .slice(0, 10);
    }

    return {
      totalDeals: all.length,
      wonDeals: won.length,
      byCargo: { all: _countField(all, 'cargo'), won: _countField(won, 'cargo') },
      bySegmento: { all: _countField(all, 'p_segmento'), won: _countField(won, 'p_segmento') },
      byPerfil: { all: _countField(all, 'perfil'), won: _countField(won, 'perfil') },
      byFaturamento: { all: _countField(all, 'faixa_de_faturamento'), won: _countField(won, 'faixa_de_faturamento') },
      byFuncionarios: { all: _countField(all, 'faixa_de_funcionarios'), won: _countField(won, 'faixa_de_funcionarios') },
      byTier: { all: _countField(all, 'tier_da_oportunidade'), won: _countField(won, 'tier_da_oportunidade') }
    };
  }

  // ============================================================================
  // BLOCO 6 — Velocidade (Δt entre fases)
  // ============================================================================
  function calcVelocity() {
    var deals = Object.values(_deals());
    var byLine = {};

    deals.forEach(function (d) {
      var line = d._revLine || (window.resolveRevenueLine ? window.resolveRevenueLine(d) : null) || 'nao_definido';
      if (!byLine[line]) byLine[line] = { dt_values: [], byQualif: {} };

      var dt = parseFloat(d.delta_t);
      if (!dt || isNaN(dt) || dt <= 0) return;

      byLine[line].dt_values.push(dt);

      // Also group by qualifier for granularity
      var qName = d.qualificador_name || 'N/A';
      if (!byLine[line].byQualif[qName]) byLine[line].byQualif[qName] = [];
      byLine[line].byQualif[qName].push(dt);
    });

    function _avg(arr) { return arr.length ? Math.round(arr.reduce(function (a, b) { return a + b; }, 0) / arr.length * 10) / 10 : null; }
    function _median(arr) {
      if (!arr.length) return null;
      var s = arr.slice().sort(function (a, b) { return a - b; });
      var mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2 * 10) / 10;
    }

    var rows = Object.keys(byLine).map(function (name) {
      var bl = byLine[name];
      return {
        name: name,
        avg_dt: _avg(bl.dt_values),
        median_dt: _median(bl.dt_values),
        min_dt: bl.dt_values.length ? Math.min.apply(null, bl.dt_values) : null,
        max_dt: bl.dt_values.length ? Math.max.apply(null, bl.dt_values) : null,
        samples: bl.dt_values.length,
        byQualif: bl.byQualif
      };
    });
    rows.sort(function (a, b) { return (a.avg_dt || 999) - (b.avg_dt || 999); });

    return { rows: rows };
  }

  // ============================================================================
  // BLOCO 7 — Forecast por Canal
  // ============================================================================
  function calcForecastByChannel() {
    var deals = Object.values(_deals());
    var byCh = {};

    deals.forEach(function (d) {
      var ch = d.canal_de_marketing || d.utm_medium || d.canal || 'Outro';
      if (!byCh[ch]) byCh[ch] = { total: 0, opp: 0, won: 0, value: 0, oppValue: 0 };

      var bc = byCh[ch];
      var fase = (d.fase_atual_no_processo || d.fase || '').toLowerCase();

      bc.total++;
      var val = parseFloat(d.valor_da_oportunidade || d.revenue || 0);
      bc.value += val;

      if (fase.indexOf('oportunidade') !== -1 || fase.indexOf('negociac') !== -1 || fase.indexOf('ganho') !== -1) {
        bc.opp++;
        bc.oppValue += val;
      }
      if (fase.indexOf('ganho') !== -1) bc.won++;
    });

    var rows = Object.keys(byCh).map(function (name) {
      var c = byCh[name];
      return {
        name: name, total: c.total, opp: c.opp, won: c.won,
        value: c.value, oppValue: c.oppValue,
        cr_opp: _pct(c.opp, c.total), cr_won: _pct(c.won, c.opp)
      };
    });
    rows.sort(function (a, b) { return b.oppValue - a.oppValue; });

    return { rows: rows };
  }

  // ============================================================================
  // BLOCO 8 — Anti-Divagação LLM Insight Engine
  // ============================================================================
  var INSIGHT_CACHE = {};
  var INSIGHT_TTL = 30 * 60 * 1000;

  function buildInsightPrompt(blockName, data) {
    return JSON.stringify({
      instruction: 'Voce e um analista de pre-vendas B2B. Analise os dados abaixo e retorne EXATAMENTE um JSON com o campo "insights" contendo um array de 3 strings. Cada string deve ter no maximo 20 palavras e ser um insight acionavel. NAO inclua explicacoes, headers, markdown ou texto fora do JSON.',
      format: '{"insights":["insight 1","insight 2","insight 3"]}',
      block: blockName,
      data: data
    });
  }

  function parseInsightResponse(raw) {
    try {
      // Try direct JSON parse
      var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed.insights && Array.isArray(parsed.insights)) {
        return parsed.insights.slice(0, 3).map(function (s) {
          return typeof s === 'string' ? s.slice(0, 120) : String(s).slice(0, 120);
        });
      }
    } catch (e) { /* fallback */ }

    // Try extracting JSON from text
    try {
      var match = (raw || '').match(/\{[\s\S]*"insights"[\s\S]*\}/);
      if (match) {
        var extracted = JSON.parse(match[0]);
        if (extracted.insights) return extracted.insights.slice(0, 3);
      }
    } catch (e) { /* fallback */ }

    return null;
  }

  async function requestInsight(blockName, dataSummary) {
    var cacheKey = blockName + '_' + _today();
    if (INSIGHT_CACHE[cacheKey] && (Date.now() - INSIGHT_CACHE[cacheKey].ts < INSIGHT_TTL)) {
      return INSIGHT_CACHE[cacheKey].data;
    }

    // Also check localStorage
    var cached = _cacheGet('insight_' + cacheKey);
    if (cached) { INSIGHT_CACHE[cacheKey] = { ts: Date.now(), data: cached }; return cached; }

    var sb = _sb();
    if (!sb) return null;

    var prompt = buildInsightPrompt(blockName, dataSummary);

    // Send via cockpit_requests for LLM processing
    try {
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 5000);

      var resp = await sb.from('cockpit_requests').insert({
        operator_email: _opEmail(),
        request_type: 'insight_v4',
        deal_id: 'report_' + blockName,
        payload: { prompt: prompt, block: blockName },
        status: 'pending'
      }).select('id').single();

      clearTimeout(timeout);

      if (!resp.data) return null;

      // Poll for response (max 5s)
      var reqId = resp.data.id;
      var attempts = 0;
      while (attempts < 10) {
        await new Promise(function (r) { setTimeout(r, 500); });
        var res = await sb.from('cockpit_responses').select('response_payload').eq('request_id', reqId).single();
        if (res.data && res.data.response_payload) {
          var insights = parseInsightResponse(res.data.response_payload.text || res.data.response_payload);
          if (insights) {
            INSIGHT_CACHE[cacheKey] = { ts: Date.now(), data: insights };
            _cacheSet('insight_' + cacheKey, insights);
            return insights;
          }
          break;
        }
        attempts++;
      }
    } catch (e) {
      // Timeout or error — return null, block renders without insight
    }

    return null;
  }

  // ============================================================================
  // RENDERING ENGINE — Pure HTML generation (no external libs)
  // ============================================================================

  function renderFunnelBars(data) {
    if (!data || !data.stages) return '<div style="color:var(--text2);font-size:11px">Sem dados</div>';
    var maxVal = Math.max.apply(null, data.stages.map(function (s) { return data.counts[s] || 0; })) || 1;
    var html = '';

    data.stages.forEach(function (stage, i) {
      var count = data.counts[stage] || 0;
      var pct = Math.round((count / maxVal) * 100);
      var cr = data.conversions[i - 1] ? data.conversions[i - 1].rate + '%' : '';
      var colors = ['var(--accent)', 'var(--accent2)', '#6c7ae0', '#48bb78', '#ed8936', '#e53e3e', '#38b2ac'];
      var color = colors[i % colors.length];

      html += '<div class="fr"><div class="fl">' + stage + '</div>';
      html += '<div class="fb-bg"><div class="fb-f" style="width:' + Math.max(pct, 3) + '%;background:' + color + '">';
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
      html += '<div style="flex:1;height:' + hMql + 'px;background:var(--accent);border-radius:2px 2px 0 0;min-height:2px" title="MQL: ' + d.mql + '"></div>';
      html += '<div style="flex:1;height:' + hSal + 'px;background:var(--accent2);border-radius:2px 2px 0 0;min-height:2px" title="SAL: ' + d.sal + '"></div>';
      html += '<div style="flex:1;height:' + hOpp + 'px;background:var(--green);border-radius:2px 2px 0 0;min-height:2px" title="OPP: ' + d.opp + '"></div>';
      html += '</div>';
      html += '<div style="font-size:8px;color:var(--text2)">' + d.label + '</div>';
      html += '</div>';
    });

    html += '</div>';
    html += '<div style="display:flex;gap:12px;justify-content:center;margin-top:4px">';
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
    html += '<th style="text-align:right">#Won</th><th style="text-align:right">%O→W</th>';
    html += '<th style="text-align:right">Receita</th></tr></thead><tbody>';

    // Highlight current operator
    var myEmail = (_opEmail() || '').toLowerCase();

    data.rows.forEach(function (r) {
      if (r.mql < 5) return; // skip noise
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

    // Totals row
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
    html += '</tr>';

    html += '</tbody></table></div>';
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
    if (!data) return '<div style="color:var(--text2);font-size:11px">Sem dados</div>';

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

  function renderVelocityTable(data) {
    if (!data || !data.rows || !data.rows.length) return '<div style="color:var(--text2);font-size:11px">Sem dados</div>';

    var html = '<div style="overflow-x:auto"><table class="intel-table">';
    html += '<thead><tr><th>Linha de Receita</th><th style="text-align:right">Media (dias)</th>';
    html += '<th style="text-align:right">Mediana</th><th style="text-align:right">Min</th>';
    html += '<th style="text-align:right">Max</th><th style="text-align:right">N</th></tr></thead><tbody>';

    data.rows.forEach(function (r) {
      if (!r.samples) return;
      var colorDt = function (v) { return v == null ? '' : v <= 3 ? 'color:var(--green)' : v <= 7 ? 'color:var(--yellow)' : 'color:var(--red)'; };
      html += '<tr>';
      html += '<td>' + r.name + '</td>';
      html += '<td style="text-align:right;font-weight:700;' + colorDt(r.avg_dt) + '">' + (r.avg_dt != null ? r.avg_dt + 'd' : '—') + '</td>';
      html += '<td style="text-align:right;' + colorDt(r.median_dt) + '">' + (r.median_dt != null ? r.median_dt + 'd' : '—') + '</td>';
      html += '<td style="text-align:right;color:var(--green)">' + (r.min_dt != null ? r.min_dt + 'd' : '—') + '</td>';
      html += '<td style="text-align:right;color:var(--red)">' + (r.max_dt != null ? r.max_dt + 'd' : '—') + '</td>';
      html += '<td style="text-align:right;color:var(--text2)">' + r.samples + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
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

  function renderInsightBox(insights) {
    if (!insights || !insights.length) return '';
    var html = '<div style="margin-top:10px;padding:8px 12px;background:var(--bg4);border-radius:var(--r2);border-left:3px solid var(--accent)">';
    html += '<div style="font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Insight</div>';
    insights.forEach(function (ins) {
      html += '<div style="font-size:11px;color:var(--text);margin-bottom:2px">• ' + ins + '</div>';
    });
    html += '</div>';
    return html;
  }

  // ============================================================================
  // MASTER RENDER — Assembles all 8 blocks into the Reports V4 container
  // ============================================================================
  async function renderReportsV4(containerId) {
    var el = document.getElementById(containerId || 'screen-reports-v4');
    if (!el) return;

    el.innerHTML = '<div style="font-size:12px;color:var(--text2);padding:20px;text-align:center">Calculando indicadores...</div>';

    // Calculate all blocks
    var funnel = calcOperatorFunnel();
    var daily = calcDailyVolume();
    var efficiency = calcQualifierEfficiency();
    var pipeline = calcPipelineByLine();
    var profile = calcClientProfile();
    var velocity = calcVelocity();
    var channel = calcForecastByChannel();

    // Build HTML
    var html = '';

    // Header
    html += '<div style="margin-bottom:16px">';
    html += '<div style="font-size:18px;font-weight:800;color:var(--text);margin-bottom:3px">Pre-Vendas Intelligence</div>';
    html += '<div style="font-size:12px;color:var(--text2)">Dados do mes atual — atualizado via Supabase</div>';
    html += '</div>';

    // KPI Summary Row
    html += '<div class="kpi-g" style="grid-template-columns:repeat(6,1fr);margin-bottom:14px">';
    html += '<div class="kpi"><div class="kpi-l">MQL</div><div class="kpi-v">' + _fmt(funnel.counts['MQL']) + '</div></div>';
    html += '<div class="kpi"><div class="kpi-l">SAL</div><div class="kpi-v">' + _fmt(funnel.counts['SAL']) + '</div></div>';
    html += '<div class="kpi"><div class="kpi-l">OPP</div><div class="kpi-v">' + _fmt(funnel.counts['Oportunidade']) + '</div></div>';
    html += '<div class="kpi"><div class="kpi-l">Won</div><div class="kpi-v">' + _fmt(funnel.counts['Ganho']) + '</div></div>';
    html += '<div class="kpi"><div class="kpi-l">CR MQL→OPP</div><div class="kpi-v">' + _pct(funnel.counts['Oportunidade'], funnel.counts['MQL']) + '%</div></div>';
    html += '<div class="kpi"><div class="kpi-l">Perdidos</div><div class="kpi-v" style="color:var(--red)">' + _fmt(funnel.total > 0 ? funnel.lost : 0) + '</div></div>';
    html += '</div>';

    // Row 1: Funnel + Daily Volume (2 columns)
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">';

    html += '<div class="ch"><div class="ch-t">Funil do Operador</div>';
    html += renderFunnelBars(funnel);
    html += '<div id="rv4-insight-funnel"></div></div>';

    html += '<div class="ch"><div class="ch-t">Volume Diario — Mes Atual</div>';
    html += renderDailyChart(daily);
    html += '<div id="rv4-insight-daily"></div></div>';

    html += '</div>';

    // Row 2: Pipeline by Line + Channel Forecast (2 columns)
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">';

    html += '<div class="ch"><div class="ch-t">Pipeline por Linha de Receita</div>';
    html += renderLineTable(pipeline);
    html += '<div id="rv4-insight-pipeline"></div></div>';

    html += '<div class="ch"><div class="ch-t">Forecast por Canal</div>';
    html += renderChannelBars(channel);
    html += '<div id="rv4-insight-channel"></div></div>';

    html += '</div>';

    // Row 3: Efficiency Table (full width)
    html += '<div class="ch"><div class="ch-t">Eficiencia por Qualificador</div>';
    html += renderEfficiencyTable(efficiency);
    html += '<div id="rv4-insight-efficiency"></div></div>';

    // Row 4: Client Profile + Velocity (2 columns)
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">';

    html += '<div class="ch"><div class="ch-t">Perfil de Cliente — Quem Converte</div>';
    html += renderClientProfile(profile);
    html += '<div id="rv4-insight-profile"></div></div>';

    html += '<div class="ch"><div class="ch-t">Velocidade (Δt) por Linha</div>';
    html += renderVelocityTable(velocity);
    html += '<div id="rv4-insight-velocity"></div></div>';

    html += '</div>';

    el.innerHTML = html;

    // Fire-and-forget: load LLM insights async (anti-divagation)
    _loadInsightsAsync(funnel, daily, efficiency, pipeline, profile, velocity, channel);
  }

  async function _loadInsightsAsync(funnel, daily, efficiency, pipeline, profile, velocity, channel) {
    var blocks = [
      { id: 'rv4-insight-funnel', name: 'funnel', data: { stages: funnel.stages, counts: funnel.counts, conversions: funnel.conversions } },
      { id: 'rv4-insight-daily', name: 'daily_volume', data: { days_count: daily.days.length, last_3: daily.days.slice(-3) } },
      { id: 'rv4-insight-efficiency', name: 'qualifier_efficiency', data: { top5: efficiency.rows.slice(0, 5), bottom5: efficiency.rows.slice(-5), totals: efficiency.totals } },
      { id: 'rv4-insight-pipeline', name: 'pipeline_by_line', data: pipeline.rows.slice(0, 5) },
      { id: 'rv4-insight-profile', name: 'client_profile', data: { cargo: profile.byCargo.won.slice(0, 3), segmento: profile.bySegmento.won.slice(0, 3) } },
      { id: 'rv4-insight-velocity', name: 'velocity', data: velocity.rows.slice(0, 5) },
      { id: 'rv4-insight-channel', name: 'channel_forecast', data: channel.rows.slice(0, 5) }
    ];

    blocks.forEach(async function (block) {
      var el = document.getElementById(block.id);
      if (el) el.innerHTML = '<div style="margin-top:8px;padding:7px 10px;background:var(--bg4);border-radius:var(--r2);border-left:3px solid var(--border);opacity:.5;font-size:10px;color:var(--text2)">⏳ Carregando análise...</div>';
      try {
        var insights = await requestInsight(block.name, block.data);
        el = document.getElementById(block.id);
        if (!el) return;
        if (insights && insights.length) {
          el.innerHTML = renderInsightBox(insights);
        } else {
          el.innerHTML = '<div style="margin-top:8px;padding:6px 10px;background:var(--bg4);border-radius:var(--r2);border-left:3px solid var(--border);font-size:10px;color:var(--text2);opacity:.6">— Worker sem resposta. Tente novamente em instantes.</div>';
        }
      } catch (e) {
        el = document.getElementById(block.id);
        if (el) el.innerHTML = '<div style="margin-top:8px;padding:6px 10px;background:var(--rdim);border-radius:var(--r2);border-left:3px solid var(--red);font-size:10px;color:var(--red)">Falha ao carregar insight: ' + (e && e.message ? e.message : 'timeout') + '</div>';
      }
    });
  }

  // ============================================================================
  // EXPORT
  // ============================================================================
  window.ReportsV4 = {
    calcOperatorFunnel: calcOperatorFunnel,
    calcDailyVolume: calcDailyVolume,
    calcQualifierEfficiency: calcQualifierEfficiency,
    calcPipelineByLine: calcPipelineByLine,
    calcClientProfile: calcClientProfile,
    calcVelocity: calcVelocity,
    calcForecastByChannel: calcForecastByChannel,
    requestInsight: requestInsight,
    renderReportsV4: renderReportsV4,
    // Individual renderers (for embedding in other tabs)
    renderFunnelBars: renderFunnelBars,
    renderDailyChart: renderDailyChart,
    renderEfficiencyTable: renderEfficiencyTable,
    renderLineTable: renderLineTable,
    renderClientProfile: renderClientProfile,
    renderVelocityTable: renderVelocityTable,
    renderChannelBars: renderChannelBars,
    renderInsightBox: renderInsightBox
  };

})();
