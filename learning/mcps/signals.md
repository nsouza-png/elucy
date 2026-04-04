# MCP: Signals
## Camada Semantica - Tipos de Sinais de Venda G4 Educacao

---

## Definicao

Este MCP define os 10 tipos de sinais que o sistema Elucy v2 identifica, pontua e combina para gerar recomendacoes de acao. Cada sinal possui dimensoes de peso (confianca, recencia, frequencia, impacto) que determinam sua relevancia no contexto do deal.

---

## Dimensoes de Peso (aplicam-se a todos os sinais)

| Dimensao | Range | Descricao |
|----------|-------|-----------|
| `confidence` | 0.0 - 1.0 | Quao certo estamos de que o sinal e real (dado explicito vs inferido) |
| `recency` | 0.0 - 1.0 | Quao recente e o sinal (1.0 = hoje, 0.1 = >30 dias) |
| `frequency` | 0.0 - 1.0 | Quantas vezes o sinal apareceu (1.0 = recorrente, 0.1 = unico) |
| `impact` | 0.0 - 1.0 | Quao forte e o efeito desse sinal no resultado do deal |

**Score composto:** `signal_score = (confidence * 0.3) + (recency * 0.25) + (frequency * 0.2) + (impact * 0.25)`

---

## Os 10 Tipos de Sinal

### 1. BUY (Sinal de Compra)
- **Codigo:** `buy`
- **Definicao:** Indicadores de que o lead esta pronto ou proximo de comprar
- **Evidencias no contexto G4:**
  - Lead perguntou sobre datas disponiveis para Imersao
  - Pediu proposta formal ou condicoes de pagamento
  - Perguntou sobre outros participantes/empresas que ja fizeram
  - Mencionou orcamento aprovado ou verba disponivel
  - Solicitou contrato ou link de pagamento
- **Pesos tipicos:** confidence: 0.8-1.0 | impact: 0.9-1.0
- **Mapeamento Databricks:** `aquisicao.etapa_anterior` movendo para Proposal/Negotiation, `customer_360_sales_table` com interacoes recentes

### 2. RISK (Sinal de Risco)
- **Codigo:** `risk`
- **Definicao:** Indicadores de que o deal pode ser perdido
- **Evidencias no contexto G4:**
  - Lead mencionou concorrente (EY, Endeavor, outros programas)
  - Pediu para "pensar melhor" ou "falar com socio"
  - Cancelou reuniao e nao reagendou
  - Parou de responder apos proposta enviada
  - Questionou ROI ou valor do investimento
  - Disse que "nao e o momento"
- **Pesos tipicos:** confidence: 0.6-0.9 | impact: 0.7-0.9
- **Mapeamento Databricks:** `aquisicao.motivo_lost` (historico), tempo sem atividade no deal

### 3. STALL (Sinal de Estagnacao)
- **Codigo:** `stall`
- **Definicao:** Deal parado, sem movimentacao, sem avanco nem recuo
- **Evidencias no contexto G4:**
  - Nenhuma atividade registrada ha mais de 7 dias (mid-market) ou 14 dias (enterprise)
  - Lead responde mas sem compromisso ("vamos ver", "me manda material")
  - Reuniao aconteceu mas nao houve proximo passo definido
  - Proposta enviada sem feedback apos 5 dias uteis
  - Follow-up sem resposta (2+ tentativas)
- **Pesos tipicos:** confidence: 0.7-0.9 | recency: decai rapido | impact: 0.6-0.8
- **Mapeamento Databricks:** `DATEDIFF(CURRENT_DATE, data_ultima_atividade)` na tabela aquisicao

### 4. ENGAGEMENT (Sinal de Engajamento)
- **Codigo:** `engagement`
- **Definicao:** Lead esta interagindo ativamente com conteudo ou comunicacoes da G4
- **Evidencias no contexto G4:**
  - Abriu emails de follow-up (3+ vezes)
  - Assistiu webinar ou live da G4
  - Interagiu com conteudo no Instagram/LinkedIn da G4
  - Baixou material rico (ebook, pesquisa, case)
  - Visitou pagina de produto no site (Imersao, Club)
  - Respondeu pesquisa ou formulario
