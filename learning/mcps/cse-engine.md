# MCP: CSE Engine — Conversational State Engine (Motor de Fisica Social)

## Proposito

Este MCP define a maquina de estados conversacionais do ELUCI — o motor que determina ONDE o lead esta cognitivamente e o que pode ser feito a partir dai.

O ELUCI nao gerencia mensagens. Gerencia estados cognitivos.
A conversao nao e um evento. E a consequencia inevitavel de uma sequencia correta de transicoes de estado.

---

## PRINCIPIO FISICO

Vendas complexas sao transicoes de fase, nao eventos lineares.
Assim como agua precisa de 100C para virar vapor, o lead precisa atingir niveis especificos de consciencia e tensao para virar Deal.

**Erro dos sistemas comuns:** tentar "martelar o ferro frio" (vender antes da tensao) ou "esfriar o ferro quente" (falar demais quando o cliente ja decidiu).

---

## 1. UNIDADES ATOMICAS DA CONVERSA

### 1.1 Interacao (O Atomo)
Um evento isolado: mensagem enviada, visualizacao de recibo, clique em PDF, resposta curta.

**Regra:** Uma interacao isolada NAO define a verdade. O sistema NUNCA julga o lead por um unico "nao".

### 1.2 O Delta (Δ) de Progresso
O ELUCI mede o sucesso de cada interacao calculando o Delta:

| Delta | Significado | Implicacao |
|---|---|---|
| **Δ > 0** | Lead revelou informacao nova (dor, cargo, timeline) OU mudou de emocao/postura | Progresso — registrar e usar |
| **Δ = 0** | Lead respondeu ("ok", "legal", emoji) mas nao houve avanco de inteligencia | Friccao inutil — nao conta como touchpoint valido |
| **Δ < 0** | Lead recuou (ficou irritado, pediu para sair, regrediu de estado) | Regressao — ativar protocolo de recuperacao |

**Regra:** Touchpoint so existe se gerar Δ > 0. Friccao inutil e pior que silencio.

### 1.3 Estado Conversacional (A Fase)
Conjunto de interacoes que define onde o lead esta mentalmente.
O estado e persistente ate que um Evento de Transicao ocorra.

---

## 2. TAXONOMIA DOS 8 ESTADOS (CORE DO MOTOR)

O ELUCI classifica cada lead em EXATAMENTE UM estado por vez.

### 🧊 ESTADO 1: COLD (Zero Kelvin)
```
Definicao:    Nenhuma resposta OU respostas automaticas/evasivas
Psicologia:   Lead esta em inercia. Nao ha processamento ativo
Delta tipico: Δ = 0 ou Δ < 0
Objetivo:     Quebrar a inercia — NAO vender
Estrategia:   Pattern Interrupt (ruptura de padrao)

FRAMEWORKS PERMITIDOS:   Pattern Interrupt leve
FRAMEWORKS PROIBIDOS:    Challenger, SPICED, SPIN, proposta, preco
ERRO FATAL:              Tentar vender ("compre agora") — gera bloqueio imediato

Sinais de ativacao:
  - 0 respostas em 3+ tentativas
  - Respostas monossilabicas sem engajamento
  - "Vi seu anuncio" sem pergunta ou interesse
```

### 👀 ESTADO 2: AWARE (O Despertar)
```
Definicao:    Responde, reconhece o contexto, mas nao engaja profundamente
Psicologia:   Curiosidade passiva. Atencao captada, intencao nao formada
Delta tipico: Δ = 0 a Δ > 0 fraco
Objetivo:     Transformar atencao em intencao
Estrategia:   Prova Social ("Empresas como a sua...")

FRAMEWORKS PERMITIDOS:   Abertura com valor, prova social, pergunta de contexto leve
FRAMEWORKS PROIBIDOS:    Challenger, SPICED diagnostico, proposta
ERRO FATAL:              Ir direto para preco ou proposta

Sinais de ativacao:
  - "Vi seu anuncio"
  - "Tenho interesse em saber mais"
  - Clique em material sem perguntas
  - Resposta polida sem dor articulada
```

