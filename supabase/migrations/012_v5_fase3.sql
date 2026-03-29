-- =============================================================
-- ELUCY V5 — FASE 3: Task System + Stage History + Task Queues
-- Data: 2026-03-25
-- Tabelas: task_queues (NOVA) + task_queue_items (NOVA)
-- Funcoes: seed_stage_history(), seed_tasks_from_runtime()
-- =============================================================

-- -----------------------------------------------
-- 1. task_queues — filas formais de tarefas
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_queues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_slug TEXT NOT NULL UNIQUE,    -- fup | dm | no_show | reengage | handoff | high_value | cadence
  queue_label TEXT NOT NULL,
  description TEXT,
  priority_order INT DEFAULT 50,      -- ordem global (menor = mais prioritario)
  focus_modes TEXT[] DEFAULT '{}',    -- quais focus modes priorizam esta fila
  task_types TEXT[] DEFAULT '{}',     -- task_types que entram nesta fila
  max_items INT DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  config_json JSONB DEFAULT '{}',     -- regras especificas (aging thresholds, etc)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed das filas padrao
INSERT INTO public.task_queues (queue_slug, queue_label, description, priority_order, focus_modes, task_types) VALUES
  ('fup',        'Follow-Up',        'Deals que precisam de contato',           10, '{velocidade,qualificacao}', '{follow_up}'),
  ('dm',         'Social DM',        'Leads para abordagem via DM',             20, '{social_dm}',              '{social_dm}'),
  ('no_show',    'No-Show Recovery',  'Leads que nao compareceram',              15, '{velocidade,handoff}',     '{no_show_recovery}'),
  ('reengage',   'Reativacao',        'Deals frios para reativacao',             30, '{reativacao}',             '{reativacao}'),
  ('handoff',    'Handoff Prep',      'Deals prontos para passar ao closer',     5,  '{handoff}',               '{handoff_prep}'),
  ('high_value', 'High Value',        'Deals de alto valor com atencao especial',8,  '{imersao,qualificacao}',   '{dvl_review,requalificacao}'),
  ('cadence',    'Cadencia',          'Tasks de cadencia automatizada',          12, '{velocidade}',             '{cadence}'),
  ('default',    'Geral',             'Fila generica',                           50, '{}',                       '{agendamento,note_completion}')
ON CONFLICT (queue_slug) DO NOTHING;

-- RLS
ALTER TABLE public.task_queues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tq_public_access" ON public.task_queues FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- 2. task_queue_items — itens ativos nas filas (view materializada em tabela)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_queue_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_slug TEXT NOT NULL REFERENCES public.task_queues(queue_slug),
  task_id UUID REFERENCES public.deal_tasks(id),
  deal_id TEXT NOT NULL,
  operator_email TEXT NOT NULL,
  position INT DEFAULT 0,            -- posicao na fila
  entered_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,            -- auto-remove se nao completar
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_tqi_queue ON public.task_queue_items(queue_slug, is_active, position);
CREATE INDEX IF NOT EXISTS idx_tqi_operator ON public.task_queue_items(operator_email, is_active);
CREATE INDEX IF NOT EXISTS idx_tqi_deal ON public.task_queue_items(deal_id);

ALTER TABLE public.task_queue_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tqi_public_access" ON public.task_queue_items FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_queue_items;

