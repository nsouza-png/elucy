-- Migration 040: Add kill switch 'undefined_revenue_line'
-- Blocks deals from transitioning to Won stages without a classified revenue line
-- Part of Revenue Lab Fase 0 — Data Remediation (D-032)
-- Date: 2026-04-12

-- Insert the kill switch into the kill_switches table
INSERT INTO public.kill_switches (id, switch_slug, switch_label, description, is_enabled, severity, condition_json, block_message)
VALUES (
  gen_random_uuid(),
  'undefined_revenue_line',
  'Linha de receita obrigatoria para fechamento',
  'Bloqueia transicao para Ganho/Contrato assinado se grupo_de_receita = Nao Definido e linha_de_receita_vigente esta vazia. Implementado como parte do Revenue Lab (D-032) para garantir integridade da Growth Formula.',
  true,
  'hard',
  '{"field": "grupo_de_receita", "not_in": ["Não Definido", "Nao Definido", ""], "requires_also": "linha_de_receita_vigente"}',
  'Defina o produto vendido antes de concluir esta venda. Qual linha de receita se aplica a este negocio?'
)
ON CONFLICT (switch_slug) DO NOTHING;
