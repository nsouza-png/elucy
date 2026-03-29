-- =============================================================
-- ELUCY V7 — Qualitative Forecast Engine (Delta from V6)
-- Data: 2026-03-25
-- Novas tabelas: framework_extractions, deal_framework_runtime, framework_extraction_events
-- ALTERs: forecast_runtime (V7 columns)
-- =============================================================

-- -----------------------------------------------
-- 1. framework_extractions — cada extração individual
-- Cada note/meeting/DM gera um registro de extração
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.framework_extractions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id TEXT NOT NULL,
  operator_email TEXT,
  source_type TEXT NOT NULL,  -- 'note', 'meeting', 'whatsapp', 'dm', 'call', 'interaction'
  source_id TEXT,
  framework_version TEXT NOT NULL DEFAULT 'v7.1',

  -- SPICED scores (0-1)
  spiced_json JSONB DEFAULT '{}'::JSONB,
  -- MEDDIC scores (0-1)
  meddic_json JSONB DEFAULT '{}'::JSONB,
  -- Auxiliary signals
  auxiliary_json JSONB DEFAULT '{}'::JSONB,
  -- Coverage metrics
  coverage_json JSONB DEFAULT '{}'::JSONB,

  confidence_score NUMERIC(6,4),
  main_gaps JSONB DEFAULT '[]'::JSONB,
  next_best_questions JSONB DEFAULT '[]'::JSONB,
  raw_evidence JSONB DEFAULT '[]'::JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fe7_deal ON public.framework_extractions(deal_id);
CREATE INDEX IF NOT EXISTS idx_fe7_operator ON public.framework_extractions(operator_email);
CREATE INDEX IF NOT EXISTS idx_fe7_source ON public.framework_extractions(source_type);
CREATE INDEX IF NOT EXISTS idx_fe7_created ON public.framework_extractions(created_at DESC);

ALTER TABLE public.framework_extractions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fe7_public_access" ON public.framework_extractions;
CREATE POLICY "fe7_public_access" ON public.framework_extractions FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- 2. deal_framework_runtime — snapshot consolidado por deal
-- Um registro por deal, atualizado a cada re-cálculo
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.deal_framework_runtime (
  deal_id TEXT PRIMARY KEY,
  operator_email TEXT,

  -- SPICED scores consolidados (média de todas as extrações)
  spiced_situation NUMERIC(6,4) DEFAULT 0,
  spiced_pain NUMERIC(6,4) DEFAULT 0,
  spiced_impact NUMERIC(6,4) DEFAULT 0,
  spiced_critical_event NUMERIC(6,4) DEFAULT 0,
  spiced_decision NUMERIC(6,4) DEFAULT 0,
  spiced_avg NUMERIC(6,4) DEFAULT 0,

  -- MEDDIC scores consolidados
  meddic_metrics NUMERIC(6,4) DEFAULT 0,
  meddic_economic NUMERIC(6,4) DEFAULT 0,
  meddic_criteria NUMERIC(6,4) DEFAULT 0,
  meddic_process NUMERIC(6,4) DEFAULT 0,
  meddic_pain NUMERIC(6,4) DEFAULT 0,
  meddic_champion NUMERIC(6,4) DEFAULT 0,
  meddic_avg NUMERIC(6,4) DEFAULT 0,

  -- Auxiliary scores consolidados
  authority_score NUMERIC(6,4) DEFAULT 0,
  urgency_score NUMERIC(6,4) DEFAULT 0,
  intent_score NUMERIC(6,4) DEFAULT 0,
  next_step_clarity NUMERIC(6,4) DEFAULT 0,
  objection_score NUMERIC(6,4) DEFAULT 0,
  note_quality_score NUMERIC(6,4) DEFAULT 0,
  meeting_quality_score NUMERIC(6,4) DEFAULT 0,

  -- Coverage
  spiced_coverage NUMERIC(6,4) DEFAULT 0,
  meddic_coverage NUMERIC(6,4) DEFAULT 0,
  overall_coverage NUMERIC(6,4) DEFAULT 0,

  -- Confidence da consolidação
  confidence_score NUMERIC(6,4) DEFAULT 0,

  -- Qualitative score final (vai pro forecast)
  qualitative_score NUMERIC(6,4) DEFAULT 1.0,

  -- Gaps e recomendações
  main_gap_1 TEXT,
  main_gap_2 TEXT,
  main_gap_3 TEXT,
  recommended_questions JSONB DEFAULT '[]'::JSONB,
  explain_json JSONB DEFAULT '{}'::JSONB,

  -- Metadata
  extraction_count INTEGER DEFAULT 0,
  last_source_type TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dfr_operator ON public.deal_framework_runtime(operator_email);

ALTER TABLE public.deal_framework_runtime ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dfr_public_access" ON public.deal_framework_runtime;
CREATE POLICY "dfr_public_access" ON public.deal_framework_runtime FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- 3. framework_extraction_events — audit trail
-- Append-only, cada extração gera um evento
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.framework_extraction_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id TEXT NOT NULL,
  source_type TEXT,
  source_id TEXT,
  event_type TEXT NOT NULL,  -- 'extraction', 'consolidation', 'gap_detected', 'coverage_change'
  delta_coverage NUMERIC(6,4),
  delta_confidence NUMERIC(6,4),
  payload JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_deal ON public.framework_extraction_events(deal_id);
CREATE INDEX IF NOT EXISTS idx_fee_type ON public.framework_extraction_events(event_type);
CREATE INDEX IF NOT EXISTS idx_fee_date ON public.framework_extraction_events(created_at DESC);

ALTER TABLE public.framework_extraction_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fee_public_access" ON public.framework_extraction_events;
CREATE POLICY "fee_public_access" ON public.framework_extraction_events FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- 4. ALTERs forecast_runtime — V7 columns
-- -----------------------------------------------
ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS qualitative_score_v7 NUMERIC(6,4) DEFAULT 1.0;

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS spiced_avg NUMERIC(6,4);

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS meddic_avg NUMERIC(6,4);

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS framework_coverage NUMERIC(6,4);

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS framework_confidence NUMERIC(6,4);

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS forecast_value_crm NUMERIC(14,2);

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS forecast_value_v7 NUMERIC(14,2);

-- -----------------------------------------------
-- 5. Framework gap task queue
-- -----------------------------------------------
INSERT INTO public.task_queues (queue_slug, queue_label, description, priority_order, focus_modes, task_types)
VALUES ('framework_gap', 'Framework Gaps', 'Deals com gaps criticos em SPICED/MEDDIC — cobrir antes de forecast', 6, '{qualificacao,alta_performance}', '{framework_gap_fill,authority_confirmation,pain_quantification}')
ON CONFLICT (queue_slug) DO NOTHING;
