-- ============================================================================
-- 036_transition_events.sql
-- Log append-only de todas as transicoes de etapa no pipeline
-- Parte do D2 Pipeline Update — Elucy Revenue Intelligence
-- Data: 2026-04-06
-- ============================================================================

-- Tabela principal: audit trail de transicoes
create table if not exists public.deal_transition_events (
  id uuid primary key default gen_random_uuid(),
  deal_id text not null,
  operator_email text not null,
  from_stage text not null,
  to_stage text not null,
  transition_type text default 'advance',  -- advance | revert | lost | reactivate
  gates_evaluated jsonb default '[]',
  gates_passed jsonb default '[]',
  gates_failed jsonb default '[]',
  kill_switches_triggered text[] default '{}',
  signal_snapshot jsonb default '{}',       -- snapshot dos sinais no momento da transicao
  dqi_at_transition numeric(3,2),
  override_by text,                          -- email do gerente se override manual
  override_reason text,
  created_at timestamptz default now()
);

-- Comentarios
comment on table public.deal_transition_events is 'Audit trail append-only de transicoes de etapa no pipeline SDR/Closer';
comment on column public.deal_transition_events.transition_type is 'advance | revert | lost | reactivate';
comment on column public.deal_transition_events.gates_evaluated is 'Lista de gates avaliados nesta transicao';
comment on column public.deal_transition_events.gates_passed is 'Gates que passaram na validacao';
comment on column public.deal_transition_events.gates_failed is 'Gates que falharam na validacao';
comment on column public.deal_transition_events.kill_switches_triggered is 'Kill switches que bloquearam a transicao';
comment on column public.deal_transition_events.signal_snapshot is 'Snapshot completo dos sinais no momento da transicao';
comment on column public.deal_transition_events.dqi_at_transition is 'DQI score no momento da transicao (0.00 - 5.00)';
comment on column public.deal_transition_events.override_by is 'Email do gerente que autorizou override manual';

-- Indices para queries frequentes
create index idx_dte_deal on public.deal_transition_events (deal_id, created_at desc);
create index idx_dte_operator on public.deal_transition_events (operator_email, created_at desc);
create index idx_dte_type on public.deal_transition_events (transition_type);

-- RLS
alter table public.deal_transition_events enable row level security;

-- Operador ve apenas suas proprias transicoes
create policy "Operators see own transitions"
  on public.deal_transition_events for select
  using (operator_email = current_setting('request.jwt.claims')::json->>'email');

-- Apenas service role insere (via edge function transition-validator)
create policy "Service role inserts transitions"
  on public.deal_transition_events for insert
  with check (true);
