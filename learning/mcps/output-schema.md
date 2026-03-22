# MCP: Output Schema — Schema Canonico de Output do ELUCI

## Proposito

Este MCP define o CONTRATO DE SAIDA do sistema ELUCI.
Todo output estrategico deve seguir exatamente estes schemas.
Nenhuma resposta livre. Nenhuma improvisacao de formato.

**Principio:** Se nao esta no formato do contrato, nao pode ser colado no CRM.
**Principio:** Output sem schema = inteligencia perdida = sistema que nao escala.

---

## 1. ELUCI REPORT — O BLOCO UNIVERSAL (MVP Manual)

Este e o bloco copiavel pelo operador para o campo Observacoes do CRM.
TODA analise do ELUCI deve terminar com este bloco.

```
[ELUCI REPORT]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ELUCI CONTEXT]
Persona:              [Titan/Builder/Executor]
ICP Tier:             [1A / 1B / 2 / 3]
Revenue Line:         [Imersao Presencial / Club / Online / Traction / Eventos]
CSE State:            [Cold/Aware/Curious/Problem-Aware/Tensioned/Aligned/Blocked/Disqualified]
CDS Score:            [0-5]
DQI Estimado:         [0-100]

[DIAGNOSTIC CORE]
Problem (dor real):   [frase exata ou [NAO DECLARADO]]
Impact (impacto):     [valor/consequencia ou [NAO DECLARADO]]
Critical Event:       [data/evento ou [NAO DECLARADO]]
Decision Structure:   [quem decide e como ou [NAO DECLARADO]]
Evidence Citation:    "[trecho exato da conversa que sustenta o diagnostico]"

[STRATEGIC DIRECTIVE]
Objetivo desta interacao:   [micro-goal especifico]
Framework autorizado:       [Challenger/SPICED/SPIN/Pattern Interrupt]
Postura recomendada:        [tom e abordagem]
Tática permitida:           [acao especifica]
Tática PROIBIDA:            [o que NAO fazer agora]

[NEXT BEST ACTION]
Acao:           [acao clara e especifica]
Quem executa:   [SDR / Closer Senior / Operador]
Quando:         [prazo ou condicao de ativacao]
CTA sugerido:   [mensagem ou pergunta exata, se aplicavel]

[GOVERNANCE FLAGS]
⚠️  Risco detectado:       [descricao ou NENHUM]
⛔ Bloqueio ativo:         [motivo ou NENHUM]
🛡️  Protecao de valor:     [o que esta sendo protegido ou N/A]
📊 Confianca do sistema:   [Alta (>0.7) / Media (0.5-0.7) / Baixa (<0.5)]

[ELUCI VERDICT]
Recomendacao final:   [AVANCAR / AGUARDAR / BLOQUEAR / ESCALAR / DOWNSELL]
DQI Pentagon Score:   ICP_Fit:[0-100] | Frame:[0-100] | Timing:[0-100] | Ecosystem:[0-100] | Data:[0-100]
DQI Final:            [media ponderada]
Confianca geral:      [0.0-1.0]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 2. SCHEMA JSON — PARA INTEGRACAO FUTURA (REFERENCIA TECNICA)

Schema estruturado para quando o MVP evoluir para integracao direta com CRM:

```json
{
  "eluci_report": {
    "context": {
      "persona": "Builder | Titan | Executor",
      "icp_tier": "1A | 1B | 2 | 3",
      "revenue_line": "Imersao Presencial | Club | Online | Traction | Eventos",
      "cse_state": "Cold | Aware | Curious | Problem-Aware | Tensioned | Aligned | Blocked | Disqualified",
      "cse_previous_state": "string",
      "cds_score": 0,
      "transition_trigger": "string",
      "time_in_current_state": "string"
    },
    "diagnostic": {
      "situation": {
        "value": "string | [NAO DECLARADO]",
        "confidence": 0.0,
        "evidence": "trecho literal da conversa"
      },
      "problem": {
        "value": "string | [NAO DECLARADO]",
        "confidence": 0.0,
        "evidence": "trecho literal da conversa",
        "type": "fato | inferencia | hipotese"
      },
      "impact": {
        "value": "string | [NAO DECLARADO]",
        "quantified": false,
        "amount_estimated": null,
        "confidence": 0.0,
        "evidence": "trecho literal"
      },
      "critical_event": {
        "value": "string | [NAO DECLARADO]",
        "date_or_trigger": null,
        "confidence": 0.0
      },
      "decision_structure": {
        "primary_decision_maker": "string | [NAO DECLARADO]",
        "influencers": [],
        "process_mapped": false,
        "confidence": 0.0
      }
    },
    "gaps": [
      {
        "field": "nome do campo ausente",
        "impact": "alto | medio | baixo",
        "blocks_action": true
      }
    ],
    "risks": [
      {
        "signal": "stall | regressao | divergencia | toxic_profile",
        "severity": "critico | moderado | leve",
        "evidence": "string"
      }
    ],
    "strategy": {
      "objective": "micro-goal especifico",
      "framework": "Challenger | SPICED | SPIN | Pattern Interrupt | Facilitacao",
      "allowed_tactics": ["lista de taticas permitidas"],
      "forbidden_tactics": ["lista de taticas proibidas"],
      "posture": "descricao do tom e abordagem"
    },
    "next_best_action": {
      "action": "descricao clara",
      "executor": "SDR | Closer Senior | Operador",
      "when": "prazo ou condicao",
      "suggested_cta": "mensagem ou pergunta exata (opcional)"
    },
    "governance": {
      "sla_block_active": false,
      "block_reason": null,
      "premature_close_risk": false,
      "value_protection_note": "string | null",
      "escalate_to_human": false,
      "escalation_reason": null
    },
    "verdict": {
      "recommendation": "AVANCAR | AGUARDAR | BLOQUEAR | ESCALAR | DOWNSELL",
      "dqi_pentagon": {
        "icp_fit": 0,
        "frame_integrity": 0,
        "state_timing": 0,
        "ecosystem_protection": 0,
        "data_density": 0,
        "final_dqi": 0
      },
      "confidence": 0.0,
      "system_action": "REINFORCE_PATTERN | FLAG_FOR_REVIEW | ALERT_RED | BLOCK"
    }
  }
}
```

---

## 3. SCHEMAS ESPECIFICOS POR FRAMEWORK

### 3.1 Schema SPICED (Builder e Executor)

```json
{
  "spiced_analysis": {
    "situation": {
      "mapped": true,
      "depth": "superficial | parcial | completo",
      "key_facts": ["fato 1", "fato 2"],
      "confidence": 0.0,
      "evidence": "trecho exato"
    },
    "problem": {
      "identified": true,
      "declared_by_lead": true,
      "problem_type": "operacional | comercial | lideranca | financeiro | outro",
      "problem_statement": "frase do proprio lead",
      "confidence": 0.0,
      "evidence": "trecho exato"
    },
    "impact": {
      "quantified": false,
      "impact_type": "financeiro | operacional | reputacional | estrategico",
      "impact_value": null,
      "impact_statement": "como o lead descreveu o impacto",
      "confidence": 0.0,
      "evidence": "trecho exato"
    },
    "critical_event": {
      "identified": false,
      "event_type": "data | contratacao | expansao | crise | sazonalidade",
      "event_description": null,
      "urgency_level": "alta | media | baixa | ausente",
      "confidence": 0.0
    },
    "decision": {
      "primary_buyer_identified": false,
      "decision_process_mapped": false,
      "stakeholders": [],
      "decision_timeline": null,
      "confidence": 0.0
    },
    "spiced_completeness": 0,
    "recommended_next_spiced_step": "qual letra do SPICED aprofundar agora"
  }
}
```

### 3.2 Schema Challenger (Titan)

```json
{
  "challenger_analysis": {
    "teach_phase": {
      "insight_delivered": false,
      "insight_type": "dado de mercado | benchmark | caso real | perspectiva nova",
      "insight_content": "descricao do insight usado",
      "lead_reaction": "receptivo | neutro | defensivo | indiferente",
      "awareness_delta": "positivo | zero | negativo",
      "confidence": 0.0
    },
    "tailor_phase": {
      "personalization_applied": false,
      "connected_to_lead_context": false,
      "persona_frame_respected": true,
      "evidence": "como o insight foi personalizado"
    },
    "take_control_phase": {
      "frame_maintained": true,
      "authority_preserved": true,
      "lead_showed_deference": false,
      "next_step_proposed_by_eluci": false
    },
    "tension_generated": {
      "type": "positiva | negativa | ausente",
      "current_cse_state": "Tensioned | Problem-Aware | Aligned",
      "recommended_action": "silencio tatico | reframe | avançar"
    },
    "challenger_verdict": "CONTINUAR | AGUARDAR | REFRAME | BLOQUEAR"
  }
}
```

### 3.3 Schema SPIN (Executor / Politico)

```json
{
  "spin_analysis": {
    "situation_questions": {
      "asked": 0,
      "answered": 0,
      "quality": "superficial | adequada | profunda",
      "key_context_extracted": ["item 1", "item 2"]
    },
    "problem_questions": {
      "asked": 0,
      "lead_acknowledged_problem": false,
      "problem_statement": "como o lead articulou o problema",
      "confidence": 0.0
    },
    "implication_questions": {
      "asked": 0,
      "implication_surfaced": false,
      "emotional_impact_level": "alto | medio | baixo | ausente",
      "organizational_impact": "como afeta a empresa",
      "personal_impact": "como afeta o decisor pessoalmente"
    },
    "need_payoff_questions": {
      "asked": 0,
      "lead_articulated_solution": false,
      "need_payoff_statement": "como o lead descreveu o valor da solucao",
      "buy_in_level": "alto | medio | baixo | ausente"
    },
    "champion_readiness": {
      "executor_is_champion": false,
      "internal_selling_capacity": "alta | media | baixa",
      "business_case_built": false,
      "recommended_champion_tools": ["ROI case", "benchmark", "caso similar"]
    }
  }
}
```

---

## 4. SCHEMA DE GOVERNANCE ALERT

Quando um bloqueio e detectado, este e o bloco obrigatorio:

```
[ELUCI GOVERNANCE ALERT]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tipo:            [PREMATURE_CLOSE / FRAMEWORK_MISMATCH / TIER_VIOLATION / SLA_BREAK / TOXIC_PROFILE]
Regra violada:   [referencia ao canonical doc — ex: "guardrails.md secao 2, Tier Block"]
Acao bloqueada:  [o que o operador estava prestes a fazer]
Motivo:          [por que e um problema]
Risco evitado:   [o que seria protegido ao bloquear]
Alternativa:     [o que PODE ser feito no lugar]
DQI impacto:     [qual dimensao do Pentagon seria zerada se acao prosseguisse]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 5. SCHEMA DE ESCALADA HUMANA