- **Pesos tipicos:** confidence: 0.5-0.7 (inferido) | frequency: importante | impact: 0.4-0.6
- **Mapeamento Databricks:** `skills_pql_user` (product qualified leads), metricas de engajamento

### 5. MULTI_THREAD (Sinal de Multi-Thread)
- **Codigo:** `multi_thread`
- **Definicao:** Multiplas pessoas da mesma empresa estao envolvidas no processo
- **Evidencias no contexto G4:**
  - Lead mencionou que vai "falar com o CEO/socio"
  - Segundo contato da mesma empresa apareceu no pipeline
  - Lead pediu para incluir outra pessoa na reuniao
  - Executor trouxe o decisor para conversa
  - Multiplos cadastros da mesma empresa em persons_overview
- **Pesos tipicos:** confidence: 0.7-0.9 | impact: 0.8-1.0 (muda drasticamente a probabilidade)
- **Mapeamento Databricks:** `persons_overview` agrupado por empresa, `aquisicao` com multiplos contatos

### 6. TIMING (Sinal de Timing)
- **Codigo:** `timing`
- **Definicao:** Alinhamento temporal favoravel a compra
- **Evidencias no contexto G4:**
  - Proxima Imersao em menos de 30 dias (urgencia natural)
  - Inicio de trimestre/ano (orcamento novo)
  - Lead mencionou evento ou deadline especifico ("preciso resolver isso antes de X")
  - Sazonalidade favoravel (Jan-Mar e Jul-Set sao picos de Imersao)
  - Lead mencionou Critical Event no SPICED
- **Pesos tipicos:** confidence: 0.6-0.8 | recency: critico | impact: 0.7-0.9
- **Mapeamento Databricks:** calendario de Imersoes, `aquisicao.data_criacao` vs datas de evento

### 7. BUDGET (Sinal de Orcamento)
- **Codigo:** `budget`
- **Definicao:** Indicadores sobre capacidade e disposicao financeira
- **Evidencias no contexto G4:**
  - Lead confirmou faixa de investimento compativel
  - Nao demonstrou choque com precos mencionados
  - Perguntou sobre condicoes de pagamento (sinal positivo: esta planejando)
  - Ja e cliente de outro produto G4 (historico de pagamento)
  - Empresa esta em `faixa_de_faturamento` compativel com o produto
- **Pesos tipicos:** confidence: 0.6-0.9 | impact: 0.7-0.8
- **Mapeamento Databricks:** `persons_overview.faixa_de_faturamento`, `order_items` (historico de compras), `customer_360_sales_table`

### 8. AUTHORITY (Sinal de Autoridade)
- **Codigo:** `authority`
- **Definicao:** Indicadores sobre poder de decisao do contato
- **Evidencias no contexto G4:**
  - Lead e CEO/Founder (confirma autoridade)
  - Lead disse "eu decido isso"
  - Lead e Diretor mas precisa de aprovacao (reduz authority)
  - Lead envolveu decisor no processo (authority indireta)
  - Cargo no `persons_overview` confirma nivel C-level
- **Pesos tipicos:** confidence: 0.7-1.0 | impact: 0.8-1.0
- **Mapeamento Databricks:** `persons_overview.cargo`, `persons_overview.perfil`

### 9. PAIN (Sinal de Dor)
- **Codigo:** `pain`
- **Definicao:** Lead articulou um problema claro que a G4 pode resolver
- **Evidencias no contexto G4:**
  - "Minha empresa estagnou e nao sei como crescer"
  - "Preciso de networking com empresarios do meu nivel"
  - "Meu time nao performa e preciso de metodologia"
  - "Estou perdendo mercado para concorrentes"
  - "Nao consigo escalar a operacao"
  - Dor mapeada no SPICED (Problem + Impact documentados)
