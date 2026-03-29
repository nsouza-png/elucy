# G4 RevOps Blueprint — Taxonomia Canonica
> BLUEPRINT_001 | v1.0 | 29/03/2026
> Fonte: production.diamond.funil_comercial (Databricks) — mapeamento real, nao teorico.

## Principio Fundamental

O G4 opera com **6 dimensoes independentes** que NUNCA devem ser misturadas:

| DIM | Campo Databricks | O Que Representa | Label UI (cockpit) | Exemplo |
|-----|------------------|------------------|-------------------|---------|
| D1 | `etapa_atual_no_pipeline` | Workflow operacional (onde o deal esta no processo) | Etapa Operacional | Novo Lead, D1-D6, Conectados, Agendamento |
| D2 | `fase_atual_no_processo` | Maturidade comercial (estagio logico) | **Fase Comercial** | MQL, SAL, Conectado, Oportunidade |
| D3 | `grupo_de_receita` | Macro familia do produto/receita | Grupo de Receita | Turmas, Self-Checkout, Field Sales |
| D4 | `linha_de_receita_vigente` | Produto/campanha especifica em negociacao | Linha de Receita | [IM] Social DM, G4 Traction, [ON] Selfcheckout |
| D5 | `canal_de_marketing` | Canal de aquisicao/origem do lead | **Canal de Origem** | Social Media, Paid Media, CRM, Prospecção |
| D6 | `tier_da_oportunidade` | Porte do deal (ticket estimado) | **Tier** | Diamond, Gold, Silver, Bronze |

> **Nota de nomenclatura (UI):**
> - D2 exibe como **Fase Comercial** (não "Fase de Qualificação") — os valores incluem Negociação, Ganho, Perdido, que vão além de qualificação
> - D5 exibe como **Canal de Origem** (não "Canal de Marketing") — mais claro para o operador SDR
> - D6 exibe como **Tier** capitalizado (Diamond/Gold/Silver/Bronze) — valores no DB continuam minúsculos

---

## D1 — Etapa Operacional (`etapa_atual_no_pipeline`)

> **Uso:** Task Runner, SLA, aging, cadencia, ordenacao Pipeline. NAO define forecast.

### Etapas SDR (pipeline principal — as unicas relevantes para operacao diaria)
```
Novo Lead -> Dia 01 -> Dia 02 -> Dia 03 -> Dia 04 -> Dia 05 -> Dia 06
  -> Conectados -> Agendamento -> Reagendamento -> Entrevista Agendada
  -> Nova Oportunidade -> Negociacao -> Ganho / Perdido
```

### Etapas Secundarias (outros pipelines no HubSpot — 170+ valores distintos)
O Databricks contem ~170 etapas distintas porque cada pipeline do HubSpot tem suas proprias.
Exemplos de pipelines secundarios:
- CS/Renovacao: CHURN, T3/T4, ADOCAO, QBR 1-4, Pós Onboarding
- Eventos: Inscrito, Presente, Ausente, Dia do evento
- Selfcheckout: Abandono de Carrinho, Self Checkout
- Field Sales: Prospeccao 1-3, Discovery, Demo, Proposta Enviada
- Legados: Limpeza de Pipeline, Legado Pipeline AM, [Aniv25] Perdido

**REGRA:** Filtros e views SDR devem considerar APENAS as etapas do pipeline principal.
As etapas secundarias sao contextuais e NAO devem aparecer em Task Runner ou filtros globais.

---

## D2 — Fase de Qualificacao (`fase_atual_no_processo`)

> **Uso:** Forecast, scoring, maturidade. Define PROBABILIDADE, nao workflow.

| Fase | Significado | Volume Real |
|------|-------------|-------------|
| MQL | Marketing Qualified Lead — lead gerado pelo mkt | 36.656 |
| SAL | Sales Accepted Lead — aceito pelo time comercial | 43.019 |
| Conectado | Contato efetivo realizado | 11.213 |
| Agendado | Reuniao agendada/confirmada | 11.792 |
| Oportunidade | Deal qualificado com potencial real | 3.785 |
| Negociacao | Em negociacao ativa (proposta/contrato) | 11.018 |
| Ganho | Deal fechado | 641.185 |
| Perdido | Deal perdido | 2.873.195 |
| N/A | Sem classificacao | 2.616 |

**REGRA CRITICA:** MQL e SAL sao FASES (D2), NAO etapas de pipeline (D1). NUNCA misturar.

---

## D3 — Grupo de Receita (`grupo_de_receita`)

> **Uso:** Agrupamento macro de produto para analytics, forecast weights, e routing.

