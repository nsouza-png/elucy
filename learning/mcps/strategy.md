# Strategy - Camada Semantica Elucy v2

## Definicao

Este MCP define os 6 tipos de estrategia que a Elucy pode recomendar ou executar. Cada estrategia e um plano de acao estruturado com condicoes de ativacao, inputs obrigatorios, output esperado e riscos. A escolha errada de estrategia pode ser pior que nenhuma estrategia - por isso as regras de selecao sao rigorosas.

---

## Tipos de Estrategia

### 1. qualification_strategy
**Definicao:** Estrategia para aprofundar o entendimento do lead usando SPICED. Usada quando ha informacao insuficiente para avancar com confianca.

**Quando usar:**
- Lead novo com pouco historico no Databricks
- Deal em estagio inicial (discovery/qualification)
- Score de qualificacao baixo ou incompleto
- Informacoes conflitantes (ex: cargo alto mas empresa Tier 2)

**Inputs obrigatorios:**
- Dados basicos do lead (persons_overview)
- Historico de interacoes existente (se houver)
- Score PQL atual (skills_pql_user)
- Tier e persona classificados

**Output esperado:**
- SPICED completo preenchido (Situation, Problem, Impact, Critical Event, Decision)
- Recomendacao de proximo passo baseada nos gaps encontrados
- Classificacao de fit (High/Medium/Low/No Fit)

**Risco se estrategia errada:**
- Usar qualification_strategy com Titan = erro fatal. Titan nao aceita ser "qualificado" com perguntas genericas. Usar Challenger approach ao inves
- Usar qualification_strategy em deal late_stage = retrabalho. O lead vai sentir que voce nao prestou atencao

---

### 2. closing_strategy
**Definicao:** Estrategia para avancar deal para proposta, handoff ao Closer ou fechamento. Usada quando qualificacao esta completa e sinais sao positivos.

**Quando usar:**
- SPICED completo com score alto
- 2+ reunioes realizadas com engajamento
- Budget confirmado e decisor mapeado
- Timing favoravel (critical event identificado)

**Inputs obrigatorios:**
- SPICED completo
- Historico de todas as interacoes
- Mapeamento de stakeholders (quem decide, quem influencia)
- Proposta ou opcoes de produto definidas
- Objecoes levantadas e status de cada uma

**Output esperado:**
- Plano de fechamento com timeline especifica
- Script/roteiro para call de proposta
- Handoff Intelligence Block para Closer (se aplicavel)
- Antecipacao de objecoes finais

**Risco se estrategia errada:**
- Usar closing_strategy sem qualification completa = proposta prematura. Lead recebe proposta sem entender valor, pede desconto ou some
- Usar closing_strategy sem authority_check = proposta vai pra pessoa errada

---

### 3. expansion_strategy
**Definicao:** Estrategia para expandir relacionamento com cliente existente. Upsell de novos produtos, programas adicionais ou upgrade de tier.

**Quando usar:**
- Cliente ja comprou pelo menos 1 produto G4
- Resultados positivos reportados ou evidenciados
- Mudanca de contexto do cliente (cresceu, novo desafio, nova equipe)
- Proximidade de renovacao ou evento G4

**Inputs obrigatorios:**
- Historico completo de compras (order_items)
- Produtos ja adquiridos e datas
- NPS ou feedback se disponivel
- Faturamento atualizado da empresa
- Tier atual vs potencial

**Output esperado:**
- Mapeamento de gaps de produto (o que falta na jornada)
- Recomendacao de proximo produto com justificativa baseada em dados
- Approach personalizado referenciando resultados anteriores
- Timeline de abordagem

**Risco se estrategia errada:**
- Usar expansion_strategy com cliente insatisfeito = desastre. Verificar sempre sinais de churn antes
- Recomendar produto que o cliente ja tem = perda de credibilidade

---

### 4. reactivation_strategy
**Definicao:** Estrategia para reengajar leads perdidos ou deals que esfriaram. Requer abordagem diferente da original pois o lead ja disse nao (ou sumiu).

**Quando usar:**
- Deal marcado como lost entre 30 e 90 dias atras (janela otima)
- Lead que parou de responder ha mais de 15 dias
- Motivo de perda registrado e tratavel (timing, budget, nao era prioridade)
- Mudanca de contexto que justifica novo contato (novo produto, evento, case relevante)