- **Pesos tipicos:** confidence: 0.7-1.0 (depende se e explicito) | impact: 0.8-0.9
- **Mapeamento Databricks:** campos de qualificacao no CRM, notas de reuniao

### 10. URGENCY (Sinal de Urgencia)
- **Codigo:** `urgency`
- **Definicao:** Pressao temporal real para resolver o problema
- **Evidencias no contexto G4:**
  - "Preciso resolver isso nesse trimestre"
  - Evento externo criando pressao (fusao, novo investidor, perda de cliente grande)
  - Critical Event mapeado no SPICED com data especifica
  - Lead iniciou contato (nao foi prospectado - urgencia implicita)
  - Deadline interno mencionado
- **Pesos tipicos:** confidence: 0.7-0.9 | recency: maximo | impact: 0.9-1.0
- **Mapeamento Databricks:** campo de Critical Event no CRM, `aquisicao.data_criacao` (inbound = urgencia implicita)

### 11. CQL_STATE (Estado de Jornada Social DM — Conversa Qualificada)
> **NOTA TAXONOMICA:** cql_state NAO e um sinal no mesmo nivel semantico dos demais (buy/pain/risk).
> E um **estado de jornada** da conversa no canal Social DM. Gerenciado separadamente do SIGNAL_REGISTRY.
> Mantido neste arquivo por proximidade operacional — nao incluir no calculo de deal_score.
- **Codigo:** `cql_state`
- **Escopo:** EXCLUSIVO para canal SOCIAL_DM. Nao existe em outros canais.
- **Definicao:** Estado intermediario de qualificacao pre-MQL no Social DM. Mede o progresso da conversa na DM em relacao ao fluxo de conversao CQL→MQL.
- **Estados possiveis:**
  - `CQL_NONE` — Lead nao respondeu ou respondeu apenas com emoji. Nao e CQL ainda.
  - `CQL_INITIATED` — Lead respondeu com conteudo (TP1 concluido). Conversa existe.
  - `CQL_DEEPENED` — Lead revelou empresa/cargo/dor (TP2 concluido). CQL confirmado.
  - `CQL_REFRAMED` — Lead recebeu reframe e demonstrou tensao positiva (TP3 concluido). Pronto para CTA.
  - `CQL_CONVERTED` — Lead aceitou ir para WhatsApp/Call (TP4 executado). CQL → MQL confirmado.
  - `CQL_STALLED` — Silencio > 48h pos-TP1 ou TP2. Reengajamento necessario (TP5).
  - `CQL_DISQUALIFIED` — Lead perguntou preco/tecnico na DM OU revelou Perfil Toxico. BLOQUEADO.
- **Evidencias de CQL_DEEPENED (CQL confirmado):**
  - Lead mencionou empresa, cargo ou faixa de faturamento
  - Lead descreveu um problema de negocio ("meu time nao entrega", "estagnei")
  - Lead se identificou como decisor ou socio
- **Regra de promocao CQL → MQL:**
  - `cql_state = CQL_CONVERTED` → Lead vira MQL automaticamente
  - `cql_state = CQL_REFRAMED` + tensao positiva detectada → SDR executa CTA imperativo
- **Pesos tipicos:** confidence: 0.85 (estado e factual, nao inferido) | impact: 0.95 (canal de altissimo RPL)
- **Kill Switches ativos para Social DM:**
  - Lead perguntou preco/tecnico: `CQL_DISQUALIFIED` — resposta: devolver com curiosidade estrategica
  - Perfil I/J (<500k detectado): `CQL_DISQUALIFIED` — direcionar automacao, nao gastar tempo senior
  - Resposta tipo "ok"/"show"/emoji: `CQL_STATE` permanece em `CQL_INITIATED` (nao avanca)
- **Mapeamento Databricks:** canal_origem = 'Social DM' em `aquisicao`, `distribuicao_leads_resultado`

---

