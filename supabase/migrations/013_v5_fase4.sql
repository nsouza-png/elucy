-- =============================================================
-- ELUCY V5 — FASE 4: Social DM Pipeline
-- Data: 2026-03-25
-- Tabelas: social_dm_runtime (NOVA), social_dm_touchpoints (NOVA), social_dm_sequences (NOVA)
-- ALTER social_dm_leads para V5
-- =============================================================

-- -----------------------------------------------
-- 1. ALTER social_dm_leads — adicionar colunas V5
-- -----------------------------------------------
ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS operator_email TEXT;

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS source_channel TEXT DEFAULT 'instagram';

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS deal_id TEXT;

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS company_name TEXT;

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS company_segment TEXT;

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS estimated_revenue NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS icp_score NUMERIC(5,2) DEFAULT 0;

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS lost_reason TEXT;

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS last_touchpoint_at TIMESTAMPTZ;

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS touchpoint_count INT DEFAULT 0;

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS sequence_id UUID;

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS sequence_step INT DEFAULT 0;

ALTER TABLE public.social_dm_leads
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_sdl_operator ON public.social_dm_leads(operator_email);
CREATE INDEX IF NOT EXISTS idx_sdl_status ON public.social_dm_leads(status);
CREATE INDEX IF NOT EXISTS idx_sdl_deal ON public.social_dm_leads(deal_id);

-- -----------------------------------------------
-- 2. social_dm_runtime — estado vivo de cada lead DM
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_dm_runtime (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.social_dm_leads(id) ON DELETE CASCADE,
  operator_email TEXT NOT NULL,

  -- Estado atual
  current_status TEXT NOT NULL DEFAULT 'identified',
  temperature INT DEFAULT 0,           -- 0-100 quao quente esta o lead
  engagement_score NUMERIC(5,2) DEFAULT 0,
  response_rate NUMERIC(5,2) DEFAULT 0,  -- % de respostas do lead
  avg_response_time_min INT DEFAULT 0,

  -- Sequencia
  active_sequence_id UUID,
  current_step INT DEFAULT 0,
  next_step_at TIMESTAMPTZ,
  sequence_paused BOOLEAN DEFAULT false,

  -- Sinais
  signal_state TEXT DEFAULT 'NEUTRAL',  -- NEUTRAL | WARM | HOT | DOME
  risk_state TEXT DEFAULT 'none',       -- none | medium | high | critical
  last_signal TEXT,
  last_signal_at TIMESTAMPTZ,

  -- Copy intelligence
  copies_sent INT DEFAULT 0,
  copies_opened INT DEFAULT 0,
  copies_replied INT DEFAULT 0,
  best_channel TEXT DEFAULT 'instagram',
  best_time_of_day TEXT,                -- morning | afternoon | evening

  -- NBA
  next_best_action TEXT,
  nba_reason TEXT,

  -- Meta
  runtime_payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(lead_id, operator_email)
);

CREATE INDEX IF NOT EXISTS idx_sdmr_operator ON public.social_dm_runtime(operator_email);
CREATE INDEX IF NOT EXISTS idx_sdmr_status ON public.social_dm_runtime(current_status);
CREATE INDEX IF NOT EXISTS idx_sdmr_signal ON public.social_dm_runtime(signal_state);
CREATE INDEX IF NOT EXISTS idx_sdmr_sequence ON public.social_dm_runtime(active_sequence_id);

ALTER TABLE public.social_dm_runtime ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sdmr_public_access" ON public.social_dm_runtime;
CREATE POLICY "sdmr_public_access" ON public.social_dm_runtime FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.social_dm_runtime;

