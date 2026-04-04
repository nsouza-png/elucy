-- ============================================================
-- MIGRATION 030 — ROA (Revenue Objective Achievement)
-- Quality Conversations + Five Whys + Coaching + Ramp + Intent
-- Ref: Conversation Intelligence + Behavioral Pipeline OS
-- ============================================================

-- ── P0: QUALITY CONVERSATIONS ────────────────────────────────
-- Core entity do ROA. Cada interacao significativa vira um registro.
-- Quality Conversation = has_new_information AND (pain OR authority OR urgency OR next_step)
CREATE TABLE IF NOT EXISTS quality_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id text NOT NULL,
  operator_email text NOT NULL,
  activity_id uuid,              -- ref para activity_log se existir
  note_analysis_id uuid,         -- ref para note_analysis que gerou o QC

  channel text NOT NULL DEFAULT 'call',  -- call | whatsapp | dm | email | meeting
  source_type text DEFAULT 'auto',       -- auto | manual | elucy_report

  -- Extraction flags (core ROA)
  has_new_information boolean DEFAULT false,
  extracted_pain boolean DEFAULT false,
  extracted_authority boolean DEFAULT false,
  extracted_urgency boolean DEFAULT false,
  extracted_next_step boolean DEFAULT false,

  -- Depth analysis
  depth_score numeric(5,2) DEFAULT 0,  -- 0-1

  -- Five Whys progression
  why_listen boolean DEFAULT false,
  why_care boolean DEFAULT false,
  why_change boolean DEFAULT false,
  why_you boolean DEFAULT false,
  why_now boolean DEFAULT false,
  why_stage text,  -- computed: listen | care | change | you | now

  -- Composite scores
  conversation_quality_score numeric(5,2) DEFAULT 0,  -- 0-1
  -- Formula: (0.30 * depth) + (0.20 * pain) + (0.15 * authority) + (0.15 * urgency) + (0.20 * next_step)

  is_quality_conversation boolean GENERATED ALWAYS AS (
    has_new_information AND (extracted_pain OR extracted_authority OR extracted_urgency OR extracted_next_step)
  ) STORED,

  -- Metadata
  raw_summary text,
  analysis_payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_deal ON quality_conversations(deal_id);
CREATE INDEX IF NOT EXISTS idx_qc_operator ON quality_conversations(operator_email);
CREATE INDEX IF NOT EXISTS idx_qc_is_quality ON quality_conversations(is_quality_conversation) WHERE is_quality_conversation = true;
CREATE INDEX IF NOT EXISTS idx_qc_created ON quality_conversations(created_at DESC);

-- ── P1: DEAL PSYCHOLOGICAL PROGRESS (Five Whys Engine) ───────
-- Estado corrente do deal na progressao cognitiva do buyer.
-- Um registro por deal (upsert).
CREATE TABLE IF NOT EXISTS deal_psychological_progress (
  deal_id text PRIMARY KEY,
  operator_email text NOT NULL,

  why_listen numeric(5,2) DEFAULT 0,   -- 0-1: buyer entende por que ouvir
  why_care numeric(5,2) DEFAULT 0,     -- 0-1: buyer se importa com o problema
  why_change numeric(5,2) DEFAULT 0,   -- 0-1: buyer aceita que precisa mudar
  why_you numeric(5,2) DEFAULT 0,      -- 0-1: buyer entende por que G4
  why_now numeric(5,2) DEFAULT 0,      -- 0-1: buyer sente urgencia

  stage text,  -- listen | care | change | you | now | ready
  stage_confidence numeric(5,2) DEFAULT 0,

  -- Kill switch flags
  premature_meeting boolean DEFAULT false,  -- why_care < 0.5 AND meeting_scheduled
  premature_proposal boolean DEFAULT false, -- why_change < 0.5 AND proposal_sent
  skipped_stage boolean DEFAULT false,      -- gap > 0.3 entre stages adjacentes

  last_qc_id uuid,
  qc_count int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- ── P2: COACHING EVENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS coaching_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_email text NOT NULL,
  deal_id text,

  type text NOT NULL DEFAULT 'suggestion',  -- correction | suggestion | alert | review
  category text,     -- tone | questions | framework | objection_handling | closing
  description text,
  duration_equivalent numeric(5,1) DEFAULT 5,  -- minutos equivalentes

  source text DEFAULT 'elucy',  -- elucy | manager | self
  impact_score numeric(5,2),    -- delta conversion rate (calculado depois)

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_operator ON coaching_events(operator_email);
CREATE INDEX IF NOT EXISTS idx_coaching_deal ON coaching_events(deal_id);

-- ── P2: OPERATOR RAMP ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operator_ramp (
  operator_email text PRIMARY KEY,

  start_date date NOT NULL DEFAULT CURRENT_DATE,
  ramp_stage text DEFAULT 'week1',  -- week1 | week2 | month1 | month2 | graduated

  complexity_level numeric(5,2) DEFAULT 0.2,  -- 0-1: que nivel de complexidade liberar
  expected_score numeric(5,2) DEFAULT 0.3,    -- score esperado para o stage

  -- Feature gates (o que o SDR pode acessar)
  gate_tone boolean DEFAULT true,
  gate_questions boolean DEFAULT true,
  gate_framework boolean DEFAULT false,
  gate_signals boolean DEFAULT false,
  gate_objections boolean DEFAULT false,
  gate_advanced boolean DEFAULT false,

  graduated_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- ── P3: LEAD INTENT ANALYSIS (Time Waster Detector) ─────────
CREATE TABLE IF NOT EXISTS lead_intent_analysis (
  deal_id text PRIMARY KEY,
  operator_email text NOT NULL,

  reciprocity_score numeric(5,2) DEFAULT 0.5,  -- info_given / info_requested
  info_extraction_ratio numeric(5,2) DEFAULT 0,
  curiosity_risk boolean DEFAULT false,

  classification text DEFAULT 'unknown',  -- buyer | curious | time_waster | undetermined
  classification_confidence numeric(5,2) DEFAULT 0,

  signals_used jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intent_classification ON lead_intent_analysis(classification);

-- ── P3: MCP INJECTIONS LOG ───────────────────────────────────
CREATE TABLE IF NOT EXISTS mcp_injections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id text,
  operator_email text,

  persona text,
  framework text,

  suggestion_type text,  -- playbook | objection_handler | talk_track | question
  mcp_doc_id text,       -- which MCP doc was injected
  used boolean DEFAULT false,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_deal ON mcp_injections(deal_id);

-- ── ENABLE RLS ───────────────────────────────────────────────
ALTER TABLE quality_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_psychological_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_ramp ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_intent_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_injections ENABLE ROW LEVEL SECURITY;

-- Policies: operators can read/write their own data
CREATE POLICY qc_all ON quality_conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY dpp_all ON deal_psychological_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY ce_all ON coaching_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY or_all ON operator_ramp FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY lia_all ON lead_intent_analysis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY mi_all ON mcp_injections FOR ALL USING (true) WITH CHECK (true);
