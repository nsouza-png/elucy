-- ============================================================
-- Elucy Cockpit — Migração Enterprise
-- Executa no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. TABELA: deals
-- Garante que RLS permite leitura para usuário autenticado pelo email
ALTER TABLE IF EXISTS deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operator_own_deals" ON deals;
DROP POLICY IF EXISTS "deals_select_own" ON deals;
DROP POLICY IF EXISTS "deals_insert_service" ON deals;

-- Leitura: usuário autenticado lê seus próprios deals por email
CREATE POLICY "deals_select_by_email" ON deals
  FOR SELECT USING (operator_email = auth.jwt()->>'email');

-- Escrita: apenas service role (worker G4 OS faz upsert via script)
CREATE POLICY "deals_insert_service_only" ON deals
  FOR INSERT WITH CHECK (true); -- service role bypassa RLS

CREATE POLICY "deals_update_service_only" ON deals
  FOR UPDATE USING (true);

-- 2. TABELA: cockpit_requests
ALTER TABLE IF EXISTS cockpit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operator_own_requests" ON cockpit_requests;

-- INSERT: usuário autenticado insere com seu próprio user_id
CREATE POLICY "requests_insert_own" ON cockpit_requests
  FOR INSERT WITH CHECK (operator_id = auth.uid()::text);

-- SELECT: usuário lê seus próprios requests
CREATE POLICY "requests_select_own" ON cockpit_requests
  FOR SELECT USING (operator_id = auth.uid()::text);

-- UPDATE: service role atualiza status (worker)
CREATE POLICY "requests_update_service" ON cockpit_requests
  FOR UPDATE USING (true);

-- 3. TABELA: cockpit_responses
ALTER TABLE IF EXISTS cockpit_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operator_own_responses" ON cockpit_responses;

-- SELECT: usuário lê suas próprias respostas
CREATE POLICY "responses_select_own" ON cockpit_responses
  FOR SELECT USING (operator_id = auth.uid()::text);

-- INSERT: service role insere respostas (worker G4 OS)
CREATE POLICY "responses_insert_service" ON cockpit_responses
  FOR INSERT WITH CHECK (true);

-- 4. TABELA: operators
ALTER TABLE IF EXISTS operators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operators_select_own" ON operators;

-- Leitura: usuário lê apenas seu próprio registro
CREATE POLICY "operators_select_own" ON operators
  FOR SELECT USING (email = auth.jwt()->>'email');

-- 5. TABELA: copy_history (se existir)
ALTER TABLE IF EXISTS copy_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copy_history_own" ON copy_history;

CREATE POLICY "copy_history_own" ON copy_history
  FOR ALL USING (operator_id = auth.uid()::text);

-- 6. TABELA: elucy_cache (se existir)
ALTER TABLE IF EXISTS elucy_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "elucy_cache_own" ON elucy_cache;

CREATE POLICY "elucy_cache_own" ON elucy_cache
  FOR ALL USING (operator_id = auth.uid()::text);

-- 7. REALTIME: habilita para cockpit_responses (necessário para subscription)
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE cockpit_requests;

-- 8. INDEXES para performance
CREATE INDEX IF NOT EXISTS idx_deals_operator_email ON deals(operator_email);
CREATE INDEX IF NOT EXISTS idx_cockpit_requests_operator ON cockpit_requests(operator_id, status);
CREATE INDEX IF NOT EXISTS idx_cockpit_requests_pending ON cockpit_requests(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_cockpit_responses_request ON cockpit_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_cockpit_responses_operator ON cockpit_responses(operator_id, deal_id);