## Regras Compostas (Combinacao de Sinais)

### Combinacoes de Alta Probabilidade

```
REGRA 1: multi_thread + urgency = HIGH_PROBABILITY
  Condicao: multi_thread.score > 0.6 AND urgency.score > 0.6
  Resultado: probabilidade de close +30%
  Acao: priorizar deal, preparar proposta imediatamente

REGRA 2: buy + authority + budget = READY_TO_CLOSE
  Condicao: buy.score > 0.7 AND authority.score > 0.7 AND budget.score > 0.6
  Resultado: deal pronto para fechamento
  Acao: enviar proposta/contrato, nao atrasar

REGRA 3: pain + urgency + timing = PERFECT_STORM
  Condicao: pain.score > 0.7 AND urgency.score > 0.6 AND timing.score > 0.5
  Resultado: janela de oportunidade maxima
  Acao: abordagem direta ao resultado, nao fazer discovery demorado

REGRA 4: engagement + pain + authority = WARM_AND_READY
  Condicao: engagement.frequency > 0.6 AND pain.score > 0.6 AND authority.score > 0.7
  Resultado: lead aquecido com poder de decisao
  Acao: agendar reuniao rapidamente, nao perder momentum
```

### Combinacoes de Alto Risco

```
REGRA 5: stall + risk = DEAL_IN_DANGER
  Condicao: stall.score > 0.5 AND risk.score > 0.5
  Resultado: deal em risco critico
  Acao: late_stage_recovery playbook, mudar abordagem completamente

REGRA 6: stall + no_reply (engagement < 0.2) = GHOSTING
  Condicao: stall.score > 0.6 AND engagement.score < 0.2
  Resultado: lead sumiu
  Acao: breakup email, tentar canal diferente, ou mover para reactivation

REGRA 7: meeting_cancelled + late_stage (estagio >= Proposal) = HIGH_RISK
  Condicao: risk (cancelamento) em estagio Proposal ou Negotiation
  Resultado: deal possivelmente perdido
  Acao: contato urgente por canal diferente, verificar se decisor saiu do processo

REGRA 8: authority_low + no_multi_thread = STUCK
  Condicao: authority.score < 0.4 AND multi_thread.score < 0.3
  Resultado: falando com pessoa errada sem caminho para decisor
  Acao: ativar multi-thread strategy, pedir apresentacao ao CEO
```

### Combinacoes de Oportunidade

```
REGRA 9: budget + engagement + no_contact = MISSED_OPPORTUNITY
  Condicao: budget.score > 0.6 AND engagement.score > 0.5 AND sdr_contact nao realizado
  Resultado: lead quente sem contato de SDR
  Acao: contato imediato, prioridade maxima na fila

REGRA 10: pain + no_urgency + authority = NEEDS_CRITICAL_EVENT
  Condicao: pain.score > 0.7 AND urgency.score < 0.3 AND authority.score > 0.6
  Resultado: tem dor e poder mas nao tem pressa
  Acao: criar urgencia via Critical Event (proximo evento, vagas limitadas, case de concorrente)
```

---

## Calculo do Score Agregado do Deal

```
deal_score = SUM(signal_score * signal_weight) / total_signals

Onde signal_weight por tipo:
  buy: 1.0
  urgency: 0.95
  authority: 0.90
  pain: 0.85
  budget: 0.80
  multi_thread: 0.80
  timing: 0.70
  engagement: 0.60
  risk: -0.90 (negativo - reduz score)
  stall: -0.70 (negativo - reduz score)

Classificacao:
  deal_score >= 0.7 = HOT (prioridade maxima)
  deal_score 0.4-0.69 = WARM (acompanhamento ativo)
  deal_score 0.2-0.39 = COOL (nurturing)
  deal_score < 0.2 = COLD (considerar descarte ou reactivation)
```

---

## Mapeamento Databricks - Resumo