```
[ELUCI — ESCALADA NECESSARIA]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motivo:             [descricao especifica e objetiva]
Confianca atual:    [0.0-1.0]
Dado critico faltante: [campo especifico]
Tipo de complexidade:  [CEO enterprise / M&A / Litígio / Crise / Titular politico]
Acao sugerida:      [o que o operador deve fazer]
Quem acionar:       [Closer Senior / Head of Sales / Juridico / CEO]
Prazo:              [urgencia da escalada]
Material preparado: [o que o ELUCI ja tem disponivel para o escalado]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 6. RITUAL DO OPERADOR (MVP Manual)

### Passo a passo obrigatorio antes de colar no CRM

```
PASSO 1 — LER COMPLETO
  [ ] Leu o output inteiro antes de qualquer acao?
  [ ] Algo parece estranho ou inconsistente?
  [ ] Se SIM: NAO improvisar — reportar ao ELUCI ou escalar

PASSO 2 — CHECAR GOVERNANCE FLAGS
  [ ] Ha ⚠️ Risco detectado?     SE SIM → investigar antes de avancar
  [ ] Ha ⛔ Bloqueio ativo?      SE SIM → NAO avancar sem validar com lider
  [ ] DQI < 50?                  SE SIM → NAO fazer handoff para Closer

