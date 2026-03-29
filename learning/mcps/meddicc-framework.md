# MCP: MEDDICC Framework — Enterprise Qualification Engine
# DOCUMENT_ID: MEDDICC_001
# DOCUMENT_TYPE: FRAMEWORK_QUALIFICATION_ENGINE
# Versao: 1.0 | Status: ACTIVE | Autor: G4 RevOps Intelligence
# Intent trigger: deals enterprise (5M+), Builder persona, qualification_gap, authority_missing, forecast_low_confidence

---

## PROPOSITO

Este MCP governa a qualificacao de deals enterprise usando o framework MEDDICC (Metrics, Economic Buyer, Decision Criteria, Decision Process, Paper Process, Implicate Pain, Champion, Competition).

**Principio fundamental:** Confianca no forecast nao e campo editavel. E resultado da intersecao entre progressao declarada e sinais reais capturados pelo Signal Engine V8.

O ELUCI nao usa MEDDICC como checklist. Usa como sistema de deteccao de gap. A pergunta nao e "o que foi preenchido" — e "o que esta faltando e por que".

---

## RESTRICOES DE ATIVACAO

- OBRIGATORIO para deals com tier=diamond OU opportunityValue > R$500.000
- RECOMENDADO para Builder persona em fase Oportunidade ou Negociacao
- PROIBIDO expor terminologia MEDDICC ao lead (Black Box Protocol — ver secao 7)
- NUNCA usar como substituto do SPICED para deals SMB (<R$1MM) com Executor persona

---

## 1. AS 8 DIMENSOES (MOTOR-CENTRICO)

### M — Metrics (Metricas de Impacto)

**O que o motor valida:**
- O operador declarou o impacto quantitativo que o G4 vai gerar para o cliente?
- A metrica e especifica (ex: "reduzir ciclo de vendas de 90 para 45 dias") ou generica ("melhorar performance")?
- A metrica declarada e compativel com o Enterprise Value Score (EVS) do tier da conta?

**Sinal de gap:**
- `metrics_defined` ausente no Signal Engine = campo nao validado
- Metrica generica sem numero = confidence degradada automaticamente no Forecast V7
- EVS < 0.40 com metrica declarada = inconsistencia — sinalizar framework_gap

**Como transformar em pergunta de negocio (Black Box):**
- "Qual e o custo atual de um ciclo de vendas perdido para voces?"
- "Se em 12 meses voces converterem X% mais dos leads enterprise, o que isso representa em receita?"

---

### E — Economic Buyer (Comprador Economico)

**O que o motor valida:**
- O stakeholder identificado como EB tem poder de assinatura E acesso a orcamento discricionario?
- O EB ja teve interacao direta (reuniao ou email) com o operador ou com o time G4?
- O cargo do EB em `persons_overview` e C-Level, Diretoria ou equivalente?

**Sinal de gap:**
- `authority_missing` ativado = EB nao validado ou nao identificado
- `economic_buyer_present` ausente = proximo passo obrigatorio: mapear quem decide
- Contato apenas com gestores intermediarios = advance_without_decisor sinalizado

**Regra critica:**
EB nao e necessariamente o maior entusiasta do produto. E a pessoa que, quando fala, todos os outros ficam em silencio — e que assina o cheque. Confundir Champion com EB e o erro mais comum em deals perdidos no ultimo estagio.

**Como transformar em pergunta de negocio (Black Box):**
- "Voce consegue me ajudar a entender como decisoes desse porte costumam ser aprovadas internamente?"
- "Quem mais precisa estar confortavel com essa decisao antes do fechamento?"

---

### D — Decision Criteria (Criterios de Decisao)

**O que o motor valida:**
- Criterios tecnicos: integracoes, compatibilidade, requisitos de implementacao
- Criterios economicos: ROI, payback, modelo de investimento
- Criterios de relacionamento: confianca, referencias, casos de uso similares

**Sinal de gap:**
- `decision_process_known` ausente = criterios nao mapeados
- Proposta enviada sem alinhamento dos 3 pilares = Premature Close Kill Switch potencial

