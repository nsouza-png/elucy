# DOCUMENT_ID: BLDE_001
# DOCUMENT_TYPE: BRAND_LINGUISTIC_DENSITY_ENGINE
# TITLE: Buzzwords & Symbolic Density Control Engine
# VERSION: 1.0
# PRIORITY: HIGH
# DEPENDENCIES: ELUCI_CORE_000, REVENUE_ONTOLOGY, FIP_001
# STATUS: ACTIVE
# RAG_OPTIMIZED: TRUE
# MCP_COMPATIBLE: TRUE

---

## 1. PURPOSE

Controla intensidade simbolica e densidade de linguagem de marca em:
- Revenue Lines
- Canais
- Contexto de Founder
- Estagio de Funil

Este motor governa:
- Uso de buzzwords
- Intensidade ideologica
- Tom institucional
- Referencias narrativas ligadas ao founder
- Exposicao de simbolos de marca

Este motor NAO governa:
- Logica de CTA
- Permissao de preco
- Classificacao de persona
- Gating de estado

Governa apenas carga simbolica linguistica.

---

## 2. ENUM DEFINITIONS (VOCABULARIO FECHADO)

### ENUM BUZZWORD_LEVEL

LEVEL_0 = ZERO_SYMBOLIC
LEVEL_1 = LIGHT_BRAND_SIGNAL
LEVEL_2 = MODERATE_BRAND_IDENTITY
LEVEL_3 = STRONG_BRAND_IDEOLOGY

---

### ENUM FOUNDER_PROFILE

TALLIS
NARDON
ALFREDO
G4_INSTITUTIONAL
NONE

---

### ENUM SYMBOLIC_CATEGORY

IDEOLOGICAL
METHOD_BASED
FOUNDER_HISTORY
BRAND_PHILOSOPHY
INSTITUTIONAL_POSITIONING

---

## 3. REGRA BASE — CANAL PRIMEIRO

```
RULE_ID: BLDE_001
CATEGORY: CHANNEL_BASE
PRIORITY: 2

IF CHANNEL == INSTAGRAM_FOUNDER
AND REVENUE_LINE == SOCIAL_DM
THEN BUZZWORD_LEVEL = LEVEL_0
```

Narrativa institucional: PROIBIDA.
Enquadramento ideologico: PROIBIDO.

---

## 4. REVENUE LINE MATRIX

| Revenue Line   | Default Buzzword Level |
|---|---|
| SOCIAL_DM      | LEVEL_0 |
| DIGITAL        | LEVEL_1 |
| TRACTION       | LEVEL_1 |
| CORE_IMERSAO   | LEVEL_2 |
| EVENT          | LEVEL_3 |
| CLUB           | LEVEL_2 |
| RENEWAL        | LEVEL_1 |

---

## 5. FOUNDER MODULATION RULE

```
RULE_ID: BLDE_010
CATEGORY: FOUNDER_MODIFIER
PRIORITY: 3
```

### IF FOUNDER_PROFILE == TALLIS

Permitido em LEVEL_2+:
- Construir o Brasil real
- Metodo
- Gestao de verdade
- Ambicao inegociavel

Tom: Forte, Confrontacional, Direcional

---

### IF FOUNDER_PROFILE == NARDON

Referencias simbolicas permitidas devem conectar a:
- Eficiencia
- Sistema
- Maximo global
- Processo acima de esforco

NUNCA:
- Enquadramento ideologico pesado
- Metaforas simbolicas em excesso

---

### IF FOUNDER_PROFILE == ALFREDO

Permitido:
- Energia
- Execucao
- Venda
- Ritmo
- Crescimento

Evitar:
- Filosofia institucional longa

---

## 6. SYMBOLIC DENSITY CONTROL

```
RULE_ID: BLDE_020
CATEGORY: DENSITY_LIMIT
PRIORITY: 2
```

Restricao por nivel:

LEVEL_0:
- 0 frases institucionais
- 0 referencias ideologicas
- Apenas clareza contextual

LEVEL_1:
- Max 1 frase ligada a marca
- Sem tom de manifesto

LEVEL_2:
- Ate 2 referencias simbolicas
- Narrativa com enquadramento controlado

LEVEL_3:
- Enquadramento ideologico permitido
- Linguagem institucional permitida
- Tese de marca permitida

---

## 7. SOCIAL_DM HARD LIMIT

```
RULE_ID: BLDE_030
CATEGORY: SOCIAL_DM_LOCK
PRIORITY: 1

IF REVENUE_LINE == SOCIAL_DM
THEN FORCE BUZZWORD_LEVEL = LEVEL_0

BLOCK: Nova Ordem | Ecossistema | Elite | Esfera armilar | Manifesto | Narrativa institucional
```

DM de founder deve soar humano, nao institucional.

---

## 8. EVENT & CORE ESCALATION

```
RULE_ID: BLDE_040
CATEGORY: EVENT_INTENSITY
PRIORITY: 3

IF REVENUE_LINE == EVENT
THEN BUZZWORD_LEVEL = LEVEL_3
```

Permitido:
- Nova Ordem
- Movimento
- Construir legado
- Elite
- Bussola
- Ecossistema

---

## 9. DYNAMIC ADJUSTMENT

```
RULE_ID: BLDE_050
CATEGORY: STATE_MODIFIER
PRIORITY: 3
```

IF CSE_STATE <= CURIOUS
  THEN DECREASE BUZZWORD_LEVEL by 1

IF CSE_STATE >= ALIGNED
  THEN BUZZWORD_LEVEL may increase by 1 (max LEVEL_3)

Racional: Carga simbolica alta somente quando existe permissao psicologica.

---

## 10. EXECUTION FUNCTION

```
FUNCTION APPLY_BLDE(ctx):
  base_level    = GET_LEVEL_BY_REVENUE(ctx.revenue_line)
  modified_level = APPLY_FOUNDER_MODIFIER(base_level, ctx.founder)
  modified_level = APPLY_STATE_ADJUSTMENT(modified_level, ctx.cse_state)
  ENFORCE_DENSITY_LIMIT(modified_level)
  RETURN modified_level
```

---

## 11. SYSTEM GUARANTEE

Este motor garante:
- Social DM nunca soa institucional
- Eventos soam poderosos
- Core soa premium
- Digital soa pratico
- Founders mantem coerencia de identidade
- Simbolismo de marca aparece apenas onde e estruturalmente adequado

---

## 12. INTEGRATION POSITION

Posicao no pipeline:

```
INPUT
  → CSE_ENGINE
  → REVENUE_RESOLUTION
  → TVE
  → FIP (se aplicavel)
  → BLDE  ← AQUI
  → BEG
  → INTERLOCUTOR
  → OUTPUT
```

---

DEPLOYMENT_READY: TRUE
STRUCTURE_STABLE: TRUE
