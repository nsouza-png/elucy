-- ============================================================================
-- 037_transition_graph.sql
-- Grafo de transicoes validas do pipeline (configuravel, nao hardcoded)
-- Parte do D2 Pipeline Update — Elucy Revenue Intelligence
-- Data: 2026-04-06
-- ============================================================================

create table if not exists public.pipeline_transition_graph (
  id uuid primary key default gen_random_uuid(),
  from_stage text not null,
  to_stage text not null,
  transition_type text default 'advance',   -- advance | revert | lost | reactivate
  gates_required text[] default '{}',       -- nomes dos gates obrigatorios
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(from_stage, to_stage, transition_type)
);

comment on table public.pipeline_transition_graph is 'Grafo configuravel de transicoes validas entre etapas do pipeline';
comment on column public.pipeline_transition_graph.gates_required is 'Array de nomes de gates que devem passar para permitir a transicao';
comment on column public.pipeline_transition_graph.is_active is 'Flag para desativar transicoes sem deletar (soft delete)';

-- Indice para lookup rapido por from_stage
create index idx_ptg_from on public.pipeline_transition_graph (from_stage, is_active);

-- ============================================================================
-- SEED: Transicoes validas do funil SDR
-- ============================================================================

insert into public.pipeline_transition_graph (from_stage, to_stage, transition_type, gates_required) values
  -- Cadencia linear: Novo Lead → Dia 01 ... → Dia 06
  ('Novo Lead',   'Dia 01',  'advance', '{"contact_initiated"}'),
  ('Dia 01',      'Dia 02',  'advance', '{}'),
  ('Dia 02',      'Dia 03',  'advance', '{}'),
  ('Dia 03',      'Dia 04',  'advance', '{}'),
  ('Dia 04',      'Dia 05',  'advance', '{}'),
  ('Dia 05',      'Dia 06',  'advance', '{}'),

  -- Dia 01-06 → Conectados (cada dia precisa de aresta individual)
  ('Dia 01',      'Conectados', 'advance', '{"bidirectional_response"}'),
  ('Dia 02',      'Conectados', 'advance', '{"bidirectional_response"}'),
  ('Dia 03',      'Conectados', 'advance', '{"bidirectional_response"}'),
  ('Dia 04',      'Conectados', 'advance', '{"bidirectional_response"}'),
  ('Dia 05',      'Conectados', 'advance', '{"bidirectional_response"}'),
  ('Dia 06',      'Conectados', 'advance', '{"bidirectional_response"}'),

  -- Conectados → Agendamento → Entrevista / Reagendamento
  ('Conectados',  'Agendamento',          'advance', '{"meeting_proposed"}'),
  ('Agendamento', 'Entrevista Agendada',  'advance', '{"invite_accepted"}'),
  ('Agendamento', 'Reagendamento',        'advance', '{"no_show_or_reschedule"}'),
  ('Reagendamento', 'Entrevista Agendada','advance', '{"invite_accepted"}'),

  -- Handoff SDR → Closer
  ('Entrevista Agendada', 'Fechamento', 'advance', '{"dqi_gte_4","spiced_complete","handoff_approved"}'),

  -- Retrocessos permitidos
  ('Conectados',    'Dia 01',      'revert',     '{"reactivation_post_silence"}'),
  ('Reagendamento', 'Conectados',  'revert',     '{"double_no_show"}'),

  -- Reativacao
  ('Dia 06',        'Novo Lead',   'reactivate', '{"cold_reentry_30d"}')

on conflict (from_stage, to_stage, transition_type) do nothing;