**Inputs obrigatorios:**
- Motivo de perda original (motivo_lost) - OBRIGATORIO
- Historico completo de interacoes anteriores
- Tempo desde ultimo contato
- Mudancas no contexto do lead (nova rodada, novo cargo, crescimento)
- Novo angulo ou trigger disponivel

**Output esperado:**
- Mensagem de reativacao personalizada (nunca generica)
- Novo angulo de abordagem diferente do original
- Sequencia de follow-up (3 toques)
- Criterios de abandono (quando parar de tentar)

**Risco se estrategia errada:**
- Reativar sem saber motivo_lost = repetir o mesmo erro
- Reativar com menos de 30 dias = parecer desesperado
- Reativar com mais de 90 dias = lead ja esqueceu quem somos, precisa abordagem quase cold

---

### 5. multi_thread_strategy
**Definicao:** Estrategia para acessar o CEO/decisor via contatos intermediarios (Executor/Braco Direito). Usada quando o deal precisa de decisao de cima mas o SDR so tem acesso ao nivel operacional.

**Quando usar:**
- Deal enterprise (Elite ou Builder alto)
- Contato atual e Braco Direito/Executor sem poder de decisao
- Deal travado em estagio avanacdo por falta de sponsor
- Empresa com estrutura hierarquica forte

**Inputs obrigatorios:**
- Mapeamento de stakeholders atual
- Cargo e influencia do contato atual
- Informacoes sobre o CEO/decisor (LinkedIn, persons_overview)
- Argumentos que ressoam com cada nivel hierarquico
- Historico de tentativas de acesso ao decisor

**Output esperado:**
- Plano de multi-threading com papeis definidos
- Mensagem para pedir introducao ao CEO via contato atual
- Abordagem direta ao CEO (LinkedIn DM, email) como plano B
- Argumentacao customizada por nivel (Executor ouve eficiencia, CEO ouve crescimento/competitividade)

**Risco se estrategia errada:**
- Usar multi_thread com Titan que ja esta na call = desnecessario e ofensivo
- Pular o Executor sem avisa-lo = queimar o champion interno
- Abordar CEO com discurso de Executor = feature dump com Titan = deal morto

---

### 6. risk_recovery_strategy
**Definicao:** Estrategia para salvar deals em risco de perda. Usada quando sinais de stall, desengajamento ou objecoes nao resolvidas sao detectados.

**Quando usar:**
- Deal em negotiation ha mais de 15 dias sem movimento
- Lead parou de responder ha 5+ dias apos proposta
- Objecao critica levantada e nao resolvida
- Concorrente mencionado na conversa
- Sinais de compra que sumiram (era quente, esfriou)

**Inputs obrigatorios:**
- Timeline completa do deal com datas de cada interacao
- Ultima objecao ou preocupacao registrada
- Proposta enviada (valor, produto, condicoes)
- Nivel de engajamento recente vs historico
- Alternativas/concorrentes mencionados

**Output esperado:**
- Diagnostico do motivo do stall
- Plano de recuperacao em 3 passos (mensagem de reengajamento, nova proposta de valor, deadline)
- Recomendacao de escalacao se necessario (envolver gestor, Closer, founder)
- Decisao de kill/save (nem todo deal vale salvar)

**Risco se estrategia errada:**
- Usar risk_recovery sem requalificar = insistir em deal que ja morreu
- Oferecer desconto como primeira opcao = destruir margem sem necessidade
- Nao saber quando abandonar = custo de oportunidade alto

---

## Regras de Selecao de Estrategia

### Regras Automaticas
| Condicao | Estrategia |
|---|---|
| enterprise + late_stage + champion_only | multi_thread_strategy |
| low_intent + early_stage | qualification_strategy (education first) |
| deal_at_risk + stall_detected | risk_recovery_strategy (requalificar antes de agir) |
| Titan/Soberano como lead | NUNCA usar qualification_strategy com SPICED. Usar Challenger approach |
| cliente_existente + novo_trigger | expansion_strategy |
| lost_deal + 30_90_dias | reactivation_strategy |
| SPICED_completo + sinais_positivos | closing_strategy |

### Regras de Prioridade
1. **Governance primeiro:** Se Iron Dome detectou violacao, resolver antes de qualquer estrategia
2. **Risco antes de avanco:** Se ha sinais de risco, aplicar risk_recovery antes de closing
3. **Qualificacao antes de tudo:** Na duvida, qualify. Melhor perder tempo qualificando do que avancar sem base
4. **Uma estrategia por vez:** Nao misturar. Definir estrategia primaria e executar. Pivotar se nao funcionar

