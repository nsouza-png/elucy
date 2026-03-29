-- ============================================================
-- ELUCY V11.1 — Strategic Expansion SQL
-- 6 novas tabelas para Features 1-4 do documento estratégico
-- Executar no Supabase SQL Editor (projeto tnbbsjvzwleeoqnxtafp)
-- ============================================================

-- L23: Enterprise Qualification Runtime
CREATE TABLE IF NOT EXISTS deal_enterprise_runtime (
  deal_id TEXT PRIMARY KEY,
  operator_email TEXT NOT NULL,
  is_enterprise BOOLEAN DEFAULT false,
  evs NUMERIC(5,1) DEFAULT 0, -- Enterprise Value Score 0-100
  band TEXT DEFAULT 'standard', -- platinum/gold/silver/qualifying/standard
  rev_scale NUMERIC(4,1) DEFAULT 0,
  strategic_fit NUMERIC(4,1) DEFAULT 0,
  decision_complexity NUMERIC(4,1) DEFAULT 0,
  engagement_depth NUMERIC(4,1) DEFAULT 0,
  framework_coverage NUMERIC(4,1) DEFAULT 0,
  pipeline_momentum NUMERIC(4,1) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enterprise_runtime_email ON deal_enterprise_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_enterprise_runtime_band ON deal_enterprise_runtime(band);

-- L24: Trusted Advisor Runtime
CREATE TABLE IF NOT EXISTS deal_trusted_advisor_runtime (
  deal_id TEXT PRIMARY KEY,
  operator_email TEXT NOT NULL,
  score NUMERIC(5,3) DEFAULT 0, -- Combined score 0-1
  maister_score NUMERIC(5,3) DEFAULT 0, -- Maister equation 0-1
  objection_resistance NUMERIC(5,3) DEFAULT 0, -- Objection resistance 0-1
  credibility NUMERIC(5,3) DEFAULT 0,
  reliability NUMERIC(5,3) DEFAULT 0,
  intimacy NUMERIC(5,3) DEFAULT 0,
  self_orientation NUMERIC(5,3) DEFAULT 0,
  objections_total INT DEFAULT 0,
  objections_resolved INT DEFAULT 0,
  level TEXT DEFAULT 'commodity', -- trusted_advisor/expert/vendor/commodity
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ta_runtime_email ON deal_trusted_advisor_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_ta_runtime_level ON deal_trusted_advisor_runtime(level);

-- L25: Strategic Intelligence Runtime (per operator snapshot)
CREATE TABLE IF NOT EXISTS strategic_intelligence_runtime (
  operator_email TEXT PRIMARY KEY,
  channel_quality_json JSONB DEFAULT '{}',
  gtm_alignment_rate NUMERIC(5,1) DEFAULT 0,
  gtm_misaligned_count INT DEFAULT 0,
  line_velocity_json JSONB DEFAULT '{}',
  rfv_health_score NUMERIC(6,3) DEFAULT 0,
  rfv_champion_count INT DEFAULT 0,
  rfv_at_risk_count INT DEFAULT 0,
  enterprise_count INT DEFAULT 0,
  enterprise_value NUMERIC(12,2) DEFAULT 0,
  enterprise_avg_evs NUMERIC(5,1) DEFAULT 0,
  ta_trusted_advisor_count INT DEFAULT 0,
  ta_commodity_count INT DEFAULT 0,
  objection_resolution_rate NUMERIC(5,1) DEFAULT 0,
  objection_dominant_type TEXT DEFAULT 'unknown',
  snapshot_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- L26: SPIN Audit Runtime
CREATE TABLE IF NOT EXISTS deal_spin_audit_runtime (
  deal_id TEXT PRIMARY KEY,
  operator_email TEXT NOT NULL,
  spin_score NUMERIC(5,3) DEFAULT 0, -- SPIN balance score 0-1
  situation_ratio NUMERIC(5,3) DEFAULT 0,
  problem_ratio NUMERIC(5,3) DEFAULT 0,
  implication_ratio NUMERIC(5,3) DEFAULT 0,
  need_payoff_ratio NUMERIC(5,3) DEFAULT 0,
  premature_solution BOOLEAN DEFAULT false,
  dominant_component TEXT DEFAULT 'situation',
  advance_classification TEXT DEFAULT 'neutral', -- advance/continuation/neutral
  advance_signals INT DEFAULT 0,
  continuation_signals INT DEFAULT 0,
  objection_count INT DEFAULT 0,
  objection_types_json JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spin_audit_email ON deal_spin_audit_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_spin_audit_advance ON deal_spin_audit_runtime(advance_classification);

-- L27: RFV Per-Deal Runtime
CREATE TABLE IF NOT EXISTS deal_rfv_runtime (
  deal_id TEXT PRIMARY KEY,
  operator_email TEXT NOT NULL,
  rfv_cluster TEXT DEFAULT 'new_customer', -- champion/loyal/potential_loyal/at_risk/hibernating/new_customer
  r_score INT DEFAULT 0, -- Recency 1-3
  f_score INT DEFAULT 0, -- Frequency 1-3
  v_score INT DEFAULT 0, -- Value 1-3
  rfv_total INT DEFAULT 0, -- Sum 3-9
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rfv_runtime_email ON deal_rfv_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_rfv_runtime_cluster ON deal_rfv_runtime(rfv_cluster);

-- L27: RFV Portfolio Summary (per operator)
CREATE TABLE IF NOT EXISTS rfv_portfolio_runtime (
  operator_email TEXT PRIMARY KEY,
  total_deals INT DEFAULT 0,
  total_value NUMERIC(12,2) DEFAULT 0,
  health_score NUMERIC(6,3) DEFAULT 0,
  champion_count INT DEFAULT 0,
  champion_value NUMERIC(12,2) DEFAULT 0,
  loyal_count INT DEFAULT 0,
  at_risk_count INT DEFAULT 0,
  hibernating_count INT DEFAULT 0,
  snapshot_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE deal_enterprise_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_trusted_advisor_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_intelligence_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_spin_audit_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_rfv_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfv_portfolio_runtime ENABLE ROW LEVEL SECURITY;

-- RLS policies: operators can read/write their own data
CREATE POLICY "operators_own_data" ON deal_enterprise_runtime
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "operators_own_data" ON deal_trusted_advisor_runtime
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "operators_own_data" ON strategic_intelligence_runtime
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "operators_own_data" ON deal_spin_audit_runtime
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "operators_own_data" ON deal_rfv_runtime
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "operators_own_data" ON rfv_portfolio_runtime
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name LIKE '%runtime%'
-- ORDER BY table_name;
