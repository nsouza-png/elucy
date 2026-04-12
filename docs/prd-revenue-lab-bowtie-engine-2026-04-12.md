# PRD — Revenue Lab: Bowtie Engine
## Elucy Cockpit — Arquitetura de Receita Matematica

> **Autor:** Nathan + PM Elucy | **Data:** 2026-04-12
> **Status:** Draft | **Prioridade:** P0-Strategic
> **Codename:** Revenue Lab

---

## 1. Contexto

O Elucy hoje e um Revenue Intelligence System focado no **lado esquerdo do funil** — aquisicao (Lead > MQL > SAL > Oportunidade > Ganho). Toda a infraestrutura (funil_comercial, analytics-engine, reports-v4, Intelligence tab) modela apenas a jornada ate o fechamento.

O problema: **o funil tradicional termina exatamente onde o valor composto comeca.** O G4 Educacao vende produtos de alto ticket com ciclo de vida longo (Imersoes, Scale, Club, Sprints). A receita real nao vem do primeiro deal — vem da expansao, retencao e advocacy pos-venda.

Sem modelagem matematica do lado direito, a operacao toma decisoes com metade dos dados:
- Nao sabe o LTV real por canal/tier/grupo de receita
- Nao consegue calcular CAC payback com precisao
- Nao identifica quais cohorts expandem vs churnam
- Nao retroalimenta aquisicao com sinais de retencao (loop fechado)
- Forecast e unilateral — preve fechamento mas nao preve receita recorrente

---

## 2. Problema

**"O G4 opera com um funil linear num negocio de receita composta."**

Consequencias mensureaveis:
1. SDR prospecta leads de perfil que churn em 6 meses — sem feedback loop
2. Closer fecha Tier 2 em Imersao Presencial — sem gate de capacidade de adocao
3. CS nao tem health score matematico — age por intuicao
4. Lideranca nao sabe se deve investir em aquisicao ou retencao — sem simulador
5. Expansion revenue e invisivel — nao existe metrica de cross/upsell por cohort

---

## 3. Objetivo

Criar o **Revenue Lab** — um motor matematico de funil Bowtie completo que:
1. Modela a jornada do cliente de ponta a ponta (Awareness → Advocacy)
2. Calcula metricas de volume (VM) e conversao (CR) em cada estagio
3. Processa estatisticamente cada metrica de forma individual antes de apresentar
4. Alimenta forecasting bidirecional (aquisicao ↔ retencao)
5. Retroalimenta kill switches e scoring com dados do lado direito
6. Se torna, ao longo do tempo, o **coracao estrategico de receita do G4**

O Revenue Lab NAO e um dashboard. E uma **camada de processamento matematico** que ingere dados brutos, fragmenta em segmentos, aplica modelos estatisticos e so entao apresenta outputs consolidados.

---

## 4. Usuarios

| Role | Como usa o Revenue Lab | Nivel de acesso |
|------|----------------------|-----------------|
| Nathan / CRO | Simulador de cenarios, unit economics, decisao aquisicao vs retencao | Full — todos os modulos |
| Closer | Forecast bidirecional, expansion signals nos deals ativos | Modulo Forecast + Signals |
| SDR | Feedback loop — quais perfis geram LTV alto vs churn | Modulo Feedback Loop (read-only) |
| CS/CX | Health score matematico, cohort analysis, churn prediction | Modulo Retencao + Health Score |
| Account Manager | Portfolio LTV, expansion pipeline, RFV clustering | Modulo Expansao + RFV |

---

## 5. Modelo Bowtie — Adaptado ao G4

```
                          THE BOWTIE

  AQUISICAO (linear, soma)          RETENCAO (exponencial, multiplicacao)
  ========================          ====================================

  VM1        VM2       VM3       VM4    |    VM5         VM6        VM7         VM8
  Awareness  Educacao  Commit    Close  | Onboarding   Adocao    Expansao    Advocacy
    |          |         |         |    |     |           |          |           |
    CR1        CR2       CR3       CR4  |    CR5         CR6        CR7         CR8
  Visit>Lead Lead>MQL MQL>Opp  Opp>Won | Won>Onboard  Onb>Adopt  Adopt>Exp   Exp>Adv
```

### Mapeamento para Taxonomia G4 (6 Dimensoes)