PASSO 3 — COPIAR INTEGRALMENTE
  [ ] Copiar TODO o bloco [ELUCI REPORT] — sem editar
  [ ] Colar no campo Observacoes do CRM — sem resumir
  [ ] NUNCA apagar campos negativos ou alertas
  [ ] NUNCA "traduzir para o jeito do operador"

PASSO 4 — EXECUTAR NEXT BEST ACTION
  [ ] Executar APENAS a acao especificada em [NEXT BEST ACTION]
  [ ] Nenhuma acao extra "porque achei melhor"
  [ ] Se houver duvida sobre a acao: PARAR e consultar

PASSO 5 — SELF-AUDIT FINAL
  [ ] Algum campo ficou [NAO DECLARADO]?     SE SIM → tentar enriquecer antes de avancar
  [ ] ICP Risk Flag esta ativa?               SE SIM → nao agendar Closer sem validar
  [ ] Framework usado corresponde a persona?  SE NAO → BLOQUEADO
```

### O Operador NUNCA pode:
```
❌ Resumir o bloco antes de colar
❌ "Traduzir para o jeito dele"
❌ Apagar flags negativas ou alertas de governanca
❌ Agendar Closer com DQI < 50 ou Governance Block ativo
❌ Enviar proposta com CSE State < Problem-Aware
❌ Ignorar [NAO DECLARADO] e inventar o dado
❌ Usar urgencia artificial ("corre que acaba") sem evento critico real
❌ Misturar output de leads diferentes no mesmo registro
```

### Frase-ancora do Operador:
> "O operador nao e pago para decidir melhor que o sistema.
> E pago para nao corromper a inteligencia que o sistema produziu."

---

## 7. METRICAS DE QUALIDADE DO OUTPUT (DQI PENTAGON)

### Como calcular o DQI de uma interacao

**Dimensao 1 — ICP Fit Score (0-100)**
```
100: Produto oferecido corresponde exatamente ao Tier do lead
75:  Produto adequado mas com ressalvas (ex: Builder em Tier 1B para Imersao)
50:  Indefinido — dados insuficientes para validar fit
0:   Tier 2 ou 3 sendo encaminhado para produto de Tier 1 (FALHA CRITICA)
```

**Dimensao 2 — Frame Integrity Score (0-100)**
```
100: Framework correto para persona, tom adequado, autoridade mantida
75:  Framework adequado mas com desvios menores
50:  Framework ambiguo ou parcialmente correto
0:   Framework errado para persona OU urgencia artificial OU "mendigar reuniao"
```

**Dimensao 3 — State Timing Score (0-100)**
```
100: Acao exatamente sincronizada com CSE State (ex: Challenger em Problem-Aware)
75:  Acao adequada mas levemente precoce ou tardia
50:  Timing dubio
0:   Proposta/close em estado < Problem-Aware (AFOBACAO — ERRO GRAVE)
```

**Dimensao 4 — Ecosystem Protection Score (0-100)**
```
100: Lead toxico ou fora de ICP foi BLOQUEADO antes de chegar ao Closer
100: Downsell honesto executado para Tier 2/3
50:  Situacao ambigua — revisao necessaria
0:   Lead toxico empurrado para Closer para bater meta (DESTRUICAO DE ECOSSISTEMA)
```

**Dimensao 5 — Data Density Score (0-100)**
```
100: Todos os campos SPICED preenchidos com dados reais e citados
75:  Maioria dos campos com dados reais, 1-2 [NAO DECLARADO] com baixo impacto
50:  Dados parciais, alguns campos criticos ausentes
0:   "Cliente interessado, pediu preco" — LIXO DE DADOS
```

**Formula DQI Final:**
```
DQI = (ICP_Fit * 0.25) + (Frame * 0.20) + (Timing * 0.25) + (Ecosystem * 0.20) + (Data * 0.10)

