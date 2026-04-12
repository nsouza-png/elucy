# Revenue Lab — Fase 0: Data Remediation & Kill Switches
## Execution Plan — 2026-04-12

> **Contexto:** Audit de dados do Databricks revelou que 60.6% da receita won (R$ 10.6B)
> esta com `grupo_de_receita = 'Nao Definido'`. Este documento detalha a execucao dos
> dois pre-requisitos do Revenue Lab antes do build do Bowtie Engine.

---

## PROBLEMA 1 — Reclassificacao de Linha de Receita (P0-Critical)

### 1.1 Diagnostico

| Segmento | Deals Won | Receita (R$ MM) | Reclassificavel? |
|----------|-----------|-----------------|-----------------|
| Nao Definido + TEM canal + TEM utm | 152,692 | 3,844.73 | SIM — canal + utm presentes |
| Nao Definido + SEM canal + TEM utm | 181,277 | 3,337.26 | SIM — utm_source presente |
| Nao Definido + SEM canal + SEM utm | 116,458 | 2,458.64 | PARCIAL — precisa de heuristica |
| Nao Definido + TEM canal + SEM utm | 40,532 | 979.77 | SIM — canal presente |
| **TOTAL** | **490,959** | **10,620.40** | — |

**Conclusao:** 76.3% dos deals "Nao Definido" (R$ 8.16B) tem ao menos um sinal (canal ou utm)
para reclassificacao automatica. Os 23.7% restantes (R$ 2.46B) precisam de heuristica adicional.

### 1.2 Regras de Reclassificacao (Attribution Engine)

Baseado nos top 25 canais/UTMs encontrados nos deals won "Nao Definido":

```sql
-- REGRA DE RECLASSIFICACAO: utm_source + canal_de_marketing -> grupo_de_receita
-- Ordem de prioridade: regras mais especificas primeiro

CASE
  -- REGRA 1: Social Media / Instagram → Funil de Marketing
  WHEN utm_source = 'instagram' AND canal_de_marketing = 'Social Media'
    THEN 'Funil de Marketing'

  -- REGRA 2: Facebook (paid ou organic) → Funil de Marketing
  WHEN utm_source = 'facebook'
    THEN 'Funil de Marketing'

  -- REGRA 3: Google (paid) → Funil de Marketing
  WHEN utm_source = 'google' AND canal_de_marketing = 'Paid Media'
    THEN 'Funil de Marketing'

  -- REGRA 4: Google (organic ou sem canal) → Funil de Marketing
  WHEN utm_source = 'google'
    THEN 'Funil de Marketing'

  -- REGRA 5: Prospeccao → Time de Vendas - Aquisicao
  WHEN utm_source = 'prospeccao' OR canal_de_marketing = 'Prospecção'
    THEN 'Time de Vendas - Aquisição'

  -- REGRA 6: Produto / Hubspot CRM → Renovacao ou Expansao
  WHEN utm_source = 'produto'
    THEN 'Expansão'

  -- REGRA 7: HubSpot CRM
  WHEN utm_source = 'hubspot' OR canal_de_marketing = 'CRM'
    THEN 'Time de Vendas - Aquisição'

  -- REGRA 8: MGM (member get member) → Funil de Marketing (indicacao)
  WHEN utm_source = 'mgm'
    THEN 'Funil de Marketing'

  -- REGRA 9: Presencial / Imersao / Evento → Projetos e Eventos
  WHEN utm_source IN ('presencial', 'imersao', 'evento')
    THEN 'Projetos e Eventos'

  -- REGRA 10: Vendas / Time de vendas → Time de Vendas - Aquisicao
  WHEN utm_source IN ('vendas', 'time_vendas')
    THEN 'Time de Vendas - Aquisição'

  -- REGRA 11: WhatsApp → Funil de Marketing (chat)
  WHEN utm_source = 'whatsapp'
    THEN 'Funil de Marketing'

  -- REGRA 12: Direct → Organico (Funil de Marketing)
  WHEN utm_source = 'direct' OR canal_de_marketing = 'Orgânico'
    THEN 'Funil de Marketing'

  -- REGRA 13: YouTube → Funil de Marketing
  WHEN utm_source = 'youtube'
    THEN 'Funil de Marketing'

  -- REGRA 14: LinkedIn Ads → Funil de Marketing
  WHEN utm_source = 'linkedin-ads' OR canal_de_marketing = 'Paid Media'
    THEN 'Funil de Marketing'

  -- REGRA 15: Instagram (sem canal) → Funil de Marketing
  WHEN utm_source = 'instagram'
    THEN 'Funil de Marketing'

  -- REGRA 16: Tem canal mas sem utm
  WHEN canal_de_marketing = 'Social Media' THEN 'Funil de Marketing'
  WHEN canal_de_marketing = 'Paid Media' THEN 'Funil de Marketing'
  WHEN canal_de_marketing = 'Orgânico' THEN 'Funil de Marketing'
  WHEN canal_de_marketing = 'CRM' THEN 'Time de Vendas - Aquisição'
  WHEN canal_de_marketing = 'Prospecção' THEN 'Time de Vendas - Aquisição'
  WHEN canal_de_marketing = 'MGM' THEN 'Funil de Marketing'

  -- FALLBACK: Sem nenhum sinal → manter como 'Não Definido' (pendente de review manual)
  ELSE 'Não Definido'
END as grupo_de_receita_reclassificado
```