| Estagio Bowtie | D1 (etapa_pipeline) | D2 (fase_processo) | Fonte de dados |
|----------------|--------------------|--------------------|----------------|
| VM1 Awareness | — | — | UTMs, canal_de_marketing (D5) |
| VM2 Educacao | Novo Lead, D02-D05 | null → SAL | funil_comercial |
| VM3 Commit | Conectados, Agendamento, Entrevista | SAL → Conectado → Agendado | funil_comercial |
| VM4 Close | Negociacao, Fechamento | Negociacao → Oportunidade → Ganho | funil_comercial |
| **NOH** | **Ganho** | **Ganho** | **deals_fct (closed_at, status=Ganho)** |
| VM5 Onboarding | — | — | vagas_fct (alocacao), alunos_events_fct |
| VM6 Adocao | — | — | eventos_presenciais_fct + presenca |
| VM7 Expansao | — | — | order_items (deals subsequentes por PA) |
| VM8 Advocacy | — | — | indicacoes (UTM referral), NPS (futuro) |

### Metricas Matematicas por Estagio

| Metrica | Formula | Estagio | Tipo |
|---------|---------|---------|------|
| CR1 (Visit → Lead) | COUNT(leads_created) / COUNT(sessions) | Awareness→Educacao | Conversao |
| CR2 (Lead → MQL) | COUNT(fase='MQL') / COUNT(leads) por periodo | Educacao→Commit | Conversao |
| CR3 (MQL → Opp) | COUNT(fase='Oportunidade') / COUNT(fase='MQL') | Commit→Close | Conversao |
| CR4 (Win Rate) | COUNT(status='Ganho') / COUNT(fase='Oportunidade') | Close→Noh | Conversao |
| CR5 (Onboarding Rate) | COUNT(alocados_em_turma) / COUNT(deals_ganhos) | Noh→Onboarding | Conversao |
| CR6 (Adoption Rate) | COUNT(presenca >= 80%) / COUNT(alocados) | Onboarding→Adocao | Conversao |
| CR7 (GRR) | SUM(receita_retida) / SUM(receita_inicio_periodo) | Adocao→Expansao | Retencao |
| CR8 (NRR / Expansion) | SUM(receita_retida + upsell + cross) / SUM(receita_inicio_periodo) | Expansao→Advocacy | Expansao |
| VM-n (Volume) | COUNT por estagio por periodo | Todos | Volume |
| t (Tempo medio) | AVG(dias entre estagios consecutivos) | Todos | Velocidade |
| CAC | SUM(custo_aquisicao) / COUNT(deals_ganhos) | Cross-bowtie | Eficiencia |
| LTV | SUM(receita_lifetime por PA) | Cross-bowtie | Valor |
| Payback | CAC / (receita_mensal_media por cohort) | Cross-bowtie | Eficiencia |

---

## 6. Requisitos Funcionais

### RF-01: Bowtie Data Layer (Databricks)

Camada de dados que consolida ambos os lados do funil numa unica tabela fato.

**Schema proposto: `production.gold.bowtie_funnel_fct`**

| coluna | tipo | descricao |
|--------|------|-----------|
| bowtie_id | STRING | PK (UUID) |
| g4_personal_account_id | STRING | FK para persons_overview |
| deal_id | STRING | FK para deals_fct (deal gerador) |
| bowtie_stage | STRING | ENUM: awareness, education, commit, close, onboarding, adoption, expansion, advocacy |
| bowtie_side | STRING | left / right |
| stage_entered_at | TIMESTAMP | Quando entrou no estagio |
| stage_exited_at | TIMESTAMP | Quando saiu (null se atual) |
| stage_duration_days | FLOAT | Calculado: exit - enter |
| d1_etapa_pipeline | STRING | Dim 1 no momento da transicao |
| d2_fase_processo | STRING | Dim 2 no momento da transicao |
| d3_grupo_receita | STRING | Dim 3 |
| d4_linha_receita | STRING | Dim 4 |
| d5_canal_marketing | STRING | Dim 5 |
| d6_tier | STRING | Dim 6 |
| revenue_at_stage | DECIMAL | Receita associada ao estagio |
| cumulative_revenue | DECIMAL | Receita acumulada do PA ate este ponto |
| is_expansion | BOOLEAN | True se deal nao e o primeiro do PA |
| cohort_month | STRING | YYYY-MM do primeiro deal ganho |
| source_table | STRING | Tabela de origem do evento |
| updated_at | TIMESTAMP | Ultima atualizacao |

**Schema proposto: `production.gold.bowtie_metrics_agg`**