-- -----------------------------------------------
-- 3. Funcao: seed_stage_history — gera historico inicial a partir de deal_runtime
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_stage_history()
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_rec RECORD;
BEGIN
  -- Para cada deal no runtime, criar um registro de "estado atual" como ponto de partida
  FOR v_rec IN
    SELECT DISTINCT ON (deal_id)
      deal_id, current_stage, operator_email
    FROM public.deal_runtime
    WHERE current_stage IS NOT NULL
    ORDER BY deal_id, synced_at DESC
  LOOP
    -- So insere se nao existe historico para este deal
    IF NOT EXISTS (SELECT 1 FROM public.deal_stage_history WHERE deal_id = v_rec.deal_id) THEN
      INSERT INTO public.deal_stage_history (deal_id, from_stage, to_stage, changed_by, source, metadata)
      VALUES (
        v_rec.deal_id,
        NULL,
        v_rec.current_stage,
        'system',
        'seed',
        jsonb_build_object('seeded_at', now()::text, 'operator', v_rec.operator_email)
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------
-- 4. Funcao: seed_tasks_from_runtime — gera tasks iniciais a partir de deal_runtime.next_best_action
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_tasks_from_runtime()
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_rec RECORD;
  v_queue TEXT;
  v_priority INT;
BEGIN
  FOR v_rec IN
    SELECT deal_id, operator_email, next_best_action, nba_reason,
           risk_state, aging_days, value_score, urgency_score, signal_state,
           current_stage, revenue_line
    FROM public.deal_runtime
    WHERE next_best_action IS NOT NULL
  LOOP
    -- So insere se nao tem task pendente para este deal+operator+type
    IF NOT EXISTS (
      SELECT 1 FROM public.deal_tasks
      WHERE deal_id = v_rec.deal_id
        AND operator_email = v_rec.operator_email
        AND task_type = v_rec.next_best_action
        AND task_status IN ('pending', 'ready', 'in_progress')
    ) THEN

      -- Calcular prioridade 0-100 baseada em risk + urgency
      v_priority := CASE v_rec.risk_state
        WHEN 'critical' THEN 90
        WHEN 'high' THEN 70
        WHEN 'medium' THEN 50
        ELSE 30
      END;
      -- Boost por urgency
      v_priority := LEAST(100, v_priority + COALESCE(v_rec.urgency_score, 0)::int / 10);

      -- Mapear task_type para queue_slug
      v_queue := CASE v_rec.next_best_action
        WHEN 'follow_up' THEN 'fup'
        WHEN 'social_dm' THEN 'dm'
        WHEN 'no_show_recovery' THEN 'no_show'
        WHEN 'reativacao' THEN 'reengage'
        WHEN 'handoff_prep' THEN 'handoff'
        WHEN 'dvl_review' THEN 'high_value'
        WHEN 'requalificacao' THEN 'high_value'
        WHEN 'cadence' THEN 'cadence'
        ELSE 'default'
      END;

      INSERT INTO public.deal_tasks (
        deal_id, operator_email, task_type, queue_type, task_status, priority,
        due_at, task_payload
      ) VALUES (
        v_rec.deal_id,
        v_rec.operator_email,
        v_rec.next_best_action,
        v_queue,
        'pending',
        v_priority,
        now() + INTERVAL '24 hours',  -- vence em 24h
        jsonb_build_object(
          'reason', v_rec.nba_reason,
          'risk', v_rec.risk_state,
          'aging_days', v_rec.aging_days,
          'value_score', v_rec.value_score,
          'stage', v_rec.current_stage,
          'revenue_line', v_rec.revenue_line,
          'signal', v_rec.signal_state,
          'seeded', true
        )
      );

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------
-- 5. Funcao: populate_queue_items — preenche task_queue_items a partir de deal_tasks pendentes
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.populate_queue_items()
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_rec RECORD;
BEGIN
  -- Limpa items antigos inativos
  DELETE FROM public.task_queue_items WHERE is_active = false;

  FOR v_rec IN
    SELECT dt.id AS task_id, dt.deal_id, dt.operator_email, dt.queue_type, dt.priority
    FROM public.deal_tasks dt
    WHERE dt.task_status IN ('pending', 'ready')
    ORDER BY dt.priority DESC, dt.created_at ASC
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.task_queue_items
      WHERE task_id = v_rec.task_id AND is_active = true
    ) THEN
      INSERT INTO public.task_queue_items (queue_slug, task_id, deal_id, operator_email, position)
      VALUES (
        COALESCE(v_rec.queue_type, 'default'),
        v_rec.task_id,
        v_rec.deal_id,
        v_rec.operator_email,
        v_rec.priority  -- position = priority (descending = most urgent first)
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------
-- 6. Trigger: auto-track stage changes via deal_runtime
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.track_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    INSERT INTO public.deal_stage_history (deal_id, from_stage, to_stage, changed_by, source)
    VALUES (NEW.deal_id, OLD.current_stage, NEW.current_stage, NEW.operator_email, 'runtime_sync');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- So cria o trigger se nao existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_deal_runtime_stage_change'
  ) THEN
    CREATE TRIGGER trg_deal_runtime_stage_change
      AFTER UPDATE ON public.deal_runtime
      FOR EACH ROW
      EXECUTE FUNCTION public.track_stage_change();
  END IF;
END $$;

-- -----------------------------------------------
-- EXECUCAO POS-DDL
-- -----------------------------------------------
-- Rodar em sequencia apos criar tudo:
--
-- 1. Seed stage history (ponto de partida):
--    SELECT seed_stage_history();
--    -- Esperado: ~191 registros (1 por deal)
--
-- 2. Seed tasks a partir do runtime:
--    SELECT seed_tasks_from_runtime();
--    -- Esperado: ~191 tasks (1 por deal com NBA)
--
-- 3. Popular filas:
--    SELECT populate_queue_items();
--    -- Esperado: ~191 queue items
--
-- 4. Verificar:
--    SELECT queue_slug, COUNT(*) FROM task_queue_items GROUP BY queue_slug;
--    SELECT task_type, COUNT(*) FROM deal_tasks GROUP BY task_type;
--    SELECT to_stage, COUNT(*) FROM deal_stage_history GROUP BY to_stage ORDER BY count DESC;
