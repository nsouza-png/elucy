-- ============================================================
-- 034: Dialer Queues — Smart call queues with dynamic filters
-- Supports Elucy Dialer (Epic 1) — trigger-based queue creation
-- ============================================================

create table if not exists public.dialer_queues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  operator_email text not null,
  filter_rules jsonb not null default '{}',
  auto_refresh boolean default true,
  priority_mode text default 'urgency',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for operator lookup
create index if not exists idx_dialer_queues_operator
  on public.dialer_queues (operator_email, is_active);

-- RLS
alter table public.dialer_queues enable row level security;

create policy "Operators read own queues" on public.dialer_queues
  for select to authenticated
  using (operator_email = current_setting('request.jwt.claims', true)::json->>'email');

create policy "Operators manage own queues" on public.dialer_queues
  for all to authenticated
  using (operator_email = current_setting('request.jwt.claims', true)::json->>'email')
  with check (operator_email = current_setting('request.jwt.claims', true)::json->>'email');

-- ============================================================
-- dialer_sessions — tracks active dialer sessions (power dialer)
-- ============================================================

create table if not exists public.dialer_sessions (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.dialer_queues(id) on delete set null,
  operator_email text not null,
  status text default 'active',
  started_at timestamptz default now(),
  ended_at timestamptz,
  deals_called int default 0,
  deals_connected int default 0,
  deals_voicemail int default 0,
  deals_no_answer int default 0,
  wrap_up_seconds int default 30,
  notes text
);

create index if not exists idx_dialer_sessions_operator
  on public.dialer_sessions (operator_email, status);

alter table public.dialer_sessions enable row level security;

create policy "Operators read own sessions" on public.dialer_sessions
  for select to authenticated
  using (operator_email = current_setting('request.jwt.claims', true)::json->>'email');

create policy "Operators manage own sessions" on public.dialer_sessions
  for all to authenticated
  using (operator_email = current_setting('request.jwt.claims', true)::json->>'email')
  with check (operator_email = current_setting('request.jwt.claims', true)::json->>'email');