| coluna | tipo | descricao |
|--------|------|-----------|
| metric_id | STRING | PK |
| period | STRING | YYYY-MM |
| bowtie_stage | STRING | Estagio do bowtie |
| dimension | STRING | Qual dimensao de corte (d3, d5, d6, all) |
| dimension_value | STRING | Valor da dimensao |
| volume | INT | VM — contagem de entidades no estagio |
| conversion_rate | FLOAT | CR — taxa de conversao para proximo estagio |
| avg_duration_days | FLOAT | t — tempo medio no estagio |
| revenue_sum | DECIMAL | Receita total no estagio |
| entity_count | INT | Deals ou PAs unicos |
| computed_at | TIMESTAMP | Quando foi calculado |

### RF-02: Statistical Processing Engine (Edge Function)

Edge function `revenue-lab-compute` que processa metricas individualmente com rigor estatistico.

**Processamento por metrica:**
1. **Ingestao** — Puxa dados brutos do Databricks via db-proxy
2. **Segmentacao** — Fragmenta por cada combinacao de dimensoes (D3xD5xD6 = ate 10x16x4 = 640 segmentos)
3. **Calculo estatistico** — Para cada segmento:
   - Media, mediana, desvio padrao, p25/p75/p95
   - Trend (regressao linear ultimos 6 meses)
   - Anomaly detection (Z-score > 2 = flag)
   - Confidence interval (95%)
4. **Persistencia** — Grava resultados em `bowtie_metrics_agg` (Supabase) e/ou Databricks
5. **Cache** — Resultados cacheados por 4h (configurable), invalidados por sync-deals

**Modelos estatisticos por modulo:**

| Modulo | Modelo | Input | Output |
|--------|--------|-------|--------|
| Cohort Analysis | Survival curves (Kaplan-Meier simplificado) | Cohorts mensais + eventos de churn/expansion | Curvas de retencao e expansao por cohort |
| Churn Prediction | Logistic regression (features: recencia, frequencia, ticket, tier) | Dados historicos de churn | Probabilidade de churn por PA (0-1) |
| LTV Estimation | Historico de compras + survival rate | order_items + cohort retention | LTV estimado por segmento |
| Forecast Bidirecional | Monte Carlo simulation (1000 runs) | CRs historicos + pipeline atual | Range de receita (p10/p50/p90) |
| RFV Clustering | K-means (k=4: champion, loyal, at-risk, churned) | Recencia, Frequencia, Valor por PA | Cluster assignment + centroid distances |
| Feedback Loop | Correlation matrix (CRs esquerdo x CRs direito) | CRs de ambos os lados por segmento | Quais segmentos de aquisicao geram melhor retencao |

### RF-03: Feedback Loop (Kill Switch Retroativo)

O lado direito retroalimenta o lado esquerdo:

1. **Tier Block Dinamico** — Se cohort de Tier 2 em Imersao Presencial mostra churn > 60% em 12 meses, Elucy bloqueia novas vendas desse perfil no lado esquerdo (kill switch `high_churn_profile`)
2. **RFV-driven Upsell** — Quando PA cruza para cluster "champion" (RFV), sistema gera task automatica de expansion para Account Manager
3. **Channel Quality Score** — Cada canal (D5) recebe score baseado no LTV medio dos PAs que gerou, nao apenas no volume de leads. Score visivel no SDR dashboard

### RF-04: Revenue Lab UI (Tab no Cockpit)

Nova tab `Revenue Lab` substitui posicao da tab Intel (Intel vira subtab dentro de Revenue Lab).

**Modulos visuais:**

| Modulo | Visualizacao | Interacao |
|--------|-------------|-----------|
| Bowtie Overview | Diagrama bowtie com VM e CR em cada estagio | Click em estagio → drill down |
| Unit Economics | Cards: CAC, LTV, Payback, NRR, GRR | Filtro por D3/D5/D6 |
| Cohort Heatmap | Matriz cohort x mes com retencao (cor) | Hover = detalhes, click = lista de PAs |
| Simulador | Sliders de CR por estagio → projecao de receita | Drag slider → recalculo real-time |
| Feedback Loop | Sankey diagram: canal → tier → retencao | Visual de quais caminhos geram valor |
| Health Score | Score por PA com decomposicao (recencia, frequencia, adocao) | Lista ordenavel, filtros por cluster RFV |

### RF-05: API de Metricas (para consumo externo)

Edge function `revenue-lab-api` que expoe metricas processadas para:
- Dashboards de lideranca (Google Sheets, BI tools)
- Alertas automaticos (Slack via webhook)
- Outros sistemas G4

