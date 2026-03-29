-- FASE 3 — BLOCO 1: Tabelas task_queues + task_queue_items + seed filas

CREATE TABLE IF NOT EXISTS public.task_queues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_slug TEXT NOT NULL UNIQUE,
  queue_label TEXT NOT NULL,
  description TEXT,
  priority_order INT DEFAULT 50,
  focus_modes TEXT[] DEFAULT '{}',
  task_types TEXT[] DEFAULT '{}',
  max_items INT DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

ALTER TABLE public.task_queues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tq_public_access" ON public.task_queues;
CREATE POLICY "tq_public_access" ON public.task_queues FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.task_queue_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_slug TEXT NOT NULL REFERENCES public.task_queues(queue_slug),
  task_id UUID REFERENCES public.deal_tasks(id),
  deal_id TEXT NOT NULL,
  operator_email TEXT NOT NULL,
  position INT DEFAULT 0,
  entered_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_tqi_queue ON public.task_queue_items(queue_slug, is_active, position);
CREATE INDEX IF NOT EXISTS idx_tqi_operator ON public.task_queue_items(operator_email, is_active);
CREATE INDEX IF NOT EXISTS idx_tqi_deal ON public.task_queue_items(deal_id);

ALTER TABLE public.task_queue_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tqi_public_access" ON public.task_queue_items;
CREATE POLICY "tqi_public_access" ON public.task_queue_items FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_queue_items;
