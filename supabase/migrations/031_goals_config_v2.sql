-- 031_goals_config_v2.sql
-- Extensao de operator_goals para Blueprint Pre-Vendas v4
-- NOTA: estrutura real da tabela usa month_ref (nao period_key), meta_opp, meta_sal, etc.
--
-- Colunas existentes confirmadas:
--   id, operator_email, month_ref, meta_mql, meta_sal, meta_opp,
--   meta_ganho, meta_receita, created_at

-- 1. Adicionar gerente_email
ALTER TABLE public.operator_goals
  ADD COLUMN IF NOT EXISTS gerente_email TEXT;

-- 2. Adicionar linhas_atribuidas (JSON com linhas de receita do operador)
--    NULL = detectado automaticamente via leads ativos no pipeline
ALTER TABLE public.operator_goals
  ADD COLUMN IF NOT EXISTS linhas_atribuidas JSONB DEFAULT NULL;

-- 3. Metas de CR configuradas pelo gerente por operador
--    NULL = usa media da operacao como referencia
ALTER TABLE public.operator_goals
  ADD COLUMN IF NOT EXISTS meta_cr_mql_sal NUMERIC(5,2) DEFAULT NULL;

ALTER TABLE public.operator_goals
  ADD COLUMN IF NOT EXISTS meta_cr_sal_opp NUMERIC(5,2) DEFAULT NULL;

ALTER TABLE public.operator_goals
  ADD COLUMN IF NOT EXISTS meta_cr_opp_won NUMERIC(5,2) DEFAULT NULL;

-- 4. Policy para authenticated
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'operator_goals'
    AND policyname = 'goals_authenticated_all'
  ) THEN
    CREATE POLICY "goals_authenticated_all"
      ON public.operator_goals
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 5. View de conveniencia para periodo atual
CREATE OR REPLACE VIEW public.goals_current_period AS
SELECT
  operator_email,
  month_ref,
  meta_opp          AS meta_opp_mensal,
  meta_sal,
  meta_mql,
  meta_ganho,
  meta_receita,
  meta_cr_mql_sal,
  meta_cr_sal_opp,
  meta_cr_opp_won,
  gerente_email,
  linhas_atribuidas,
  created_at
FROM public.operator_goals
WHERE month_ref = TO_CHAR(NOW(), 'YYYY-MM');
