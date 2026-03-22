# VALIDATION FORMS ENGINE — Dynamic Validation Layer (DVL)
# DOCUMENT_ID: DOCUMENT_26
# DOCUMENT_TYPE: HUMAN_VALIDATION_GATE
# Versao: 1.0 | Status: ACTIVE
# Fonte: Elucy DVL Blueprint (Sprint 1 — 21/03/2026)

## PROPOSITO

O DVL (Dynamic Validation Layer) é uma camada de validação humana que intercepta a execução
de qualquer skill quando um deal_id, email ou empresa é detectado no input.

O operador SEMPRE valida antes de o sistema executar. Isso garante:
- Integridade dos dados (o CRM pode estar desatualizado)
- Engajamento e didática do SDR (ele aprende o que o sistema inferiu)
- DQI máximo (decisões tomadas com contexto confirmado valem mais)
- Gamificação (validações acumulam SDR Progress Score)

---

## DEAL DETECTOR — Padrões de Detecção

O sistema detecta automaticamente qualquer um desses padrões no input:

```
DEAL_ID_PATTERNS:
  - Número puro > 4 dígitos sozinho: ex. "12345", "987654"
  - Prefixo reconhecido: deal-, opp-, neg-, #, ID
  - Ex: "deal-12345", "opp-987", "#45678", "ID: 3321"

EMAIL_PATTERNS:
  - Regex padrão: [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
  - Ex: "marcus@titansolutions.com"

EMPRESA_PATTERNS:
  - Palavra capitalizada após "empresa:", "conta:", "lead:", "cliente:"
  - Ex: "lead: Titan Solutions", "empresa: Acme Corp"
```

Quando QUALQUER padrão detectado → acionar DEAL_CONTEXT_LOADER antes da skill.

---

## DEAL_CONTEXT_LOADER — Etapa 0 do DVL

Antes de abrir o form, o sistema carrega automaticamente do Databricks:

```
QUERY OBRIGATÓRIA (funil_comercial):
  SELECT
    pessoa_nome,
    empresa_nome,
    tier_da_oportunidade,
    persona_inferida,
    fase_atual_no_processo,
    delta_t,
    linha_de_receita_vigente,
    grupo_de_receita,
    proprietario_name,
    qualificador_name,
    utm_medium,
    temperatura_calculada,   -- calculado pelo sistema (ver algoritmo abaixo)
    sinais_ativos            -- JSON com últimos 3 sinais CRM
  FROM production.diamond.funil_comercial
  WHERE deal_id = {deal_id}  -- ou email, ou empresa_nome
  LIMIT 1

SE Databricks offline → bloquear com [ELUCY — Databricks offline]
SE deal não encontrado → exibir DEAL_NOT_FOUND_FORM (ver abaixo)
SE dados carregados → abrir VALIDATION_FORM da skill acionada
```

---

## ALGORITMO DE TEMPERATURA DO DEAL

Score 0–100 calculado em tempo real, exibido no form e no deal card.

```
TEMPERATURA = BASE_SCORE + Σ(sinais positivos) - Σ(penalidades)

BASE_SCORE = 50

SINAIS POSITIVOS:
  +25 → Critical Event confirmado com data < 30 dias
  +20 → SDR validou SPICED completo (validation_score = COMPLETE)
  +20 → LinkedIn interaction < 24h
  +15 → Email opened ≥ 2x
  +10 → Reunião agendada ou confirmada
  +10 → Lead respondeu última mensagem

PENALIDADES:
  -25 → delta_t na fase atual > SLA definido (sla-engine.md)
  -20 → Sem contato há > 7 dias
  -20 → Tier 2 tentando Imersão Presencial (Iron Dome ativo)
  -15 → Decisor real não identificado (Decision Process = UNKNOWN)
  -10 → Objeção ativa sem resposta registrada
  -5  → Deal em fase anterior há > 14 dias sem movimento

FAIXAS:
  0–25   → 🔴 FRIO — risco de perda, intervenção urgente
  26–50  → 🟡 MORNO — precisa de ação para esquentar
  51–75  → 🟢 QUENTE — no ritmo, manter cadência
  76–100 → 🔥 CRÍTICO — fechar agora, não deixar esfriar
```