### 🕵️ ESTADO 3: CURIOUS (A Investigacao — ARMADILHA)
```
Definicao:    Faz perguntas TATICAS sobre produto/preco/data/formato
Psicologia:   Lead quer informacao para DESQUALIFICAR, nao para comprar
Delta tipico: Δ > 0 mas superficial (informacoes de produto, nao de dor)
Objetivo:     NAO responder diretamente — devolver com qualificacao
Estrategia:   Inversao de frame — responder pergunta com pergunta de contexto

⚠️ ARMADILHA DO VENDEDOR JUNIOR:
  Responder "quanto custa?" diretamente = entregar tudo sem entender nada
  O lead usa a informacao para desqualificar e sumir

FRAMEWORKS PERMITIDOS:   Perguntas de contexto (SPICED Situation/Problem superficial)
FRAMEWORKS PROIBIDOS:    Challenger, proposta, preco, desconto
ACAO DO ELUCI:           "Antes de falar do investimento, deixa eu entender
                          se realmente faz sentido para voce. Me conta..."

Sinais de ativacao:
  - "Quanto custa?"
  - "Qual a data?"
  - "Tem online?"
  - "Me manda informacoes"
  - "O que inclui o programa?"
```

### 🤕 ESTADO 4: PROBLEM-AWARE (A Dor Revelada)
```
Definicao:    Lead admite o caos. Usa linguagem de friccao e urgencia propria
Psicologia:   Vulnerabilidade. Momento de conexao real — "Barro na Bota"
Delta tipico: Δ > 0 alto (revelacao de dor, impacto, contexto pessoal)
Objetivo:     Aprofundar ferida. Monetizar impacto (SPICED I + E)
Estrategia:   SPICED completo (Builder/Executor). Challenger inicial (Titan)

FRAMEWORKS PERMITIDOS:   SPICED (Builder/Executor), Challenger (Titan), SPIN (Executor politico)
FRAMEWORKS PROIBIDOS:    Proposta prematura, preco, urgencia artificial
TRANSICAO PARA PROXIMA:  So sai daqui quando impacto financeiro/operacional for confirmado

Frases tipicas que indicam este estado:
  - "Meu time nao entrega"
  - "Sou escravo da operacao"
  - "Se eu parar 3 dias a empresa quebra"
  - "Estamos crescendo mas virando um caos"
  - "Perco bons profissionais toda hora"
```

### ⚡ ESTADO 5: TENSIONED (O Momento da Verdade)
```
Definicao:    Estado pos-Challenger. Lead foi confrontado com realidade incomoda
Psicologia:   Processamento cognitivo ativo. Desconforto produtivo
Delta tipico: Δ = 0 (silencio reflexivo) ou Δ > 0 defensivo/questionador
Objetivo:     SILENCIO TATICO. Deixar processar.
Estrategia:   Quem fala primeiro perde. ELUCI aguarda.

⚠️ REGRA CRITICA DO SILENCIO:
  Silencio reflexivo apos Challenger = POSITIVO. NAO interromper.
  Silencio por fantasma apos proposta = NEGATIVO. Protocolo de reengajamento.

FRAMEWORKS PERMITIDOS:   Silencio tatico, reframe secundario SE necessario
FRAMEWORKS PROIBIDOS:    Novo Challenger, SPICED, proposta, preco, follow-up ansioso
ERRO FATAL:              Quebrar o silencio com "voce achou o que?"

Sinais de ativacao:
  - Silencio de 4-24h apos pergunta Challenger
  - "Deixa eu pensar sobre isso"
  - Resposta defensiva moderada (nao agressiva)
  - Questionamento das premissas apresentadas
```

### 🤝 ESTADO 6: ALIGNED (A Convergencia)
```
Definicao:    Lead concorda com diagnostico. Aceita que a solucao e necessaria
Psicologia:   Comprometimento cognitivo. Decisao praticamente tomada
Delta tipico: Δ > 0 forte (perguntas de implementacao, timing, pagamento)
Objetivo:     Facilitacao. Remover friccao. Sair da frente.
Estrategia:   SPIN de alinhamento. Fechar com facilitacao, nao pressao.

FRAMEWORKS PERMITIDOS:   Facilitacao, SPIN de fechamento, proposta, preco
FRAMEWORKS PROIBIDOS:    Novo Challenger (destroi o estado), urgencia artificial
ERRO FATAL:              Continuar vendendo apos lead estar Aligned

Sinais de ativacao:
  - "Como funciona o pagamento?"
  - "Manda o contrato"
  - "Qual a proxima turma?"
  - "Quem mais da minha empresa pode participar?"
  - "Posso indicar alguem?"
```

