-- =============================================================
-- ELUCY V5 — FASE 5: Calendar & Meetings
-- Data: 2026-03-25
-- Tabelas: meetings (NOVA), meeting_runtime (NOVA)
-- =============================================================

-- -----------------------------------------------
-- 1. meetings — entidade de reuniao/call
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id TEXT,
  operator_email TEXT NOT NULL,

  -- Dados da reuniao
  meeting_type TEXT NOT NULL DEFAULT 'discovery',  -- discovery | qualification | demo | negotiation | closing | follow_up | no_show_recovery
  title TEXT,
  description TEXT,

  -- Agendamento
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INT DEFAULT 30,
  timezone TEXT DEFAULT 'America/Sao_Paulo',

  -- Participantes
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  closer_email TEXT,                    -- se for handoff, quem e o closer

  -- Status
  meeting_status TEXT DEFAULT 'scheduled',  -- scheduled | confirmed | in_progress | completed | no_show | cancelled | rescheduled
  confirmed_at TIMESTAMPTZ,

  -- Resultado
  outcome TEXT,                         -- qualified | not_qualified | handoff | reschedule | lost | no_show
  outcome_notes TEXT,

  -- Integracao
  calendar_event_id TEXT,               -- Google Calendar event ID
  calendar_link TEXT,                   -- link do meet/zoom
  crm_activity_id TEXT,                 -- ID no CRM

  -- Meta
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mtg_deal ON public.meetings(deal_id);
CREATE INDEX IF NOT EXISTS idx_mtg_operator ON public.meetings(operator_email);
CREATE INDEX IF NOT EXISTS idx_mtg_scheduled ON public.meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_mtg_status ON public.meetings(meeting_status);
CREATE INDEX IF NOT EXISTS idx_mtg_type ON public.meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_mtg_date_range ON public.meetings(operator_email, scheduled_at);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mtg_public_access" ON public.meetings;
CREATE POLICY "mtg_public_access" ON public.meetings FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;

-- -----------------------------------------------
-- 2. meeting_runtime — estado vivo da reuniao (pre/durante/pos)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.meeting_runtime (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  operator_email TEXT NOT NULL,

  -- Pre-meeting
  prep_completed BOOLEAN DEFAULT false,
  briefing_generated BOOLEAN DEFAULT false,
  briefing_payload JSONB DEFAULT '{}',   -- output do Elucy briefing
  questions_prepared TEXT[],             -- perguntas SPIN/SPICED preparadas
  objections_anticipated TEXT[],         -- objecoes previstas

  -- During
  started_at TIMESTAMPTZ,
  actual_duration_min INT,
  notes_raw TEXT,                        -- notas brutas durante call

  -- Post-meeting
  ended_at TIMESTAMPTZ,
  summary TEXT,                          -- resumo automatico
  next_steps TEXT[],                     -- proximos passos identificados
  commitment_level TEXT,                 -- high | medium | low | none

  -- Qualificacao pos-call
  spiced_score JSONB DEFAULT '{}',       -- { situation, pain, impact, critical_event, decision }
  authority_confirmed BOOLEAN,
  budget_confirmed BOOLEAN,
  timeline_confirmed BOOLEAN,
  champion_identified BOOLEAN,

  -- Sinais
  signal_state TEXT DEFAULT 'NEUTRAL',   -- NEUTRAL | WARM | HOT | DOME
  temperature_delta INT DEFAULT 0,       -- quanto mudou a temperatura do deal

  -- Follow-up
  follow_up_scheduled BOOLEAN DEFAULT false,
  follow_up_at TIMESTAMPTZ,
  follow_up_type TEXT,                   -- call | email | whatsapp | dm

  -- Meta
  runtime_payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(meeting_id, operator_email)
);

CREATE INDEX IF NOT EXISTS idx_mrt_meeting ON public.meeting_runtime(meeting_id);
CREATE INDEX IF NOT EXISTS idx_mrt_operator ON public.meeting_runtime(operator_email);

ALTER TABLE public.meeting_runtime ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mrt_public_access" ON public.meeting_runtime;
CREATE POLICY "mrt_public_access" ON public.meeting_runtime FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- 3. Trigger: auto-update meeting status e deal temperature
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.on_meeting_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    -- Atualizar meeting status
    UPDATE public.meetings SET meeting_status = 'completed', updated_at = now()
    WHERE id = NEW.meeting_id AND meeting_status != 'completed';

    -- Atualizar deal_runtime temperature se houver delta
    IF NEW.temperature_delta != 0 THEN
      UPDATE public.deal_runtime
      SET temperature_score = LEAST(100, GREATEST(0, temperature_score + NEW.temperature_delta)),
          updated_at = now()
      WHERE deal_id = (SELECT deal_id FROM public.meetings WHERE id = NEW.meeting_id)
        AND operator_email = NEW.operator_email;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_meeting_completed') THEN
    CREATE TRIGGER trg_meeting_completed
      AFTER UPDATE ON public.meeting_runtime
      FOR EACH ROW
      EXECUTE FUNCTION public.on_meeting_completed();
  END IF;
END $$;