### Regras por Tier
- **Elite (>R$10MM):** multi_thread quase sempre necessario. Ciclo longo e normal. Patience is key
- **Builders (R$1M-R$10M):** qualification + closing sao o fluxo padrao. Ciclo de 2-4 semanas
- **Tier 2 (<R$1MM):** Se nao fechar rapido, provavelmente nao fecha. Nao investir mais que 2 interacoes em qualification

---

## Mapeamento Databricks

| Estrategia | Tabelas | Campos Chave |
|---|---|---|
| qualification_strategy | persons_overview, skills_pql_user | score_pql, cargo, segmento, faturamento |
| closing_strategy | customer_360_sales_table | deal_stage, days_in_stage, deal_value |
| expansion_strategy | order_items, aquisicao | produtos_comprados, datas, valor_total |
| reactivation_strategy | customer_360_sales_table | motivo_lost, data_lost, ultimo_contato |
| multi_thread_strategy | persons_overview | stakeholders, cargo, hierarquia |
| risk_recovery_strategy | customer_360_sales_table | deal_stage, days_in_stage, engajamento |

---

## Regras Canonicas ELUCI - Logica de Ativacao SPICED (Doc 7)

### Condicoes de Ativacao

```
ATIVACAO_SPICED:
  Pre-requisitos (TODOS obrigatorios):
    1. ICP Confirmado (lead passou pela validacao de tier)
    2. Pain Signal detectado (lead mencionou dor ou problema)
    3. Objetivo claro: Converter reclamacao/queixa em Business Case estruturado

  Quando ATIVAR:
    - Builder/Trator com dor identificada
    - Executor/Braco Direito com problema operacional
    - Mid-Market em fase de discovery

  TITAN BAN - SPICED PROIBIDO PARA PERSONA 1:
    SE persona = Titan/Soberano:
      SPICED = PROIBIDO
      Motivo: Titan nao aceita ser "qualificado" com perguntas padrao
              Titan precisa ser DESAFIADO, nao interrogado
      Alternativa: Usar Challenger Sale (Teach-Tailor-Take Control)
```

---

## Zonas de Ativacao Challenger Sale (Doc 8)

### Green Zone (USAR Challenger)

```
CHALLENGER_GREEN_ZONE:
  - Persona Titan/Soberano (SEMPRE)
  - Contexto de Estagnacao (empresa parou de crescer, zona de conforto)
  - Pos-SPICED (quando SPICED ja foi feito e agora precisa gerar tensao)
  - Lead que "acha que sabe tudo" (overconfident)
  - Enterprise com multiplos stakeholders (precisa de insight disruptivo)
```

### Red Zone (NUNCA usar Challenger)

```
CHALLENGER_RED_ZONE:
  - Top-of-funnel / primeiro contato frio (lead nao te conhece)
  - SMB / Tier 2 (ticket baixo, decisao emocional, Challenger assusta)
  - Momento de Price-closing (quando ja esta negociando preco, tarde demais)
  - Lead fragil emocionalmente (sinais de inseguranca, medo)
  - Primeiro contato com Executor (precisa de rapport antes)
```

---

## 3 Vetores de Reframe (Doc 8)

### Estrategias de Reframe por Persona

```
1. RISK REFRAME (Para Titan/Soberano):
   Alvo: Medo de irrelevancia
   Mecanismo: Mostrar que o mercado esta mudando e ele pode ficar para tras
   Exemplo: "Empresas do seu porte que nao investiram em gestao de pessoas
             nos ultimos 2 anos perderam 30% de market share. Voce esta
             confortavel com esse risco?"
   Emocao ativada: Medo de perder posicao, orgulho ferido

2. CAUSE REFRAME (Para Builder/Trator):
   Alvo: Locus de controle interno
   Mecanismo: Mostrar que o problema nao e externo, e de gestao interna
   Exemplo: "Voce mencionou que o mercado esta dificil. Mas empresas do
             mesmo segmento e porte estao crescendo 40%. A diferenca nao
             e o mercado - e o processo interno."
   Emocao ativada: Responsabilidade pessoal, vontade de agir

3. IDENTITY REFRAME (Para Executor/Braco Direito):
   Alvo: Elevacao de carreira
   Mecanismo: Mostrar que resolver esse problema e o caminho para promocao
   Exemplo: "Se voce trouxer essa solucao para o CEO e ela gerar resultado,
             quem voce acha que vai ser promovido? Isso e uma oportunidade
             de carreira, nao so um projeto."
   Emocao ativada: Ambicao profissional, reconhecimento
```