### 🚧 ESTADO 7: BLOCKED (O Gargalo Externo)
```
Definicao:    Quer comprar, mas ha travas externas ao lead (nao e objecao interna)
Psicologia:   Frustracao e impotencia. Lead e ativo, o bloqueio e estrutural
Delta tipico: Δ > 0 (revelacao do bloqueio), depois Δ = 0 (travamento)
Objetivo:     Equipar o lead para resolver o bloqueio internamente
Estrategia:   SPIN + Champion Selling (armar o Executor interno)

Tipos de bloqueio:
  - CAIXA: fluxo de caixa temporario, aguarda fechamento de contrato
  - SOCIO: precisa de aprovacao de outro decisor ausente
  - DATA: timing errado (aguarda evento critico)
  - POLITICO: precisa de endorsement interno
  - LEGAL: aguarda aprovacao juridica

FRAMEWORKS PERMITIDOS:   SPIN (implicacao), Champion Selling, case de ROI
FRAMEWORKS PROIBIDOS:    Challenger (lead ja esta convencido), desconto como saida
ACAO DO ELUCI:           Ajudar a construir o business case interno

Para o EXECUTOR (Braco Direito bloqueado):
  Estrategia SPIN + "Como voce venderia isso internamente?"
  Armar com dados, cases, ROI para apresentar ao CEO/Socio
```

### 💀 ESTADO 8: DISQUALIFIED (O Expurgo)
```
Definicao:    Fora de ICP, curioso sem dor real, ou mentalidade incompativel
Psicologia:   Nao ha match entre o que o lead precisa e o que o G4 oferece
Delta tipico: N/A — analise indica incompatibilidade estrutural
Objetivo:     Proteger tempo humano e qualidade da sala de aula
Estrategia:   Downsell honesto OU Nurturing de longo prazo

Motivos de disqualificacao:
  - ICP_TIER: faturamento < R$250k (Tier 3 Micro)
  - NO_PAIN: sem dor real apos discovery profundo
  - CULTURAL_MISMATCH: mentalidade incompativel com metodo G4
  - WRONG_MOMENT: timing estruturalmente errado (> 6 meses)
  - TOXIC_PROFILE: sinais de cliente que se tornaria detrator

ACAO PARA TIER 2 (<R$1MM):  Downsell para G4 Traction / Online / Eventos
ACAO PARA TIER 3 (<R$250k): Redirecionar para produtos Online/Digital exclusivamente
ACAO PARA CULTURAL_MISMATCH: Nurturing com conteudo + revisitar em 90 dias

⛔ REGRA ABSOLUTA: NUNCA insistir apos Disqualified.
   Insistencia apos Disqualified = violacao de governanca (DQI Ecosystem = 0)
```

---

## 3. FINITE STATE MACHINE (FSM) — TRANSICOES VALIDAS

### Mapa de Transicoes

```
COLD ──────────────────→ AWARE (via Pattern Interrupt bem-sucedido)
COLD ──────────────────→ DISQUALIFIED (via ausencia total de resposta em 5+ tentativas)

AWARE ─────────────────→ CURIOUS (lead faz perguntas taticas)
AWARE ─────────────────→ PROBLEM-AWARE (lead revela dor sem passar por Curious)
AWARE ─────────────────→ DISQUALIFIED (sem engajamento real apos 3 tentativas)

CURIOUS ───────────────→ PROBLEM-AWARE (lead para de pedir info e fala sobre dor)
CURIOUS ───────────────→ COLD (lead sumiu apos receber informacoes)
CURIOUS ───────────────→ DISQUALIFIED (apenas curiosidade sem substancia)

PROBLEM-AWARE ─────────→ TENSIONED (apos Challenger ou SPICED com Impact alto)
PROBLEM-AWARE ─────────→ ALIGNED (lead rapido, ja concorda — Builder em urgencia)
PROBLEM-AWARE ─────────→ BLOCKED (dor clara mas bloqueio externo identificado)

TENSIONED ─────────────→ ALIGNED (processou e concorda com diagnostico)
TENSIONED ─────────────→ PROBLEM-AWARE (regrediu — precisa re-diagnosticar)
TENSIONED ─────────────→ DISQUALIFIED (reacao muito negativa ao Challenger)
TENSIONED ─────────────→ COLD (fantasma apos tensao — ghost total)

ALIGNED ───────────────→ CLOSE (facilitacao bem-sucedida)
ALIGNED ───────────────→ BLOCKED (apareceu bloqueio externo no ultimo momento)
ALIGNED ───────────────→ CURIOUS (regrediu — risco de churn no funil — KILL SWITCH)

BLOCKED ───────────────→ ALIGNED (bloqueio resolvido)
BLOCKED ───────────────→ DISQUALIFIED (bloqueio irresolvivel — timing definitivo)
BLOCKED ───────────────→ COLD (lead esfriou enquanto bloqueio nao resolvia)
```