Interpretacao:
  DQI >= 85: EXCELLENT DECISION — reforcar padrao
  DQI 70-84: GOOD DECISION — monitorar pontos de melhoria
  DQI 50-69: ACCEPTABLE — revisar dimensoes baixas
  DQI 30-49: POOR DECISION — auditoria obrigatoria
  DQI < 30:  CRITICAL FAILURE — alerta vermelho, intervencao imediata
```

---

## 8. EXEMPLOS DE OUTPUT CANONICO

### Exemplo 1 — Builder Problem-Aware (DQI 91)

```
[ELUCI REPORT]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ELUCI CONTEXT]
Persona:       Builder (Trator)
ICP Tier:      1B (R$4.5MM estimado)
Revenue Line:  Imersao Presencial — Gestao Empresarial
CSE State:     Problem-Aware → Tensioned
CDS Score:     3 (impacto mencionado, nao quantificado)
DQI Estimado:  78

[DIAGNOSTIC CORE]
Problem:       Caos operacional com dependencia total do fundador
Impact:        [NAO DECLARADO — enriquecer] — mencao a "se eu parar a empresa para"
Critical Event: Black Friday em 60 dias (declarado)
Decision:      Fundador decide sozinho (confirmado)
Evidence:      "Se eu parar 3 dias a empresa quebra. Todo mundo so resolve quando eu olho."