Endpoints:
- `GET /metrics?stage=X&dimension=Y&period=Z` — metricas agregadas
- `GET /unit-economics?segment=X` — CAC, LTV, Payback
- `GET /health-score?pa_id=X` — health score individual
- `GET /forecast?scenario=X` — projecoes Monte Carlo

---

## 7. Requisitos Nao-Funcionais

| Requisito | Meta | Racional |
|-----------|------|----------|
| Latencia de calculo | < 30s para metricas agregadas, < 5min para full recompute | Operador nao espera — cache resolve 90% dos requests |
| Freshness | Metricas atualizadas a cada sync-deals (atual: ~daily) | Revenue Lab e tao fresh quanto o sync |
| Seguranca | JWT obrigatorio, rate limit 10/min, Black Box nos modelos | Consistente com D-006, D-014, D-015 |
| Escalabilidade | Suportar 640 segmentos (D3xD5xD6) x 8 estagios x 12 meses = ~61K registros em metrics_agg | Databricks aguenta; Supabase precisa de indices |
| Observabilidade | Logs de cada compute run, latencia p95, cache hit rate | Via telemetry-stats existente |

---

## 8. Out of Scope (V1)

- **Dados de custo de aquisicao real** — CAC V1 sera estimado (custo por canal informado manualmente). Integracao com Meta Ads / Google Ads = V2
- **NPS real** — Advocacy V1 usa proxy (indicacoes via UTM). NPS survey integration = V2
- **Presenca granular** — Adoption V1 usa flag binaria (alocado/nao). Presenca por dia de imersao = V2
- **ML avancado** — V1 usa regressao logistica e K-means. Gradient boosting / neural nets = V3
- **Real-time streaming** — V1 e batch (recompute no sync). Streaming via Supabase realtime = V2

---

## 9. Metricas de Sucesso

| Metrica | Baseline | Target V1 (90 dias) | Guardrail |
|---------|----------|---------------------|-----------|
| Cobertura bowtie | 0% (so lado esquerdo) | 100% dos 8 estagios com dados | < 6 estagios = gaps criticos |
| LTV precision | Inexistente | LTV estimado por segmento com CI 95% | CI > 50% do valor = modelo fraco |
| Feedback loop ativo | 0 kill switches retroativos | >= 1 kill switch ativo baseado em dados de retencao | 0 = loop nao funciona |
| Adocao Revenue Lab | 0 | Nathan usa simulador >= 2x/semana | 0 uso em 30 dias = UX ruim |
| Churn prediction accuracy | Inexistente | AUC > 0.7 na curva ROC | < 0.6 = modelo inutil |
| Tempo de decisao estrategica | Subjetivo (horas/dias coletando dados) | < 5min para responder "investir em aquisicao ou retencao?" | > 30min = ferramenta nao resolve |

---

## 10. Dependencias

| Dependencia | Status | Impacto se bloqueada |
|-------------|--------|---------------------|
| funil_comercial (Databricks) | Ativa | Bloqueia lado esquerdo inteiro |
| deals_fct + personal_account_to_deals_fct | Ativa | Bloqueia noh do bowtie |
| vagas_fct + alunos_events_fct | Ativa | Bloqueia VM5 (Onboarding) |
| eventos_presenciais_fct | Ativa | Bloqueia VM6 (Adocao) |
| order_items | Ativa | Bloqueia VM7 (Expansao) e LTV |
| persons_overview | Ativa | Bloqueia join PA → jornada completa |
| Pipeline D2 (Transition Engine) | Em desenvolvimento | Sem D2, transicoes do lado esquerdo sao imprecisas |
| Backend Computed Fields (D-024) | Ready | Sem computed fields, metricas do lado esquerdo sao inconsistentes |
| sync-deals atualizado | Ativa | Freshness de dados depende do sync |

---

## 11. Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Dados de pos-venda incompletos (vagas_fct sem todas alocacoes) | Alta | Alto | Audit de completude antes de V1. Fallback: usar closed_at como proxy de onboarding |
| Segmentacao gera combinacoes com N < 10 (nao significativo) | Media | Medio | Threshold minimo: so calcular metrica se N >= 10 no segmento |
| Modelos estatisticos overfit em dados escassos | Media | Alto | Cross-validation obrigatoria. Regularizacao em logistic regression |
| Performance do compute em 640 segmentos | Baixa | Medio | Processamento paralelo por segmento. Cache de 4h |
| Resistencia operacional ("mais um dashboard") | Media | Alto | Revenue Lab NAO e dashboard — e motor. UI so mostra output processado |

