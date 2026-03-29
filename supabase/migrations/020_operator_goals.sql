-- operator_goals — Histórico mensal de metas por operador
-- Cada SDR define suas metas (fups, qualificacoes, handoffs, opp) por mês
-- O cockpit persiste automaticamente quando salva settings

CREATE TABLE IF NOT EXISTS public.operator_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_email TEXT NOT NULL,
  period_key TEXT NOT NULL,           -- '2026-03' formato YYYY-MM
  fups INT DEFAULT 300,
  qualificacoes INT DEFAULT 100,
  handoffs INT DEFAULT 40,
  opp INT DEFAULT 15,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_operator_goals_period
ON public.operator_goals(operator_email, period_key);

ALTER TABLE public.operator_goals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'operator_goals' AND policyname = 'goals_anon_all') THEN
    CREATE POLICY "goals_anon_all" ON public.operator_goals FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;
