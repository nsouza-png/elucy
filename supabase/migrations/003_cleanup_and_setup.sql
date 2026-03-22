-- ============================================================
-- Elucy Cockpit — Migração 003: Limpeza + Setup completo
-- Executa no SQL Editor do Supabase Dashboard
-- Projeto: tnbbsjvzwleeoqnxtafp
-- ============================================================
-- O QUE ESTE SCRIPT FAZ:
--   1. Remove tabelas spam nunca referenciadas no código
--   2. Cria lead_enrichments (contexto qualitativo do SDR)
--   3. Cria operator_tokens (chave por operador para G4 OS local)
--   4. Adiciona colunas spiced_score, enrichment_count na tabela deals
-- ============================================================


-- ── PARTE 1: REMOVER TABELAS NÃO USADAS ──────────────────────
-- elucy_cache: substituído pelo ELUCY_CACHE em memória no browser
-- copy_history: nunca referenciada no código
-- pending_users: fluxo de aprovação manual — feito direto via operators
DROP TABLE IF EXISTS public.elucy_cache CASCADE;
DROP TABLE IF EXISTS public.copy_history CASCADE;
DROP TABLE IF EXISTS public.pending_users CASCADE;


-- ── PARTE 2: TABELA lead_enrichments ─────────────────────────
-- SDR cola contexto qualitativo: WhatsApp, nota de call, transcrição
-- Worker Elucy lê + calcula SPICED score real (não heurístico)

CREATE TABLE IF NOT EXISTS public.lead_enrichments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         TEXT NOT NULL,
  operator_id     TEXT NOT NULL,
  operator_email  TEXT NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'nota',   -- whatsapp | nota | call | email
  conteudo        TEXT NOT NULL,
  spiced_score    INTEGER,                        -- calculado pelo worker (0-100)
  spiced_delta    INTEGER,                        -- variação vs score anterior
  processed       BOOLEAN DEFAULT FALSE,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrichments_deal
  ON public.lead_enrichments(deal_id, operator_id);
CREATE INDEX IF NOT EXISTS idx_enrichments_pending
  ON public.lead_enrichments(processed, created_at)
  WHERE processed = FALSE;

ALTER TABLE public.lead_enrichments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "enrichments_insert_own" ON public.lead_enrichments;
DROP POLICY IF EXISTS "enrichments_select_own" ON public.lead_enrichments;
DROP POLICY IF EXISTS "enrichments_update_service" ON public.lead_enrichments;

CREATE POLICY "enrichments_insert_own" ON public.lead_enrichments
  FOR INSERT WITH CHECK (operator_id = auth.uid()::text);
CREATE POLICY "enrichments_select_own" ON public.lead_enrichments
  FOR SELECT USING (operator_id = auth.uid()::text);
CREATE POLICY "enrichments_update_service" ON public.lead_enrichments
  FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_enrichments;


-- ── PARTE 3: TABELA operator_tokens ──────────────────────────
-- Chave de integração por operador para autenticação no G4 OS local
-- Token: elc_<uid8>_<hex48>

CREATE TABLE IF NOT EXISTS public.operator_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     TEXT NOT NULL UNIQUE,
  operator_email  TEXT NOT NULL,
  token           TEXT NOT NULL UNIQUE,
  label           TEXT DEFAULT 'default',
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  revoked         BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_tokens_active
  ON public.operator_tokens(token)
  WHERE revoked = FALSE;

ALTER TABLE public.operator_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tokens_select_own" ON public.operator_tokens;
DROP POLICY IF EXISTS "tokens_insert_own" ON public.operator_tokens;
DROP POLICY IF EXISTS "tokens_update_service" ON public.operator_tokens;

CREATE POLICY "tokens_select_own" ON public.operator_tokens
  FOR SELECT USING (operator_id = auth.uid()::text);
CREATE POLICY "tokens_insert_own" ON public.operator_tokens
  FOR INSERT WITH CHECK (operator_id = auth.uid()::text);
CREATE POLICY "tokens_update_service" ON public.operator_tokens
  FOR UPDATE USING (true);


-- ── PARTE 4: COLUNAS NOVAS em deals ──────────────────────────
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS spiced_score      INTEGER   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spiced_updated    TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enrichment_count  INTEGER   DEFAULT 0;


-- ── PARTE 5: FUNÇÃO generate_operator_token ──────────────────
CREATE OR REPLACE FUNCTION public.generate_operator_token()
RETURNS TEXT AS $$
DECLARE
  v_uid   TEXT := auth.uid()::text;
  v_email TEXT := auth.jwt()->>'email';
  v_token TEXT;
BEGIN
  v_token := 'elc_' || LEFT(REPLACE(v_uid, '-', ''), 8) || '_' || encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.operator_tokens (operator_id, operator_email, token)
  VALUES (v_uid, v_email, v_token)
  ON CONFLICT (operator_id) DO UPDATE
    SET token = EXCLUDED.token, revoked = FALSE, created_at = NOW();
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── VERIFICAÇÃO FINAL ─────────────────────────────────────────
-- Rode para confirmar que apenas as tabelas corretas existem:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- Esperado: cockpit_requests, cockpit_responses, deals, lead_enrichments, operator_tokens, operators
