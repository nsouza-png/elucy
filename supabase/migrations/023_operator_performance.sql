-- ==================================================================
-- ELUCY OPERATOR PERFORMANCE MODEL — SQL Delta
-- ALTERs em operator_efficiency para suportar 6 blocos + score final
-- Executar no Supabase SQL Editor
-- ==================================================================

-- -----------------------------------------------
-- 1. Colunas dos 6 blocos de score
-- -----------------------------------------------

-- Bloco 1: Volume Operacional
ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS volume_score NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS deals_trabalhados INT DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS dms_count INT DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS notes_count INT DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS meetings_booked INT DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS meetings_realized INT DEFAULT 0;

-- Bloco 2: Conversao
ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS conversion_score NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS cr_sal_conectado NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS cr_conectado_agendamento NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS cr_agendamento_show NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS cr_show_opp NUMERIC(5,2) DEFAULT 0;

-- Bloco 3: Velocidade / Disciplina
ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS speed_score NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS discipline_score NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS time_to_first_contact_avg NUMERIC(8,1) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS touch_delay_avg NUMERIC(8,1) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS aging_avg NUMERIC(8,1) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS sla_risk_rate NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS inactive_rate NUMERIC(6,4) DEFAULT 0;

-- Bloco 4: Qualidade Operacional (DQI)
ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS dqi NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS notes_quality_pct NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS next_step_pct NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS authority_identified_pct NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS pain_clarity_pct NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS meeting_logging_pct NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS no_show_treatment_pct NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS handoff_quality_pct NUMERIC(5,2) DEFAULT 0;

-- Bloco 5: Forecast Quality
ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS forecast_quality_score NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS forecast_confidence_avg NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS inflated_pipeline_rate NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS no_context_rate NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS forecast_error_rate NUMERIC(6,4) DEFAULT 0;

-- Bloco 6: Impacto em Receita
ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS revenue_score NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS revenue_influenced NUMERIC(14,2) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS revenue_per_deal NUMERIC(14,2) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS revenue_per_handoff NUMERIC(14,2) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS avg_ticket NUMERIC(14,2) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS forecast_value_total NUMERIC(14,2) DEFAULT 0;

-- Score Final (7 componentes ponderados)
ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS final_score NUMERIC(6,4) DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS performance_band TEXT DEFAULT 'estavel';

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS alerts JSONB DEFAULT '[]';

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS benchmark_json JSONB DEFAULT '{}';

-- -----------------------------------------------
-- 2. Indice para performance band
-- -----------------------------------------------
CREATE INDEX IF NOT EXISTS idx_eff_band
  ON public.operator_efficiency(performance_band);

CREATE INDEX IF NOT EXISTS idx_eff_final_score
  ON public.operator_efficiency(final_score DESC);
