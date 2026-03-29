-- ==============================================================
-- ELUCY V8 — Signal System Schema
-- Tabelas: deal_signals + deal_signal_runtime
-- Executar no Supabase SQL Editor (public schema)
-- ==============================================================

-- 1. Tabela central de sinais (append-only, histórico completo)
create table if not exists deal_signals (
  id uuid primary key default gen_random_uuid(),
  deal_id text not null,
  operator_email text,

  signal_type text not null,       -- e.g. 'pain_detected', 'no_show', 'aging_high'
  signal_category text not null,   -- behavioral | framework | pipeline | quality | forecast | revenue

  signal_value numeric(6,4) default 0,  -- raw score, when applicable (0-1)
  weight numeric(6,4) not null,         -- peso configurado no registry
  impact_forecast numeric(6,4),         -- impacto esperado no forecast
  impact_score numeric(6,4),            -- weight * polarity (positive/negative)

  description text,
  payload jsonb default '{}'::jsonb,

  source text,   -- 'engine' | 'note' | 'meeting' | 'manual'
  version text default 'v8',

  created_at timestamptz default now()
);

create index if not exists idx_deal_signals_deal_id on deal_signals(deal_id);
create index if not exists idx_deal_signals_type on deal_signals(signal_type);
create index if not exists idx_deal_signals_category on deal_signals(signal_category);
create index if not exists idx_deal_signals_created on deal_signals(created_at desc);

-- 2. Snapshot runtime consolidado por deal
create table if not exists deal_signal_runtime (
  deal_id text primary key,
  operator_email text,

  -- Scores por categoria
  behavioral_score numeric(6,4) default 0,
  framework_score  numeric(6,4) default 0,
  pipeline_score   numeric(6,4) default 0,
  quality_score    numeric(6,4) default 0,
  forecast_score   numeric(6,4) default 0,
  revenue_score    numeric(6,4) default 0,

  -- Score consolidado
  positive_score   numeric(6,4) default 0,
  negative_score   numeric(6,4) default 0,
  signal_total     numeric(6,4) default 0,  -- positive - negative, clamped [-1, +1]

  -- Risk assessment
  risk_level       text default 'medium',   -- low | medium | high | critical

  -- Top sinais
  top_positive_signals jsonb default '[]'::jsonb,
  top_negative_signals jsonb default '[]'::jsonb,

  -- Explain
  explain_json jsonb default '{}'::jsonb,

  -- Counts
  signal_count     int default 0,
  positive_count   int default 0,
  negative_count   int default 0,

  updated_at timestamptz default now()
);

-- 3. Enable RLS (permissiva por ora, igual ao padrão do projeto)
alter table deal_signals enable row level security;
alter table deal_signal_runtime enable row level security;

create policy "allow_all_deal_signals" on deal_signals for all using (true) with check (true);
create policy "allow_all_deal_signal_runtime" on deal_signal_runtime for all using (true) with check (true);

-- 4. Realtime (para o cockpit receber updates automáticos)
alter publication supabase_realtime add table deal_signal_runtime;