| Grupo (valor real Databricks) | Label UI | Volume | Slug Engine | SDR Scope |
|-------------------------------|----------|--------|-------------|-----------|
| Funil de Marketing | Funil de Marketing | 2.185.617 | `funil_marketing` | NAO — geracao de demanda, time de mkt |
| Turmas | Turmas | 76.058 | `turmas` | SIM |
| Projetos e Eventos | Projetos e Eventos | 612.801 | `projetos_eventos` | SIM |
| Selfcheckout | **Self-Checkout** | 204.437 | `selfcheckout` | SIM |
| Expansao | Expansão | 14.784 | `expansao` | SIM |
| Renovacao | Renovação | 9.142 | `renovacao` | SIM |
| Time de Vendas - Field Sales | **Field Sales** | 14.036 | `field_sales` | SIM |
| Time de Vendas - Aquisicao | **Aquisição** | 243.332 | `aquisicao` | SIM |
| G4 Tools | G4 Tools | 604 | `g4_tools` | SIM |
| Nao Definido | Não Definido | 8.436.800 | `nao_definido` | SIM (com peso reduzido) |

> **Regra:** valores no banco não mudam. Labels em negrito são as versões de UI — aplicar via `GRUPO_LABELS` no engine.

**REGRA CRITICA 1:** "Funil de Marketing" e um GRUPO DE RECEITA (D3), NAO um canal.
Ele agrupa todos os deals gerados pelo time de marketing (forms, chat, social media).
O SDR NAO opera esses deals — sao responsabilidade do time de mkt.

**REGRA CRITICA 2:** "Funil de Marketing" NAO e "canal". Canal e D5 (`canal_de_marketing`).
Um deal pode ser do grupo "Turmas" e ter vindo pelo canal "Social Media".

---

## D4 — Linha de Receita (`linha_de_receita_vigente`)

> **Uso:** Identificacao granular do produto/campanha. Display em deal cards. Prefixos indicam BU.

### Prefixos
| Prefixo | Business Unit |
|---------|---------------|
| [IM] | Imersoes (turmas presenciais) |
| [ON] | Online (Scale, selfcheckout) |
| [SKL] | Skills (plataforma digital) |
| [FS] | Field Sales |
| [CM] | Consulting / Marketing |

### Mapeamento D4 -> D3 (linhas por grupo)

**Turmas:** G4 Traction (30.640), Gestao e Estrategia (18.636), G4 Sales (7.622), turmas especificas IM-GE-xxx/IM-TRA-xxx
**Aquisicao:** [IM] Reativacao (147.227), [IM] Time de vendas (72.650), [SKL] Base Lost (10.107), [SKL] Time de vendas (8.831), [ON] Time de vendas (4.517)
**Selfcheckout:** [ON] Selfcheckout - Outros (98.002), [ON] Abandono de carrinho (75.139), [ON] Selfcheckout - FG4 (22.605), [SKL] Especialista (7.250)
**Projetos e Eventos:** Nao definida (178.161), Aniversario G4 (111.302), G4 Valley (73.330), BlackFriday (54.428), G4 Pelo Brasil (24.266)
**Funil de Marketing:** Form G4 Instagram G4 (204.703), [IM] Form Facebook Ads (150.829), [IM] Chat (143.937), [SKL] CRM - Email (106.832)
**Expansao:** Farmer (7.044), [ON] Customer Success (4.508), [SKL] Expansao (1.731)
**Renovacao:** G4 Scale - Renovacao (3.670), [SKL] Renovacao (2.621), G4 Club - Renovacao (2.426)
**Field Sales:** [FS] Time de vendas (14.036)
**G4 Tools:** G4 Tools (321), Finders Fee (199), Servicos (54), G4 Capital (30)

---

## D5 — Canal de Marketing (`canal_de_marketing`)

> **Uso:** Origem do lead. Analytics de canal. Routing de comunicacao.
> **NUNCA derivar canal de `linha_de_receita_vigente` (D4) — sao dimensoes diferentes.**

| Canal (valor real) | Volume | Tipo |
|--------------------|--------|------|
| Social Media | 2.286.853 | Instagram, Facebook, TikTok (organico social) |
| Paid Media | 1.172.582 | Google Ads, Meta Ads, CPC |
| Organico | 684.127 | SEO, site, busca organica |
| CRM | 565.339 | Email, WhatsApp, automacao |
| Prospeccao | 471.607 | Outbound, ligacao ativa, field sales |
| MGM | 61.163 | Member-Get-Member, indicacao |
| Eventos | 5.015 | Eventos presenciais, feiras |
| PLG | 1.678 | Product-Led Growth |
| Outros | 556 | Nao classificado |

### utm_medium — Sub-canal (30 valores top)
Usado como fallback quando `canal_de_marketing` e nulo. Mapeamento:
- **Founders (DM):** tallis (807.629), alfredo (356.199), nardon (148.801), basaglia (31.462), bernardinho (13.196), vabo (11.311) → Canal: Instagram (DM Founder)
- **Midia:** cpc (3.613.902) → Paid Media | organic (17.571) → Organico
- **Canais diretos:** whatsapp (555.479), email (490.832), chat (392.402), mensagem (24.321)
- **Produtos:** g4 (1.994.853), g4skills (91.981), g4club (46.477), g4scale (45.211), imersoes (95.365)
- **Operacional:** prospeccao-ativa (45.443), time-vendas (25.987)

