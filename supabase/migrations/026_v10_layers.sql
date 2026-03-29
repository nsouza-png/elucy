-- ============================================================
-- ELUCY V10 — Layers 19-22 (Data Quality, Transition, Portfolio, Attribution)
-- Run against Supabase project tnbbsjvzwleeoqnxtafp
-- ============================================================

-- L19 — Data Quality Runtime
CREATE TABLE IF NOT EXISTS deal_data_quality_runtime (
  deal_id TEXT PRIMARY KEY,
  operator_email TEXT,
  completeness_score NUMERIC(6,4) DEFAULT 0,
  consistency_score NUMERIC(6,4) DEFAULT 0,
  recency_score NUMERIC(6,4) DEFAULT 0,
  evidence_score NUMERIC(6,4) DEFAULT 0,
  data_trust_score NUMERIC(6,4) DEFAULT 0,
  data_quality_band TEXT DEFAULT 'critical',
  explain_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dqr_operator ON deal_data_quality_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_dqr_band ON deal_data_quality_runtime(data_quality_band);

-- L20 — Transition Rules Runtime
CREATE TABLE IF NOT EXISTS deal_transition_runtime (
  deal_id TEXT PRIMARY KEY,
  operator_email TEXT,
  current_pipeline_stage TEXT,
  target_pipeline_stage TEXT,
  transition_readiness_score NUMERIC(6,4) DEFAULT 0,
  transition_valid BOOLEAN DEFAULT false,
  transition_block_reason TEXT,
  transition_gap_count INT DEFAULT 0,
  gaps_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dtr_operator ON deal_transition_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_dtr_valid ON deal_transition_runtime(transition_valid);

-- L21 — Portfolio Prioritization Runtime
CREATE TABLE IF NOT EXISTS deal_portfolio_runtime (
  deal_id TEXT PRIMARY KEY,
  operator_email TEXT,
  value_leverage_score NUMERIC(6,4) DEFAULT 0,
  urgency_score NUMERIC(6,4) DEFAULT 0,
  actionability_score NUMERIC(6,4) DEFAULT 0,
  neglect_score NUMERIC(6,4) DEFAULT 0,
  portfolio_priority_score NUMERIC(6,4) DEFAULT 0,
  portfolio_rank INT DEFAULT 0,
  priority_band TEXT DEFAULT 'p4',
  recommended_queue TEXT DEFAULT 'default',
  explain_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dpr_operator ON deal_portfolio_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_dpr_band ON deal_portfolio_runtime(priority_band);
CREATE INDEX IF NOT EXISTS idx_dpr_rank ON deal_portfolio_runtime(portfolio_rank);

-- L22 — Attribution Events (append-only log)
CREATE TABLE IF NOT EXISTS deal_attribution_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  deal_id TEXT NOT NULL,
  outcome_type TEXT,
  outcome_at TIMESTAMPTZ,
  activity_type TEXT,
  activity_at TIMESTAMPTZ,
  proximity_weight NUMERIC(6,4),
  activity_base_weight NUMERIC(6,4),
  outcome_weight NUMERIC(6,4),
  attribution_contribution NUMERIC(8,6),
  normalized_attribution NUMERIC(8,6),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dae_deal ON deal_attribution_events(deal_id);
CREATE INDEX IF NOT EXISTS idx_dae_outcome ON deal_attribution_events(outcome_type);

-- L22 — Attribution Runtime (per-deal summary)
CREATE TABLE IF NOT EXISTS deal_attribution_runtime (
  deal_id TEXT PRIMARY KEY,
  operator_email TEXT,
  top_attribution_driver TEXT,
  advancement_attribution_score NUMERIC(6,4) DEFAULT 0,
  attribution_diversity_score NUMERIC(6,4) DEFAULT 0,
  channel_attribution_json JSONB,
  task_attribution_json JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dar_operator ON deal_attribution_runtime(operator_email);

-- Enable RLS on all new tables
ALTER TABLE deal_data_quality_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_transition_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_portfolio_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_attribution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_attribution_runtime ENABLE ROW LEVEL SECURITY;

-- RLS policies (service_role bypass, anon read by operator)
CREATE POLICY "service_role_dqr" ON deal_data_quality_runtime FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_dtr" ON deal_transition_runtime FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_dpr" ON deal_portfolio_runtime FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_dae" ON deal_attribution_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_dar" ON deal_attribution_runtime FOR ALL USING (true) WITH CHECK (true);