**Como transformar em pergunta de negocio (Black Box):**
- "Alem do resultado que voce espera, o que mais vai pesar na decisao final do time?"
- "Tem alguma restricao tecnica ou de processo que precisamos garantir antes de avancar?"

---

### D — Decision Process (Processo de Decisao)

**O que o motor valida:**
- O operador sabe QUEM aprova, em QUAL ORDEM, com QUAL prazo?
- O processo declarado tem etapas concretas ou e vago ("vou levar para a lideranca")?
- O DAG Engine detecta atividade real de progressao ou apenas volume de touchpoints?

**Sinal de gap:**
- `too_many_touchpoints` com `stage_stuck` = atividade sem progressao real
- `fast_progress` sem `decision_process_known` = avanco superficial, risco de reversao

**Regra critica do motor:**
Avancar de etapa sem processo de decisao mapeado e continuation, nao advance. O motor diferencia. Score de confianca nao sobe sem evidencia de progressao real no processo do cliente.

---

### P — Paper Process (Processo Burocrático)

**O que o motor valida:**
- Documentos tecnicos (DPA, seguranca, compliance) foram solicitados ou entregues?
- Jurídico do cliente ja foi acionado?
- Existe prazo realista para o Paper Process ou o deal vai estagnar aqui?

**Sinal de gap:**
- Deal em fase Negociacao ha > 15 dias sem nenhum documento trocado = `aging_high` + alerta manual
- Close Date declarada sem Paper Process iniciado = Premature Close Kill Switch

**Como transformar em pergunta de negocio (Black Box):**
- "Do lado de voces, quais passos burocraticos precisam acontecer para viabilizar o contrato?"
- "Tem alguma validacao juridica ou de compliance que costuma levar mais tempo?"

---

### I — Implicate Pain (Implicar a Dor)

**O que o motor valida:**
- A dor foi identificada no inicio do ciclo (Discovery) ou so foi mencionada depois da proposta?
- A dor e urgente o suficiente para justificar uma decisao agora?
- Existe um Critical Event que cria pressao de timing natural?

**Sinal de gap:**
- `pain_missing` = dor nao identificada ou nao validada pelo motor
- `no_critical_event` = sem urgencia real — deal em risco de entrar em stall
- `pain_detected` com `no_critical_event` = dor existe mas sem timeline — trabalhar o custo de inacao

**Regra critica:**
Pain sem Critical Event nao gera decisao. O motor nao avanca deals para fase Oportunidade sem pelo menos `pain_detected` ativo. Pain + Critical Event = condicao para Commit.

**Como transformar em pergunta de negocio (Black Box):**
- "Quanto essa situacao custa para voces por mes que continua sem resolucao?"
- "O que acontece com o negocio se isso nao for resolvido nos proximos 90 dias?"

---

### C — Champion (Campeao Interno)

**O que o motor valida:**
- O Champion identificado tem PODER (posicao de influencia real, nao apenas entusiasmo)?
- O Champion tem INTERESSE no sucesso da solucao (ganha algo concreto se o projeto der certo)?
- O Champion esta ATIVO — interagindo, respondendo, movendo internamente?

**Sinal de gap:**
- `champion_missing` = nenhum Champion qualificado identificado
- `champion_detected` + zero interacoes nos ultimos 7 dias = desengajamento — task routing automatico
- Champion identificado com `authority_score` < 0.30 = pseudo-champion, nao tem peso real

**Regra de ouro:**
Champion nao e quem fala mais nas reunioes. E quem, quando fala, todos os outros ficam em silencio — e que ativamente move o processo internamente quando voce nao esta na sala. Se o Champion nao consegue mover nada sem sua presenca, ele nao e um Champion.

**Como transformar em pergunta de negocio (Black Box):**
- "Quem internamente fica mais animado com esse resultado que discutimos?"
- "Tem alguem que ja esta defendendo essa iniciativa com a lideranca?"

---

### C — Competition (Competicao e Inércia)

**O que o motor valida:**
- Concorrentes diretos identificados (outras empresas de educacao executiva, consultorias)?
- Competidores de orcamento: outros projetos disputando o mesmo recurso financeiro?
- Forca de inertia: "nao fazer nada" — o cliente pode simplesmente manter o status quo?

