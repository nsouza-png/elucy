-- =============================================================
-- ELUCY V6 — Qualitative Forecast Engine (Delta from V5)
-- Data: 2026-03-25
-- Nova tabela: forecast_events
-- ALTERs: meetings, meeting_runtime, note_analysis, forecast_runtime
-- =============================================================

-- -----------------------------------------------
-- 1. ALTERs meetings — V6 pede campos extras
-- -----------------------------------------------
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS meeting_id_crm TEXT;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS owner_name TEXT;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS happened_at TIMESTAMPTZ;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]';

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS notes_raw TEXT;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- -----------------------------------------------
-- 2. ALTERs meeting_runtime — V6 pede scores especificos
-- -----------------------------------------------
ALTER TABLE public.meeting_runtime
  ADD COLUMN IF NOT EXISTS show_state TEXT;

ALTER TABLE public.meeting_runtime
  ADD COLUMN IF NOT EXISTS authority_score_meeting NUMERIC(5,2);

ALTER TABLE public.meeting_runtime
  ADD COLUMN IF NOT EXISTS urgency_score_meeting NUMERIC(5,2);

ALTER TABLE public.meeting_runtime
  ADD COLUMN IF NOT EXISTS intent_score NUMERIC(5,2);

ALTER TABLE public.meeting_runtime
  ADD COLUMN IF NOT EXISTS objection_score NUMERIC(5,2);

ALTER TABLE public.meeting_runtime
  ADD COLUMN IF NOT EXISTS next_step_clarity NUMERIC(5,2);

ALTER TABLE public.meeting_runtime
  ADD COLUMN IF NOT EXISTS risk_flag TEXT;

ALTER TABLE public.meeting_runtime
  ADD COLUMN IF NOT EXISTS forecast_shift NUMERIC(6,4) DEFAULT 0;

-- -----------------------------------------------
-- 3. ALTERs note_analysis — V6 pede campos extras
-- -----------------------------------------------
ALTER TABLE public.note_analysis
  ADD COLUMN IF NOT EXISTS source_id TEXT;

ALTER TABLE public.note_analysis
  ADD COLUMN IF NOT EXISTS pain_detected BOOLEAN DEFAULT false;

ALTER TABLE public.note_analysis
  ADD COLUMN IF NOT EXISTS pain_type TEXT;

ALTER TABLE public.note_analysis
  ADD COLUMN IF NOT EXISTS urgency_level TEXT;

ALTER TABLE public.note_analysis
  ADD COLUMN IF NOT EXISTS authority_level TEXT;

ALTER TABLE public.note_analysis
  ADD COLUMN IF NOT EXISTS risk_flag TEXT;

ALTER TABLE public.note_analysis
  ADD COLUMN IF NOT EXISTS next_event TEXT;

ALTER TABLE public.note_analysis
  ADD COLUMN IF NOT EXISTS note_quality_score NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.note_analysis
  ADD COLUMN IF NOT EXISTS forecast_shift NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.note_analysis
  ADD COLUMN IF NOT EXISTS extracted_json JSONB DEFAULT '{}';

-- -----------------------------------------------
-- 4. ALTERs forecast_runtime — V6 pede pesos granulares
-- -----------------------------------------------
ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS forecast_version TEXT DEFAULT 'v6';

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS stage_probability_v6 NUMERIC(6,4);

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS qualitative_weight NUMERIC(6,4) DEFAULT 1.0;

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS show_weight NUMERIC(6,4) DEFAULT 1.0;

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS note_weight NUMERIC(6,4) DEFAULT 1.0;

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS authority_weight NUMERIC(6,4) DEFAULT 1.0;

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS urgency_weight NUMERIC(6,4) DEFAULT 1.0;

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS no_show_penalty NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS behavior_weight NUMERIC(6,4) DEFAULT 1.0;

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS next_step_weight NUMERIC(6,4) DEFAULT 1.0;

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS forecast_score_raw NUMERIC(6,4);

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS forecast_score_adjusted NUMERIC(6,4);

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS forecast_confidence NUMERIC(6,4);

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS forecast_value NUMERIC(14,2);

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS reason_main TEXT;

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS reason_secondary TEXT;

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS positive_signals JSONB DEFAULT '[]';

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS risk_signals JSONB DEFAULT '[]';

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS next_action TEXT;

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS next_action_reason TEXT;

ALTER TABLE public.forecast_runtime
  ADD COLUMN IF NOT EXISTS explain_json JSONB DEFAULT '{}';

-- -----------------------------------------------
-- 5. forecast_events — auditoria e explicabilidade
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.forecast_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source_entity TEXT,
  source_id TEXT,
  delta_forecast NUMERIC(6,4),
  reason TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fe_deal ON public.forecast_events(deal_id);
CREATE INDEX IF NOT EXISTS idx_fe_type ON public.forecast_events(event_type);
CREATE INDEX IF NOT EXISTS idx_fe_date ON public.forecast_events(created_at DESC);

ALTER TABLE public.forecast_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fe_public_access" ON public.forecast_events;
CREATE POLICY "fe_public_access" ON public.forecast_events FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- 6. Forecast Repair Queue — task type nova
-- -----------------------------------------------
INSERT INTO public.task_queues (queue_slug, queue_label, description, priority_order, focus_modes, task_types)
VALUES ('forecast_repair', 'Forecast Repair', 'Deals com forecast inflado ou baixa confianca qualitativa', 7, '{qualificacao,imersao}', '{forecast_repair}')
ON CONFLICT (queue_slug) DO NOTHING;
