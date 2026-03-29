-- =============================================================
-- ELUCY V5 — FASE 2: Analytics Layer
-- Data: 2026-03-25
-- Tabelas: analytics_snapshots (NOVA) + ALTER operator_efficiency
-- =============================================================

-- -----------------------------------------------
-- 1. analytics_snapshots — snapshot diario/semanal de metricas agregadas
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Dimensoes
  snapshot_date DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'daily',  -- daily | weekly | monthly
  operator_email TEXT,                         -- NULL = global (all operators)
  revenue_line TEXT,                            -- NULL = all lines
  stage TEXT,                                   -- NULL = all stages
  channel TEXT,                                 -- NULL = all channels

  -- Contagens de pipeline
  total_deals INT DEFAULT 0,
  new_deals INT DEFAULT 0,
  moved_deals INT DEFAULT 0,
  won_deals INT DEFAULT 0,
  lost_deals INT DEFAULT 0,

  -- Risk distribution
  risk_critical INT DEFAULT 0,
  risk_high INT DEFAULT 0,
  risk_medium INT DEFAULT 0,
  risk_none INT DEFAULT 0,

  -- Signal distribution
  signal_dome INT DEFAULT 0,
  signal_hot INT DEFAULT 0,
  signal_warm INT DEFAULT 0,
  signal_neutral INT DEFAULT 0,

  -- Velocity
  avg_aging_days NUMERIC(6,1) DEFAULT 0,
  avg_delta_stage NUMERIC(6,1) DEFAULT 0,       -- dias medio entre stages
  p50_aging_days NUMERIC(6,1) DEFAULT 0,
  p90_aging_days NUMERIC(6,1) DEFAULT 0,

  -- Scores agregados
  avg_temperature NUMERIC(5,1) DEFAULT 0,
  avg_urgency NUMERIC(5,1) DEFAULT 0,
  avg_value_score NUMERIC(10,2) DEFAULT 0,
  avg_priority NUMERIC(5,1) DEFAULT 0,

  -- Conversao
  cr_mql_sal NUMERIC(5,2) DEFAULT 0,
  cr_sal_connected NUMERIC(5,2) DEFAULT 0,
  cr_connected_scheduled NUMERIC(5,2) DEFAULT 0,
  cr_scheduled_opp NUMERIC(5,2) DEFAULT 0,
  cr_opp_won NUMERIC(5,2) DEFAULT 0,

  -- Revenue
  pipeline_value NUMERIC(14,2) DEFAULT 0,
  won_value NUMERIC(14,2) DEFAULT 0,
  lost_value NUMERIC(14,2) DEFAULT 0,

  -- Activity (do period)
  fups_count INT DEFAULT 0,
  calls_count INT DEFAULT 0,
  copies_generated INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,

  -- Payload flexivel para metricas extras
  metrics_payload JSONB DEFAULT '{}',

  -- Meta
  formula_version TEXT DEFAULT 'v5.0',
  source TEXT DEFAULT 'analytics_engine',       -- analytics_engine | manual | cockpit_worker
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para queries rapidas por dimensao
CREATE INDEX IF NOT EXISTS idx_snap_date ON public.analytics_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_snap_period ON public.analytics_snapshots(period_type, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_snap_operator ON public.analytics_snapshots(operator_email, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_snap_line ON public.analytics_snapshots(revenue_line, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_snap_composite ON public.analytics_snapshots(period_type, operator_email, snapshot_date DESC);

-- Unique constraint para evitar duplicatas
ALTER TABLE public.analytics_snapshots
  ADD CONSTRAINT uq_snapshot_dims
  UNIQUE (snapshot_date, period_type, operator_email, revenue_line, stage, channel);

-- RLS aberto para MVP
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "snap_read_all" ON public.analytics_snapshots;
CREATE POLICY "snap_read_all" ON public.analytics_snapshots FOR SELECT USING (true);
DROP POLICY IF EXISTS "snap_write_all" ON public.analytics_snapshots;
CREATE POLICY "snap_write_all" ON public.analytics_snapshots FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_snapshots;

-- -----------------------------------------------
-- 2. ALTER operator_efficiency — adicionar colunas V5
-- -----------------------------------------------

-- period_type: permite granularidade alem de mes (daily, weekly, monthly)
ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'monthly';

-- period_key: chave flexivel do periodo (2026-03-25 para daily, 2026-W13 para weekly, 2026-03 para monthly)
ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS period_key TEXT;

-- metrics_json: metricas brutas completas em JSON (flexivel para novas metricas sem ALTER)
ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS metrics_json JSONB DEFAULT '{}';

-- scores_json: scores computados em JSON (dqi, velocity, activity, quality, operator_score)
ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS scores_json JSONB DEFAULT '{}';

-- formula_version: versao da formula usada para calcular scores
ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS formula_version TEXT DEFAULT 'v3.1';

-- Campos extras de atividade
ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS handoffs_count INT DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS tasks_completed INT DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS social_dm_sent INT DEFAULT 0;

ALTER TABLE public.operator_efficiency
  ADD COLUMN IF NOT EXISTS avg_response_time_min NUMERIC(8,1) DEFAULT 0;

-- Indice para period_type + period_key
CREATE INDEX IF NOT EXISTS idx_eff_period
  ON public.operator_efficiency(period_type, period_key);

CREATE INDEX IF NOT EXISTS idx_eff_composite
  ON public.operator_efficiency(operator_email, period_type, period_key);

-- -----------------------------------------------
-- 3. Funcao helper: gerar snapshot do dia atual a partir de deal_runtime
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_daily_snapshot(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_rec RECORD;
BEGIN
  -- Snapshot GLOBAL (operator_email = NULL, revenue_line = NULL)
  INSERT INTO public.analytics_snapshots (
    snapshot_date, period_type, operator_email, revenue_line, stage, channel,
    total_deals, risk_critical, risk_high, risk_medium, risk_none,
    signal_dome, signal_hot, signal_warm, signal_neutral,
    avg_aging_days, avg_temperature, avg_urgency, avg_value_score, avg_priority,
    pipeline_value, formula_version
  )
  SELECT
    p_date, 'daily', NULL, NULL, NULL, NULL,
    COUNT(*),
    COUNT(*) FILTER (WHERE risk_state = 'critical'),
    COUNT(*) FILTER (WHERE risk_state = 'high'),
    COUNT(*) FILTER (WHERE risk_state = 'medium'),
    COUNT(*) FILTER (WHERE risk_state = 'none'),
    COUNT(*) FILTER (WHERE signal_state = 'DOME'),
    COUNT(*) FILTER (WHERE signal_state = 'HOT'),
    COUNT(*) FILTER (WHERE signal_state = 'WARM'),
    COUNT(*) FILTER (WHERE signal_state = 'NEUTRAL'),
    COALESCE(AVG(aging_days), 0),
    COALESCE(AVG(temperature_score), 0),
    COALESCE(AVG(urgency_score), 0),
    COALESCE(AVG(value_score), 0),
    COALESCE(AVG(priority_score), 0),
    COALESCE(SUM(value_score), 0),
    'v5.0'
  FROM public.deal_runtime
  ON CONFLICT ON CONSTRAINT uq_snapshot_dims DO UPDATE SET
    total_deals = EXCLUDED.total_deals,
    risk_critical = EXCLUDED.risk_critical,
    risk_high = EXCLUDED.risk_high,
    risk_medium = EXCLUDED.risk_medium,
    risk_none = EXCLUDED.risk_none,
    signal_dome = EXCLUDED.signal_dome,
    signal_hot = EXCLUDED.signal_hot,
    signal_warm = EXCLUDED.signal_warm,
    signal_neutral = EXCLUDED.signal_neutral,
    avg_aging_days = EXCLUDED.avg_aging_days,
    avg_temperature = EXCLUDED.avg_temperature,
    avg_urgency = EXCLUDED.avg_urgency,
    avg_value_score = EXCLUDED.avg_value_score,
    avg_priority = EXCLUDED.avg_priority,
    pipeline_value = EXCLUDED.pipeline_value;

  v_count := v_count + 1;

  -- Snapshot POR OPERADOR
  FOR v_rec IN
    SELECT DISTINCT operator_email FROM public.deal_runtime
  LOOP
    INSERT INTO public.analytics_snapshots (
      snapshot_date, period_type, operator_email, revenue_line, stage, channel,
      total_deals, risk_critical, risk_high, risk_medium, risk_none,
      signal_dome, signal_hot, signal_warm, signal_neutral,
      avg_aging_days, avg_temperature, avg_urgency, avg_value_score, avg_priority,
      pipeline_value, formula_version
    )
    SELECT
      p_date, 'daily', v_rec.operator_email, NULL, NULL, NULL,
      COUNT(*),
      COUNT(*) FILTER (WHERE risk_state = 'critical'),
      COUNT(*) FILTER (WHERE risk_state = 'high'),
      COUNT(*) FILTER (WHERE risk_state = 'medium'),
      COUNT(*) FILTER (WHERE risk_state = 'none'),
      COUNT(*) FILTER (WHERE signal_state = 'DOME'),
      COUNT(*) FILTER (WHERE signal_state = 'HOT'),
      COUNT(*) FILTER (WHERE signal_state = 'WARM'),
      COUNT(*) FILTER (WHERE signal_state = 'NEUTRAL'),
      COALESCE(AVG(aging_days), 0),
      COALESCE(AVG(temperature_score), 0),
      COALESCE(AVG(urgency_score), 0),
      COALESCE(AVG(value_score), 0),
      COALESCE(AVG(priority_score), 0),
      COALESCE(SUM(value_score), 0),
      'v5.0'
    FROM public.deal_runtime
    WHERE operator_email = v_rec.operator_email
    ON CONFLICT ON CONSTRAINT uq_snapshot_dims DO UPDATE SET
      total_deals = EXCLUDED.total_deals,
      risk_critical = EXCLUDED.risk_critical,
      risk_high = EXCLUDED.risk_high,
      risk_medium = EXCLUDED.risk_medium,
      risk_none = EXCLUDED.risk_none,
      signal_dome = EXCLUDED.signal_dome,
      signal_hot = EXCLUDED.signal_hot,
      signal_warm = EXCLUDED.signal_warm,
      signal_neutral = EXCLUDED.signal_neutral,
      avg_aging_days = EXCLUDED.avg_aging_days,
      avg_temperature = EXCLUDED.avg_temperature,
      avg_urgency = EXCLUDED.avg_urgency,
      avg_value_score = EXCLUDED.avg_value_score,
      avg_priority = EXCLUDED.avg_priority,
      pipeline_value = EXCLUDED.pipeline_value;

    v_count := v_count + 1;
  END LOOP;

  -- Snapshot POR LINHA DE RECEITA
  FOR v_rec IN
    SELECT DISTINCT revenue_line FROM public.deal_runtime WHERE revenue_line IS NOT NULL
  LOOP
    INSERT INTO public.analytics_snapshots (
      snapshot_date, period_type, operator_email, revenue_line, stage, channel,
      total_deals, risk_critical, risk_high, risk_medium, risk_none,
      avg_aging_days, avg_temperature, avg_value_score,
      pipeline_value, formula_version
    )
    SELECT
      p_date, 'daily', NULL, v_rec.revenue_line, NULL, NULL,
      COUNT(*),
      COUNT(*) FILTER (WHERE risk_state = 'critical'),
      COUNT(*) FILTER (WHERE risk_state = 'high'),
      COUNT(*) FILTER (WHERE risk_state = 'medium'),
      COUNT(*) FILTER (WHERE risk_state = 'none'),
      COALESCE(AVG(aging_days), 0),
      COALESCE(AVG(temperature_score), 0),
      COALESCE(AVG(value_score), 0),
      COALESCE(SUM(value_score), 0),
      'v5.0'
    FROM public.deal_runtime
    WHERE revenue_line = v_rec.revenue_line
    ON CONFLICT ON CONSTRAINT uq_snapshot_dims DO UPDATE SET
      total_deals = EXCLUDED.total_deals,
      risk_critical = EXCLUDED.risk_critical,
      risk_high = EXCLUDED.risk_high,
      risk_medium = EXCLUDED.risk_medium,
      risk_none = EXCLUDED.risk_none,
      avg_aging_days = EXCLUDED.avg_aging_days,
      avg_temperature = EXCLUDED.avg_temperature,
      avg_value_score = EXCLUDED.avg_value_score,
      pipeline_value = EXCLUDED.pipeline_value;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------
-- VERIFICACAO
-- -----------------------------------------------
-- Apos executar no SQL Editor do Supabase, rodar:
--   SELECT generate_daily_snapshot();
-- Deve retornar o numero de snapshots inseridos (1 global + N operadores + M linhas)
--
-- Verificar dados:
--   SELECT * FROM analytics_snapshots ORDER BY created_at DESC LIMIT 10;
--   SELECT period_type, period_key FROM operator_efficiency LIMIT 5;
