-- ============================================================
-- ELUCY V11 — Enterprise Layer SQL
-- Tables: deal_enterprise_runtime, strategic_snapshots
-- Columns: deal_runtime (3), operator_efficiency (3)
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. deal_enterprise_runtime (L23)
CREATE TABLE IF NOT EXISTS deal_enterprise_runtime (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id text NOT NULL,
  operator_email text NOT NULL,
  enterprise_value_score integer DEFAULT 0,
  is_5m_plus boolean DEFAULT false,
  band text DEFAULT 'standard',
  priority_boost integer DEFAULT 0,
  company_revenue_score integer DEFAULT 0,
  founder_seniority_score integer DEFAULT 0,
  decision_complexity_score integer DEFAULT 0,
  expansion_potential_score integer DEFAULT 0,
  icp_fit_score integer DEFAULT 0,
  urgency_score integer DEFAULT 0,
  computed_at timestamptz DEFAULT now(),
  UNIQUE(deal_id, operator_email)
);

CREATE INDEX IF NOT EXISTS idx_ent_runtime_deal ON deal_enterprise_runtime(deal_id);
CREATE INDEX IF NOT EXISTS idx_ent_runtime_operator ON deal_enterprise_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_ent_runtime_5m ON deal_enterprise_runtime(is_5m_plus) WHERE is_5m_plus = true;

-- 2. strategic_snapshots (L25)
CREATE TABLE IF NOT EXISTS strategic_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date date NOT NULL,
  operator_email text NOT NULL,
  sal_5m_count integer DEFAULT 0,
  pipeline_5m_value numeric DEFAULT 0,
  avg_enterprise_score integer DEFAULT 0,
  total_deals integer DEFAULT 0,
  titan_count integer DEFAULT 0,
  builder_count integer DEFAULT 0,
  executor_count integer DEFAULT 0,
  framework_coverage_pct integer DEFAULT 0,
  iron_dome_count integer DEFAULT 0,
  handoff_ready_count integer DEFAULT 0,
  trusted_advisor_score numeric(4,2),
  credibility_score numeric(4,2),
  availability_score numeric(4,2),
  intimacy_score numeric(4,2),
  selfishness_score numeric(4,2),
  advisor_band text,
  computed_at timestamptz DEFAULT now(),
  UNIQUE(snapshot_date, operator_email)
);

CREATE INDEX IF NOT EXISTS idx_strat_snap_date ON strategic_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_strat_snap_operator ON strategic_snapshots(operator_email);

-- 3. ALTER deal_runtime — add enterprise columns
ALTER TABLE deal_runtime
  ADD COLUMN IF NOT EXISTS enterprise_value_score integer,
  ADD COLUMN IF NOT EXISTS is_5m_plus boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS enterprise_band text;

-- 4. ALTER operator_efficiency — add trusted advisor columns
ALTER TABLE operator_efficiency
  ADD COLUMN IF NOT EXISTS trusted_advisor_score numeric(4,2),
  ADD COLUMN IF NOT EXISTS advisor_band text,
  ADD COLUMN IF NOT EXISTS advisor_json jsonb;

-- 5. RLS — enable for new tables
ALTER TABLE deal_enterprise_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can read own enterprise data" ON deal_enterprise_runtime
  FOR SELECT USING (operator_email = current_setting('request.jwt.claims')::json->>'email');

CREATE POLICY "Operators can upsert own enterprise data" ON deal_enterprise_runtime
  FOR ALL USING (operator_email = current_setting('request.jwt.claims')::json->>'email');

CREATE POLICY "Operators can read own snapshots" ON strategic_snapshots
  FOR SELECT USING (operator_email = current_setting('request.jwt.claims')::json->>'email');

CREATE POLICY "Operators can upsert own snapshots" ON strategic_snapshots
  FOR ALL USING (operator_email = current_setting('request.jwt.claims')::json->>'email');

-- Done. V11 Enterprise Layer ready.