| Sinal | Tabela Principal | Campos |
|-------|-----------------|--------|
| buy | aquisicao | etapa_anterior, status_do_deal |
| risk | aquisicao | motivo_lost, data_ultima_atividade |
| stall | aquisicao | data_ultima_atividade, etapa_anterior |
| engagement | skills_pql_user | metricas de interacao |
| multi_thread | persons_overview | empresa, contatos por empresa |
| timing | aquisicao + calendario | data_criacao, datas de eventos |
| budget | persons_overview, order_items | faixa_de_faturamento, historico |
| authority | persons_overview | cargo, perfil |
| pain | CRM (notas) | campos de qualificacao SPICED |
| urgency | CRM (notas) | Critical Event do SPICED |

---

## Delta como Sinal Primario (Integracao com CSE Engine)

O Delta (Δ) e a unidade atomica de progresso conversacional.
Cada sinal listado acima ganha ou perde relevancia baseado no Delta gerado.

### Classificacao de Delta por Sinal

```
DELTA POSITIVO (Δ > 0) — sinal ganha peso:
  - Lead revelou novo dado (dor, cargo, budget, timeline)
  - Lead mudou postura (de defensivo para curioso)
  - Lead fez pergunta ativa (de investigacao, nao de preco)
  - Lead mencionou Critical Event pela primeira vez
  Resultado: elevar confidence do sinal em +0.1 a +0.2

DELTA ZERO (Δ = 0) — sinal nao evolui:
  - Lead respondeu "ok", "legal", emoji
  - Resposta monossilabica sem nova informacao
  - Confirmacao generica sem substancia
  Resultado: manter peso do sinal, contar como friccao inutil (nao como touchpoint valido)

DELTA NEGATIVO (Δ < 0) — sinal regride:
  - Lead recuou de posicao anterior
  - Lead reverteu decisao ja tomada
  - Lead demonstrou irritacao ou fechamento
  - Lead cancelou reuniao sem reagendar
  Resultado: reduzir confidence do sinal em -0.2 a -0.4, ativar risk_signal
```

### Silencio como Sinal Ativo (Leitura do Invisivel)

O silencio nao e ausencia de sinal. E um sinal com interpretacao propria.

| Tipo de Silencio | Duracao Tipica | Sinal Gerado | Peso |
|---|---|---|---|
| Silencio Reflexivo (pos-Challenger) | 2-24h | POSITIVE_PROCESSING | confidence: 0.8 — aguardar |
| Silencio de Aprovacao Interna | 1-3 dias | BLOCKED_WAITING | confidence: 0.6 — follow-up com prazo |
| Ghost pos-preco | 2-5 dias | RISK alto | confidence: 0.7 — reengajamento com valor |
| Ghost total | 5+ dias | STALL critico | confidence: 0.85 — breakup ou nurturing |
| Silencio Estrategico (testando SDR) | Variavel | AUTHORITY_TEST | confidence: 0.65 — aplicar silencio de volta |

**Regra:** Silencio pos-Challenger com Titan = NAO e stall. E TENSIONED.
**Regra:** Ghost post-proposta Builder = risk + stall combinados.
**Regra:** SDR que quebra silencio reflexivo com "achou o que?" perde o deal.

### Integracao com CSE States

| CSE State | Sinal Esperado | Sinal de Alerta |
|---|---|---|
| COLD | Nenhum ativo | buy, urgency — se aparecerem, dados suspeitos |
| AWARE | engagement fraco | risk aparecendo cedo demais |
| CURIOUS | engagement + stall | buy antes de pain — prematuridade |
| PROBLEM-AWARE | pain forte | urgency ausente — Critical Event nao identificado |
| TENSIONED | silencio reflexivo | risk + stall — indica reacao negativa ao Challenger |
| ALIGNED | buy + authority | stall — deal pode estar travando no final |
| BLOCKED | multi_thread + timing | risk — bloqueio pode ser definitivo |
| DISQUALIFIED | N/A | todos os sinais sao invalidos — nao processar |

---

## Skills que Usam