### Transicoes PROIBIDAS (violam logica do sistema)

```
❌ COLD → ALIGNED      (impossivel sem passar por estados intermediarios)
❌ COLD → CLOSE        (impossivel)
❌ CURIOUS → CLOSE     (impossivel sem Problem-Aware)
❌ CURIOUS → ALIGNED   (impossivel sem Problem-Aware)
❌ AWARE → CLOSE       (impossivel)
❌ AWARE → ALIGNED     (impossivel sem Problem-Aware)
❌ PROBLEM-AWARE → CLOSE  (so apos Aligned — nunca direto)
```

---

## 4. MATRIZ DE TRANSICAO POR PERSONA

### Para o TITAN (Soberano)
```
Rota Expressa: COLD → AWARE → TENSIONED (via Challenger direto) → ALIGNED → CLOSE
Pulo natural:  Titan raramente passa por CURIOUS — ele nao pergunta preco, pergunta valor
Velocidade:    Lenta no inicio, explosiva no final
Silencio:      POSITIVO apos Challenger — aguardar ate 48h sem follow-up
```

### Para o BUILDER (Trator)
```
Rota Padrao:   AWARE → PROBLEM-AWARE (via SPICED) → BLOCKED (Caixa) → ALIGNED → CLOSE
Bloqueio tipico: Fluxo de caixa, socio ausente
Velocidade:    Media — aceita processo mas quer agilidade
Perigo:        Pode ser precipitado e querer pular para Aligned sem Impact confirmado
```

### Para o EXECUTOR (Braco Direito)
```
Rota Politica: CURIOUS → ALIGNED (ele comprou internamente) → BLOCKED (chefe nao aprovou)
               → ALIGNED (com aprovacao)
Peculiaridade: Executor ACREDITA internamente mas tem bloqueio politico
Estrategia:    Champion Selling — armar o Executor para vender internamente
Perigo:        Confundir Aligned com fechamento quando decisor real ainda nao aprovou
```

---

## 5. REGRA DO TEMPO E DA LATENCIA

### Classificacao do Silencio (Leitura do Invisivel)

| Tipo de Silencio | Indicador | Estado CSE | Acao |
|---|---|---|---|
| **Silencio Reflexivo** | Apos Challenger ou pergunta dificil. Demora 2-24h para responder | TENSIONED | Aguardar. NAO interromper |
| **Silencio de Processamento** | Builder ou Executor consultando internamente | BLOCKED | Aguardar com prazo claro |
| **Ghost Pos-Proposta** | Sumiu apos receber proposta/preco | RISK / COLD regressao | Re-engagement com gatilho de valor |
| **Ghost Total** | Sem resposta em 5+ dias sem motivo | COLD | Protocolo de breakup |
| **Silencio Estrategico** | Lead testa se SDR vai perseguir | TENSIONED | NAO perseguir — aplicar autoridade pelo silencio |

### Lei da Economia Cognitiva
```
Pensar 10 segundos antes de responder = nao enviar a mensagem errada
Uma boa leitura de estado elimina:
  - follow-ups inuteis
  - insistencia desgastante
  - desgaste humano
  - tempo total por lead

Tempo gasto analisando estado REDUZ dramaticamente o tempo total por lead.
Isso e especialmente critico para Field Sales / Chefes de Campo.
```

