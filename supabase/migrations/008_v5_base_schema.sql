-- ============================================================
-- ELUCY COCKPIT — Schema Supabase
-- Projeto: tnbbsjvzwleeoqnxtafp
-- Criado: 22/03/2026
-- ============================================================

-- ── 1. OPERATORS — cadastro de SDRs aprovados ───────────────
CREATE TABLE IF NOT EXISTS api.operators (
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
CREATE TABLE IF NOT EXISTS api.deals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id                 TEXT NOT NULL,
  operator_email          TEXT NOT NULL REFERENCES api.operators(email),
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
CREATE TABLE IF NOT EXISTS api.elucy_cache (
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
CREATE TABLE IF NOT EXISTS api.copy_history (
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
CREATE TABLE IF NOT EXISTS api.pending_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status     TEXT DEFAULT 'pending'  -- pending | approved | rejected
);

-- ── ÍNDICES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_deals_operator ON api.deals(operator_email);
CREATE INDEX IF NOT EXISTS idx_deals_deal_id  ON api.deals(deal_id);
CREATE INDEX IF NOT EXISTS idx_cache_deal     ON api.elucy_cache(deal_id, operator_email);
CREATE INDEX IF NOT EXISTS idx_copy_deal      ON api.copy_history(deal_id, operator_email);
CREATE INDEX IF NOT EXISTS idx_pending_email  ON api.pending_users(email);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE api.operators    ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.deals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.elucy_cache  ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.copy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.pending_users ENABLE ROW LEVEL SECURITY;

-- Operators: cada SDR vê apenas seus próprios dados
DO $$ BEGIN
  CREATE POLICY "operators_self" ON api.operators
    FOR SELECT USING (email = auth.email());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Deals: SDR vê apenas seus deals
DO $$ BEGIN
  CREATE POLICY "deals_own" ON api.deals
    FOR ALL USING (operator_email = auth.email());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Elucy cache: SDR vê apenas seu cache
DO $$ BEGIN
  CREATE POLICY "cache_own" ON api.elucy_cache
    FOR ALL USING (operator_email = auth.email());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Copy history: SDR vê apenas suas copies
DO $$ BEGIN
  CREATE POLICY "copy_own" ON api.copy_history
    FOR ALL USING (operator_email = auth.email());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Pending users: apenas insert (auto-cadastro na fila)
DO $$ BEGIN
  CREATE POLICY "pending_insert" ON api.pending_users
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── FUNÇÃO: verificar se usuário está aprovado ───────────────
CREATE OR REPLACE FUNCTION api.is_approved_operator()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM api.operators
    WHERE email = auth.email() AND approved = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ── FUNÇÃO: registrar usuário na fila de aprovação ───────────
CREATE OR REPLACE FUNCTION api.request_access(p_email TEXT, p_name TEXT)
RETURNS TEXT AS $$
BEGIN
  INSERT INTO api.pending_users (email, name)
  VALUES (p_email, p_name)
  ON CONFLICT (email) DO NOTHING;
  RETURN 'queued';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
