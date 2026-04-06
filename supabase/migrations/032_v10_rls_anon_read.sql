-- ============================================================
-- Fix: Add RLS read policies for anon/authenticated on V10 tables
-- The original 026_v10_layers.sql only created service_role policies.
-- Cockpit frontend uses anon key → needs explicit SELECT policies.
-- ============================================================

-- L19 — deal_data_quality_runtime
CREATE POLICY "anon_read_dqr" ON deal_data_quality_runtime
  FOR SELECT TO anon, authenticated USING (true);

-- L20 — deal_transition_runtime
CREATE POLICY "anon_read_dtr" ON deal_transition_runtime
  FOR SELECT TO anon, authenticated USING (true);

-- L21 — deal_portfolio_runtime
CREATE POLICY "anon_read_dpr" ON deal_portfolio_runtime
  FOR SELECT TO anon, authenticated USING (true);

-- L22 — deal_attribution_events
CREATE POLICY "anon_read_dae" ON deal_attribution_events
  FOR SELECT TO anon, authenticated USING (true);

-- L22 — deal_attribution_runtime
CREATE POLICY "anon_read_dar" ON deal_attribution_runtime
  FOR SELECT TO anon, authenticated USING (true);