### 1.3 Regras para linha_de_receita_vigente (D4)

Para deals que ja tem `linha_de_receita_vigente` preenchida mesmo com grupo "Nao Definido":

| linha_de_receita_vigente (pattern) | grupo_de_receita correto | receita MM |
|-----------------------------------|-------------------------|------------|
| `[SKL] Outros` | Time de Vendas - Aquisicao (Scale) | 14.29 |
| `relancamento-tra-*` | Turmas (Traction) | 8.34 |
| `relancamento-ge-*` | Turmas (GE) | 5.12 |
| `remax-*` | Projetos e Eventos | 4.38 |
| `poker-hub-*` | Projetos e Eventos | 2.14 |
| `XP+G4-*` | Projetos e Eventos | 2.09 |
| `*summit*`, `*meeting*`, `*conference*` | Projetos e Eventos | ~3.67 |
| `masterclass-*` | Projetos e Eventos | 2.69 |
| `*formatura*` | Turmas | 0.52 |
| `talks-g4club-*` | Renovacao (Club) | 1.89 |

### 1.4 Query de Reclassificacao (DRY RUN — somente SELECT, nao altera dados)

```sql
-- DRY RUN: simula reclassificacao sem alterar dados
-- Rodar no Databricks para validar cobertura antes de aplicar

SELECT
  reclassificado,
  COUNT(*) as total_deals,
  COUNT(CASE WHEN status_do_deal = 'Ganho' THEN 1 END) as deals_ganhos,
  ROUND(SUM(CASE WHEN status_do_deal = 'Ganho' THEN COALESCE(revenue, 0) ELSE 0 END) / 1e6, 2) as receita_MM,
  ROUND(SUM(CASE WHEN status_do_deal = 'Ganho' THEN COALESCE(revenue, 0) ELSE 0 END) * 100.0 /
    SUM(SUM(CASE WHEN status_do_deal = 'Ganho' THEN COALESCE(revenue, 0) ELSE 0 END)) OVER(), 2) as pct_receita
FROM (
  SELECT *,
    CASE
      -- Prioridade 1: linha_de_receita_vigente com pattern conhecido
      WHEN linha_de_receita_vigente LIKE '%SKL%Outros%' THEN 'Time de Vendas - Aquisição'
      WHEN linha_de_receita_vigente LIKE 'relancamento-tra%' THEN 'Turmas'
      WHEN linha_de_receita_vigente LIKE 'relancamento-ge%' THEN 'Turmas'
      WHEN linha_de_receita_vigente LIKE 'remax%' THEN 'Projetos e Eventos'
      WHEN linha_de_receita_vigente LIKE '%summit%' THEN 'Projetos e Eventos'
      WHEN linha_de_receita_vigente LIKE '%meeting%' THEN 'Projetos e Eventos'
      WHEN linha_de_receita_vigente LIKE '%conference%' THEN 'Projetos e Eventos'
      WHEN linha_de_receita_vigente LIKE 'masterclass%' THEN 'Projetos e Eventos'
      WHEN linha_de_receita_vigente LIKE '%formatura%' THEN 'Turmas'
      WHEN linha_de_receita_vigente LIKE 'talks-g4club%' THEN 'Renovação'

      -- Prioridade 2: canal + utm
      WHEN utm_source = 'instagram' AND canal_de_marketing = 'Social Media' THEN 'Funil de Marketing'
      WHEN utm_source = 'facebook' THEN 'Funil de Marketing'
      WHEN utm_source = 'google' THEN 'Funil de Marketing'
      WHEN utm_source IN ('prospeccao') OR canal_de_marketing = 'Prospecção' THEN 'Time de Vendas - Aquisição'
      WHEN utm_source = 'produto' THEN 'Expansão'
      WHEN utm_source = 'hubspot' OR canal_de_marketing = 'CRM' THEN 'Time de Vendas - Aquisição'
      WHEN utm_source = 'mgm' THEN 'Funil de Marketing'
      WHEN utm_source IN ('presencial', 'imersao', 'evento') THEN 'Projetos e Eventos'
      WHEN utm_source IN ('vendas', 'time_vendas') THEN 'Time de Vendas - Aquisição'
      WHEN utm_source = 'whatsapp' THEN 'Funil de Marketing'
      WHEN utm_source = 'direct' OR canal_de_marketing = 'Orgânico' THEN 'Funil de Marketing'
      WHEN utm_source = 'youtube' THEN 'Funil de Marketing'
      WHEN utm_source = 'instagram' THEN 'Funil de Marketing'
      WHEN canal_de_marketing IN ('Social Media', 'Paid Media', 'Orgânico', 'MGM') THEN 'Funil de Marketing'
      WHEN canal_de_marketing IN ('CRM', 'Prospecção') THEN 'Time de Vendas - Aquisição'

      -- Fallback
      ELSE 'Não Definido (pendente review)'
    END as reclassificado
  FROM production.diamond.funil_comercial
  WHERE grupo_de_receita = 'Não Definido'
)
GROUP BY reclassificado
ORDER BY receita_MM DESC
```

