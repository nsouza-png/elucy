-- ================================================================
-- ELUCY Strategic Intelligence Expansion — SQL Schema
-- 5 novas tabelas runtime: L23-L27
-- Executar no Supabase SQL Editor (https://supabase.com/dashboard)
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- L23 — REVENUE QUALITY ENGINE
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_revenue_quality_runtime (
  deal_id text PRIMARY KEY,
  operator_email text,
  icp_fit_score numeric(6,4),
  enterprise_value_score numeric(6,4),
  decision_maturity_score numeric(6,4),
  revenue_quality_score numeric(6,4),
  revenue_quality_band text,
  explain_json jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drqr_operator ON public.deal_revenue_quality_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_drqr_band ON public.deal_revenue_quality_runtime(revenue_quality_band);

ALTER TABLE public.deal_revenue_quality_runtime ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drqr_anon_all" ON public.deal_revenue_quality_runtime FOR ALL TO anon USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────
-- L24 — TRUSTED ADVISOR ENGINE (per-deal)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_trust_runtime (
  deal_id text PRIMARY KEY,
  operator_email text,
  credibility_score numeric(6,4),
  availability_score numeric(6,4),
  intimacy_score numeric(6,4),
  selfishness_score numeric(6,4),
  trust_score numeric(6,4),
  trusted_advisor_band text,
  explain_json jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dtr_operator ON public.deal_trust_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_dtr_band ON public.deal_trust_runtime(trusted_advisor_band);

ALTER TABLE public.deal_trust_runtime ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dtr_anon_all" ON public.deal_trust_runtime FOR ALL TO anon USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────
-- L25 — STRATEGIC ALIGNMENT ENGINE
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.strategic_alignment_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL,
  period_key text NOT NULL,
  operator_email text,
  squad text,
  sal_5m_rate numeric(6,4),
  pipeline_5m_value numeric(14,2),
  marketing_sal_revenue numeric(14,2),
  experience_score numeric(6,4),
  strategic_revenue_score numeric(6,4),
  explain_json jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sas_period ON public.strategic_alignment_snapshots(period_type, period_key);
CREATE INDEX IF NOT EXISTS idx_sas_operator ON public.strategic_alignment_snapshots(operator_email);

ALTER TABLE public.strategic_alignment_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sas_anon_all" ON public.strategic_alignment_snapshots FOR ALL TO anon USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────
-- L26 — BEHAVIORAL INTELLIGENCE ENGINE
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.operator_behavior_runtime (
  operator_email text PRIMARY KEY,
  curiosity_score numeric(6,4),
  depth_of_qualification_score numeric(6,4),
  trust_building_score numeric(6,4),
  execution_consistency_score numeric(6,4),
  sdr_behavior_score numeric(6,4),
  explain_json jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.operator_behavior_runtime ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obr_anon_all" ON public.operator_behavior_runtime FOR ALL TO anon USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────
-- L27 — EXPANSION & LIFETIME VALUE ENGINE
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_expansion_runtime (
  deal_id text PRIMARY KEY,
  account_id text,
  operator_email text,
  purchase_history_score numeric(6,4),
  line_adjacency_score numeric(6,4),
  account_value_score numeric(6,4),
  expansion_potential_score numeric(6,4),
  repurchase_band text,
  explain_json jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_der_operator ON public.deal_expansion_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_der_account ON public.deal_expansion_runtime(account_id);
CREATE INDEX IF NOT EXISTS idx_der_band ON public.deal_expansion_runtime(repurchase_band);

ALTER TABLE public.deal_expansion_runtime ENABLE ROW LEVEL SECURITY;
CREATE POLICY "der_anon_all" ON public.deal_expansion_runtime FOR ALL TO anon USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────
-- Enable Realtime for all new tables
-- ────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_revenue_quality_runtime;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_trust_runtime;
ALTER PUBLICATION supabase_realtime ADD TABLE public.strategic_alignment_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.operator_behavior_runtime;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_expansion_runtime;

-- ════════════════════════════════════════════════════════════════
-- DONE — 5 tables created, indexed, RLS enabled, Realtime enabled
-- ════════════════════════════════════════════════════════════════