**Sinal de gap:**
- `objection_timing` ou `objection_price` recorrentes = competidor de orcamento ativo
- Deal estagnado sem objecao explicita = inertia / "nao fazer nada" como competidor padrao
- Forecast com `qualitative_weak` + deal em negociacao = competidor pode estar ganhando posicao

**Como transformar em pergunta de negocio (Black Box):**
- "Existem outras iniciativas na empresa disputando o mesmo budget para esse semestre?"
- "O que acontece se voces decidirem nao avancar com nada agora?"

---

## 2. MAPEAMENTO NAS CAMADAS DO MOTOR

| Camada | Componente MEDDICC | Funcao |
|--------|-------------------|--------|
| L13 — Forecast V7 | Todas (Framework Score) | `meddic_avg` pondera forecast_confidence via 7 componentes |
| L16 — Framework Extractor | MEDDICC Gaps | Identifica o que falta, nao o que foi preenchido |
| L17 — Framework UI | MEDDICC Gaps | Renderiza gap tasks no cockpit para o operador |
| L18 — Signal Engine V8 | EB, Champion, Pain | `economic_buyer_present`, `champion_detected`, `pain_detected` e inversos |
| L19 — Data Quality | Metrics, Paper Process | `data_trust_score` afeta confidence se campos MEDDICC vazios |
| L20 — Transition Rules | Decision Process | Bloqueia transicao de fase sem `decision_process_known` em deals enterprise |
| L23 — Enterprise Qualification | Metrics + EB | `enterprise_5m_detected` + EVS cruzado com metrics declaradas |
| L24 — Trusted Advisor Score | Champion + EB | Equacao de Maister aplicada ao relacionamento com Champion e EB |

---

## 3. FORMULA DE CONFIANCA MEDDICC (7 COMPONENTES)

A confianca no forecast enterprise nao e intuicao. E o resultado de:

```
confidence_meddicc = (
  eb_present       × 0.25 +   // Economic Buyer validado via persons_overview
  champion_active  × 0.20 +   // Champion com interacao < 7 dias
  pain_intensity   × 0.18 +   // Pain detectado + Critical Event presente
  metrics_defined  × 0.15 +   // Metrica quantitativa com numero real
  decision_clarity × 0.12 +   // Processo de decisao com etapas conhecidas
  paper_initiated  × 0.06 +   // Paper Process iniciado
  competition_mapped × 0.04   // Competidor(es) identificados
)
```

**Regra de degradacao:** Se `eb_present = 0` E deal em fase Negociacao → confidence_meddicc automaticamente capped em 0.40, independente dos outros componentes. Nao existe "quase fechado" sem EB validado.

---

## 4. KILL SWITCHES MEDDICC

| Kill Switch | Condicao | Impacto |
|------------|----------|---------|
| Framework Violation | Tentativa de transicao Discovery→Commit sem Pain + EB validados | Blocked from Commit: deal impedido de entrar na previsao firme |
| Premature Close | Close Date declarada sem Paper Process + Decision Criteria aceito | Automatic Task Routing: forcado criar tarefas de governanca |
| Pseudo-Champion Block | Champion identificado com authority_score < 0.30 e zero EB validado | Alert + task: mapear EB real antes de avancar |
| Black Box Protocol Breach | Terminologia MEDDICC ("champion", "economic buyer", "decision criteria") detectada em copy gerada | Copy Generation Block: impede envio — reformular em linguagem de negocio |

---

## 5. SINAIS CANÔNICOS RELACIONADOS (Signal Engine V8)

Sinais positivos (pol > 0):
- `economic_buyer_present` — meddic_economic >= 0.60
- `champion_detected` — meddic_champion >= 0.55
- `decision_process_known` — meddic_process >= 0.50
- `metrics_defined` — meddic_metrics >= 0.50
- `pain_detected` — spiced_pain >= 0.60
- `critical_event_defined` — spiced_critical_event >= 0.50
- `advance_confirmed` — avanco real de etapa verificado

Sinais negativos (pol < 0):
- `authority_missing` — authority_score < 0.30 OU meddic_economic < 0.25
- `champion_missing` — meddic_champion < 0.25
- `pain_missing` — spiced_pain < 0.25
- `no_critical_event` — spiced_critical_event < 0.20
- `advance_without_decisor` — avanco sem EB validado
- `no_next_step` — next_step_clarity < 0.25