### 1.5 Kill Switch: `undefined_revenue_line`

**Integracao com transition-validator (D2):**

```json
{
  "kill_switch_id": "undefined_revenue_line",
  "description": "Bloqueia transicao para Ganho se grupo_de_receita = 'Nao Definido' e linha_de_receita_vigente NULL",
  "trigger_transitions": ["Negociação → Ganho", "Fechamento → Ganho", "Nova Oportunidade → Ganho"],
  "condition": "deal.grupo_de_receita == 'Não Definido' AND (deal.linha_de_receita_vigente IS NULL OR deal.linha_de_receita_vigente == '')",
  "action": "BLOCK",
  "user_message": "Para concluir esta venda, defina o produto vendido. Qual linha de receita se aplica a este negocio?",
  "override_allowed": true,
  "override_requires": "gerente",
  "priority": "P0",
  "created_at": "2026-04-12"
}
```

**Insercao no pipeline_transition_graph:**

```sql
-- Adicionar gate obrigatorio na transicao para Ganho
INSERT INTO pipeline_transition_graph (
  from_stage, to_stage, gate_type, gate_config, kill_switch_id
) VALUES
  ('Negociação', 'Ganho', 'field_required', '{"field": "grupo_de_receita", "not_in": ["Não Definido", ""]}', 'undefined_revenue_line'),
  ('Fechamento', 'Ganho', 'field_required', '{"field": "grupo_de_receita", "not_in": ["Não Definido", ""]}', 'undefined_revenue_line'),
  ('Nova Oportunidade', 'Ganho', 'field_required', '{"field": "grupo_de_receita", "not_in": ["Não Definido", ""]}', 'undefined_revenue_line');
```