---

## VALIDATION FORMS — Por Skill

Cada skill tem seu próprio schema. O form é renderizado via `jsonrender` no chat
usando os dados já carregados pelo DEAL_CONTEXT_LOADER.

---

### FORM_01 — /qualificar-lead (ANALYSIS_MODE / BRIEF_MODE)

```yaml
FORM_ID: QUAL_001
TITLE: "Validação de Contexto — Qualificação"
TRIGGER_SKILLS: [qualificar-lead, ANALYSIS_MODE, BRIEF_MODE]

FIELDS:
  - id: tier
    label: "Tier confirmado"
    type: badge_select
    options: [Tier 1 Elite >10MM, Tier 1-B Builder 1M-10M, Tier 2 <1MM]
    prefill: tier_da_oportunidade
    required: true

  - id: persona
    label: "Persona do decisor"
    type: badge_select
    options: [Soberano/Titan, Trator/Builder, Braço Direito/Executor]
    prefill: persona_inferida
    required: true

  - id: critical_event
    label: "Evento crítico identificado?"
    type: text_confirm
    prefill: critical_event_data
    placeholder: "Ex: SKO em julho, Series C em 6 meses"
    required: false

  - id: decision_maker
    label: "Quem toma a decisão final?"
    type: text_confirm
    prefill: decisor_name
    placeholder: "Nome + cargo"
    required: true

  - id: pain_confirmed
    label: "Dor principal confirmada?"
    type: text_confirm
    prefill: dor_inferida
    placeholder: "Ex: 32% de pipeline leakage"
    required: true

TEMPERATURE_DISPLAY: true
SIGNALS_DISPLAY: true
DQI_PREVIEW: true

ON_CONFIRM: executar skill com contexto validado + incrementar validation_score
ON_EDIT: atualizar campos → re-calcular temperatura → confirmar novamente
ON_CANCEL: abortar skill + registrar "operador cancelou validação" em sdr-progress.md
```

---

### FORM_02 — /social-dm (SDR_SOCIAL_DM_MODE)

```yaml
FORM_ID: DM_001
TITLE: "Validação de DM — Canal e Tom"
TRIGGER_SKILLS: [social-dm, SDR_SOCIAL_DM_MODE, FOLLOWUP_FOUNDER_DM_MODE]

FIELDS:
  - id: instagram_handle
    label: "@ do lead no Instagram"
    type: text_input
    prefill: instagram_handle_crm
    placeholder: "@marcusaurelius"
    required: true

  - id: founder_account
    label: "Conta founder para envio"
    type: badge_select
    options: [Tallis, Nardon, Alfredo, G4 Oficial]
    prefill: utm_medium_to_founder
    required: true

  - id: touchpoint
    label: "Touchpoint atual"
    type: badge_select
    options: [TP1 – Primeiro contato, TP2 – Follow-up, TP3 – Reengajamento, TP4 – Decisão]
    prefill: touchpoint_atual
    required: true

  - id: cql_signal
    label: "Sinal CQL que motivou a ação"
    type: text_confirm
    prefill: ultimo_sinal_ativo
    placeholder: "Ex: Visualizou perfil do Tallis hoje"
    required: false

  - id: objective
    label: "Objetivo da DM"
    type: badge_select
    options: [Abrir conversa, Agendar call, Reativar lead frio, Forçar decisão]
    required: true

TEMPERATURE_DISPLAY: true
SIGNALS_DISPLAY: true

ON_CONFIRM: executar social-dm com contexto validado
ON_EDIT: atualizar campos → confirmar novamente
```

---

### FORM_03 — /challenger-titan (CHALLENGER_MODE)