---

## 12. Fases de Implementacao

### Fase 0 — Data Audit & Schema (Semana 1-2)
**Objetivo:** Validar que todos os dados existem e criar schemas

| Item | Descricao | Esforco |
|------|-----------|---------|
| F0-1 | Audit de completude: vagas_fct, alunos_events_fct, order_items — verificar cobertura por cohort | S |
| F0-2 | Query exploratoria: quantos PAs tem jornada completa (deal + vaga + evento + deal subsequente)? | XS |
| F0-3 | Criar tabela `bowtie_funnel_fct` no Databricks | S |
| F0-4 | Criar tabela `bowtie_metrics_agg` no Supabase | XS |
| F0-5 | Pipeline ETL: popular bowtie_funnel_fct a partir das tabelas existentes | M |
| **Gate:** | >= 70% dos PAs com deal ganho tem ao menos 1 estagio pos-venda mapeavel | — |

### Fase 1 — Metricas Core (Semana 3-5)
**Objetivo:** Calcular VM e CR para todos os 8 estagios, sem segmentacao

| Item | Descricao | Esforco |
|------|-----------|---------|
| F1-1 | Edge function `revenue-lab-compute` — calculo de VM/CR por estagio (agregado, sem corte) | M |
| F1-2 | Calculo de t (tempo medio por estagio) | S |
| F1-3 | Unit economics basicos: LTV historico, CAC estimado, Payback | S |
| F1-4 | Persistencia em bowtie_metrics_agg | S |
| F1-5 | Endpoint API basico (`/metrics`, `/unit-economics`) | S |
| **Gate:** | Metricas conferem com sample manual de 50 PAs | — |

### Fase 2 — Segmentacao & Estatistica (Semana 6-8)
**Objetivo:** Fragmentar metricas por dimensoes e aplicar modelos estatisticos

| Item | Descricao | Esforco |
|------|-----------|---------|
| F2-1 | Segmentacao por D3 (grupo_receita), D5 (canal), D6 (tier) | M |
| F2-2 | Estatistica descritiva por segmento (media, mediana, std, p25/p75/p95) | S |
| F2-3 | Cohort analysis — curvas de retencao por cohort mensal | M |
| F2-4 | Churn prediction — logistic regression com features basicas | M |
| F2-5 | RFV clustering — K-means (k=4) para PAs do lado direito | S |
| F2-6 | Anomaly detection — Z-score por metrica/segmento | S |
| **Gate:** | Churn prediction AUC > 0.65 em validacao cruzada | — |

### Fase 3 — Feedback Loop & Kill Switches (Semana 9-10)
**Objetivo:** Conectar lado direito ao lado esquerdo

| Item | Descricao | Esforco |
|------|-----------|---------|
| F3-1 | Correlation matrix: CRs do lado esquerdo x CRs do lado direito | S |
| F3-2 | Channel Quality Score por D5 (baseado em LTV, nao volume) | S |
| F3-3 | Kill switch `high_churn_profile` — bloqueia perfis de alto churn no lado esquerdo | M |
| F3-4 | RFV-driven task generation — auto-cria task de expansion para champions | S |
| F3-5 | Wiring com transition-validator: novo gate `churn_risk_check` | S |
| **Gate:** | >= 1 kill switch retroativo disparado em teste com dados reais | — |

### Fase 4 — Revenue Lab UI (Semana 11-14)
**Objetivo:** Interface no cockpit

| Item | Descricao | Esforco |
|------|-----------|---------|
| F4-1 | Tab Revenue Lab no cockpit (substitui posicao de Intel) | M |
| F4-2 | Bowtie Overview diagram (SVG interativo com VM/CR) | L |
| F4-3 | Unit Economics cards com filtros D3/D5/D6 | M |
| F4-4 | Cohort Heatmap | M |
| F4-5 | Simulador de cenarios (sliders de CR → projecao) | L |
| F4-6 | Health Score list com RFV clusters | M |
| **Gate:** | Nathan valida que simulador responde "aquisicao vs retencao" em < 5min | — |

### Fase 5 — Forecast Bidirecional & Refinamento (Semana 15-18)
**Objetivo:** Motor preditivo completo