---

## PROBLEMA 2 — Onboarding Split por Tipo de Produto (P1)

### 2.1 Diagnostico: Onboarding Rate por Grupo de Receita

| Grupo de Receita | Deals Won | Com Vaga | Onboarding % | Receita (R$ MM) | Tipo de Onboarding |
|-----------------|-----------|----------|--------------|-----------------|-------------------|
| Turmas | 1,802 | 1,548 | **85.9%** | 5,235.88 | PRESENCIAL — vaga obrigatoria |
| Time de Vendas - Aquisicao | 5,307 | 4,096 | **77.2%** | 2,109.23 | PRESENCIAL — vaga obrigatoria |
| Time de Vendas - Field Sales | 770 | 553 | **71.8%** | 1,277.00 | PRESENCIAL — vaga obrigatoria |
| Funil de Marketing | 19,390 | 13,444 | **69.3%** | 6,494.76 | MISTO — depende do produto |
| Expansao | 1,370 | 866 | **63.2%** | 206.93 | MISTO |
| Renovacao | 1,703 | 845 | **49.6%** | 286.18 | MISTO — Club pode ser digital |
| Selfcheckout | 62,550 | 12,865 | **20.6%** | 170.33 | DIGITAL — onboarding diferente |
| Projetos e Eventos | 74,109 | 14,397 | **19.4%** | 5,755.81 | EVENTO — presenca pontual, nao vaga |
| G4 Tools | 63 | 11 | **17.5%** | 34.68 | DIGITAL |

### 2.2 Classificacao de Tipo de Onboarding

O CR5 (Onboarding Rate) deve ser calculado de forma diferente por tipo de produto:

```
TIPO A — PRESENCIAL (vaga obrigatoria)
  Grupos: Turmas, Time de Vendas - Aquisicao, Time de Vendas - Field Sales
  CR5 = COUNT(deals com vaga alocada) / COUNT(deals ganhos)
  Benchmark: 77-86% (dados reais)
  Gap: 14-23% dos deals presenciais sem vaga = problema operacional

TIPO B — EVENTO (presenca pontual)
  Grupos: Projetos e Eventos
  CR5 = COUNT(deals com presenca em evento) / COUNT(deals ganhos)
  Nota: 19.4% tem vaga, mas muitos eventos nao usam vagas_fct
  Fonte alternativa: alunos_events_fct (eventos pontuais)

TIPO C — DIGITAL (sem vaga fisica)
  Grupos: Selfcheckout, G4 Tools
  CR5 = COUNT(deals com acesso ativado) / COUNT(deals ganhos)
  Fonte: precisa de tabela de ativacao (nao existe ainda)
  Proxy V1: considerar 100% onboarded (acesso automatico)

TIPO D — MISTO (depende da linha de receita)
  Grupos: Funil de Marketing, Renovacao, Expansao
  CR5 = split por D4 (linha_de_receita_vigente)
  Ex: [IM] = presencial, [ON] = digital, [SKL] = presencial
```

### 2.3 Expansion Rate por Grupo (Dados Reais)

| Grupo | Deals/PA | Interpretacao |
|-------|----------|--------------|
| Renovacao | 1.36 | Maior recorrencia (Club renewals) |
| Projetos e Eventos | 1.33 | Clientes voltam para novos eventos |
| Expansao | 1.24 | Cross-sell ativo |
| Time de Vendas - Field Sales | 1.17 | Venda em turma gera repeat |
| Time de Vendas - Aquisicao | 1.14 | Moderada |
| Selfcheckout | 1.13 | Low-touch expansion |
| Turmas | 1.06 | Uma turma = experiencia principal |
| Funil de Marketing | 1.05 | Menor expansion (top of funnel) |