### Regra de Latencia por Persona
```
TITAN:
  Resposta rapida e generica = PROIBIDA (destroi autoridade)
  Resposta profunda e demorada = OBRIGATORIA (30-60 min para personalizar)
  Follow-up < 48h apos Challenger = ANSIEDADE (penaliza DQI)

BUILDER:
  Speed to Lead < 5 minutos (critico)
  Follow-up sem valor = PROIBIDO
  Resposta rapida COM contexto = IDEAL

SOCIAL DM (qualquer persona):
  Resposta < 3 minutos quando lead responder
  Excecao: resposta INTENCIONAL demorada para estabelecer autoridade (Lead ansioso x 5 mensagens em 1 min)
```

---

## 6. WRITEBACK ESTRUTURADO DO CSE

A cada transicao de estado, o ELUCI gera este payload para registro no CRM:

```json
{
  "CSE_Update": {
    "current_state": "Problem-Aware",
    "previous_state": "Curious",
    "transition_trigger": "Lead admitted revenue plateau (Delta > 0)",
    "transition_evidence": "[trecho exato da mensagem/call]",
    "time_in_previous_state": "2 days 4 hours",
    "delta_value": "positive",
    "silence_type": null
  },
  "Next_Action_Protocol": {
    "objective": "Quantify Financial Impact (I of SPICED)",
    "micro_goal": "Get a number — what does this problem cost per month?",
    "forbidden_tactics": ["Send Checkout Link", "Discount Offer", "Artificial Urgency"],
    "recommended_framework": "SPICED (Impact + Critical Event)",
    "confidence": 0.82
  },
  "Governance": {
    "sla_block_active": false,
    "premature_close_risk": true,
    "dqi_prediction": "medium",
    "next_state_target": "Tensioned"
  }
}
```

---

## 7. BLOQUEIOS AUTOMATICOS DE GOVERNANCA

### Premature Close Block
```
CONDICAO: tentativa de fechar venda (enviar proposta, preco, link)
SE estado < Problem-Aware:
  BLOQUEAR acao
  ALERTAR: "ELUCI BLOCK: Lead ainda nao esta Problem-Aware.
            Estado atual: [estado]. Proposta so a partir de Aligned."

SE estado = Problem-Aware (sem passar por Tensioned):
  ALERTAR: "ATENCAO: Proposta prematura detectada. Lead nao processou tensao.
            Recomendado: aplicar Challenger antes de proposta."
```

### Framework Mismatch Block
```
SE Challenger tentado em estado COLD:
  BLOQUEAR — "Challenger em Cold destroi o contato. Usar Pattern Interrupt."

SE SPICED tentado com TITAN:
  BLOQUEAR — "SPICED proibido para Titan. Usar Challenger approach."

SE Challenger tentado apos ALIGNED:
  ALERTAR — "Lead ja esta Aligned. Challenger agora pode regredir o estado."
```

### Anti-Ansiedade Protocol
```
SE lead interagiu 5+ vezes em 1 minuto (ansiedade extrema):
  DESACELERAR resposta intencionalmente
  ESTABELECER frame de autoridade (nao somos suporte de fast-food)
  OBJETIVO: demonstrar que o sistema tem ritmo proprio
```

### Kill Switch de Regressao
```
SE lead regrediu de ALIGNED para CURIOUS (questiona o basico novamente):
  MARCAR: "RISCO DE CHURN NO FUNIL"
  ACIONAR: intervencao humana imediata
  MOTIVO: regressao de Aligned indica duvida profunda nao endereçada
```

---

## 8. INTEGRATION COM OUTROS MCPS

| MCP | Dependencia |
|---|---|
| `guardrails.md` | Valida framework correto por persona ANTES da transicao |
| `signals.md` | Os 10 sinais alimentam a deteccao de Delta e tipo de silencio |
| `inference-constitution.md` | CDS score e calculado antes de cada transicao |
| `output-schema.md` | Writeback do CSE segue o schema canonico |
| `conversion.md` | DQI Pentagon Score inclui State Timing (0-100) |

---

## 9. FRASE-ANCORA DO CSE

> "Nao buscamos respostas rapidas.
> Buscamos a proxima mudanca correta de estado.
> A conversao nao e um evento de sorte —
> e a soma vetorial de consciencia, tensao e alinhamento."
