# Objectives - Camada Semantica Elucy v2

## Definicao

Este MCP define todos os objetivos possiveis que o Orchestrator da Elucy pode detectar a partir das mensagens do operador (usuario principal). Cada objetivo tem frases-gatilho que o ativam, skills necessarias para execucao e contexto obrigatorio que deve ser carregado antes de processar.

---

## Objetivos

### 1. analyze_deal
**Definicao:** Entender o status atual de um deal especifico. Diagnostico completo de saude, riscos e oportunidades.

**Frases-gatilho (exemplos):**
- "Como esta o deal do [nome]?"
- "Me da um resumo do [empresa]"
- "Qual a situacao do deal [id]?"
- "Esse deal tem chance?"
- "O que ta acontecendo com o [nome]?"

**Skills necessarias:**
- deal-diagnostics (principal)
- behavior-reader (sinais comportamentais)
- strategy-builder (recomendacao de proximo passo)

**Contexto obrigatorio:**
- deal_id ou email do lead
- customer_360_sales_table (stage, days_in_stage, historico)
- persons_overview (perfil, tier, persona)
- Historico de interacoes recentes

---

### 2. analyze_call
**Definicao:** Avaliar a qualidade de uma call ou reuniao de vendas. Identificar pontos fortes, gaps e acoes corretivas.

**Frases-gatilho (exemplos):**
- "Analisa essa call pra mim"
- "Como foi minha ligacao com o [nome]?"
- "O que eu poderia ter feito melhor nessa call?"
- "Avalia minha reuniao"
- "Review da call de hoje"

**Skills necessarias:**
- call-analyzer (principal)
- sdr-coach (recomendacoes de melhoria)

**Contexto obrigatorio:**
- Transcricao ou resumo da call
- Dados do lead no Databricks (persons_overview)
- Tier e persona classificados
- Historico previo do deal (se existir)

---

### 3. coach_sdr
**Definicao:** Melhorar performance do SDR com coaching direcionado. Pode ser reativo (apos erro) ou proativo (desenvolvimento).

**Frases-gatilho (exemplos):**
- "Me da um coaching sobre [tema]"
- "Como eu melhoro minha qualificacao?"
- "To errando muito em [aspecto]"
- "Me ajuda a melhorar minhas calls"
- "Quero treinar objecoes"
- "O que eu preciso desenvolver?"

**Skills necessarias:**
- sdr-coach (principal)
- call-analyzer (se houver calls para analisar)

**Contexto obrigatorio:**
- Historico de calls recentes (se disponivel)
- Gaps identificados em analises anteriores
- learning/memory/ (padroes ja salvos)
- Nivel de senioridade do SDR

---

### 4. optimize_conversion
**Definicao:** Aumentar taxa de conversao. Analise de pipeline completo para identificar onde esta perdendo deals e como melhorar.

**Frases-gatilho (exemplos):**
- "Como aumento minha conversao?"
- "To perdendo muito deal, por que?"
- "Minha taxa ta baixa"
- "O que ta matando meus deals?"
- "Onde to perdendo mais?"

**Skills necessarias:**
- deal-diagnostics (analise de pipeline)
- sdr-coach (acoes corretivas)
- strategy-builder (novas abordagens)

**Contexto obrigatorio:**
- customer_360_sales_table (todos os deals do SDR)
- Motivos de perda (motivo_lost) dos ultimos 90 dias
- Taxas de conversao por stage
- Comparacao com media do time

---

### 5. prepare_meeting
**Definicao:** Preparar o SDR para uma call ou reuniao agendada. Gerar Intelligence Block com dados, insights e roteiro. Inclui protocolo de confirmacao para reduzir no-show.

**Frases-gatilho (exemplos):**
- "Tenho call com [nome] amanha"
- "Prepara um briefing do [empresa]"
- "O que preciso saber antes da reuniao com [nome]?"
- "Me da um intelligence block do [lead]"
- "Prep pra call"
- "Confirma a reuniao do [nome]"

