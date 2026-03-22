-- ============================================================
-- Elucy Cockpit — Migração 004: Novas colunas em deals
-- Campos do funil_comercial que faltavam + histórico persons_overview
-- Executa no SQL Editor do Supabase Dashboard
-- ============================================================

ALTER TABLE public.deals
  -- funil_comercial: novos campos
  ADD COLUMN IF NOT EXISTS perfil             TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_source         TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_campaign       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS motivo_lost        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS origem_do_deal     TEXT DEFAULT '',
  -- persons_overview: histórico de compras
  ADD COLUMN IF NOT EXISTS p_produtos_comprados    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS p_data_primeira_compra  TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS p_data_ultima_compra    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS p_comprou_scale         TEXT DEFAULT 'false',
  ADD COLUMN IF NOT EXISTS p_comprou_club          TEXT DEFAULT 'false';
