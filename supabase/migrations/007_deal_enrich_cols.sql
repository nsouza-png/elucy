-- 007 — Add missing CRM-relevant columns to deals table
-- These columns mirror funil_comercial + persons_overview fields
-- so the cockpit can display the same data as the CRM.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS revenue                NUMERIC   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contact_name           TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS valor_da_oportunidade  NUMERIC   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS probabilidade_de_previsao NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS faixa_de_faturamento   TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS nome_do_evento         TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_de_evento         TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS coproprietario_name    TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_de_conversao      TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS selfbooking            TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS p_telefone             TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS p_segmento             TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS p_cluster_rfm          TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS p_negociacoes_ganhas   INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS p_receita_total        NUMERIC   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS p_pa_cliente           TEXT      DEFAULT 'false',
  ADD COLUMN IF NOT EXISTS p_primeiro_produto     TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS p_ultimo_produto       TEXT      DEFAULT '',
  ADD COLUMN IF NOT EXISTS p_instagram            TEXT      DEFAULT '';

COMMENT ON COLUMN public.deals.revenue IS 'Valor real do deal (funil_comercial.revenue)';
COMMENT ON COLUMN public.deals.contact_name IS 'Nome do contato (persons_overview.nome ou funil_comercial.contact_name)';
COMMENT ON COLUMN public.deals.faixa_de_faturamento IS 'Faixa de faturamento da empresa (persons_overview)';
COMMENT ON COLUMN public.deals.p_telefone IS 'Telefone do lead (persons_overview)';
COMMENT ON COLUMN public.deals.p_instagram IS 'Instagram do lead (persons_overview)';
COMMENT ON COLUMN public.deals.p_receita_total IS 'LTV total no G4 (persons_overview.receita_total)';
