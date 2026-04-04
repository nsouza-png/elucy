-- Cadence Engine V1 — 4 tables for adaptive cadence runtime

-- 1. deal_cadence_runtime — primary runtime state per deal
create table if not exists public.deal_cadence_runtime (
  deal_id text primary key,
  operator_email text,
  cadence_state text,
  cadence_objective text,
  cadence_channel text,
  cadence_next_touch_at timestamptz,
  cadence_delay_hours numeric(8,2),
  cadence_priority_score numeric(6,4),
  cadence_confidence numeric(6,4),
  cadence_stop_state text default 'NONE',
  cadence_reason_main text,
  cadence_reason_secondary text,
  channel_saturation_score numeric(6,4),
  delta_score numeric(6,4),
  silence_type text,
  explain_json jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 2. cadence_touch_events — append-only audit trail of each touch
create table if not exists public.cadence_touch_events (
  id uuid primary key default gen_random_uuid(),
  deal_id text not null,
  operator_email text,
  cadence_state text,
  cadence_objective text,
  cadence_channel text,
  touch_at timestamptz,
  planned_delay_hours numeric(8,2),
  actual_outcome text,
  outcome_at timestamptz,
  delta_score numeric(6,4),
  response_received boolean default false,
  meeting_booked boolean default false,
  advanced_stage boolean default false,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 3. cadence_state_history — state transition audit
create table if not exists public.cadence_state_history (
  id uuid primary key default gen_random_uuid(),
  deal_id text not null,
  from_state text,
  to_state text,
  reason text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 4. cadence_policy_metrics — aggregated metrics per period/operator
create table if not exists public.cadence_policy_metrics (
  id uuid primary key default gen_random_uuid(),
  period_type text not null,
  period_key text not null,
  operator_email text,
  cadence_state text,
  cadence_channel text,
  touches_count int default 0,
  replies_count int default 0,
  meetings_count int default 0,
  stage_advances_count int default 0,
  avg_delay_hours numeric(8,2),
  avg_delta_score numeric(6,4),
  reply_rate numeric(6,4),
  meeting_rate numeric(6,4),
  advance_rate numeric(6,4),
  generated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_deal_cadence_runtime_operator_state
  on public.deal_cadence_runtime (operator_email, cadence_state);

create index if not exists idx_cadence_touch_events_deal_operator_created
  on public.cadence_touch_events (deal_id, operator_email, created_at);

create index if not exists idx_cadence_state_history_deal_created
  on public.cadence_state_history (deal_id, created_at);

create index if not exists idx_cadence_policy_metrics_operator_period
  on public.cadence_policy_metrics (operator_email, period_type, period_key);
