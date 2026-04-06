-- ============================================================
-- 033: Flow Templates V2 — DB-driven cadence templates
-- Replaces hardcoded JS DEFAULT_CADENCES with Supabase tables.
-- ============================================================

-- 1. flow_templates — cadence template definitions
create table if not exists public.flow_templates (
  id text primary key,
  name text not null,
  description text,
  tier text default 'any',
  persona text default 'any',
  total_days int,
  is_default boolean default false,
  is_active boolean default true,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. flow_template_steps — individual steps within a template
create table if not exists public.flow_template_steps (
  id uuid primary key default gen_random_uuid(),
  template_id text not null references public.flow_templates(id) on delete cascade,
  day int not null,
  channel text not null,
  action text not null,
  auto boolean default false,
  fallback_channel text,
  fallback_delay_hours numeric(4,1),
  wa_template_id text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_flow_templates_active
  on public.flow_templates (is_active, tier);

create index if not exists idx_flow_steps_template
  on public.flow_template_steps (template_id, sort_order);

-- RLS
alter table public.flow_templates enable row level security;
alter table public.flow_template_steps enable row level security;

create policy "Anyone can read active templates" on public.flow_templates
  for select to anon, authenticated using (is_active = true);

create policy "Authenticated users manage templates" on public.flow_templates
  for all to authenticated using (true) with check (true);

create policy "Anyone can read template steps" on public.flow_template_steps
  for select to anon, authenticated using (true);

create policy "Authenticated users manage steps" on public.flow_template_steps
  for all to authenticated using (true) with check (true);

-- ============================================================
-- SEED: Migrate 5 DEFAULT_CADENCES from JS to DB
-- ============================================================

insert into public.flow_templates (id, name, description, tier, persona, total_days, is_default) values
  ('cad_titan_hot',       'Titan Hot — Imersão Presencial',      'Cadência 14 dias para Titan diamond/gold — Challenger framework', 'diamond,gold', 'Titan', 14, true),
  ('cad_builder_warm',    'Builder Warm — Digital/Harvard',       'Cadência 12 dias para Builder silver/gold — SPICED framework',   'silver,gold',  'Builder', 12, true),
  ('cad_executor_cold',   'Executor Cold — Reativação',           'Cadência 21 dias para Executor bronze/silver — SPIN framework',  'bronze,silver','Executor', 21, true),
  ('cad_fast_agendamento','Fast Track — Agendamento Rápido',      'Cadência 5 dias sprint para agendamento rápido',                 'diamond,gold,silver', 'any', 5, true),
  ('cad_no_show',         'No-Show Recovery',                     'Cadência 7 dias para recuperação de no-show',                    'any',          'any', 7, true)
on conflict (id) do nothing;

-- Titan Hot steps (9 steps, 14 dias)
insert into public.flow_template_steps (template_id, day, channel, action, auto, sort_order) values
  ('cad_titan_hot', 1,  'whatsapp',  'Apresentação + link calendly',                false, 1),
  ('cad_titan_hot', 1,  'ligacao',   'Call de conexão (60s max)',                    false, 2),
  ('cad_titan_hot', 2,  'whatsapp',  'FUP: enviou link? Viu material?',             false, 3),
  ('cad_titan_hot', 3,  'instagram', 'DM Founder — tensão de inação',               false, 4),
  ('cad_titan_hot', 4,  'ligacao',   'Call decisivo — agenda ou descarta',           false, 5),
  ('cad_titan_hot', 5,  'whatsapp',  'Último toque — deadline 24h',                 false, 6),
  ('cad_titan_hot', 7,  'whatsapp',  'Mensagem de encerramento elegante',           false, 7),
  ('cad_titan_hot', 10, 'instagram', 'Reengajamento leve — conteúdo de valor',      false, 8),
  ('cad_titan_hot', 14, 'whatsapp',  'Último contato — arquivo ou reativa',         false, 9);

-- Builder Warm steps (8 steps, 12 dias)
insert into public.flow_template_steps (template_id, day, channel, action, auto, sort_order) values
  ('cad_builder_warm', 1,  'whatsapp',  'Apresentação SPICED — situação + impacto',  false, 1),
  ('cad_builder_warm', 2,  'whatsapp',  'Caso de sucesso do segmento — link',        false, 2),
  ('cad_builder_warm', 3,  'ligacao',   'Call SPICED — Critical Event',               false, 3),
  ('cad_builder_warm', 4,  'whatsapp',  'FUP com dados personalizado',                false, 4),
  ('cad_builder_warm', 6,  'linkedin',  'Conexão + mensagem de valor',                false, 5),
  ('cad_builder_warm', 8,  'ligacao',   'Call decisivo',                              false, 6),
  ('cad_builder_warm', 10, 'whatsapp',  'Último toque',                               false, 7),
  ('cad_builder_warm', 12, 'whatsapp',  'Breakup — encerramento ou reativa',         false, 8);

-- Executor Cold steps (8 steps, 21 dias)
insert into public.flow_template_steps (template_id, day, channel, action, auto, sort_order) values
  ('cad_executor_cold', 1,  'whatsapp',  'Reativação — nova abordagem',              false, 1),
  ('cad_executor_cold', 3,  'ligacao',   'Call SPIN — identificar dor atual',         false, 2),
  ('cad_executor_cold', 5,  'whatsapp',  'Conteúdo educativo — link de valor',       false, 3),
  ('cad_executor_cold', 7,  'whatsapp',  'FUP + pergunta aberta',                    false, 4),
  ('cad_executor_cold', 10, 'instagram', 'Engajamento social leve',                   false, 5),
  ('cad_executor_cold', 14, 'ligacao',   'Última tentativa de call',                  false, 6),
  ('cad_executor_cold', 17, 'whatsapp',  'Mensagem de encerramento',                 false, 7),
  ('cad_executor_cold', 21, 'whatsapp',  'Breakup definitivo — arquivo ou downsell', false, 8);

-- Fast Track steps (6 steps, 5 dias)
insert into public.flow_template_steps (template_id, day, channel, action, auto, sort_order) values
  ('cad_fast_agendamento', 1, 'whatsapp',  'Envio de link para agendar',             false, 1),
  ('cad_fast_agendamento', 1, 'ligacao',   'Call imediato',                           false, 2),
  ('cad_fast_agendamento', 2, 'whatsapp',  'FUP: conseguiu agendar?',                false, 3),
  ('cad_fast_agendamento', 3, 'ligacao',   'Segunda tentativa de call',              false, 4),
  ('cad_fast_agendamento', 4, 'instagram', 'DM Founder como último recurso',         false, 5),
  ('cad_fast_agendamento', 5, 'whatsapp',  'Deadline final — agora ou arquivo',      false, 6);

-- No-Show Recovery steps (6 steps, 7 dias)
insert into public.flow_template_steps (template_id, day, channel, action, auto, sort_order) values
  ('cad_no_show', 1, 'whatsapp',  'Reagendamento imediato — tom empático',           false, 1),
  ('cad_no_show', 1, 'ligacao',   'Call para reagendar (até 2h após no-show)',       false, 2),
  ('cad_no_show', 2, 'whatsapp',  'FUP com nova data sugerida',                      false, 3),
  ('cad_no_show', 3, 'whatsapp',  'Opções de horário para reagendar',               false, 4),
  ('cad_no_show', 5, 'ligacao',   'Última tentativa de call',                        false, 5),
  ('cad_no_show', 7, 'whatsapp',  'Encerramento ou downsell',                        false, 6);
