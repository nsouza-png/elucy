-- View: production.gold.bowtie_attribution_v1
-- Revenue Lab Fase 0 — Attribution Engine (D-030, D-033)
-- Date: 2026-04-12
--
-- PURPOSE: Reclassifica deals com grupo_de_receita = 'Nao Definido' usando
-- 3 camadas hierarquicas de atribuicao:
--   Camada 1: linha_de_receita_vigente (patterns conhecidos)
--   Camada 2: utm_source + canal_de_marketing
--   Camada 3: proprietario_name (closers conhecidos)
--
-- RESULTADO ESPERADO:
--   ANTES:  39.1% da receita won com grupo definido
--   DEPOIS: ~85%+ da receita won com grupo definido
--   PENDENTE: ~15% sem sinais (nao_classificavel) — review manual
--
-- NOTA: Nao altera a tabela original funil_comercial.
-- Adiciona 2 colunas derivadas: grupo_de_receita_atribuido, attribution_source
--
-- REQUER: permissao CREATE VIEW no schema production.gold
-- EXECUTAR POR: Engenharia de Dados

CREATE OR REPLACE VIEW production.gold.bowtie_attribution_v1 AS
SELECT
  f.*,

  -- grupo_de_receita_atribuido: reclassificacao hierarquica
  CASE
    -- Deals que ja tem grupo definido: manter original
    WHEN f.grupo_de_receita NOT LIKE 'N%o Definido' THEN f.grupo_de_receita

    -- CAMADA 1: linha_de_receita_vigente com pattern conhecido
    WHEN f.linha_de_receita_vigente LIKE '%SKL%Outros%' THEN 'Time de Vendas - Aquisicao'
    WHEN f.linha_de_receita_vigente LIKE 'relancamento-tra%' THEN 'Turmas'
    WHEN f.linha_de_receita_vigente LIKE 'relancamento-ge%' THEN 'Turmas'
    WHEN f.linha_de_receita_vigente LIKE 'remax%' THEN 'Projetos e Eventos'
    WHEN f.linha_de_receita_vigente LIKE '%summit%' THEN 'Projetos e Eventos'
    WHEN f.linha_de_receita_vigente LIKE '%meeting%' THEN 'Projetos e Eventos'
    WHEN f.linha_de_receita_vigente LIKE '%conference%' THEN 'Projetos e Eventos'
    WHEN f.linha_de_receita_vigente LIKE 'masterclass%' THEN 'Projetos e Eventos'
    WHEN f.linha_de_receita_vigente LIKE '%formatura%' THEN 'Turmas'
    WHEN f.linha_de_receita_vigente LIKE 'talks-g4club%' THEN 'Renovacao'

    -- CAMADA 2: utm_source + canal_de_marketing
    WHEN f.utm_source = 'instagram' AND f.canal_de_marketing = 'Social Media' THEN 'Funil de Marketing'
    WHEN f.utm_source = 'facebook' THEN 'Funil de Marketing'
    WHEN f.utm_source = 'google' THEN 'Funil de Marketing'
    WHEN f.utm_source = 'prospeccao' OR f.canal_de_marketing LIKE 'Prospec%' THEN 'Time de Vendas - Aquisicao'
    WHEN f.utm_source = 'produto' THEN 'Expansao'
    WHEN f.utm_source = 'hubspot' OR f.canal_de_marketing = 'CRM' THEN 'Time de Vendas - Aquisicao'
    WHEN f.utm_source = 'mgm' OR f.canal_de_marketing = 'MGM' THEN 'Funil de Marketing'
    WHEN f.utm_source IN ('presencial', 'imersao', 'evento') THEN 'Projetos e Eventos'
    WHEN f.utm_source IN ('vendas', 'time_vendas') THEN 'Time de Vendas - Aquisicao'
    WHEN f.utm_source = 'whatsapp' THEN 'Funil de Marketing'
    WHEN f.utm_source = 'direct' OR f.canal_de_marketing LIKE 'Org%' THEN 'Funil de Marketing'
    WHEN f.utm_source = 'youtube' THEN 'Funil de Marketing'
    WHEN f.utm_source = 'instagram' THEN 'Funil de Marketing'
    WHEN f.utm_source = 'linkedin-ads' THEN 'Funil de Marketing'
    WHEN f.canal_de_marketing IN ('Social Media', 'Paid Media') THEN 'Funil de Marketing'

    -- CAMADA 3: proprietario_name (closers conhecidos → Time de Vendas)
    WHEN f.proprietario_name IN (
      'Carolina Moroz', 'Cristopher Elesbao', 'Larissa Fernandes',
      'Andre Luiz Coutinho', 'Lais Cordeiro', 'Jorge Carvalho', 'Roberto Toledo',
      'Mariana Freire', 'Vinicius Veiga', 'Isabela Caldas', 'Cassio Gifford',
      'Gabriel Zovaro', 'Guilherme Segalla', 'Marcia Crepani', 'Marcson Ribas',
      'Gabriela Chiari Citrinite', 'Maria Sobral', 'Aline Hipolito', 'Laura Zacharczuk',
      'Mathias Alves', 'Wellington Coutinho', 'Joao Vitor Chaves Silva'
    ) THEN 'Time de Vendas - Aquisicao'
    WHEN f.proprietario_name = 'Sales Operations' THEN 'Time de Vendas - Aquisicao'
    WHEN f.proprietario_name = 'Enrico Bello' THEN 'Projetos e Eventos'

    -- FALLBACK: nenhum sinal disponivel
    ELSE 'Nao Definido (pendente)'
  END as grupo_de_receita_atribuido,

  -- attribution_source: de onde veio a classificacao
  CASE
    WHEN f.grupo_de_receita NOT LIKE 'N%o Definido' THEN 'original'
    WHEN f.linha_de_receita_vigente IS NOT NULL AND f.linha_de_receita_vigente != '' THEN 'camada1_linha'
    WHEN f.utm_source IS NOT NULL AND f.utm_source != '' THEN 'camada2_utm'
    WHEN f.canal_de_marketing IS NOT NULL AND f.canal_de_marketing != '' THEN 'camada2_canal'
    WHEN f.proprietario_name IS NOT NULL AND f.proprietario_name != '' THEN 'camada3_proprietario'
    ELSE 'nao_classificavel'
  END as attribution_source

FROM production.diamond.funil_comercial f;

-- Validacao pos-criacao:
-- SELECT grupo_de_receita_atribuido, attribution_source, COUNT(*) as n,
--   ROUND(SUM(CASE WHEN status_do_deal='Ganho' THEN revenue ELSE 0 END)/1e6, 2) as receita_MM
-- FROM production.gold.bowtie_attribution_v1
-- GROUP BY 1, 2 ORDER BY receita_MM DESC;
