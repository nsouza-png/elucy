-- FASE 3 — BLOCO 2: Funcoes seed + populate + trigger

-- Funcao 1: seed stage history
CREATE OR REPLACE FUNCTION public.seed_stage_history()
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT ON (deal_id)
      deal_id, current_stage, operator_email
    FROM public.deal_runtime
    WHERE current_stage IS NOT NULL
    ORDER BY deal_id, synced_at DESC
  LOOP
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

-- Funcao 2: seed tasks from runtime
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
    IF NOT EXISTS (
      SELECT 1 FROM public.deal_tasks
      WHERE deal_id = v_rec.deal_id
        AND operator_email = v_rec.operator_email
        AND task_type = v_rec.next_best_action
        AND task_status IN ('pending', 'ready', 'in_progress')
    ) THEN
      v_priority := CASE v_rec.risk_state
        WHEN 'critical' THEN 90
        WHEN 'high' THEN 70
        WHEN 'medium' THEN 50
        ELSE 30
      END;
      v_priority := LEAST(100, v_priority + COALESCE(v_rec.urgency_score, 0)::int / 10);

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
        now() + INTERVAL '24 hours',
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

-- Funcao 3: populate queue items
CREATE OR REPLACE FUNCTION public.populate_queue_items()
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_rec RECORD;
BEGIN
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
        v_rec.priority
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-track stage changes
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
