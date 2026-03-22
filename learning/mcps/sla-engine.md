# DOCUMENT_ID: SLA_ENGINE_001
# DOCUMENT_TYPE: COMMERCIAL_SLA_EXECUTION_SYSTEM
# VERSION: 1.0
# PRIORITY: CRITICAL
# STATUS: ACTIVE
# DEPENDENCIES: DATA_CONTRACT_001, CRM_EVENTS, REVENUE_ONTOLOGY, CSE_ENGINE

---

## 1. PURPOSE

Este documento transforma em um Sistema Deterministico Unico de Governanca de SLA:
- Politicas
- SLAs
- Regras operacionais
- Regras de comunicacao
- Regras de prioridade

Este documento:
- Inicia contagem
- Pausa contagem
- Define prazo
- Detecta risco
- Detecta quebra
- Executa acao automatica
- Atualiza CRM
- Registra auditoria

Nao e narrativa. E motor.

---

## 2. VOCABULARIO FECHADO (ENUMS)

```
ENUM SLA_CASE
  SAL
  SELFBOOKING
  SELFBOOKING_RESCHEDULE
  LEAD_NO_ACTIVITY
  ENTERPRISE_PRIORITY
  COMMUNICATION_POLICY

ENUM SLA_EVENT
  LEAD_CREATED
  LEAD_ASSIGNED
  FIRST_TOUCH
  CONTACT_SUCCESS
  MEETING_BOOKED
  MEETING_HELD
  NO_SHOW
  RESCHEDULE_REQUESTED
  RESCHEDULE_COMPLETED
  STATUS_CHANGED
  LAST_ACTIVITY_UPDATED

ENUM SLA_STATUS
  ON_TRACK
  AT_RISK
  BREACHED
  PAUSED
  CLOSED

ENUM SLA_ACTION
  CREATE_TASK
  SEND_ALERT_SDR
  SEND_ALERT_MANAGER
  SEND_ALERT_CRO
  ESCALATE_OWNER
  MOVE_STAGE
  TAG_RECORD
  LOG_AUDIT
```

---

## 3. PRINCIPIOS GLOBAIS (OBRIGATORIOS)

```
RULE: NO_HALLUCINATION
RULE: NO_OPINION
RULE: ONLY_FACTUAL_EVENTS
RULE: UNAVAILABLE_DATA = "NAO_INFORMADO"
RULE: ALL_SLA_DECISIONS_AUDITABLE = TRUE
```

---

## 4. MOTOR CENTRAL

```
FUNCTION SLA_ENGINE(ctx):
  IDENTIFY sla_case
  IDENTIFY trigger_event
  LOAD timer_config
  CHECK pause_rules
  CHECK breach_rules
  EXECUTE actions
  UPDATE crm_fields
  LOG audit_event
  RETURN sla_decision
```

---

## 5. SLA — SAL

```
SLA_CASE: SAL
START_EVENT: LEAD_ASSIGNED
TIMER: FIRST_TOUCH_TIMER
BREACH_IF:
  FIRST_TOUCH not registered within deadline
ON_BREACH:
  CREATE_TASK(owner)
  SEND_ALERT_MANAGER
  TAG_RECORD("SAL_BREACH")
  LOG_AUDIT
```

Qualidade minima adicional:
```
IF spiced_score < minimum_required
THEN TAG_RECORD("LOW_QUALIFICATION")
```

---

## 6. SLA — SELFBOOKING

```
SLA_CASE: SELFBOOKING
START_EVENT: MEETING_BOOKED
CLOSE_EVENT: MEETING_HELD
PAUSE_EVENT: RESCHEDULE_REQUESTED
BREACH_IF:
  MEETING not executed and no activity within deadline
ON_AT_RISK:
  SEND_ALERT_SDR
ON_BREACH:
  SEND_ALERT_MANAGER
  CREATE_TASK("Follow-up obrigatorio")
```

---

## 7. SLA — SELFBOOKING REAGENDAMENTO

```
SLA_CASE: SELFBOOKING_RESCHEDULE
START_EVENT: RESCHEDULE_REQUESTED
CLOSE_EVENT: RESCHEDULE_COMPLETED
BREACH_IF:
  RESCHEDULE not completed before deadline
ON_BREACH:
  CREATE_TASK
  SEND_ALERT_MANAGER
  TAG_RECORD("REAGENDAMENTO_PENDENTE")
```

---

## 8. SLA — LEAD SEM ATIVIDADE

```
SLA_CASE: LEAD_NO_ACTIVITY
START_EVENT: LAST_ACTIVITY_UPDATED
BREACH_IF:
  now - last_activity_at >= threshold
ON_BREACH:
  TAG_RECORD("NO_ACTIVITY")
  CREATE_TASK("Reengajamento obrigatorio")
  SEND_ALERT_MANAGER
```

---

## 9. SLA — ENTERPRISE PRIORITY

```
SLA_CASE: ENTERPRISE_PRIORITY

IF company_tier == ENTERPRISE
THEN reduce_deadline_by(priority_factor)

ON_BREACH:
  ESCALATE_OWNER
  SEND_ALERT_CRO
  TAG_RECORD("ENTERPRISE_RISK")
```

---

## 10. SLA — POLITICA DE COMUNICACAO

```
RULE:
IF communication_channel not aligned with stage
THEN TAG_RECORD("CHANNEL_MISALIGNMENT")

IF sensitive_stage AND message_delay > threshold
THEN SEND_ALERT_MANAGER
```

---

## 11. PAUSAS GLOBAIS

```
IF status in {DISQUALIFIED, CLOSED_WON, CLOSED_LOST}
THEN SLA_STATUS = CLOSED

IF waiting_on_customer == TRUE
THEN SLA_STATUS = PAUSED
```

---

## 12. INTEGRACAO COM FUNIL QUALITATIVO

SLA nao olha apenas tempo.

```
IF sla_case == SAL
AND spiced_score < 3
THEN block_stage_advance
```

---

## 13. SAIDA PADRAO

```
{
  sla_case,
  current_status,
  deadline_at,
  breached: BOOLEAN,
  actions_executed: [],
  crm_updates: [],
  audit_log: []
}
```

---

## 14. O QUE ESSE DOCUMENTO SUBSTITUI

Substitui como referencia de execucao (passam a ser historico):
- Gestao de Comunicacao
- SLA definicao de SAL
- SLA Selfbooking
- SLA Reagendamento
- SLA Leads sem Atividade
- SLA Empresas

A execucao real acontece neste motor unico.

---

## 15. GARANTIAS

Sistema unico:
- Deterministico
- Executavel
- Auditavel
- Integravel ao ELUCI
- Escalavel

---

DEPLOYMENT_READY: TRUE
STRUCTURE_STABLE: TRUE