```yaml
FORM_ID: CHALL_001
TITLE: "Validação Challenger — Titan/Soberano"
TRIGGER_SKILLS: [challenger-titan, CHALLENGER_MODE]

FIELDS:
  - id: pain_reframe
    label: "Reframe de dor (o que o Titan ainda não percebeu)"
    type: text_input
    prefill: challenger_insight_sugerido
    placeholder: "Ex: O gargalo não é mais vendas, é ritmo do time"
    required: true

  - id: critical_event
    label: "Critical Event para ancoragem"
    type: text_confirm
    prefill: critical_event_data
    required: true

  - id: authority_confirmed
    label: "CEO é o decisor final?"
    type: boolean_confirm
    prefill: is_ceo_decision_maker
    required: true

  - id: competition_present
    label: "Concorrente ativo neste deal?"
    type: text_input
    placeholder: "Nome do concorrente ou 'não identificado'"
    required: false

  - id: framework_lock
    label: "Framework: Challenger (BLOQUEADO para Titan)"
    type: locked_display
    value: "Challenger — inviolável para Soberano/Titan"

TEMPERATURE_DISPLAY: true

ON_CONFIRM: executar challenger-titan com contexto confirmado
```

---

### FORM_04 — /hot-handoff

```yaml
FORM_ID: HANDOFF_001
TITLE: "Validação de Hot Handoff"
TRIGGER_SKILLS: [hot-handoff]

FIELDS:
  - id: urgency_level
    label: "Nível de urgência"
    type: rating_1_5
    required: true

  - id: handoff_reason
    label: "Motivo do handoff"
    type: badge_select
    options: [Lead pediu reunião agora, Sinal de compra imediata, Objeção de preço avançada, Critical Event iminente]
    required: true

  - id: closer_available
    label: "Closer disponível"
    type: text_input
    prefill: proprietario_name
    placeholder: "Nome do closer"
    required: true

  - id: deal_context_summary
    label: "Resumo do contexto para o closer (3 linhas)"
    type: textarea
    placeholder: "Tier, dor principal, próximo passo acordado com lead"
    required: true

TEMPERATURE_DISPLAY: true

ON_CONFIRM: executar hot-handoff + notificar closer via Slack (se ativo)
```

---

### FORM_05 — /gerar-nota-lead (NOTE_MODE)

```yaml
FORM_ID: NOTE_001
TITLE: "Validação de Nota CRM"
TRIGGER_SKILLS: [gerar-nota-lead, NOTE_MODE]

FIELDS:
  - id: data_completeness_check
    label: "Dados confirmados para a nota"
    type: checklist
    items:
      - label: "Tier e persona verificados"
        prefill: tier_and_persona_confirmed
      - label: "Dor principal documentada"
        prefill: pain_documented
      - label: "Critical Event com data"
        prefill: critical_event_with_date
      - label: "Decisor identificado"
        prefill: decision_maker_identified
      - label: "Próxima ação acordada"
        prefill: next_action_defined
    required: true

  - id: crm_writeback_confirm
    label: "Confirmar gravação no CRM após geração?"
    type: boolean_confirm
    default: true

TEMPERATURE_DISPLAY: false
DQI_PREVIEW: true

ON_CONFIRM: gerar nota + DQI score + (se crm_writeback = true) → instruir operador a copiar
```

---

### FORM_06 — /estrategia (STRATEGY_MODE)

```yaml
FORM_ID: STRAT_001
TITLE: "Validação de Estratégia de Deal"
TRIGGER_SKILLS: [estrategia, STRATEGY_MODE]

FIELDS:
  - id: deal_stage
    label: "Fase atual confirmada"
    type: badge_select
    options: [Prospecção, Qualificação, Discovery, Proposta, Negociação, Fechamento]
    prefill: fase_atual_no_processo
    required: true

  - id: main_obstacle
    label: "Principal obstáculo hoje"
    type: badge_select
    options: [Acesso ao decisor, Orçamento não aprovado, Concorrente ativo, Sem urgência, Objeção técnica, Deal parado sem motivo]
    required: true

  - id: time_to_close
    label: "Prazo estimado para fechamento"
    type: text_input
    placeholder: "Ex: 2 semanas, fim do mês, Q2"
    required: false

  - id: revenue_line_confirm
    label: "Produto em negociação"
    type: text_confirm
    prefill: linha_de_receita_vigente
    required: true

TEMPERATURE_DISPLAY: true
SIGNALS_DISPLAY: true

ON_CONFIRM: executar estrategia com contexto validado
```

---

