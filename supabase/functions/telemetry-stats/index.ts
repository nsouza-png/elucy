// ELUCY Telemetry Stats — Supabase Edge Function
// GET /telemetry-stats — Returns aggregated telemetry for the Cockpit
// Endpoints: pipeline-stats, kill-switches, dag-stats

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://nsouza-png.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") || "all";
    const hours = parseInt(url.searchParams.get("hours") || "24");
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

    const result: Record<string, unknown> = {};

    // ── Pipeline Stats ───────────────────────────────────────
    if (endpoint === "all" || endpoint === "pipeline-stats") {
      const { data: deals } = await sb
        .from("deals")
        .select("deal_id, revenue, fase_atual_no_processo, delta_t, status_deal, tier_da_oportunidade")
        .in("status_deal", ["em_andamento", "Em andamento", "aberto", "Aberto", "novo", "Novo", ""])
        .limit(3000);

      const active = deals || [];
      let totalValue = 0, conectados = 0, agendamentos = 0, risco = 0, enterprise5m = 0;
      for (const d of active) {
        totalValue += d.revenue || 0;
        const fase = (d.fase_atual_no_processo || "").toLowerCase();
        if (fase.includes("conectado")) conectados++;
        if (fase.includes("oportunidade") || fase.includes("agend")) agendamentos++;
        if ((d.delta_t || 0) > 4) risco++;
        if ((d.revenue || 0) >= 5_000_000) enterprise5m++;
      }

      result.pipeline = {
        total_value: totalValue,
        active_deals: active.length,
        conectados,
        agendamentos,
        em_risco: risco,
        enterprise_5m: enterprise5m,
      };
    }

    // ── Kill Switches ────────────────────────────────────────
    if (endpoint === "all" || endpoint === "kill-switches") {
      const { data: ks } = await sb
        .from("kill_switches")
        .select("switch_slug, is_enabled, triggered_count, last_triggered_at");

      const { data: recentKs } = await sb
        .from("elucy_telemetry_events")
        .select("kill_switch_triggered, created_at")
        .not("kill_switch_triggered", "is", null)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50);

      result.kill_switches = {
        config: ks || [],
        recent_triggers: recentKs || [],
      };
    }

    // ── DAG Stats ────────────────────────────────────────────
    if (endpoint === "all" || endpoint === "dag-stats") {
      const { data: events, count } = await sb
        .from("elucy_telemetry_events")
        .select("event_type, dag_phase, layer_processed, latency_ms, operator_id, created_at", { count: "exact" })
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);

      const evts = events || [];
      const dagCompletes = evts.filter((e) => e.event_type === "dag_complete");
      const avgLatency = dagCompletes.length
        ? Math.round(dagCompletes.reduce((s, e) => s + (e.latency_ms || 0), 0) / dagCompletes.length)
        : 0;
      const operators = new Set(evts.map((e) => e.operator_id));

      // Phase distribution
      const phaseCount: Record<number, number> = {};
      evts.forEach((e) => {
        if (e.dag_phase) phaseCount[e.dag_phase] = (phaseCount[e.dag_phase] || 0) + 1;
      });

      result.dag = {
        total_events: count || evts.length,
        dag_completions: dagCompletes.length,
        avg_latency_ms: avgLatency,
        active_operators: operators.size,
        phase_distribution: phaseCount,
        events_per_hour: Math.round((count || evts.length) / hours),
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