[STRATEGIC DIRECTIVE]
Objetivo:    Quantificar o impacto financeiro da dependencia do fundador (SPICED I)
Framework:   SPICED — focar em Impact e Critical Event
Postura:     Empatico, direto, "barro na bota" — nao resolver, aprofundar a dor
Permitido:   Pergunta de monetizacao ("quanto isso te custa por mes?")
PROIBIDO:    Enviar proposta, mencionar preco, Challenger agressivo

[NEXT BEST ACTION]
Acao:        Pergunta de impacto financeiro
Quem:        SDR
Quando:      Proxima mensagem
CTA:         "Voce mencionou que a empresa para sem voce. Pensando em reais — quanto isso te custa por mes em vendas perdidas, decisoes atrasadas ou bons profissionais que saem?"

[GOVERNANCE FLAGS]
⚠️  Risco:      Tendencia a querer agendar reuniao antes de quantificar impact
⛔ Bloqueio:    NAO agendar Closer sem Impact quantificado
🛡️  Protecao:   Tempo do Closer Senior preservado
📊 Confianca:   Alta (0.82)

[ELUCI VERDICT]
Recomendacao: AGUARDAR — aprofundar Impact antes de avancar
DQI Pentagon: ICP_Fit:90 | Frame:95 | Timing:85 | Ecosystem:100 | Data:60
DQI Final:    85
Confianca:    0.82

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Exemplo 2 — Governance Block (Tier Violation)

```
[ELUCI GOVERNANCE ALERT]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tipo:          TIER_VIOLATION
Regra:         guardrails.md secao 2 — Tier 2 Silver bloqueado de Imersoes Presenciais
Acao bloqueada: Agendar Closer Senior para lead com faturamento R$600k
Motivo:        Tier 2 Silver (R$600k) nao tem elegibilidade para Imersao Presencial
Risco evitado: Contaminacao da sala + desgaste do Closer + possivel inadimplencia
Alternativa:   Redirecionar para G4 Traction (produto correto para este tier)
DQI impacto:   ICP_Fit = 0 se prosseguir
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Skills que consomem este MCP

Todas as skills que geram output para operador ou CRM:
- `qualificar-lead`, `analisar-call`, `estrategia`, `hot-handoff`
- `gerar-nota-lead`, `sinais-lead`, `gav`, `coach-sdr`
- `elucy` (orchestrator — valida output final antes de entregar)