### FORM_00 — DEAL_NOT_FOUND (fallback)

```yaml
FORM_ID: DNF_001
TITLE: "Deal não encontrado — Entrada Manual"
TRIGGER: deal_id buscado mas não encontrado no Databricks

FIELDS:
  - id: empresa
    label: "Nome da empresa"
    type: text_input
    required: true

  - id: decisor
    label: "Nome e cargo do decisor"
    type: text_input
    required: true

  - id: tier_manual
    label: "Tier estimado (receita anual)"
    type: badge_select
    options: [Tier 1 Elite >10MM, Tier 1-B Builder 1M-10M, Tier 2 <1MM]
    required: true

  - id: canal
    label: "Canal de origem"
    type: badge_select
    options: [Instagram, WhatsApp, Email, Evento, Indicação, Outbound SDR]
    required: true

  - id: motivo_sem_crm
    label: "Por que não está no CRM?"
    type: badge_select
    options: [Lead novo - ainda não cadastrado, Deal de outro time, Erro de cadastro, Outro]
    required: false

ON_CONFIRM: executar skill com dados manuais + registrar "CRM gap" em sdr-progress.md
```

---

## GAMIFICATION STATE — SDR Progress Score

Cada validação completada incrementa o SDR Progress Score armazenado em `learning/memory/sdr-progress.md`.

```
PONTUAÇÃO POR AÇÃO:
  +10 → Form validado com dados corretos (sem edições)
  +15 → Form validado com correção de dado desatualizado do CRM
  +5  → Skill executada com DQI > 80
  +20 → Deal avançou de fase após skill executada com form validado
  -5  → Form cancelado sem justificativa
  -10 → Dado inválido enviado (deal_id inexistente, email errado)

STREAKS:
  3 forms validados consecutivos → badge "Consistente"
  5 forms com DQI > 80 → badge "Cirúrgico"
  10 deals avançados com validação → badge "Arquiteto de Receita"

DISPLAY: exibir score e badges no rodapé de cada form
```

---

## RENDER PROTOCOL — Como o form aparece no chat

O form é renderizado via `jsonrender` (componente nativo do G4 OS) com a seguinte estrutura:

```
1. Card principal com:
   - Título do form + nome do lead/empresa
   - Temperatura do deal (badge colorida)
   - Sinais CRM (últimos 3, compactos)

2. Grid de campos:
   - Campos pré-preenchidos pelo Databricks (editáveis)
   - Campos obrigatórios destacados
   - Campos bloqueados (ex: framework lock) em cinza

3. Rodapé:
   - DQI Preview (se aplicável)
   - SDR Progress Score atual
   - Botões: [CONFIRMAR E EXECUTAR] [EDITAR] [CANCELAR]

4. Pós-confirmação:
   - Output da skill normalmente
   - Badge de validação + pontos ganhos
```

---

## REGRAS DE GOVERNANÇA DO DVL

```
REGRA 1 — FORM PRIMEIRO, SKILL DEPOIS
  Nenhuma skill executa sem form validado quando deal_id está presente.
  Exceção: HELP_MODE e SDR_MENU_MODE (não têm deal_id obrigatório)

REGRA 2 — DADOS DO CRM SÃO SUGESTÃO, HUMANO CONFIRMA
  O sistema pré-preenche, mas o operador é a fonte de verdade.
  Se operador corrige → dado corrigido é usado na skill E registrado como "CRM gap"

REGRA 3 — TEMPERATURE É SEMPRE CALCULADA, NUNCA DECLARADA
  Operador não pode alterar temperatura manualmente.
  Temperatura muda quando sinais mudam ou quando deal avança de fase.

REGRA 4 — DVL NÃO BLOQUEIA INDEFINIDAMENTE
  Se operador cancelar 3 forms consecutivos → sistema entra em LITE_MODE
  LITE_MODE: executa skill sem form, mas registra "DVL bypass" em sdr-progress.md

REGRA 5 — BLACK BOX PRESERVADO
  Campos internos (tier, persona, DQI, CSE state) são exibidos ao OPERADOR no form.
  NUNCA chegam ao lead. O form é exclusivamente BACKSTAGE.
```