**Skills necessarias:**
- intelligence-block-generator (principal)
- behavior-reader (sinais recentes)
- strategy-builder (abordagem recomendada)

**Contexto obrigatorio:**
- Email ou nome do lead
- persons_overview (perfil completo)
- customer_360_sales_table (historico do deal)
- order_items (compras anteriores, se cliente)
- skills_pql_user (score e sinais)

**Protocolo de confirmacao pre-reuniao (reduzir no-show):**
O prepare_meeting DEVE incluir, alem do briefing, o checklist operacional:

1. **Verificar perfil:** Lead e ICP? Tier e persona classificados?
2. **Revisar conversa:** O que foi dito na qualificacao? Que dor foi identificada?
3. **Confirmar presenca D-1:** Mensagem: "[Nome], amanha as [hora] temos nossa conversa. Confirma pra mim?"
4. **Lembrete D-0 (1h antes):** "Daqui 1h nos falamos. O link e [link]. Te espero la"
5. **Garantir que e ICP:** Se durante a preparacao descobrir que lead NAO e ICP → alertar operador antes da reuniao
6. **Garantir contexto pro closer:** Se e reuniao de handoff, montar Intelligence Block ANTES

**Definicao de reuniao valida no G4:**
- Reuniao de **30 minutos**
- Com **ICP** (perfil validado)
- Com **decisor** ou influenciador forte
- Com **interesse real** (nao curiosidade)
- Com **contexto minimo qualificado** (DQI >= 3)
- Com **chance real de compra**

Se qualquer criterio nao for atendido, o prepare_meeting DEVE alertar o operador.

---

### 6. build_strategy
**Definicao:** Criar plano de acao estruturado para um deal ou situacao especifica.

**Frases-gatilho (exemplos):**
- "Monta uma estrategia pro [deal]"
- "Qual a melhor abordagem pra [situacao]?"
- "Como eu fecho esse deal?"
- "Preciso de um plano pra [empresa]"
- "Estrategia pra reativar [nome]"

**Skills necessarias:**
- strategy-builder (principal)
- deal-diagnostics (diagnostico previo)
- behavior-reader (sinais comportamentais)

**Contexto obrigatorio:**
- Dados completos do deal/lead
- Historico de interacoes
- Stage atual e timeline
- Sinais comportamentais recentes
- learning/memory/ (estrategias ja tentadas)

---

### 7. diagnose_pipeline
**Definicao:** Analisar pipeline completo para encontrar gargalos, deals em risco e oportunidades escondidas.

**Frases-gatilho (exemplos):**
- "Como ta meu pipeline?"
- "Faz um diagnostico do meu funil"
- "Onde to travando?"
- "Quais deals preciso priorizar?"
- "Overview do pipeline"

**Skills necessarias:**
- deal-diagnostics (analise em massa)
- behavior-reader (sinais por deal)
- strategy-builder (priorizacao)

**Contexto obrigatorio:**
- customer_360_sales_table (todos os deals ativos)
- Distribuicao por stage
- Days_in_stage por deal
- Valor total em pipeline vs meta

---

### 8. compare_segments
**Definicao:** Analisar performance por segmento, tier, persona ou produto. Identificar onde esta convertendo melhor e por que.

**Frases-gatilho (exemplos):**
- "Qual segmento converte mais?"
- "Compara Elite vs Builder"
- "Qual produto ta vendendo mais?"
- "Analise por tier"
- "Onde ta minha melhor conversao?"

**Skills necessarias:**
- deal-diagnostics (analise segmentada)
- data-analyzer (queries especificas)

**Contexto obrigatorio:**
- customer_360_sales_table (dados completos)
- persons_overview (classificacao por tier/persona)
- order_items (performance por produto)
- aquisicao (canais e fontes)

---

### 9. qualify_lead
**Definicao:** Rodar processo de qualificacao completo em um lead. Classificar fit, score e recomendacao.

**Frases-gatilho (exemplos):**
- "Qualifica esse lead pra mim"
- "Esse lead tem fit?"
- "Vale a pena investir tempo no [nome]?"
- "Roda o SPICED do [lead]"
- "Score desse prospect"