| Skill | Como Usa os Sinais |
|-------|-------------------|
| `signal-scorer` | Calcula score composto de cada sinal e deal_score agregado |
| `deal-coach` | Usa regras compostas para recomendar proximos passos |
| `alert-system` | Dispara alertas em combinacoes de risco (regras 5-8) |
| `meeting-prep` | Prioriza sinais identificados para briefing pre-reuniao |
| `pipeline-analyzer` | Agrega sinais por estagio para diagnostico de funil |
| `sinais-lead` | Skill Elucy que usa este MCP + cse-engine para leitura de estado |
| `analisar-call` | Extrai sinais do transcript e calcula Delta por interacao |
| `qualification-engine` | Valida se sinais minimos estao presentes para avancar estagio |
| `playbook-selector` | Escolhe playbook com base na combinacao de sinais dominantes |
| `forecast-engine` | Usa deal_score para previsao de receita ponderada |

---

## Notas Importantes

1. **Sinais nao sao estaticos** - devem ser reavaliados a cada interacao
2. **Recency e critico** - um sinal de buy de 30 dias atras vale muito menos que um de hoje
3. **Sinais negativos (risk, stall) tem decaimento mais lento** - um risco identificado continua relevante por mais tempo
4. **Sinais de diferentes fontes aumentam confidence** - pain mencionada pelo lead + confirmada por dados = confidence 1.0
5. **O contexto do segmento altera os thresholds** - stall de 7 dias e critico para SMB mas normal para Enterprise

---

## Action Flags - Flags de Acao (Canonico - Doc 6)

Cada sinal processado gera uma Action Flag que determina a resposta do sistema:

| Flag | Descricao | Quando Aciona |
|------|-----------|---------------|
| **Diagnosticar** | Iniciar/aprofundar diagnostico SPICED | Lead demonstrou dor mas sem impacto financeiro mapeado |
| **Responder** | Resposta imediata necessaria | Lead fez pergunta direta ou demonstrou sinal de compra |
| **Silenciar** | Silencio tatico - NAO responder agora | Pos-Challenger com Titan, ou lead processando informacao |
| **Bloquear** | Bloquear avanço no funil | Perfil incompativel, Tier 2 tentando acesso premium, ou comportamento toxico |
| **Escalar** | Escalar para humano (operador/Closer) | Situacao complexa que excede capacidade do sistema automatizado |

---

## Zonas de Execucao - Gatilhos de Zona (Canonico - Doc 8)

### OPERATING_ZONE_GREEN (Sistema pode agir com autonomia)
Condicoes que indicam que o sistema/SDR pode operar com confianca:
- **Persona Titan identificada** - alto valor, framework claro
- **Contexto de Estagnacao** - lead reconheceu que esta estagnado, pronto para SPICED
- **Pos-SPICED completo** - diagnostico feito, impacto confirmado, proximo passo claro

### OPERATING_ZONE_RED (Cautela maxima, risco de erro)
Condicoes que exigem supervisao ou mudanca de abordagem:
- **Eventos de topo de funil** - lead ainda COLD/AWARE, nao forcar venda
- **SMB / Tier 2 Online** - lead de baixo ticket tentando acesso a produtos premium
- **Taticas de fechamento por preco** - lead focado em desconto, nao em valor (ex: "qual o menor preco?")

---

## Latencia como Qualificacao (Canonico - Doc 10)

O tempo de resposta do lead e um SINAL, nao apenas uma metrica operacional:

### Silencio Positivo
```
CONDICAO: Pergunta dificil enviada (Challenger/SPICED) + lead demora ~4 horas para responder
INTERPRETACAO: Lead esta PROCESSANDO a informacao. Isso e BOM.
ACAO: ESPERAR. Nao enviar follow-up. Nao perguntar "viu minha mensagem?".
O silencio e sinal de reflexao profunda.
```