---

## Logica de Ativacao SPIN (Doc 9)

### Condicoes de Ativacao

```
ATIVACAO_SPIN:
  Quando ATIVAR:
    - Venda emocional ja aconteceu MAS racionalizacao esta pendente
    - Lead comprou a ideia mas precisa de argumentos para justificar internamente
    - Persona Trator/Builder com friccao de implementacao
    - Persona Executor com friccao politica (precisa convencer chefe)

  Alvos principais:
    - Trator/Builder: Para friccao de implementacao
      "Como voce pretende implementar isso no dia a dia?"
      "Quem da sua equipe vai liderar essa mudanca?"
    - Executor/Braco Direito: Para friccao politica
      "Como voce apresentaria isso para o CEO?"
      "O que o CEO precisa ouvir para aprovar?"

  TITAN BAN ABSOLUTO:
    SE persona = Titan/Soberano:
      SPIN = PROIBIDO ABSOLUTAMENTE
      Motivo: Titan decide rapido e se irrita com processo longo
              SPIN parece "interrogatorio corporativo" para Titan
      Penalidade: Usar SPIN com Titan = perda quase certa do deal
```

---

## Fluxo Champion Selling (Doc 9)

### Construcao de Champion Interno

```
CHAMPION_SELLING_FLOW:
  Passo 1 - DETECTAR INTERESSE:
    Identificar quem dentro da empresa e o maior interessado
    Sinais: Faz perguntas proativas, pede material, menciona o problema frequentemente
    Geralmente: Head de area, Gerente, Diretor operacional

  Passo 2 - IMPLICAR RISCO:
    Mostrar para o champion o que acontece SE ele nao resolver
    "Se esse problema nao for resolvido ate Q2, qual o impacto na sua area?"
    "O CEO sabe que isso esta custando R$X por mes?"

  Passo 3 - ENTREGAR ARGUMENTO PRONTO:
    Dar ao champion o argumento formatado para ele vender internamente
    "Deixa eu te ajudar: quando voce for falar com o CEO, apresenta assim:
     'Estamos perdendo R$500k/ano com isso. A solucao custa R$30k e se
      paga em 3 meses. Ja validei com a G4 e eles tem cases similares.'"

  Resultado: Champion vende por voce internamente com SUA argumentacao
```

---

## Modelo Boutique vs Varejo (Doc 15)

### Priorizacao de Tempo do SDR

```
MODELO_BOUTIQUE_VS_VAREJO:

  PRIORIDADE ZERO - Boutique (Perfil Elite A/B):
    Criterio: Tier 1 Elite, faturamento > R$10MM, cargo C-Level
    Alocacao: 80% do tempo do SDR
    Tratamento: Hiperpersonalizado, research profundo, multi-touch
    Cadencia: Minimo 3 canais simultaneos (telefone + WhatsApp + LinkedIn)
    Follow-up: Ate 10 tentativas com abordagens diferentes
    NUNCA automatizar ou tratar como volume

  PRIORIDADE NORMAL - Varejo (Perfil C - Volume):
    Criterio: Mid-Market, Builders, faturamento R$1MM-R$10MM
    Alocacao: Padrao
    Tratamento: Processo SPICED padrao, cadencia definida
    Cadencia: Mix de canais conforme playbook
    Follow-up: Padrao (5-8 tentativas)

  LOST IMEDIATO - Descarte (Perfil I/J - <R$500k):
    Criterio: Faturamento < R$500k, perfil nao elegivel
    Alocacao: ZERO tempo de SDR Senior
    Tratamento: Automatizado ou descartado
    Acao: Direcionar para funil digital/self-serve
    NUNCA alocar tempo humano senior para esse perfil
```

---

## Business Strategy Generator - 6 Blocos (Doc 14.1)

### Template para Leads Tier 1

