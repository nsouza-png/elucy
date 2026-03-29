-- ============================================================
-- FIX: Move tabelas de api → public (schema exposta pelo PostgREST)
-- Cole e rode no SQL Editor do Supabase
-- ============================================================

-- Recria tudo na schema public (ignora se já existe)

CREATE TABLE IF NOT EXISTS public.operators (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  qualificador_name TEXT,
  role             TEXT DEFAULT 'sdr',
  approved         BOOLEAN DEFAULT FALSE,
  approved_by      TEXT,
  approved_at      TIMESTAMPTZ,
  last_login       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id                 TEXT NOT NULL,
  operator_email          TEXT NOT NULL,
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
  synced_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, operator_email)
);

CREATE TABLE IF NOT EXISTS public.elucy_cache (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id        TEXT NOT NULL,
  operator_email TEXT NOT NULL,
  report         TEXT NOT NULL,
  temp_score     INTEGER,
  cse_state      TEXT,
  persona        TEXT,
  generated_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '4 hours'),
  UNIQUE(deal_id, operator_email)
);

CREATE TABLE IF NOT EXISTS public.copy_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id        TEXT NOT NULL,
  operator_email TEXT NOT NULL,
  canal          TEXT NOT NULL,
  copy_wa        TEXT,
  copy_crm       TEXT,
  dvl_approved   BOOLEAN DEFAULT FALSE,
  sent           BOOLEAN DEFAULT FALSE,
  generated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pending_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  name         TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status       TEXT DEFAULT 'pending'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_deals_operator ON public.deals(operator_email);
CREATE INDEX IF NOT EXISTS idx_deals_deal_id  ON public.deals(deal_id);
CREATE INDEX IF NOT EXISTS idx_cache_deal     ON public.elucy_cache(deal_id, operator_email);
CREATE INDEX IF NOT EXISTS idx_copy_deal      ON public.copy_history(deal_id, operator_email);
CREATE INDEX IF NOT EXISTS idx_pending_email  ON public.pending_users(email);

-- RLS
ALTER TABLE public.operators    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elucy_cache  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Policies (idempotentes)
DO $$ BEGIN
  CREATE POLICY "operators_self" ON public.operators FOR SELECT USING (email = auth.email());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "deals_own" ON public.deals FOR ALL USING (operator_email = auth.email());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cache_own" ON public.elucy_cache FOR ALL USING (operator_email = auth.email());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "copy_own" ON public.copy_history FOR ALL USING (operator_email = auth.email());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "pending_insert" ON public.pending_users FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Primeiro operador: Nathan Souza (aprovado)
INSERT INTO public.operators (email, name, qualificador_name, role, approved, approved_by, approved_at)
VALUES ('n.souza@g4educacao.com', 'Nathan Souza', 'Nathan Souza', 'sdr', true, 'admin', NOW())
ON CONFLICT (email) DO UPDATE SET approved = true, qualificador_name = 'Nathan Souza';