---

## D6 — Tier (`tier_da_oportunidade`)

> **Uso:** Sizing do deal, ticket base, priorizacao.

| Tier (DB minúsculo) | UI (capitalizado) | Volume | Ticket Base (estimado) |
|---------------------|-------------------|--------|----------------------|
| diamond | **Diamond** | 376.458 | R$ 38.000+ |
| gold | **Gold** | 2.624.968 | R$ 18.000 |
| silver | **Silver** | 2.380.783 | R$ 9.000 |
| bronze | **Bronze** | 414.646 | R$ 4.000 |

**REGRA:** Tier bronze (<1MM faturamento) = BLOQUEADO de Imersoes Presenciais (Kill Switch KS-TIER-PRODUCT-MISMATCH).
**REGRA:** No banco: sempre minúsculo. Na UI: sempre capitalizado. NUNCA usar "Tier 1/2/3" como string.

---

## Regras de Cruzamento (Cross-Dimension)

### Canal x Grupo de Receita
Canal (D5) e Grupo (D3) sao INDEPENDENTES. Exemplos reais:
- Deal de "Turmas" pode vir de "Social Media" ou "Prospeccao"
- Deal de "Selfcheckout" pode vir de "Paid Media" ou "Organico"
- Deal de "Field Sales" vem primariamente de "Prospeccao"

### Etapa x Fase
Etapa (D1) e Fase (D2) sao PARCIALMENTE correlacionadas mas NAO equivalentes:
- Um deal em "Dia 03" (D1) normalmente esta em "SAL" (D2)
- Um deal em "Entrevista Agendada" (D1) normalmente esta em "Agendado" ou "Oportunidade" (D2)
- Mas a fase pode mudar sem a etapa mudar (e vice-versa)

### Grupo x Escopo SDR
| Grupo | SDR Opera? | Por Que |
|-------|-----------|---------|
| Funil de Marketing | NAO | Geracao de demanda = responsabilidade do time de mkt |
| Nao Definido | SIM (reduzido) | Deals sem classificacao — SDR tenta qualificar |
| Todos os outros | SIM | Core do trabalho SDR |

---

## Hierarquia de Resolucao (resolveRevenueLine)

> **REGRA CANONICA:** linha_de_receita_vigente e a propriedade-mae que diz de onde o dinheiro vem.

1. `grupo_de_receita` (quando preenchido e diferente de "Nao Definido") — fonte da verdade Databricks
2. `linha_de_receita_vigente` — propriedade-mae, classifica produto/campanha → grupo canonico
3. `utm_medium` — ULTIMO recurso, apenas quando linha_de_receita_vigente esta vazia
4. Fallback: `nao_definido`

### Caso "Nao Definido" (8.4M registros)
- `grupo_de_receita` = "Nao Definido" = propriedade nao preenchida no HubSpot
- **84% (7.1M) tem utm_medium** preenchido (cpc, g4, tallis, whatsapp, etc.)
- **48% (4.1M) tem canal_de_marketing** preenchido (Social Media, Paid Media, etc.)
- **Apenas 0.8% (65K) tem linha_de_receita_vigente** — esses sim podem ser reclassificados
- Os 8.3M restantes sao leads de marketing sem produto associado — ficam nao_definido

---

## Problemas Conhecidos nos Dados

1. **"Nao Definido" domina:** 8.4M registros (72%) — `grupo_de_receita` nao preenchido no HubSpot. Apenas 65K tem `linha_de_receita_vigente` para reclassificar; os demais sao leads sem produto associado.
2. **170+ etapas de pipeline:** Cada pipeline HubSpot cria etapas unicas — precisam ser filtradas por contexto
3. **utm_medium mistura founders e canais:** "tallis", "nardon", "alfredo" sao founders DM, nao canais — resolver via _fmtOrigem()
4. **Linhas de receita duplicadas por case/acento:** "Gestao e Estrategia" vs "Gestao & Estrategia" no Databricks
5. **Turmas com codigo de turma como linha:** IM-GE-128-MAR, IM-TRA-061-FEV — sao turmas especificas, nao linhas de receita

---

## Uso no Elucy Engine

| Dimensao | Onde e Usada | Funcao |
|----------|-------------|--------|
| D1 etapa | Task Runner, SLA, Pipeline view, aging | `_fmtEtapa()` para display |
| D2 fase | Forecast (STAGE_PROB), scoring, filtro sidebar | Probabilidade base |
| D3 grupo | REVENUE_LINES, line_weight, risk_after, analytics | `resolveRevenueLine()` |
| D4 linha | Deal card badge, Info Grid | `_fmtLinhaHtml()` para display |
| D5 canal | Analytics, channel routing, DM War Room | `_fmtOrigem()` para display |
| D6 tier | TIER_BASE, opportunity value, priorizacao | Ticket multiplicador |
