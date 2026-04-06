-- ============================================================
-- 035: WhatsApp Templates — Approved message templates catalog
-- Supports Elucy WhatsApp (Epic 2) — template-based messaging
-- ============================================================

create table if not exists public.wa_templates (
  id text primary key,
  name text not null,
  category text default 'UTILITY',
  body text not null,
  variables text[] default '{}',
  wa_status text default 'PENDING',
  language text default 'pt_BR',
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_wa_templates_status
  on public.wa_templates (wa_status);

-- RLS
alter table public.wa_templates enable row level security;

create policy "Anyone can read approved templates" on public.wa_templates
  for select to anon, authenticated using (true);

create policy "Authenticated users manage templates" on public.wa_templates
  for all to authenticated using (true) with check (true);

-- ============================================================
-- Seed: Default WA templates for cadence flows
-- ============================================================

insert into public.wa_templates (id, name, category, body, variables) values
  ('wa_first_contact',
   'Primeiro Contato',
   'UTILITY',
   'Olá {{1}}, tudo bem? Aqui é o {{2}} do G4 Educação. Vi que você demonstrou interesse no {{3}}. Posso te ajudar com mais informações?',
   ARRAY['nome', 'operador', 'produto']),
  ('wa_fup_link',
   'FUP Link Calendly',
   'UTILITY',
   'Oi {{1}}! Seguindo nosso contato — conseguiu ver o link que enviei? Se preferir, posso sugerir um horário que funcione melhor pra você.',
   ARRAY['nome']),
  ('wa_reagendamento',
   'Reagendamento No-Show',
   'UTILITY',
   'Oi {{1}}, sem problemas! Sei que a agenda aperta. Que tal remarcarmos? Tenho disponibilidade {{2}}. Qual funciona melhor?',
   ARRAY['nome', 'horarios']),
  ('wa_breakup',
   'Encerramento Elegante',
   'UTILITY',
   'Oi {{1}}, como não consegui contato, vou encerrar nosso atendimento por aqui. Se mudar de ideia, é só me chamar. Sucesso!',
   ARRAY['nome']),
  ('wa_valor',
   'Conteúdo de Valor',
   'MARKETING',
   'Oi {{1}}! Separei um material que pode te ajudar: {{2}}. Quero saber o que achou!',
   ARRAY['nome', 'link_conteudo'])
on conflict (id) do nothing;
