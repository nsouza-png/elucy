-- ==================================================================
-- ELUCY ENTERPRISE — PHASE 2: Audit Log + pgvector Embeddings
-- Executar no Supabase SQL Editor
-- ==================================================================

-- ==========================================
-- 1. AUDIT LOG — rastreia cada tool call
-- ==========================================
CREATE TABLE IF NOT EXISTS elucy_audit_log (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now(),
  tool_name     text        NOT NULL,
  operator_email text,
  deal_id       text,
  input_params  jsonb       DEFAULT '{}',
  output_summary jsonb      DEFAULT '{}',
  duration_ms   integer,
  success       boolean     DEFAULT true,
  error_message text,
  beg_stage     text,
  kill_switches_fired jsonb DEFAULT '[]',
  governance_score numeric(3,2),
  session_id    text,
  metadata      jsonb       DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_audit_tool     ON elucy_audit_log(tool_name);
CREATE INDEX IF NOT EXISTS idx_audit_operator ON elucy_audit_log(operator_email);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON elucy_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_deal     ON elucy_audit_log(deal_id);
CREATE INDEX IF NOT EXISTS idx_audit_success  ON elucy_audit_log(success) WHERE success = false;

-- RLS: operators veem apenas seus proprios logs
ALTER TABLE elucy_audit_log ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. PGVECTOR — embeddings dos 44 docs MCP
-- ==========================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS elucy_mcp_embeddings (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now(),
  doc_file      text        NOT NULL,
  doc_title     text,
  chunk_index   integer     NOT NULL DEFAULT 0,
  chunk_text    text        NOT NULL,
  chunk_tokens  integer,
  embedding     vector(1536),
  intent_tags   text[]      DEFAULT '{}',
  persona_tags  text[]      DEFAULT '{}',
  phase_tags    text[]      DEFAULT '{}',
  metadata      jsonb       DEFAULT '{}'
);

-- Unique constraint: one chunk per file+index
CREATE UNIQUE INDEX IF NOT EXISTS idx_embed_file_chunk
  ON elucy_mcp_embeddings(doc_file, chunk_index);

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_embed_vector
  ON elucy_mcp_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Tag-based filtering indexes
CREATE INDEX IF NOT EXISTS idx_embed_intent  ON elucy_mcp_embeddings USING gin(intent_tags);
CREATE INDEX IF NOT EXISTS idx_embed_persona ON elucy_mcp_embeddings USING gin(persona_tags);
CREATE INDEX IF NOT EXISTS idx_embed_phase   ON elucy_mcp_embeddings USING gin(phase_tags);
CREATE INDEX IF NOT EXISTS idx_embed_file    ON elucy_mcp_embeddings(doc_file);

-- ==========================================
-- 3. SEARCH FUNCTION — busca semantica
-- ==========================================
CREATE OR REPLACE FUNCTION match_mcp_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter_intent text DEFAULT NULL,
  filter_persona text DEFAULT NULL,
  filter_phase text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  doc_file text,
  doc_title text,
  chunk_index int,
  chunk_text text,
  chunk_tokens int,
  intent_tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.doc_file,
    e.doc_title,
    e.chunk_index,
    e.chunk_text,
    e.chunk_tokens,
    e.intent_tags,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM elucy_mcp_embeddings e
  WHERE
    (filter_intent IS NULL OR filter_intent = ANY(e.intent_tags))
    AND (filter_persona IS NULL OR filter_persona = ANY(e.persona_tags))
    AND (filter_phase IS NULL OR filter_phase = ANY(e.phase_tags))
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ==========================================
-- 4. AUDIT SUMMARY VIEW
-- ==========================================
CREATE OR REPLACE VIEW elucy_audit_summary AS
SELECT
  date_trunc('hour', created_at) AS hour,
  tool_name,
  operator_email,
  count(*)                       AS call_count,
  avg(duration_ms)::int          AS avg_duration_ms,
  count(*) FILTER (WHERE success = false) AS error_count,
  count(*) FILTER (WHERE jsonb_array_length(kill_switches_fired) > 0) AS ks_fires
FROM elucy_audit_log
GROUP BY 1, 2, 3;
