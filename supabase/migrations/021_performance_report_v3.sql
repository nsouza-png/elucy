-- Performance Report V3 — Schema SQL
-- 4 tabelas: reports, line_performance, quality_metrics, forecast_metrics

-- 1. Tabela principal de snapshot
CREATE TABLE IF NOT EXISTS public.operator_performance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_email TEXT NOT NULL,
  qualificador_name TEXT,
  period_type TEXT NOT NULL,
  period_key TEXT NOT NULL,

  meta_json JSONB DEFAULT '{}'::jsonb,
  volume_json JSONB DEFAULT '{}'::jsonb,
  conversion_json JSONB DEFAULT '{}'::jsonb,
  line_efficiency_json JSONB DEFAULT '{}'::jsonb,
  speed_json JSONB DEFAULT '{}'::jsonb,
  quality_json JSONB DEFAULT '{}'::jsonb,
  forecast_json JSONB DEFAULT '{}'::jsonb,
  revenue_json JSONB DEFAULT '{}'::jsonb,

  volume_score NUMERIC(6,4),
  conversion_score NUMERIC(6,4),
  speed_score NUMERIC(6,4),
  quality_score NUMERIC(6,4),
  forecast_score NUMERIC(6,4),
  revenue_score NUMERIC(6,4),
  final_score NUMERIC(6,4),

  report_version TEXT NOT NULL DEFAULT 'v3',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_operator_performance_reports
ON public.operator_performance_reports(operator_email, period_type, period_key);

ALTER TABLE public.operator_performance_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'operator_performance_reports' AND policyname = 'perf_reports_anon_all') THEN
    CREATE POLICY "perf_reports_anon_all" ON public.operator_performance_reports FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Tabela por linha de receita
CREATE TABLE IF NOT EXISTS public.operator_line_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_email TEXT NOT NULL,
  qualificador_name TEXT,
  revenue_line TEXT NOT NULL,
  period_type TEXT NOT NULL,
  period_key TEXT NOT NULL,

  leads_count INT DEFAULT 0,
  sal_count INT DEFAULT 0,
  connected_count INT DEFAULT 0,
  scheduled_count INT DEFAULT 0,
  show_count INT DEFAULT 0,
  opp_count INT DEFAULT 0,
  won_count INT DEFAULT 0,
  lost_count INT DEFAULT 0,

  avg_ticket NUMERIC(14,2),
  pipeline_value NUMERIC(14,2),
  won_value NUMERIC(14,2),

  cr_mql_sal NUMERIC(6,4),
  cr_sal_connected NUMERIC(6,4),
  cr_connected_scheduled NUMERIC(6,4),
  cr_scheduled_show NUMERIC(6,4),
  cr_show_opp NUMERIC(6,4),
  cr_opp_won NUMERIC(6,4),

  avg_aging_days NUMERIC(8,2),
  sla_risk_rate NUMERIC(6,4),
  forecast_confidence_avg NUMERIC(6,4),

  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_line_perf_operator
ON public.operator_line_performance(operator_email, period_key);

CREATE INDEX IF NOT EXISTS idx_operator_line_perf_line
ON public.operator_line_performance(revenue_line, period_key);

ALTER TABLE public.operator_line_performance ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'operator_line_performance' AND policyname = 'line_perf_anon_all') THEN
    CREATE POLICY "line_perf_anon_all" ON public.operator_line_performance FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Tabela de qualidade operacional
CREATE TABLE IF NOT EXISTS public.operator_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_email TEXT NOT NULL,
  period_type TEXT NOT NULL,
  period_key TEXT NOT NULL,

  deals_with_good_notes INT DEFAULT 0,
  deals_with_next_step INT DEFAULT 0,
  deals_with_authority INT DEFAULT 0,
  deals_with_clear_pain INT DEFAULT 0,
  deals_with_meeting_logged INT DEFAULT 0,
  deals_with_no_show_treated INT DEFAULT 0,
  deals_with_qng_complete INT DEFAULT 0,

  notes_quality_rate NUMERIC(6,4),
  next_step_rate NUMERIC(6,4),
  authority_rate NUMERIC(6,4),
  pain_rate NUMERIC(6,4),
  meeting_logging_rate NUMERIC(6,4),
  no_show_treatment_rate NUMERIC(6,4),
  qng_completion_rate NUMERIC(6,4),

  dqi_score NUMERIC(6,4),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_operator_quality_metrics
ON public.operator_quality_metrics(operator_email, period_type, period_key);

ALTER TABLE public.operator_quality_metrics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'operator_quality_metrics' AND policyname = 'quality_metrics_anon_all') THEN
    CREATE POLICY "quality_metrics_anon_all" ON public.operator_quality_metrics FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Tabela de forecast performance
CREATE TABLE IF NOT EXISTS public.operator_forecast_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_email TEXT NOT NULL,
  period_type TEXT NOT NULL,
  period_key TEXT NOT NULL,

  deals_with_forecast INT DEFAULT 0,
  forecast_value_total NUMERIC(14,2),
  adjusted_forecast_value_total NUMERIC(14,2),
  won_value_total NUMERIC(14,2),

  forecast_confidence_avg NUMERIC(6,4),
  forecast_error_rate NUMERIC(6,4),
  inflated_pipeline_rate NUMERIC(6,4),
  low_context_rate NUMERIC(6,4),
  no_note_rate NUMERIC(6,4),
  no_next_step_rate NUMERIC(6,4),

  forecast_quality_score NUMERIC(6,4),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_operator_forecast_metrics
ON public.operator_forecast_metrics(operator_email, period_type, period_key);

ALTER TABLE public.operator_forecast_metrics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'operator_forecast_metrics' AND policyname = 'forecast_metrics_anon_all') THEN
    CREATE POLICY "forecast_metrics_anon_all" ON public.operator_forecast_metrics FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