**Skills necessarias:**
- lead-qualifier (principal)
- behavior-reader (sinais de intencao)

**Contexto obrigatorio:**
- Email ou dados do lead
- persons_overview (perfil, faturamento, cargo)
- skills_pql_user (score PQL)
- Historico de interacoes (se existir)

---

### 10. generate_note
**Definicao:** Criar Intelligence Block estruturado para handoff, preparacao ou documentacao.

**Frases-gatilho (exemplos):**
- "Gera uma nota do [deal]"
- "Cria um intelligence block"
- "Monta o resumo pra handoff"
- "Documenta o que temos do [lead]"
- "Nota de transferencia"

**Skills necessarias:**
- intelligence-block-generator (principal)

**Contexto obrigatorio:**
- Todos os dados disponiveis do lead/deal
- Historico completo de interacoes
- SPICED preenchido (o que tiver)
- Objecoes registradas
- Proximo passo sugerido

---

### 11. check_governance
**Definicao:** Executar auditoria Iron Dome para verificar conformidade com regras de governanca.

**Frases-gatilho (exemplos):**
- "Roda o Iron Dome nesse deal"
- "Esse deal ta dentro das regras?"
- "Verifica governanca"
- "Tem alguma violacao?"
- "Auditoria do [deal]"

**Skills necessarias:**
- iron-dome (principal)

**Contexto obrigatorio:**
- Dados completos do deal
- Tier e persona classificados
- Produto proposto
- Valor e condicoes

---

### 12. redirect_tier2
**Definicao:** Aplicar downsell para lead Tier 2 que nao tem perfil para produtos premium. Direcionar para produto adequado.

**Frases-gatilho (exemplos):**
- "Esse lead e Tier 2, o que faco?"
- "Empresa muito pequena pra Imersao"
- "Downsell pra esse"
- "Qual produto certo pra empresa de [faturamento baixo]?"
- "Redireciona esse lead"

**Skills necessarias:**
- iron-dome (validacao de regra)
- product-recommender (produto adequado)

**Contexto obrigatorio:**
- Faturamento da empresa
- Tier classificado
- Produtos disponiveis para Tier 2
- Historico de compras (se cliente)

---

### 13. social_outreach
**Definicao:** Gerar mensagem para abordagem via LinkedIn DM ou rede social.

**Frases-gatilho (exemplos):**
- "Monta uma DM pro [nome]"
- "Mensagem de LinkedIn pra [lead]"
- "Abordagem social pro [nome]"
- "DM pro CEO da [empresa]"
- "Outreach LinkedIn"

**Skills necessarias:**
- message-generator (principal)
- behavior-reader (personalizar tom)

**Contexto obrigatorio:**
- Perfil do lead (persons_overview)
- Tier e persona
- Contexto especifico para personalizar (dados, trigger, evento)
- Canal (LinkedIn, Instagram, etc)

---

### 14. handoff
**Definicao:** Transferir deal qualificado para Closer com toda documentacao necessaria.

**Frases-gatilho (exemplos):**
- "Handoff do [deal]"
- "Transfere pro closer"
- "Esse deal ta pronto pra passar"
- "Monta o handoff do [nome]"
- "Passa esse pro time de fechamento"

**Skills necessarias:**
- intelligence-block-generator (gerar bloco completo)
- iron-dome (validar que deal esta qualificado para handoff)

**Contexto obrigatorio:**
- SPICED completo (obrigatorio para handoff)
- Stakeholders mapeados
- Objecoes tratadas e pendentes
- Proposta ou produto recomendado
- Timeline de decisao
- Historico completo de interacoes

---

### 15. check_performance
**Definicao:** Verificar performance do SDR em relacao a metas (GAV, conversao, atividades).

**Frases-gatilho (exemplos):**
- "Como ta minha meta?"
- "Quanto falta pro GAV?"
- "Minha performance esse mes"
- "Ranking do time"
- "Quanto eu ja vendi?"
- "Dashboard de resultados"