```
BUSINESS_STRATEGY_GENERATOR:
  Condicao de ativacao: SOMENTE para leads Tier 1 (>R$10MM)

  Bloco 1 - MARKET OVERVIEW:
    Visao geral do mercado do lead
    Tamanho do mercado, crescimento, tendencias macro
    Fonte: Dados publicos + inteligencia do SDR

  Bloco 2 - TREND RADAR:
    Tendencias que impactam o segmento do lead
    Tecnologia, regulamentacao, comportamento do consumidor
    Objetivo: Mostrar que o SDR entende o mercado do lead

  Bloco 3 - COMPETITIVE BENCHMARKING:
    Comparacao com concorrentes do lead
    O que os concorrentes estao fazendo diferente
    Objetivo: Gerar tensao ("seu concorrente ja esta fazendo X")

  Bloco 4 - FORCE MATRIX:
    Forcas a favor e contra o crescimento do lead
    Internas (equipe, processo, cultura) e externas (mercado, regulacao)
    Objetivo: Mapear alavancas e barreiras

  Bloco 5 - GAPS & OPPORTUNITIES:
    Lacunas identificadas na operacao do lead
    Oportunidades de melhoria com impacto quantificado
    Objetivo: Conectar gaps com solucoes G4

  Bloco 6 - RECOMMENDED STRATEGIC PLAYS:
    Recomendacoes estrategicas concretas
    Cada recomendacao conectada a um produto/programa G4
    Objetivo: Fazer a transicao natural de analise para proposta
```

---

## Calculo COI/ROI para Estrategia (Doc 14.1)

### Formulas de Referencia

```
CALCULO_COI:
  COI = Faturamento_Anual x %Ineficiencia x 12
  Uso estrategico: Quantificar a dor ANTES de propor solucao
  Exemplo: R$5M x 15% x 1 = R$750k/ano de perda

CALCULO_ROI_BREAKEVEN:
  BreakEven = Investimento / Margem_Liquida_Mensal_Gerada
  Uso estrategico: Justificar investimento DEPOIS de quantificar dor
  Exemplo: R$30k / R$10k/mes = 3 meses para payback

SEQUENCIA OBRIGATORIA:
  1. Primeiro calcular COI (quanto PERDE por nao agir)
  2. Depois calcular ROI (quanto GANHA ao agir)
  3. Nunca apresentar ROI sem ter apresentado COI antes
     (lead precisa sentir a dor antes de ver a solucao)
```

---

## Roteamento por Persona (Doc 10)

### Rotas Especificas por Tipo de Persona

```
ROTEAMENTO_POR_PERSONA:

  TITAN EXPRESS ROUTE (Persona 1 - Soberano):
    Framework: Challenger Sale OBRIGATORIO
    SPICED: PROIBIDO
    SPIN: PROIBIDO
    Ciclo: Rapido (Titan decide rapido quando convencido)
    Abordagem: Insight > Reframe > Tensao > Proposta direta
    Risco: Feature dump = morte do deal
    Handoff: Direto para Senior Closer
    Prioridade: MAXIMA (Boutique)

  BUILDER STANDARD ROUTE (Persona 2 - Trator):
    Framework: SPICED OBRIGATORIO
    Challenger: Opcional (pos-SPICED se necessario)
    Ciclo: Medio (2-4 semanas)
    Abordagem: Discovery > Dor > Impacto > Urgencia > Proposta
    Risco: Perder urgencia = deal esfria rapido
    Handoff: Para Closer apos SPICED completo
    Prioridade: ALTA (Padrao)

  EXECUTOR POLITICAL ROUTE (Persona 3 - Braco Direito):
    Framework: SPIN OBRIGATORIO
    Challenger: PROIBIDO (Executor nao responde bem a desafio)
    Ciclo: Longo (depende de politica interna)
    Abordagem: Rapport > Mapeamento politico > Champion building > Acesso ao CEO
    Risco: Nao mapear hierarquia = deal trava sem decisor
    Handoff: Multi-thread obrigatorio (Executor + CEO)
    Prioridade: MEDIA (investir se empresa for Tier 1)
```

---

## Skills que Usam

- **strategy-builder**: Skill principal que consome este MCP para gerar planos de acao
- **deal-diagnostics**: Usa regras de selecao para recomendar estrategia apos diagnostico
- **sdr-coach**: Referencia estrategias ao dar coaching sobre abordagem
- **orchestrator**: Usa para rotear pedidos do operador para a skill correta com a estrategia certa
- **call-analyzer**: Avalia se a estrategia usada na call era a correta