---

## 6. ENTERPRISE VALUE SCORE (EVS) — CALIBRACAO

O EVS qualifica se o deal suporta potencial enterprise (5M+). Os 6 componentes:

1. **Receita potencial** — opportunityValue > R$500k = qualificado
2. **Tier da conta** — diamond ou gold = peso maximo
3. **Urgencia** — urgency_score >= 60 = sinal de timing real
4. **Fit tecnico** — linhaReceita compativel com perfil ICP enterprise
5. **Acionabilidade** — proxima acao clara + Champion ativo
6. **Historico** — engajamentos anteriores ou renovacao

Score EVS >= 0.65 → deal entra no modo enterprise com MEDDICC obrigatorio.
Score EVS < 0.40 → usar SPICED padrao, nao MEDDICC.

---

## 7. BLACK BOX PROTOCOL — MEDDICC NO FRONTSTAGE

**PROIBIDO em copy gerada pelo motor:**
- "Quem e o seu champion?"
- "Qual e o criterio de decisao de voces?"
- "Preciso falar com o economic buyer"
- Qualquer variacao de MEDDICC / MEDDICC / MEDDPICC como terminologia

**PERMITIDO — traducoes canonicas para linguagem de negocio:**

| Termo MEDDICC | Traducao para o frontstage |
|---------------|---------------------------|
| Economic Buyer | "Quem precisa dar o ok final?" / "Quem assina esse tipo de decisao?" |
| Champion | "Quem internamente esta mais animado com isso?" |
| Decision Criteria | "O que mais pesa na hora da decisao?" |
| Decision Process | "Como e o processo de aprovacao de voces?" |
| Paper Process | "O que precisa acontecer do lado de voces para viabilizar?" |
| Implicate Pain | "O que acontece se isso nao for resolvido nos proximos 90 dias?" |
| Metrics | "Qual e o numero que vai provar que valeu a pena?" |
| Competition | "Tem outras iniciativas disputando o mesmo orcamento?" |

---

## 8. PROTOCOLO DE ADOCAO — GO-LIVE CHECKLIST

- [ ] Semantic Injection: Este MCP carregado nas Edge Functions com mapeamento para o DAG de 9 fases
- [ ] Databricks Sync: Verificar integridade de `funil_comercial` + `persons_overview` (campos de cargo, email, hierarquia)
- [ ] Signal Validation: Confirmar que `economic_buyer_present`, `champion_detected`, `pain_detected` estao ativando corretamente nos deals diamond/gold
- [ ] Kill Switch Activation: Configurar bloqueio de transicao para deals enterprise com `champion_missing` ou `authority_missing`
- [ ] EVS Calibration: Ajustar os 6 componentes do Enterprise Value Score para o ticket medio do G4 (>R$500k)
- [ ] Black Box Audit: Validar que nenhuma copy gerada pelo Elucy usa terminologia MEDDICC — apenas traducoes de negocio

---

## 9. INTEGRACAO COM OUTROS MCPs

- **SPICED (Doc46):** SPICED governa Pain + Impact + Critical Event (os "I" do MEDDICC). Nao duplicar — consultar SPICED para profundidade em dor e impacto.
- **CSE Engine (Doc08):** Estados conversacionais mapeiam onde o Champion e EB estao cognitivamente. Delta > 0 obrigatorio para considerar avanco real de processo.
- **Output Schema (Doc12):** DQI > 0.60 obrigatorio para reportar deal enterprise como "forecast firme". MEDDICC com gaps = DQI automaticamente penalizado.
- **SLA Engine (Doc25):** Deals enterprise com EB nao validado entram em SLA critico automaticamente — nao podem estagnar sem escalation.

---

## PRINCIPIO FINAL

O MEDDICC nao qualifica deals. Ele desqualifica fumaca.

Um deal que passa pelo filtro MEDDICC com confidence_meddicc >= 0.70 nao e "achismo de SDR" — e uma hipotese suportada por evidencia. O motor nao pede que o operador acredite no deal. Pede que prove.

Proof by evidence. Zero gut feeling.