-- -----------------------------------------------
-- 3. social_dm_touchpoints — timeline de interacoes
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_dm_touchpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.social_dm_leads(id) ON DELETE CASCADE,
  operator_email TEXT NOT NULL,
  touchpoint_number INT NOT NULL DEFAULT 1,

  -- Tipo e canal
  touchpoint_type TEXT NOT NULL,        -- outbound_dm | reply | story_reaction | comment | call | whatsapp | email
  channel TEXT DEFAULT 'instagram',     -- instagram | linkedin | twitter | whatsapp | email | phone
  direction TEXT DEFAULT 'outbound',    -- outbound | inbound

  -- Conteudo
  content_preview TEXT,                 -- primeiros 200 chars
  copy_used TEXT,                       -- copy completa enviada (se outbound)
  copy_framework TEXT,                  -- challenger | spiced | spin | founder_voice

  -- Resultado
  was_read BOOLEAN DEFAULT false,
  was_replied BOOLEAN DEFAULT false,
  reply_time_min INT,                   -- minutos ate resposta do lead
  sentiment TEXT,                       -- positive | neutral | negative | objection

  -- Sequencia
  sequence_id UUID,
  sequence_step INT,

  -- Meta
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sdtp_lead ON public.social_dm_touchpoints(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sdtp_operator ON public.social_dm_touchpoints(operator_email);
CREATE INDEX IF NOT EXISTS idx_sdtp_type ON public.social_dm_touchpoints(touchpoint_type);
CREATE INDEX IF NOT EXISTS idx_sdtp_channel ON public.social_dm_touchpoints(channel);

ALTER TABLE public.social_dm_touchpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sdtp_public_access" ON public.social_dm_touchpoints;
CREATE POLICY "sdtp_public_access" ON public.social_dm_touchpoints FOR ALL USING (true) WITH CHECK (true);

-- -----------------------------------------------
-- 4. social_dm_sequences — templates de sequencia automatizada
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_dm_sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_slug TEXT NOT NULL UNIQUE,
  sequence_name TEXT NOT NULL,
  description TEXT,

  -- Configuracao
  target_persona TEXT,                  -- titan | builder | executor | all
  target_channel TEXT DEFAULT 'instagram',
  total_steps INT DEFAULT 5,
  cadence_days INT DEFAULT 10,         -- duracao total em dias

  -- Steps (array de objetos)
  steps JSONB NOT NULL DEFAULT '[]',
  -- Formato: [{ "step": 1, "day": 0, "channel": "instagram", "action": "DM de abertura", "copy_template": "...", "framework": "founder_voice" }]

  -- Performance
  total_enrolled INT DEFAULT 0,
  total_completed INT DEFAULT 0,
  total_converted INT DEFAULT 0,
  avg_reply_rate NUMERIC(5,2) DEFAULT 0,
  avg_conversion_rate NUMERIC(5,2) DEFAULT 0,

  -- Meta
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.social_dm_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sdseq_public_access" ON public.social_dm_sequences;
CREATE POLICY "sdseq_public_access" ON public.social_dm_sequences FOR ALL USING (true) WITH CHECK (true);

-- Seed sequencias padrao (baseadas nas cadencias do engine)
INSERT INTO public.social_dm_sequences (sequence_slug, sequence_name, description, target_persona, total_steps, cadence_days, steps, created_by) VALUES
(
  'dm-founder-opener',
  'DM Founder — Opener',
  'Sequencia 10 dias — Instagram + WhatsApp intercalado com tom de founder',
  'all',
  6,
  10,
  '[
    {"step":1,"day":0,"channel":"instagram","action":"DM de abertura — perfil","framework":"founder_voice","copy_template":"Abertura casual referenciando perfil do lead"},
    {"step":2,"day":2,"channel":"instagram","action":"DM de valor — conteúdo","framework":"founder_voice","copy_template":"Compartilhar insight relevante ao segmento"},
    {"step":3,"day":4,"channel":"whatsapp","action":"WhatsApp — ponte do IG","framework":"challenger","copy_template":"Ponte natural do IG para WA com provocação"},
    {"step":4,"day":6,"channel":"instagram","action":"DM — prova social","framework":"founder_voice","copy_template":"Case de resultado sem mencionar G4"},
    {"step":5,"day":8,"channel":"phone","action":"Ligação — fechamento","framework":"spin","copy_template":"Call direto para agendar"},
    {"step":6,"day":10,"channel":"whatsapp","action":"WhatsApp — última chance","framework":"challenger","copy_template":"Tensão de custo de inação"}
  ]'::jsonb,
  'system'
),
(
  'dm-reativacao',
  'DM Reativação',
  'Sequencia de reengajamento para leads frios via social',
  'all',
  5,
  14,
  '[
    {"step":1,"day":0,"channel":"instagram","action":"Story reaction + DM casual","framework":"founder_voice","copy_template":"Reagir a story e puxar conversa"},
    {"step":2,"day":3,"channel":"instagram","action":"DM com case relevante","framework":"challenger","copy_template":"Caso de sucesso alinhado ao segmento"},
    {"step":3,"day":6,"channel":"whatsapp","action":"WhatsApp — retomar conversa","framework":"spin","copy_template":"Referência à conversa anterior"},
    {"step":4,"day":10,"channel":"instagram","action":"DM — pergunta provocativa","framework":"challenger","copy_template":"Pergunta sobre dor específica do mercado"},
    {"step":5,"day":14,"channel":"phone","action":"Ligação de reengajamento","framework":"spin","copy_template":"Call direto — decisão"}
  ]'::jsonb,
  'system'
),
(
  'dm-cql-qualifier',
  'DM CQL Qualifier',
  'Qualificação rápida via DM — identificar CQL em 5 touchpoints',
  'titan',
  5,
  7,
  '[
    {"step":1,"day":0,"channel":"instagram","action":"DM — abertura com autoridade","framework":"challenger","copy_template":"Provocação sobre mercado do lead"},
    {"step":2,"day":1,"channel":"instagram","action":"DM — aprofundar dor","framework":"spin","copy_template":"Pergunta Situation+Problem"},
    {"step":3,"day":3,"channel":"instagram","action":"DM — validar urgência","framework":"spiced","copy_template":"Mapear Critical Event"},
    {"step":4,"day":5,"channel":"whatsapp","action":"WhatsApp — proposta de call","framework":"challenger","copy_template":"Ponte para agendar call qualificado"},
    {"step":5,"day":7,"channel":"phone","action":"Call de qualificação","framework":"spin","copy_template":"SPIN completo — validar BANT"}
  ]'::jsonb,
  'system'
)
ON CONFLICT (sequence_slug) DO NOTHING;

-- -----------------------------------------------
-- 5. Trigger: atualizar touchpoint_count e last_touchpoint_at em social_dm_leads
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.update_dm_lead_touchpoint_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.social_dm_leads
  SET touchpoint_count = (SELECT COUNT(*) FROM public.social_dm_touchpoints WHERE lead_id = NEW.lead_id),
      last_touchpoint_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dm_touchpoint_stats') THEN
    CREATE TRIGGER trg_dm_touchpoint_stats
      AFTER INSERT ON public.social_dm_touchpoints
      FOR EACH ROW
      EXECUTE FUNCTION public.update_dm_lead_touchpoint_stats();
  END IF;
END $$;