### Silencio Negativo
```
CONDICAO: Preco/proposta enviada + lead some por 2+ dias
INTERPRETACAO: Lead esta fazendo GHOSTING. Isso e RUIM.
ACAO: Re-engajar com fear trigger (custo de inacao, vaga se fechando, case de concorrente).
NAO enviar "so passando para saber se viu".
```

---

## Medicao Delta (Canonico - Doc 10)

O Delta mede a variacao de informacao util entre interacoes:

```
Delta > 0 (POSITIVO): Nova informacao obtida na interacao
  - Lead revelou dor, compartilhou contexto, respondeu SPICED
  - ACAO: Continuar no mesmo ritmo, aprofundar

Delta = 0 (NEUTRO): Nenhuma informacao nova
  - Interacao aconteceu mas nao gerou insight
  - ACAO: Friccao inutil. Mudar abordagem, fazer pergunta diferente

Delta < 0 (NEGATIVO): Lead RECUOU
  - Lead deu informacao e depois voltou atras, ficou vago, contradisse
  - ACAO: Alerta de risco. Lead pode estar sendo influenciado por terceiro
    ou arrependido de ter compartilhado demais. Recalibrar abordagem.
```

---

## Triggers de Transicao CSE como Sinais

Transicoes entre estados CSE geram sinais automaticos:

| Transicao | Sinal Gerado | Acao |
|-----------|-------------|------|
| COLD > AWARE | `engagement` detectado | Iniciar Social Proof |
| AWARE > CURIOUS | `pain` superficial detectada | ATENCAO: nao vender aqui, redirecionar com SPICED |
| CURIOUS > PROBLEM-AWARE | `pain` profunda confirmada | Aprofundar SPICED, mapear impacto financeiro |
| PROBLEM-AWARE > TENSIONED | `urgency` + impacto confirmado | Silencio tatico, deixar tensao trabalhar |
| TENSIONED > ALIGNED | `buy` signal emergindo | Facilitar, remover friccao |
| ALIGNED > BLOCKED | `risk` ou `stall` detectado | Identificar trava, aplicar SPIN |
| BLOCKED > ALIGNED | Trava removida | Retomar facilitacao, agendar Closer |
| Qualquer > DISQUALIFIED | `authority` ou `budget` insuficiente | Downsell ou Nurture automatico |

---

## Triggers de Topico para Founder Mode (Canonico - Doc 15)

Quando o lead menciona topicos especificos, o sistema aciona o "Founder Mode" - referenciando o founder G4 mais relevante:

| Topico Detectado | Founder Acionado | Contexto |
|-----------------|-----------------|----------|
| Time, escala, crescimento | **Tallis** | Especialista em escala e crescimento acelerado |
| Gestao, processos, cultura | **Nardon** | Especialista em gestao, cultura e processos |
| Vendas, expansao, receita | **Alfredo** | Especialista em vendas, expansao comercial e receita |

```
REGRA: Quando topico detectado na conversa, referenciar o founder correspondente
como prova social e autoridade. Ex: "O Tallis fala muito sobre isso na Imersao..."
```

---

## Objecao de Preco Aciona COI Calculator (Canonico - Doc 14.1)

```
TRIGGER: Lead menciona preco como objecao ("caro", "quanto custa", "nao tenho orcamento")
ACAO: Acionar COI Calculator (Cost of Inaction)
LOGICA: Mostrar quanto o lead PERDE por nao agir, nao quanto ele GASTA para agir.
FORMATO: "Se voce continuar como esta por mais 12 meses, o custo de nao agir e R$[X].
         O investimento na G4 e [fracao] desse valor."
```

---

## Triggers de Re-engajamento (Canonico - Doc 15)

```
TRIGGER: 48 horas de silencio do lead (sem resposta a nenhuma mensagem)
ACAO: Ativar TP5 (Touchpoint 5 - Re-engagement)
FORMATO: Mensagem de re-engajamento com angulo diferente do ultimo contato.
         Usar fear trigger, novidade ou prova social nova.
         NAO repetir a mesma abordagem que gerou o silencio.
```
