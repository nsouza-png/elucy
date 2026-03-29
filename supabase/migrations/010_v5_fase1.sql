-- ============================================================
-- ELUCY V5 — FASE 1: Runtime Core
-- Executar no Supabase SQL Editor
-- Data: 2026-03-24
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. deal_runtime — TABELA MAIS CRITICA DO V5
-- Estado vivo do deal. UI avancada le daqui, nao de deals.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deal_runtime (
  deal_id          TEXT NOT NULL,
  operator_email   TEXT NOT NULL,

  -- Pipeline state
  current_stage       TEXT,
  current_stage_order INTEGER DEFAULT 0,
  revenue_line        TEXT,
  channel             TEXT,
  persona             TEXT,
  framework_in_use    TEXT,

  -- Risk & Aging
  aging_days          INTEGER DEFAULT 0,
  aging_band          TEXT DEFAULT 'green',      -- green | yellow | red | critical
  risk_state          TEXT DEFAULT 'none',       -- none | low | medium | high | critical

  -- Signals
  signal_state        TEXT DEFAULT 'NEUTRAL',    -- BUY | STALL | RISK | NEUTRAL

  -- Scores (0-100)
  temperature_score   INTEGER DEFAULT 0,
  urgency_score       INTEGER DEFAULT 0,
  value_score         NUMERIC(12,2) DEFAULT 0,
  priority_score      INTEGER DEFAULT 0,

  -- Touchpoint / FUP / Show state
  touchpoint_state    TEXT,                      -- TP1, TP2, TP3...
  fup_state           TEXT DEFAULT 'none',       -- none | pending | sent | replied
  show_state          TEXT DEFAULT 'unknown',    -- unknown | scheduled | show | no_show | rescheduled

  -- Last touch
  last_touch_at       TIMESTAMPTZ,
  last_touch_type     TEXT,
  last_copy_id        UUID,
  last_analysis_id    UUID,

  -- Next Best Action
  next_best_action    TEXT,
  nba_reason          TEXT,

  -- Forecast (addon V5)
  forecast_score_raw      NUMERIC(5,2),
  forecast_score_adjusted NUMERIC(5,2),
  forecast_confidence     TEXT,                  -- low | medium | high

  -- Flexible payload
  runtime_payload     JSONB DEFAULT '{}',

  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  PRIMARY KEY (deal_id, operator_email)
);

-- Indexes for deal_runtime
CREATE INDEX IF NOT EXISTS idx_dr_operator ON deal_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_dr_stage ON deal_runtime(current_stage);
CREATE INDEX IF NOT EXISTS idx_dr_line ON deal_runtime(revenue_line);
CREATE INDEX IF NOT EXISTS idx_dr_risk ON deal_runtime(risk_state);
CREATE INDEX IF NOT EXISTS idx_dr_signal ON deal_runtime(signal_state);
CREATE INDEX IF NOT EXISTS idx_dr_priority ON deal_runtime(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_dr_updated ON deal_runtime(updated_at DESC);

-- RLS: operador so ve seus proprios deals
ALTER TABLE deal_runtime ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_runtime_public_access" ON deal_runtime
  FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_deal_runtime_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deal_runtime_updated
  BEFORE UPDATE ON deal_runtime
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_runtime_timestamp();


-- ────────────────────────────────────────────────────────────
-- 2. ALTER operators — adicionar colunas V5
-- ────────────────────────────────────────────────────────────

ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS team_id TEXT,
  ADD COLUMN IF NOT EXISTS meta_diaria INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS focus_mode TEXT DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS active_lines TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS score_current INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_current INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level_current INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS efficiency_profile JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();


-- ────────────────────────────────────────────────────────────
-- 3. ALTER activity_log — adicionar entity tracking
-- ────────────────────────────────────────────────────────────

ALTER TABLE activity_log
  ADD COLUMN IF NOT EXISTS entity_type TEXT,       -- deal | social_dm | operator | meeting
  ADD COLUMN IF NOT EXISTS entity_id TEXT,          -- ID generico da entidade
  ADD COLUMN IF NOT EXISTS activity_value NUMERIC;  -- valor numerico da acao (ex: ticket)


-- ────────────────────────────────────────────────────────────
-- 4. ALTER deal_interactions — adicionar campos V5
-- ────────────────────────────────────────────────────────────

ALTER TABLE deal_interactions
  ADD COLUMN IF NOT EXISTS channel TEXT,            -- whatsapp | dm | call | email | linkedin
  ADD COLUMN IF NOT EXISTS content TEXT,            -- conteudo da interacao
  ADD COLUMN IF NOT EXISTS summary TEXT;            -- resumo AI


-- ────────────────────────────────────────────────────────────
-- 5. deal_stage_history — tracking de transicoes
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deal_stage_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id     TEXT NOT NULL,
  from_stage  TEXT,
  to_stage    TEXT NOT NULL,
  changed_by  TEXT,                -- operator_email ou 'system'
  source      TEXT DEFAULT 'crm',  -- crm | manual | cadence | system
  metadata    JSONB DEFAULT '{}',
  changed_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_deal ON deal_stage_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_dsh_date ON deal_stage_history(changed_at DESC);

ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dsh_public_access" ON deal_stage_history
  FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 6. deal_tasks — unidade operacional
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deal_tasks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id         TEXT NOT NULL,
  operator_email  TEXT NOT NULL,
  task_type       TEXT NOT NULL,        -- follow_up | requalificacao | agendamento | no_show_recovery | reativacao | social_dm | handoff_prep | note_completion | dvl_review | cadence
  queue_type      TEXT DEFAULT 'default', -- fup | dm | no_show | reengage | handoff | high_value | cadence
  task_status     TEXT DEFAULT 'pending', -- pending | ready | in_progress | completed | skipped | cancelled
  priority        INTEGER DEFAULT 50,    -- 0-100
  due_at          TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  disposition     TEXT,                  -- resolved | skipped_no_answer | skipped_wrong_time | rescheduled | escalated
  task_payload    JSONB DEFAULT '{}',
  result_payload  JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dt_deal ON deal_tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_dt_operator ON deal_tasks(operator_email);
CREATE INDEX IF NOT EXISTS idx_dt_status ON deal_tasks(task_status);
CREATE INDEX IF NOT EXISTS idx_dt_priority ON deal_tasks(priority DESC);
CREATE INDEX IF NOT EXISTS idx_dt_due ON deal_tasks(due_at);

ALTER TABLE deal_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dt_public_access" ON deal_tasks
  FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 7. Realtime — habilitar para tabelas criticas
-- ────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE deal_runtime;
ALTER PUBLICATION supabase_realtime ADD TABLE deal_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE deal_stage_history;


-- ============================================================
-- VERIFICACAO POS-EXECUCAO
-- ============================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--   ORDER BY table_name;
