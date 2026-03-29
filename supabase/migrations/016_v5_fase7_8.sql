-- =============================================================
-- ELUCY V5 — FASE 7: Identity Extensions + FASE 8: Forecast Engine
-- Data: 2026-03-25
-- Tabelas: accounts, contacts, teams, note_analysis, forecast_runtime, deal_enrichments
-- =============================================================

-- -----------------------------------------------
-- FASE 7.1 — accounts (empresas/contas)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name TEXT NOT NULL,
  cnpj TEXT,
  domain TEXT,
  segment TEXT,
  industry TEXT,
  porte TEXT,
  employee_count INT,
  annual_revenue NUMERIC(14,2),
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'BR',
  icp_score NUMERIC(5,2) DEFAULT 0,
  icp_tier TEXT,
  tags TEXT[] DEFAULT '{}',
  crm_account_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acc_name ON public.accounts(account_name);
CREATE INDEX IF NOT EXISTS idx_acc_cnpj ON public.accounts(cnpj);
CREATE INDEX IF NOT EXISTS idx_acc_segment ON public.accounts(segment);
CREATE INDEX IF NOT EXISTS idx_acc_icp ON public.accounts(icp_tier);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acc_public_access" ON public.accounts;
CREATE POLICY "acc_public_access" ON public.accounts FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- FASE 7.2 — contacts (contatos de deals)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.accounts(id),
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  instagram_handle TEXT,
  linkedin_url TEXT,
  cargo TEXT,
  role_type TEXT,
  decision_maker BOOLEAN DEFAULT false,
  champion BOOLEAN DEFAULT false,
  authority_score NUMERIC(5,2) DEFAULT 50,
  preferred_channel TEXT DEFAULT 'whatsapp',
  preferred_time TEXT,
  tags TEXT[] DEFAULT '{}',
  crm_contact_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_con_account ON public.contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_con_name ON public.contacts(contact_name);
CREATE INDEX IF NOT EXISTS idx_con_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_con_phone ON public.contacts(phone);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "con_public_access" ON public.contacts;
CREATE POLICY "con_public_access" ON public.contacts FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- FASE 7.3 — teams (squads)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_slug TEXT NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  team_type TEXT DEFAULT 'sdr',
  manager_email TEXT,
  members TEXT[] DEFAULT '{}',
  target_monthly JSONB DEFAULT '{}',
  active_lines TEXT[] DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.teams (team_slug, team_name, team_type, members, active_lines) VALUES
('sdr-core','SDR Core','sdr','{n.souza@g4educacao.com,v.a.fernandes@g4educacao.com}','{imersao,social_dm,digital,eventos}')
ON CONFLICT (team_slug) DO NOTHING;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teams_public_access" ON public.teams;
CREATE POLICY "teams_public_access" ON public.teams FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- FASE 8.1 — note_analysis (analise qualitativa de notas)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.note_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id TEXT NOT NULL,
  operator_email TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'crm_note',

  -- Texto original
  raw_text TEXT NOT NULL,
  cleaned_text TEXT,

  -- Analise
  sentiment TEXT,
  confidence NUMERIC(4,2) DEFAULT 0,
  intent_detected TEXT,
  objections TEXT[] DEFAULT '{}',
  commitments TEXT[] DEFAULT '{}',
  next_steps_extracted TEXT[] DEFAULT '{}',
  pain_points TEXT[] DEFAULT '{}',
  decision_criteria TEXT[] DEFAULT '{}',

  -- SPICED extraction
  spiced_situation TEXT,
  spiced_pain TEXT,
  spiced_impact TEXT,
  spiced_critical_event TEXT,
  spiced_decision TEXT,

  -- Scores
  depth_score NUMERIC(5,2) DEFAULT 0,
  quality_score NUMERIC(5,2) DEFAULT 0,
  advancement_signal BOOLEAN DEFAULT false,

  -- Impact no forecast
  forecast_impact NUMERIC(5,2) DEFAULT 0,
  forecast_direction TEXT DEFAULT 'neutral',

  -- Meta
  analyzed_by TEXT DEFAULT 'elucy',
  analysis_payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_na_deal ON public.note_analysis(deal_id);
CREATE INDEX IF NOT EXISTS idx_na_operator ON public.note_analysis(operator_email);
CREATE INDEX IF NOT EXISTS idx_na_sentiment ON public.note_analysis(sentiment);
CREATE INDEX IF NOT EXISTS idx_na_date ON public.note_analysis(created_at DESC);