**Skills necessarias:**
- performance-tracker (principal)

**Contexto obrigatorio:**
- tb_comissionamento (comissoes e resultados)
- customer_360_sales_table (deals fechados)
- Meta do periodo
- Periodo de referencia

---

## Regras de Deteccao de Objetivo

### Regras de Prioridade
1. Se mensagem contem deal_id ou email especifico: priorizar objetivos relacionados a deal (analyze_deal, prepare_meeting, build_strategy)
2. Se mensagem contem "call", "ligacao", "reuniao": priorizar analyze_call ou prepare_meeting
3. Se mensagem contem "pipeline", "funil", "geral": priorizar diagnose_pipeline
4. Se mensagem contem "meta", "GAV", "resultado": priorizar check_performance
5. Se mensagem e ambigua: pedir clarificacao ao operador antes de executar

### Regras de Combinacao
- Multiplos objetivos podem ser detectados na mesma mensagem
- Exemplo: "Analisa o deal do Joao e monta uma estrategia" = analyze_deal + build_strategy
- Executar em sequencia logica: diagnostico primeiro, estrategia depois

### Regras de Contexto
- Sempre verificar se o contexto obrigatorio esta disponivel ANTES de executar
- Se falta contexto critico: informar o operador e pedir os dados
- Se dados estao no Databricks: buscar automaticamente sem perguntar

---

## Mapeamento Databricks

| Objetivo | Tabelas Primarias |
|---|---|
| analyze_deal | customer_360_sales_table, persons_overview |
| analyze_call | persons_overview (perfil do lead) |
| optimize_conversion | customer_360_sales_table, aquisicao |
| prepare_meeting | persons_overview, customer_360_sales_table, order_items, skills_pql_user |
| diagnose_pipeline | customer_360_sales_table |
| compare_segments | customer_360_sales_table, persons_overview, order_items |
| qualify_lead | persons_overview, skills_pql_user |
| check_performance | tb_comissionamento, customer_360_sales_table |
| redirect_tier2 | persons_overview, order_items |

---

## Skills que Usam

- **orchestrator**: Skill principal que consome este MCP para detectar objetivos e rotear para skills corretas
- Cada objetivo mapeia para skills especificas conforme listado acima
- O orchestrator deve carregar o contexto obrigatorio ANTES de chamar a skill de execucao

---

## DQI - Decision Quality Index (Metrica Soberana)

### Definicao
- O DQI dissocia Resultado Financeiro de Qualidade de Decisao
- Uma nao-venda com processo correto pontua MAIS ALTO que uma venda com processo errado
- Mede se o SDR tomou a decisao certa, independente do resultado comercial

### Dimensoes do Pentagon Score
Cada dimensao e avaliada de 0 a 100:

| Dimensao | O que mede |
|---|---|
| **ICP Fit** | Lead corresponde ao perfil ideal do produto recomendado? |
| **Frame Integrity** | Framework correto foi usado para a persona? (Challenger/SPICED/SPIN) |
| **State Timing** | Acao foi adequada ao estagio do funil e timing do lead? |
| **Ecosystem Protection** | Decisao protege o ecossistema G4? (nao contaminou sala, nao forcou venda) |
| **Data Density** | Decisao foi baseada em dados suficientes? (campos preenchidos, sinais lidos) |

### Feedback Loop do DQI

| Cenario | Significado | Acao |
|---|---|---|
| DQI Alto + Deal Perdido | Processo correto, resultado negativo. Problema e externo (preco, timing, mercado) | Feedback para Produto/Pricing |
| DQI Baixo + Deal Ganho | Processo errado, resultado positivo. Venda no acaso, risco de churn | Alerta de falha de processo. Monitorar churn |
| DQI Alto + Deal Ganho | Gold Standard. Processo correto + resultado positivo | Replicar como modelo. Salvar em memory |
| DQI Baixo + Deal Perdido | Processo errado + resultado negativo | Coaching imediato. Post-mortem obrigatorio |
