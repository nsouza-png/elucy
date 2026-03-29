-- ============================================================
-- ELUCY TELEMETRY — Supabase Schema
-- Cockpit de Telemetria Industrial (Event-Sourced)
-- ============================================================

-- 1. Tabela principal de eventos de telemetria
CREATE TABLE IF NOT EXISTS elucy_telemetry_events (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id       TEXT,
  operator_id   TEXT NOT NULL,
  role          TEXT DEFAULT 'sdr' CHECK (role IN ('sdr','closer','cs','cx','am')),
  dag_phase     SMALLINT CHECK (dag_phase BETWEEN 1 AND 9),
  layer_processed SMALLINT CHECK (layer_processed BETWEEN 1 AND 25),
  layer_name    TEXT,
  signal_detected TEXT[],
  kill_switch_triggered TEXT,
  event_type    TEXT NOT NULL DEFAULT 'dag_step',
  latency_ms    INTEGER,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Indices para queries de telemetria em tempo real
CREATE INDEX idx_telemetry_created ON elucy_telemetry_events (created_at DESC);
CREATE INDEX idx_telemetry_operator ON elucy_telemetry_events (operator_id, created_at DESC);
CREATE INDEX idx_telemetry_dag_phase ON elucy_telemetry_events (dag_phase);
CREATE INDEX idx_telemetry_event_type ON elucy_telemetry_events (event_type);
CREATE INDEX idx_telemetry_kill_switch ON elucy_telemetry_events (kill_switch_triggered) WHERE kill_switch_triggered IS NOT NULL;

-- Particionar por mes (opcional, recomendado para >1M eventos)
-- CREATE TABLE elucy_telemetry_events_2026_03 PARTITION OF elucy_telemetry_events
--   FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- 2. RLS (Row Level Security)
ALTER TABLE elucy_telemetry_events ENABLE ROW LEVEL SECURITY;

-- Operadores podem inserir seus proprios eventos
CREATE POLICY telemetry_insert_own ON elucy_telemetry_events
  FOR INSERT WITH CHECK (true);

-- Operadores podem ler todos os eventos (telemetria e compartilhada)
CREATE POLICY telemetry_select_all ON elucy_telemetry_events
  FOR SELECT USING (true);

-- 3. View materializada para stats agregadas (atualiza a cada 5min via cron)
CREATE OR REPLACE VIEW telemetry_live_stats AS
SELECT
  date_trunc('hour', created_at) AS hour_bucket,
  COUNT(*) AS total_events,
  COUNT(DISTINCT deal_id) AS unique_deals,
  COUNT(DISTINCT operator_id) AS active_operators,
  AVG(latency_ms) AS avg_latency_ms,
  COUNT(*) FILTER (WHERE kill_switch_triggered IS NOT NULL) AS kill_switch_count,
  COUNT(*) FILTER (WHERE event_type = 'dag_complete') AS dag_completions,
  COUNT(*) FILTER (WHERE event_type = 'signal_detected') AS signal_events,
  jsonb_object_agg(
    COALESCE(kill_switch_triggered, '_none'),
    COUNT(*) FILTER (WHERE kill_switch_triggered IS NOT NULL)
  ) FILTER (WHERE kill_switch_triggered IS NOT NULL) AS kill_switch_breakdown
FROM elucy_telemetry_events
WHERE created_at > now() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1 DESC;

-- 4. Funcao para limpar eventos antigos (manter 7 dias)
CREATE OR REPLACE FUNCTION cleanup_telemetry_events()
RETURNS void AS $$
BEGIN
  DELETE FROM elucy_telemetry_events
  WHERE created_at < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Realtime — habilitar para SSE/WebSocket
ALTER PUBLICATION supabase_realtime ADD TABLE elucy_telemetry_events;

-- 6. Tabela de telemetry_snapshots (agregado diario para historico)
CREATE TABLE IF NOT EXISTS telemetry_snapshots (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date   DATE NOT NULL,
  total_events    INTEGER DEFAULT 0,
  unique_deals    INTEGER DEFAULT 0,
  active_operators INTEGER DEFAULT 0,
  avg_latency_ms  NUMERIC(8,2),
  dag_completions INTEGER DEFAULT 0,
  signal_events   INTEGER DEFAULT 0,
  kill_switch_events INTEGER DEFAULT 0,
  kill_switch_breakdown JSONB DEFAULT '{}',
  phase_distribution JSONB DEFAULT '{}',
  layer_distribution JSONB DEFAULT '{}',
  top_signals     JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(snapshot_date)
);

ALTER TABLE telemetry_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY snapshot_select_all ON telemetry_snapshots FOR SELECT USING (true);
CREATE POLICY snapshot_insert ON telemetry_snapshots FOR INSERT WITH CHECK (true);