ALTER TABLE public.note_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "na_public_access" ON public.note_analysis;
CREATE POLICY "na_public_access" ON public.note_analysis FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- FASE 8.2 — forecast_runtime (score de forecast ajustado)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.forecast_runtime (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id TEXT NOT NULL,
  operator_email TEXT NOT NULL,

  -- Forecast quantitativo (do deal_runtime)
  stage_probability NUMERIC(4,2) DEFAULT 0,
  aging_factor NUMERIC(4,2) DEFAULT 1.0,
  velocity_factor NUMERIC(4,2) DEFAULT 1.0,
  engagement_factor NUMERIC(4,2) DEFAULT 1.0,
  quantitative_score NUMERIC(5,2) DEFAULT 0,

  -- Forecast qualitativo (das note_analysis)
  note_sentiment_avg NUMERIC(4,2) DEFAULT 0,
  objection_count INT DEFAULT 0,
  commitment_count INT DEFAULT 0,
  advancement_signals INT DEFAULT 0,
  spiced_completeness NUMERIC(4,2) DEFAULT 0,
  qualitative_score NUMERIC(5,2) DEFAULT 0,

  -- Score combinado
  raw_score NUMERIC(5,2) DEFAULT 0,
  adjusted_score NUMERIC(5,2) DEFAULT 0,
  adjustment_reason TEXT,

  -- Confianca
  confidence_level TEXT DEFAULT 'low',
  data_points_count INT DEFAULT 0,

  -- Previsao
  predicted_outcome TEXT,
  predicted_close_date DATE,
  predicted_value NUMERIC(14,2) DEFAULT 0,

  -- Historico
  score_history JSONB DEFAULT '[]',
  last_note_analyzed_at TIMESTAMPTZ,

  -- Meta
  formula_version TEXT DEFAULT 'v5.0',
  runtime_payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(deal_id, operator_email)
);

CREATE INDEX IF NOT EXISTS idx_fr_deal ON public.forecast_runtime(deal_id);
CREATE INDEX IF NOT EXISTS idx_fr_operator ON public.forecast_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_fr_score ON public.forecast_runtime(adjusted_score DESC);
CREATE INDEX IF NOT EXISTS idx_fr_outcome ON public.forecast_runtime(predicted_outcome);

ALTER TABLE public.forecast_runtime ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fr_public_access" ON public.forecast_runtime;
CREATE POLICY "fr_public_access" ON public.forecast_runtime FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.forecast_runtime;

-- -----------------------------------------------
-- FASE 9 — deal_enrichments (bonus)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.deal_enrichments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id TEXT NOT NULL,
  operator_email TEXT,
  enrichment_type TEXT NOT NULL,
  enrichment_source TEXT DEFAULT 'elucy',
  data_payload JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC(4,2) DEFAULT 0,
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_de_deal ON public.deal_enrichments(deal_id);
CREATE INDEX IF NOT EXISTS idx_de_type ON public.deal_enrichments(enrichment_type);

ALTER TABLE public.deal_enrichments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "de_public_access" ON public.deal_enrichments;
CREATE POLICY "de_public_access" ON public.deal_enrichments FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- Trigger: auto-update forecast quando note_analysis é inserida
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.on_note_analyzed()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar forecast_runtime com dados da nota
  INSERT INTO public.forecast_runtime (deal_id, operator_email, last_note_analyzed_at)
  VALUES (NEW.deal_id, NEW.operator_email, NEW.created_at)
  ON CONFLICT (deal_id, operator_email) DO UPDATE SET
    note_sentiment_avg = (
      SELECT COALESCE(AVG(
        CASE sentiment WHEN 'positive' THEN 1.0 WHEN 'neutral' THEN 0.5 WHEN 'negative' THEN 0.0 ELSE 0.5 END
      ), 0.5)
      FROM public.note_analysis WHERE deal_id = NEW.deal_id
    ),
    objection_count = (SELECT COUNT(*) FROM public.note_analysis WHERE deal_id = NEW.deal_id AND array_length(objections, 1) > 0),
    commitment_count = (SELECT COUNT(*) FROM public.note_analysis WHERE deal_id = NEW.deal_id AND array_length(commitments, 1) > 0),
    advancement_signals = (SELECT COUNT(*) FROM public.note_analysis WHERE deal_id = NEW.deal_id AND advancement_signal = true),
    data_points_count = (SELECT COUNT(*) FROM public.note_analysis WHERE deal_id = NEW.deal_id),
    last_note_analyzed_at = NEW.created_at,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_note_forecast_update') THEN
    CREATE TRIGGER trg_note_forecast_update
      AFTER INSERT ON public.note_analysis
      FOR EACH ROW
      EXECUTE FUNCTION public.on_note_analyzed();
  END IF;
END $$;
