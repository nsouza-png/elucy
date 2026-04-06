// v10-batch-sync — Recalcula deal_data_quality_runtime e deal_transition_runtime
// Roda via cron (supabase pg_cron ou agendamento externo) ou manualmente via POST
// JWT obrigatório. Suporta: POST /v10-batch-sync?mode=full|incremental

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // Auth check
    const auth = req.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'incremental';
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const stats = { dqr: { processed: 0, critical: 0, risk: 0, ok: 0 }, dtr: { processed: 0, valid: 0, blocked: 0 } };

    // Fetch deals — incremental: only updated in last 24h, full: all
    let query = sb.from('deals').select('*');
    if (mode === 'incremental') {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('synced_at', cutoff);
    }
    const { data: deals, error: dealsErr } = await query;
    if (dealsErr) return json({ error: 'Failed to fetch deals', detail: dealsErr.message }, 500);
    if (!deals || !deals.length) return json({ message: 'No deals to process', mode, stats }, 200);

    // Batch: get all deal_ids for lookups
    const dealIds = deals.map(d => d.deal_id);

    // Fetch tasks counts grouped by deal
    const { data: allTasks } = await sb
      .from('deal_tasks')
      .select('deal_id, task_status')
      .in('deal_id', dealIds);

    const taskMap: Record<string, { total: number; completed: number }> = {};
    (allTasks || []).forEach((t: any) => {
      if (!taskMap[t.deal_id]) taskMap[t.deal_id] = { total: 0, completed: 0 };
      taskMap[t.deal_id].total++;
      if (t.task_status === 'completed') taskMap[t.deal_id].completed++;
    });

    // Fetch signals counts grouped by deal
    const { data: allSignals } = await sb
      .from('deal_signals')
      .select('deal_id, impact_score')
      .in('deal_id', dealIds);

    const signalMap: Record<string, { total: number; positive: number }> = {};
    (allSignals || []).forEach((s: any) => {
      if (!signalMap[s.deal_id]) signalMap[s.deal_id] = { total: 0, positive: 0 };
      signalMap[s.deal_id].total++;
      if (s.impact_score > 0) signalMap[s.deal_id].positive++;
    });

    // Fetch cache existence
    const { data: cacheHits } = await sb
      .from('elucy_cache')
      .select('deal_id')
      .in('deal_id', dealIds);

    const cacheSet = new Set((cacheHits || []).map((c: any) => c.deal_id));

    // Process each deal
    const dqrRows: any[] = [];
    const dtrRows: any[] = [];

    for (const d of deals) {
      const tasks = taskMap[d.deal_id] || { total: 0, completed: 0 };
      const signals = signalMap[d.deal_id] || { total: 0, positive: 0 };
      const hasCache = cacheSet.has(d.deal_id);

      // ── DQR: Data Quality Runtime ──
      const completeness = [
        d.fase_atual_no_processo, d.etapa_atual_no_pipeline, d.tier_da_oportunidade,
        d.linha_de_receita_vigente, d.grupo_de_receita, d.email_lead,
        d.cargo, d.canal_de_marketing, d.status_do_deal, d.created_at_crm
      ].filter(v => v != null && v !== '').length / 10;

      const consistency =
        (d.fase_atual_no_processo && d.etapa_atual_no_pipeline ? 0.4 : 0) +
        (d.tier_da_oportunidade ? 0.2 : 0) +
        (d.linha_de_receita_vigente && d.grupo_de_receita ? 0.2 : 0) +
        (d.canal_de_marketing && d.canal_de_marketing !== d.linha_de_receita_vigente ? 0.2 : 0);

      const syncDate = d.synced_at || d.created_at_crm || new Date(Date.now() - 90 * 86400000).toISOString();
      const daysSinceSync = (Date.now() - new Date(syncDate).getTime()) / 86400000;
      const recency = Math.max(0, 1.0 - daysSinceSync / 30);

      const evidence = Math.min(1.0,
        tasks.total * 0.15 +
        signals.total * 0.10 +
        (hasCache ? 0.3 : 0)
      );

      const trustScore = (completeness * 0.30 + consistency * 0.20 + recency * 0.25 + evidence * 0.25) * 100;
      const band = completeness < 0.4 ? 'critical' : completeness < 0.7 ? 'risk' : 'ok';

      stats.dqr.processed++;
      if (band === 'critical') stats.dqr.critical++;
      else if (band === 'risk') stats.dqr.risk++;
      else stats.dqr.ok++;

      dqrRows.push({
        deal_id: d.deal_id,
        operator_email: d.operator_email,
        completeness_score: round4(completeness),
        consistency_score: round4(consistency),
        recency_score: round4(recency),
        evidence_score: round4(evidence),
        data_trust_score: round4(trustScore),
        data_quality_band: band,
        explain_json: { version: 'v10-batch-sync-1.0', synced_at: new Date().toISOString(), tasks: tasks.total, signals: signals.total, hasCache },
        updated_at: new Date().toISOString(),
      });

      // ── DTR: Transition Runtime ──
      const nextStage = getNextStage(d.etapa_atual_no_pipeline);
      const gaps: string[] = [];
      if (!d.email_lead) gaps.push('missing_email');
      if (!d.cargo) gaps.push('missing_cargo');
      if (!d.tier_da_oportunidade) gaps.push('missing_tier');
      if (!d.linha_de_receita_vigente) gaps.push('missing_revenue_line');
      if (tasks.completed === 0) gaps.push('no_completed_tasks');
      if (d.delta_t && d.delta_t >= 30) gaps.push('aging_critical');
      else if (d.delta_t && d.delta_t >= 14) gaps.push('aging_warning');

      const readiness = Math.min(1.0,
        (d.email_lead ? 0.15 : 0) +
        (d.cargo ? 0.10 : 0) +
        (d.tier_da_oportunidade ? 0.10 : 0) +
        (d.linha_de_receita_vigente ? 0.10 : 0) +
        (tasks.completed > 0 ? 0.20 : 0) +
        (signals.positive > 0 ? 0.15 : 0) +
        (!d.delta_t || d.delta_t < 14 ? 0.20 : d.delta_t < 30 ? 0.10 : 0)
      );

      const valid = readiness >= 0.6 && !!d.etapa_atual_no_pipeline;
      stats.dtr.processed++;
      if (valid) stats.dtr.valid++;
      else stats.dtr.blocked++;

      dtrRows.push({
        deal_id: d.deal_id,
        operator_email: d.operator_email,
        current_pipeline_stage: d.etapa_atual_no_pipeline,
        target_pipeline_stage: nextStage,
        transition_readiness_score: round4(readiness),
        transition_valid: valid,
        transition_block_reason: gaps.length ? gaps.join(', ') : null,
        transition_gap_count: gaps.length,
        gaps_json: { version: 'v10-batch-sync-1.0', gaps, completed_tasks: tasks.completed, positive_signals: signals.positive, delta_t: d.delta_t },
        updated_at: new Date().toISOString(),
      });
    }

    // Upsert in batches of 500
    const batchSize = 500;
    for (let i = 0; i < dqrRows.length; i += batchSize) {
      const batch = dqrRows.slice(i, i + batchSize);
      const { error } = await sb.from('deal_data_quality_runtime').upsert(batch, { onConflict: 'deal_id' });
      if (error) console.error('DQR upsert error:', error.message);
    }

    for (let i = 0; i < dtrRows.length; i += batchSize) {
      const batch = dtrRows.slice(i, i + batchSize);
      const { error } = await sb.from('deal_transition_runtime').upsert(batch, { onConflict: 'deal_id' });
      if (error) console.error('DTR upsert error:', error.message);
    }

    return json({ message: `V10 sync complete (${mode})`, stats, deals_processed: deals.length }, 200);

  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

// ── Helpers ──

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function getNextStage(current: string | null): string | null {
  const map: Record<string, string> = {
    'novo lead': 'dia 01',
    'dia 01': 'dia 02',
    'dia 02': 'dia 03',
    'dia 03': 'conectados',
    'dia 04': 'conectados',
    'dia 05': 'conectados',
    'dia 06': 'conectados',
    'conectados': 'agendamento',
    'agendamento': 'reagendamento',
    'reagendamento': 'entrevista agendada',
  };
  return current ? map[current.toLowerCase()] || null : null;
}
