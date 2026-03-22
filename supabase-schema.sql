-- ============================================================
-- ELUCY COCKPIT — Schema Supabase
-- Projeto: tnbbsjvzwleeoqnxtafp
-- Criado: 22/03/2026
-- ============================================================

-- ── 1. OPERATORS — cadastro de SDRs aprovados ───────────────
CREATE TABLE IF NOT EXISTS public.operators (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  qualificador_name TEXT,              -- nome exato no funil_comercial (mapeado manualmente)
  role             TEXT DEFAULT 'sdr', -- sdr | closer | cs | manager
  approved         BOOLEAN DEFAULT FALSE, -- aprovação manual pelo admin
  approved_by      TEXT,               -- email do admin que aprovou
  approved_at      TIMESTAMPTZ,
  last_login       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. DEALS — cache dos deals puxados do Databricks ─────────
CREATE TABLE IF NOT EXISTS public.deals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id                 TEXT NOT NULL,
  operator_email          TEXT NOT NULL REFERENCES public.operators(email),
  -- Campos do funil_comercial
  fase_atual_no_processo  TEXT,
  etapa_atual_no_pipeline TEXT,
  tier_da_oportunidade    TEXT,
  delta_t                 INTEGER,
  qualificador_name       TEXT,
  proprietario_name       TEXT,
  linha_de_receita_vigente TEXT,
  grupo_de_receita        TEXT,
  email_lead              TEXT,
  cargo                   TEXT,
  canal_de_marketing      TEXT,
  utm_medium              TEXT,
  status_do_deal          TEXT,
  created_at_crm          TIMESTAMPTZ,
  event_skipped           BOOLEAN,
  -- Metadados de sync
  synced_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, operator_email)
);

-- ── 3. ELUCY_CACHE — cache dos ELUCI REPORTs por deal ────────
CREATE TABLE IF NOT EXISTS public.elucy_cache (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id      TEXT NOT NULL,
  operator_email TEXT NOT NULL,
  report       TEXT NOT NULL,           -- ELUCI REPORT completo
  temp_score   INTEGER,                 -- temperatura calculada (0-100)
  cse_state    TEXT,                    -- estado CSE
  persona      TEXT,                    -- Titan/Builder/Executor
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '4 hours'),
  UNIQUE(deal_id, operator_email)
);

-- ── 4. COPY_HISTORY — histórico de copies geradas/enviadas ───
CREATE TABLE IF NOT EXISTS public.copy_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id        TEXT NOT NULL,
  operator_email TEXT NOT NULL,
  canal          TEXT NOT NULL,         -- WhatsApp | Instagram | CRM
  copy_wa        TEXT,
  copy_crm       TEXT,
  dvl_approved   BOOLEAN DEFAULT FALSE, -- passou pelo DVL Gate?
  sent           BOOLEAN DEFAULT FALSE, -- SDR marcou como enviado?
  generated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. PENDING_USERS — fila de aprovação manual ──────────────
CREATE TABLE IF NOT EXISTS public.pending_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status     TEXT DEFAULT 'pending'  -- pending | approved | rejected
);

-- ── ÍNDICES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_deals_operator ON public.deals(operator_email);
CREATE INDEX IF NOT EXISTS idx_deals_deal_id  ON public.deals(deal_id);
CREATE INDEX IF NOT EXISTS idx_cache_deal     ON public.elucy_cache(deal_id, operator_email);
CREATE INDEX IF NOT EXISTS idx_copy_deal      ON public.copy_history(deal_id, operator_email);
CREATE INDEX IF NOT EXISTS idx_pending_email  ON public.pending_users(email);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE public.operators    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elucy_cache  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Operators: cada SDR vê apenas seus próprios dados
CREATE POLICY "operators_self" ON public.operators
  FOR SELECT USING (email = auth.email());

-- Deals: SDR vê apenas seus deals
CREATE POLICY "deals_own" ON public.deals
  FOR ALL USING (operator_email = auth.email());

-- Elucy cache: SDR vê apenas seu cache
CREATE POLICY "cache_own" ON public.elucy_cache
  FOR ALL USING (operator_email = auth.email());

-- Copy history: SDR vê apenas suas copies
CREATE POLICY "copy_own" ON public.copy_history
  FOR ALL USING (operator_email = auth.email());

-- Pending users: apenas insert (auto-cadastro na fila)
CREATE POLICY "pending_insert" ON public.pending_users
  FOR INSERT WITH CHECK (true);

-- ── FUNÇÃO: verificar se usuário está aprovado ───────────────
CREATE OR REPLACE FUNCTION public.is_approved_operator()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.operators
    WHERE email = auth.email() AND approved = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ── FUNÇÃO: registrar usuário na fila de aprovação ───────────
CREATE OR REPLACE FUNCTION public.request_access(p_email TEXT, p_name TEXT)
RETURNS TEXT AS $$
BEGIN
  INSERT INTO public.pending_users (email, name)
  VALUES (p_email, p_name)
  ON CONFLICT (email) DO NOTHING;
  RETURN 'queued';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