**Insight critico:** Funil de Marketing gera a MAIOR receita (R$ 2.5B) mas a MENOR expansion (1.05 deals/PA). Projetos e Eventos gera R$ 1.7B com expansion 1.33x. O Revenue Lab precisa modelar essa diferenca para o feedback loop.

---

## PLANO DE EXECUCAO CONSOLIDADO

### Semana 1 (imediato)

| # | Acao | Owner | Esforco | Dependencia |
|---|------|-------|---------|-------------|
| E1 | Rodar DRY RUN da query de reclassificacao no Databricks | Eng Dados | XS | — |
| E2 | Validar resultado do DRY RUN com Nathan — % reclassificado | Nathan + PM | XS | E1 |
| E3 | Criar view `bowtie_attribution_v1` no Databricks com a logica CASE | Eng Dados | S | E2 |
| E4 | Adicionar kill switch `undefined_revenue_line` no transition-validator | Eng Backend | S | — |
| E5 | Criar mapping de tipo de onboarding por grupo_de_receita no cockpit-engine | Eng Frontend | S | — |

### Semana 2

| # | Acao | Owner | Esforco | Dependencia |
|---|------|-------|---------|-------------|
| E6 | Aplicar reclassificacao na tabela `funil_comercial` (ou criar view derivada) | Eng Dados | M | E2 |
| E7 | Criar tabela `bowtie_onboarding_type` com mapping grupo→tipo | Eng Dados | XS | E5 |
| E8 | Calcular CR5 split por tipo A/B/C/D com dados reais | PM + Analytics | S | E6, E7 |
| E9 | Documentar regras de reclassificacao no MCP (eluci-core) | PM | S | E6 |
| E10 | UI: campo obrigatorio de linha de receita no deal card (pre-close) | Eng Frontend | M | E4 |

### Semana 3 (gate de entrada para Revenue Lab Fase 1)

| # | Acao | Owner | Esforco | Dependencia |
|---|------|-------|---------|-------------|
| E11 | Validar: % de "Nao Definido" caiu para < 10% em deals novos | PM | XS | E4, E10 |
| E12 | Validar: CR5 split por tipo de produto confere com sample manual | PM | S | E8 |
| E13 | GO/NO-GO para Revenue Lab Fase 1 | Nathan | — | E11, E12 |

---

## METRICAS DE SUCESSO

| Metrica | Baseline (12/04/2026) | Target (Semana 3) | Guardrail |
|---------|----------------------|-------------------|-----------|
| % receita won com grupo definido | 33.8% | > 80% (pos-reclassificacao) | < 60% = reclassificacao insuficiente |
| % deals novos entrando como "Nao Definido" | ~60% (estimado) | < 10% (kill switch ativo) | > 20% = kill switch nao funciona |
| CR5 cobertura | 25.3% (media geral) | Split por tipo: A=85%, B=?, C=100%, D=split | — |
| Deals bloqueados por kill switch (semana 1) | 0 | Monitorar volume | > 50% bloqueados = regra muito restritiva |

---

## DECISOES REGISTRADAS

| ID | Decisao | Data |
|----|---------|------|
| D-030 | Reclassificacao usa CASE hierarquico: linha > canal+utm > fallback manual | 12/04/2026 |
| D-031 | CR5 split em 4 tipos: Presencial, Evento, Digital, Misto | 12/04/2026 |
| D-032 | Kill switch `undefined_revenue_line` bloqueia transicao para Ganho sem grupo definido | 12/04/2026 |
| D-033 | View `bowtie_attribution_v1` no Databricks como camada de reclassificacao (nao altera tabela original) | 12/04/2026 |
