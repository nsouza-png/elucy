-- ============================================================
-- Elucy Cockpit — Migração 002: Lead Enrichment + Operator Tokens
-- Executa no SQL Editor do Supabase Dashboard
-- ============================================================

-- ── 1. TABELA: lead_enrichments ──────────────────────────────
-- SDR cola contexto qualitativo: WhatsApp, nota de call, transcrição
-- O worker Elucy lê essa tabela junto com os dados do deal
-- para calcular o SPICED score real (temperatura de lead)

CREATE TABLE IF NOT EXISTS public.lead_enrichments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         TEXT NOT NULL,
  operator_id     TEXT NOT NULL,            -- auth.uid() do SDR
  operator_email  TEXT NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'nota',
                                            -- 'whatsapp' | 'nota' | 'call' | 'email'
  conteudo        TEXT NOT NULL,            -- texto colado pelo SDR
  spiced_score    INTEGER,                  -- score calculado pelo Elucy (0-100) após análise
  spiced_delta    INTEGER,                  -- variação vs score anterior
  processed       BOOLEAN DEFAULT FALSE,    -- worker já leu e processou?
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_enrichments_deal
  ON public.lead_enrichments(deal_id, operator_id);
CREATE INDEX IF NOT EXISTS idx_enrichments_unprocessed
  ON public.lead_enrichments(processed, created_at)
  WHERE processed = FALSE;

-- RLS
ALTER TABLE public.lead_enrichments ENABLE ROW LEVEL SECURITY;

-- SDR insere seus próprios enriquecimentos
CREATE POLICY "enrichments_insert_own" ON public.lead_enrichments
  FOR INSERT WITH CHECK (operator_id = auth.uid()::text);

-- SDR lê apenas seus enriquecimentos
CREATE POLICY "enrichments_select_own" ON public.lead_enrichments
  FOR SELECT USING (operator_id = auth.uid()::text);

-- Service role (worker) pode atualizar (marcar processed=true, gravar spiced_score)
CREATE POLICY "enrichments_update_service" ON public.lead_enrichments
  FOR UPDATE USING (true);

-- Realtime: SDR vê quando o score é atualizado pelo worker
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_enrichments;


-- ── 2. TABELA: operator_tokens ───────────────────────────────
-- Chave de integração por operador: permite que o Cockpit
-- autentique direto no G4 OS do operador (LLM local)
-- Token formato: elc_<operator_id_prefix>_<random32>

CREATE TABLE IF NOT EXISTS public.operator_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     TEXT NOT NULL UNIQUE,     -- auth.uid() do operador
  operator_email  TEXT NOT NULL,
  token           TEXT NOT NULL UNIQUE,     -- elc_<uid8>_<random32>
  label           TEXT DEFAULT 'default',   -- nome do dispositivo/contexto
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  revoked         BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_tokens_token
  ON public.operator_tokens(token)
  WHERE revoked = FALSE;

-- RLS
ALTER TABLE public.operator_tokens ENABLE ROW LEVEL SECURITY;

-- Operador lê apenas seu próprio token
CREATE POLICY "tokens_select_own" ON public.operator_tokens
  FOR SELECT USING (operator_id = auth.uid()::text);

-- Operador insere seu próprio token
CREATE POLICY "tokens_insert_own" ON public.operator_tokens
  FOR INSERT WITH CHECK (operator_id = auth.uid()::text);

-- Service role pode atualizar last_used_at
CREATE POLICY "tokens_update_service" ON public.operator_tokens
  FOR UPDATE USING (true);


-- ── 3. FUNÇÃO: gerar token de operador ───────────────────────
CREATE OR REPLACE FUNCTION public.generate_operator_token()
RETURNS TEXT AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_email TEXT := auth.jwt()->>'email';
  v_token TEXT;
  v_prefix TEXT;
BEGIN
  -- Prefixo: primeiros 8 chars do uid sem hifens
  v_prefix := LEFT(REPLACE(v_uid, '-', ''), 8);
  -- Token: elc_ + prefix + _ + 32 chars aleatórios
  v_token := 'elc_' || v_prefix || '_' || encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.operator_tokens (operator_id, operator_email, token)
  VALUES (v_uid, v_email, v_token)
  ON CONFLICT (operator_id) DO UPDATE
    SET token = EXCLUDED.token,
        revoked = FALSE,
        created_at = NOW();

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 4. FUNÇÃO: resolver token → operator_id ──────────────────
-- Usada pelo worker para validar requisições com token
CREATE OR REPLACE FUNCTION public.resolve_operator_token(p_token TEXT)
RETURNS TABLE(operator_id TEXT, operator_email TEXT) AS $$
BEGIN
  UPDATE public.operator_tokens
  SET last_used_at = NOW()
  WHERE token = p_token AND revoked = FALSE;

  RETURN QUERY
  SELECT ot.operator_id, ot.operator_email
  FROM public.operator_tokens ot
  WHERE ot.token = p_token AND ot.revoked = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 5. COLUNA: spiced_score na tabela deals ───────────────────
-- Score agregado calculado pelo Elucy com base nos enrichments
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS spiced_score   INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spiced_updated TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enrichment_count INTEGER DEFAULT 0;


-- ── 6. COLUNA: spiced_score na tabela elucy_cache ────────────
-- Cache do report já incluía temp_score; garantir que existe
ALTER TABLE public.elucy_cache
  ADD COLUMN IF NOT EXISTS spiced_score   INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS enrichment_ids TEXT[]  DEFAULT '{}';