| Item | Descricao | Esforco |
|------|-----------|---------|
| F5-1 | Monte Carlo simulation (1000 runs) para forecast de receita | L |
| F5-2 | Trend analysis com regressao linear (6 meses rolling) | M |
| F5-3 | Confidence intervals em todas as projecoes | S |
| F5-4 | Sankey diagram (canal → tier → retencao) | M |
| F5-5 | Alertas automaticos (Slack webhook) para anomalias | S |
| F5-6 | API completa (`/forecast`, `/health-score`) | S |
| **Gate:** | Forecast p50 desvia < 15% do realizado em backtest de 3 meses | — |

---

## 13. Decisoes de Arquitetura

| Decisao | Opcoes avaliadas | Escolha | Racional |
|---------|-----------------|---------|----------|
| Onde vive o bowtie_funnel_fct | (a) Supabase (b) Databricks (c) Ambos | **(b) Databricks** como source of truth, materialized view em Supabase para frontend | Databricks tem os dados brutos e poder de ETL. Supabase serve o frontend |
| Processamento estatistico | (a) Frontend JS (b) Edge Function (c) Databricks SQL | **(b) Edge Function** com fallback para (c) em queries pesadas | Consistente com D-024 (backend computes). Edge function = versionavel, testavel |
| Granularidade temporal | (a) Diario (b) Semanal (c) Mensal | **(c) Mensal** para V1, com drill-down semanal em Fase 5 | Mensal e suficiente para decisoes estrategicas. Diario gera ruido |
| Framework ML | (a) TensorFlow.js (b) Python sidecar (c) Estatistica manual em JS | **(c) Estatistica manual** para V1 — regressao logistica e K-means implementados do zero | Zero dependencia, auditavel, suficiente para V1. Python sidecar = V2 se precisar |
| Revenue Lab como tab vs app separado | (a) Tab no cockpit (b) App standalone | **(a) Tab no cockpit** | Operador ja esta no cockpit. Consistente com D-001 (JS vanilla). Reduz friction |

---

## 14. Diagrama de Arquitetura

```
                    REVENUE LAB — DATA FLOW

  [Databricks]                              [Supabase]
  ============                              ==========
  funil_comercial ─┐
  deals_fct ───────┤                     bowtie_metrics_agg
  vagas_fct ───────┼──→ bowtie_funnel_fct ──→ (materialized)
  order_items ─────┤         |                     |
  persons_overview ┘         |                     |
                             v                     v
                     [revenue-lab-compute]    [cockpit.html]
                     Edge Function            Revenue Lab Tab
                             |                     |
                     Segmentacao              Bowtie Diagram
                     Estatistica              Unit Economics
                     ML (LR, KMeans)          Cohort Heatmap
                     Anomaly Detection        Simulador
                             |                Health Score
                             v
                     [revenue-lab-api]
                     Edge Function
                             |
                     Slack Alerts
                     Google Sheets
                     BI Tools
```

---

## 15. Glossario

| Termo | Definicao no contexto Revenue Lab |
|-------|----------------------------------|
| VM (Volume Metric) | Contagem de entidades em um estagio do bowtie por periodo |
| CR (Conversion Rate) | Taxa de conversao entre estagios adjacentes |
| t (Tempo) | Duracao media em dias que uma entidade permanece em um estagio |
| Noh | Ponto central do bowtie — momento do fechamento (Ganho) |
| GRR (Gross Revenue Retention) | % de receita retida sem contar expansao |
| NRR (Net Revenue Retention) | % de receita retida incluindo expansao (upsell/cross) |
| RFV | Recencia, Frequencia, Valor — framework de clusterizacao de clientes |
| Feedback Loop | Mecanismo pelo qual dados do lado direito influenciam decisoes do lado esquerdo |
| Kill Switch Retroativo | Bloqueio automatico no pipeline de aquisicao baseado em dados de retencao |
| Cohort | Grupo de PAs que fecharam o primeiro deal no mesmo mes |

---

## 16. Proximos Passos

1. **Nathan valida** este PRD e responde as 3 perguntas de discovery (anatomia pos-venda, output esperado, granularidade)
2. **Fase 0 inicia** com audit de dados no Databricks — query exploratoria para medir cobertura
3. **Decisao D-025** registrada no decisions-log: Revenue Lab como motor matematico, nao dashboard
4. **Backlog atualizado** com epico Revenue Lab (B-013)

---

> **"O Revenue Lab nao e mais uma tela. E a resposta matematica para a pergunta que todo CRO faz: onde colocar o proximo real?"**
