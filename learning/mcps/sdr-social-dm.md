# MCP: SDR Social DM
# DOCUMENT_ID: ELUCI_SKILL_SDR_SOCIAL_DM
# TRIGGER: operador digita "sdrsocialdm" ou "sdr social dm" ou "social dm"
# OUTPUT: copy TP1 personalizada ao perfil do lead + contexto da conta operada

---

## DEFINICAO

Skill de geração de copy para Social DM.
Quando acionada, abre dois campos de input:
1. @ do Instagram do lead
2. Qual conta o SDR está operando (Founder ou Institucional)

O sistema pesquisa o perfil do Instagram do lead (público ou privado),
infere persona, setor e ângulo de abordagem, e entrega a copy do TP atual
no tom correto da conta operada.

Quando o lead responde e o SDR cola a resposta: o sistema detecta
continuidade automática, avança o CQL_STATE e entrega a próxima copy
sem precisar reabrir a skill.

---

## GATILHO

```
INPUT ACEITO:
  - "sdrsocialdm"
  - "sdr social dm"
  - "social dm"
  - "abre social dm"
  - "nova dm"

ACAO IMEDIATA: abrir dois campos de input (@ + conta)
NAO gerar copy antes dos campos serem preenchidos.
```

---

## ETAPA 1 — CAMPOS DE INPUT

O sistema abre dois campos estruturados via `request_user_input` imediatamente ao detectar o gatilho.
Após o preenchimento, NENHUM campo adicional é aberto — o SDR cola texto livre e o sistema infere tudo.

### Chamada `request_user_input` — Campo ① @ do lead

```json
{
  "inputId": "sdrsocialdm-handle",
  "title": "Social DM — Lead",
  "questions": [
    {
      "id": "handle",
      "type": "text",
      "label": "@ do lead no Instagram",
      "placeholder": "@ricardosousa.ceo",
      "required": true
    }
  ]
}
```

Regras de normalização do handle recebido:
- Aceitar com ou sem o `@`
- Aceitar URL completa (`instagram.com/handle`) → extrair apenas o handle
- Remover trailing slash, query params
- Normalizar: `handle` em lowercase sem `@`

### Chamada `request_user_input` — Campo ② Conta operada

```json
{
  "inputId": "sdrsocialdm-conta",
  "title": "Social DM — Conta",
  "questions": [
    {
      "id": "conta",
      "type": "select",
      "label": "Qual conta você está operando?",
      "options": [
        { "value": "tallis", "label": "Tallis Gomes" },
        { "value": "nardon", "label": "Bruno Nardon" },
        { "value": "alfredo", "label": "Alfredo Soares" }
      ],
      "required": true
    }
  ]
}
```

Se o SDR precisar de G4 Scale, G4 Educação ou Outra, o sistema aceita como texto livre logo após (sem novo campo estruturado).
Mapeamento de fallback: qualquer resposta não mapeada → `SDR_PADRAO`.

**Mapeamento de conta → tom:**

| Conta | Tom Aplicado | Características |
|---|---|---|
| Tallis Gomes | TALLIS MODE | Caixa baixa, sem ponto final, frases < 10 palavras, provocador |
| Bruno Nardon | NARDON MODE | Português correto, analítico, racional, causa-efeito |
| Alfredo Soares | ALFREDO MODE | Alta energia, pragmático, foco em vendas e execução |
| G4 Scale | SCALE MODE | Tom institucional leve, foco em escala e resultado |
| G4 Educação | G4_EDU MODE | Tom consultivo, metodologia, transformação empresarial |
| Outra | SDR_PADRAO | Português correto, tom de especialista, sem buzzword |

---

## ETAPA 2 — PESQUISA DO PERFIL INSTAGRAM

Após campos preenchidos, o sistema tenta pesquisar o @ do lead.

### CENÁRIO A — Perfil público indexado

Buscar via web search pelo handle + contexto:
- Nome completo provável
- Bio do perfil (cargo, empresa, setor)
- Posts recentes e temas recorrentes (gestão, crescimento, produto, team)
- Número de seguidores (proxy de influência)
- Localização (se disponível)
- Empresa/marca associada ao perfil

**Parsing de inferência:**

| Sinal no perfil | Inferência |
|---|---|
| Bio menciona "CEO", "Fundador", "Sócio" | Persona provável: Titan ou Builder |
| Bio menciona "Diretor", "Head", "VP" | Persona provável: Executor |
| Número de seguidores > 10k | Perfil de influência — atenção ao Black Box |
| Posts sobre gestão/time/cultura | Dor mapeável: operação/pessoas |
| Posts sobre vendas/crescimento/receita | Dor mapeável: comercial/escala |
| Posts sobre produto/inovação/tech | Dor mapeável: estrutura/escala tech |
| Empresa identificada | Cruzar com Databricks se disponível |
| Localização identificada | Ajustar referências locais na copy |

**Output de inteligência (backstage):**

```
[ELUCY — INTELIGÊNCIA DO PERFIL]
Handle:          @[HANDLE]
Nome provável:   [NOME ou NAO ENCONTRADO]
Cargo/empresa:   [BIO EXTRAÍDA ou NAO ENCONTRADO]
Setor:           [INFERIDO ou NAO DETECTADO]
Tier estimado:   [1A / 1B / 2 / INDEFINIDO]
Persona:         [Titan / Builder / Executor / INDEFINIDO]
Dor mapeável:    [ANGULO_PRINCIPAL ou NAO DETECTADO]
CQL Status:      CQL_NONE → iniciar TP1
```

### CENÁRIO B — Perfil privado ou não encontrado

Sistema não aborta. Ativa modo de coleta mínima:

```
[ELUCY — perfil privado ou não indexado]
Sem dados públicos disponíveis.

Para calibrar a copy, me diz o que você sabe:
(pode deixar em branco o que não souber)

① O que você sabe sobre ele? (cargo, empresa, setor)
② Como ele chegou até a DM? (curtiu post, comentou, seguiu a conta)
③ Faturamento estimado? (se souber)
```

SDR responde em texto livre → sistema extrai o que for acionável e gera a copy.

**Se SDR não souber nada:** gerar copy genérica de alta conversão para o tom da conta, sem personalização de perfil.

---

## ETAPA 3 — DETECCAO AUTOMATICA DE TP E CONTINUIDADE

### Princípio: inferência total, zero pergunta ao SDR

O sistema NUNCA pergunta em qual TP está, NUNCA pede para o SDR classificar a resposta.
O SDR cola qualquer coisa — resposta do lead, trecho de conversa, print descrito em texto —
e o sistema lê, infere, decide e entrega a próxima copy.

### Lógica de inferência da resposta do lead

O sistema lê o conteúdo colado e classifica em uma única passagem:

```
PASSO 1 — É continuidade ou primeira DM?
  SE o input contém texto que parece uma resposta (frase, emoji com contexto, pergunta):
    → É CONTINUIDADE. Processar como resposta do lead.
  SE o input é apenas o @ e a conta (campos iniciais):
    → É PRIMEIRA DM. CQL_STATE = CQL_NONE → TP1.

PASSO 2 — Calcular Delta da resposta
  Δ > 0: lead revelou empresa, cargo, faturamento, dor, critical event, ou fez pergunta substantiva
  Δ = 0: lead respondeu "ok", emoji solto, "interessante", "manda mais info", monossilabo
  Δ < 0: lead recuou ("não tenho interesse", "me tira da lista"), foi hostil, ou sumiu após resposta positiva

PASSO 3 — Avançar CQL_STATE
  CQL_NONE + qualquer resposta do lead            → CQL_INITIATED
  CQL_INITIATED + Δ > 0 (revelou contexto)        → CQL_DEEPENED
  CQL_INITIATED + Δ = 0 (resposta vaga)           → manter CQL_INITIATED (nova TP1 com ângulo diferente)
  CQL_DEEPENED + Δ > 0 (aprofundou dor)           → CQL_REFRAMED
  CQL_REFRAMED + Δ > 0 (tensão positiva confirmada) → CQL_CONVERTED
  Qualquer estado + Δ < 0                         → CQL_STALLED ou CQL_KILLED (ver abaixo)
  Silêncio > 48h mencionado pelo SDR              → CQL_STALLED → TP5

PASSO 4 — Kill switches automáticos (sem exceção)
  Lead perguntou preço / "quanto custa" / "qual o valor"  → CQL_KILLED
  Lead pediu link, material, proposta, site               → CQL_KILLED
  Lead foi hostil ou pediu para parar contato             → CQL_KILLED
  Perfil I/J / MEI / faturamento < R$500k confirmado      → CQL_KILLED + flag TIER_INADEQUADO
```

### Mapeamento CQL_STATE → TP entregue

| CQL_STATE | TP Gerado | Objetivo da copy |
|---|---|---|
| CQL_NONE | TP1 | Provocar resposta. Sem produto, sem CTA. |
| CQL_INITIATED (Δ=0) | TP1 novo ângulo | Novo gancho. Não repetir o anterior. |
| CQL_INITIATED (Δ>0) | TP2 | Aprofundar dor. Pergunta de impacto. |
| CQL_DEEPENED | TP2→TP3 | Espelhar dor + tensão. Nunca propor solução. |
| CQL_REFRAMED | TP3→TP4 | Reframe + custo de inação. CTA emergindo. |
| CQL_CONVERTED | TP4 | CTA imperativo. "manda teu zap" ou meet aberto. |
| CQL_STALLED | TP5 | Novo ângulo. Fear trigger. Máx 2 tentativas. |
| CQL_KILLED | — | Encerrar. Zero copy. Mostrar motivo ao SDR. |

### Detecção de CQL_KILLED

```
TRIGGERS DE KILL (avaliar no conteúdo colado pelo SDR):
  - "quanto custa", "qual o valor", "tem desconto", "qual o preço" → KILL imediato
  - "manda o link", "manda o site", "manda material", "quero a proposta" → KILL imediato
  - "não tenho interesse", "me tira", "para de me mandar mensagem" → KILL imediato
  - Insulto ou hostilidade explícita → KILL imediato
  - SDR informa: "é MEI", "fatura menos de 500k", "é pessoa física" → KILL + TIER_INADEQUADO

OUTPUT quando KILLED:
  [ELUCY — CQL_KILLED]
  Motivo: [razão detectada]
  Ação: encerrar esta conversa. Não enviar mais nada neste perfil.
  [sem copy]
```

### Confirmação silenciosa de estado (backstage — sempre mostrar)

A cada resposta processada, o sistema exibe UMA linha de status antes da copy:

```
[@ | Conta | CQL: CQL_DEEPENED → CQL_REFRAMED | Δ>0 | TP3]
```

Isso aparece sempre — é o único feedback de estado visível ao SDR.
Zero pergunta de confirmação. O SDR vê o estado e a copy. Só isso.

---

## ETAPA 4 — GERADOR DE COPY POR TP E TOM

### TP1 — CURIOSIDADE (CQL_NONE → CQL_INITIATED)

**Tom TALLIS (Caixa baixa, sem ponto, < 10 palavras):**
```
[NOME_PRIMEIRO ou vazio se não souber]

[ANGULO_DA_DOR em forma de pergunta provocadora]
```

Exemplos por setor detectado:

| Setor | Copy Tallis |
|---|---|
| Construção civil | `empresa com 20 anos e ainda fecha contrato pessoalmente?` |
| Varejo / E-commerce | `faturando [FAIXA] e o time ainda depende de vc pra fechar?` |
| Serviços / Consultoria | `vc é gargalo na própria operação ou já resolveu isso?` |
| Indústria / Manufatura | `crescimento travou ou vc escolheu esse ritmo?` |
| Tech / SaaS | `churn subiu ou o problema é aquisição mesmo?` |
| Sem setor identificado | `operação depende de vc ou já roda sem vc?` |

**Tom NARDON (Português correto, analítico):**
```
[NOME_PRIMEIRO],

[INSIGHT sobre o setor/momento + pergunta de causa-efeito]
```

Exemplo:
```
Ricardo,

Empresas na sua faixa normalmente chegam a um ponto onde
o crescimento para de depender de mais esforço e passa a depender
de mais método.

Você está nesse ponto agora?
```

**Tom ALFREDO (Alta energia, direto):**
```
[NOME_PRIMEIRO]!

[AFIRMAÇÃO PROVOCADORA sobre o negócio + gancho de ação]
```

Exemplo:
```
Ricardo!

Operação de 8MM ainda rodando no improviso — isso custa caro todo mês.

O que tá travando mais: time ou processo?
```

**Tom G4 SCALE / G4 EDU (Consultivo):**
```
[NOME_PRIMEIRO], vi que você está à frente da [EMPRESA].

[OBSERVAÇÃO sobre o estágio da empresa + pergunta de diagnóstico]
```

---

### TP2 — DIAGNÓSTICO (CQL_DEEPENED)

Quando lead revelou empresa/cargo/dor mínima:

```
[tom da conta]

[ESPELHAMENTO da dor que o lead revelou]

[PERGUNTA DE IMPACTO — quanto isso custa?]
```

Regra: citar literalmente o que o lead disse (espelho). Nunca inventar.
Nunca propor solução. Objetivo: fazer o lead quantificar.

---

### TP3 — REFRAME (CQL_REFRAMED)

Quando lead aprofundou a dor:

```
[tom da conta]

[REFRAME: mostrar que o problema é maior/diferente do que o lead pensa]

[TENSÃO: o custo de não agir]
```

Regra: tom direto, sem suavizar. Tensão positiva, não agressiva.
Proibido mencionar produto, preço ou "o G4".

---

### TP4 — CONVERSÃO (CQL_CONVERTED → MQL)

Quando lead está engajado e com tensão positiva:

```
manda teu zap q o [NOME_SDR] te mostra o modelo

[ou para Tier 1 Elite:]
[NOME_PRIMEIRO] tá disponível agora? o [NOME_SDR] abre o meet em 5 min
```

Regras do TP4:
- CTA único e imperativo — sem opcionalidade
- Nunca "quando você tiver um tempinho"
- Tier 1 Elite (Titan confirmado): Hot Handover — meet aberto, não agendamento assíncrono
- Tier 1B/2: WhatsApp primeiro, meet depois

---

### TP5 — REENGAJAMENTO (CQL_STALLED — silêncio > 48h)

```
[tom da conta]

[NOVO ÂNGULO — diferente da última mensagem enviada]
[FEAR TRIGGER ou PROVA SOCIAL nova]
```

Regra: nunca repetir o mesmo ângulo que gerou o silêncio.
Máximo 2 tentativas de TP5. Se não responder: Silence Protocol (encerrar sem mensagem final).

---

## ETAPA 5 — OUTPUT COMPLETO

### Formato quando perfil encontrado (Cenário A):

```
[ELUCY — Social DM | @[HANDLE] | Conta: [CONTA] | TP1]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[INTELIGÊNCIA DO PERFIL]
Nome provável:   [NOME]
Bio detectada:   "[BIO]"
Setor:           [SETOR]
Tier estimado:   [TIER]
Dor mapeável:    [ANGULO]
CQL Status:      CQL_NONE → TP1

[ESTRATÉGIA]
Tom:             [TOM DA CONTA]
Ângulo:          [JUSTIFICATIVA EM 1 LINHA]
BLOQUEADO:       CTA, produto, preço, link

[COPY SUGERIDA — colar na DM]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[copy pronta no tom correto]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[copiar mensagem]

Cole aqui a resposta do lead quando chegar.
```

### Formato quando perfil privado (Cenário B) + SDR forneceu contexto mínimo:

```
[ELUCY — Social DM | @[HANDLE] | Conta: [CONTA] | TP1]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[INTELIGÊNCIA DO PERFIL]
Perfil privado — dados baseados no que você informou.
Cargo/setor:     [DO QUE SDR DISSE]
CQL Status:      CQL_NONE → TP1

[COPY SUGERIDA — colar na DM]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[copy calibrada com o contexto fornecido]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[copiar mensagem]

Cole aqui a resposta do lead quando chegar.
```

### Formato de continuidade (lead respondeu — SDR colou a resposta):

REGRA: zero campos estruturados. SDR cola texto livre. Sistema infere tudo.
Output é UMA linha de status + copy. Sem bloco de análise, sem confirmação.

```
[@handle | Conta | CQL: [ESTADO_ANTERIOR] → [NOVO_ESTADO] | Δ[+/0/-] | TP[N]]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[copy pronta no tom correto — colar na DM]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Exemplos reais:

```
@ricardosousa.ceo | Tallis | CQL: CQL_INITIATED → CQL_DEEPENED | Δ+ | TP2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
operação rodando 100% em cima de você ainda?

se o time travou, quanto isso custa por mês?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

```
@ricardosousa.ceo | Tallis | CQL: CQL_DEEPENED → CQL_REFRAMED | Δ+ | TP3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
o problema não é o time

é que vc ainda não tem o sistema que faz o time funcionar sem vc

isso existe. e empresas no teu tamanho já rodando com ele
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

```
@ricardosousa.ceo | Tallis | CQL: CQL_REFRAMED → CQL_CONVERTED | Δ+ | TP4
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
manda teu zap q o Nathan te mostra o modelo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Quando CQL_KILLED:
```
@handle | CQL_KILLED — [motivo em 1 linha]
[sem copy]
```

---

## ETAPA 6 — INTEGRAÇÃO COM CRM (PÓS-CONVERSÃO)

Quando `CQL_STATE = CQL_CONVERTED` (lead aceitou ir para WhatsApp/Call):

```
[ELUCY — CQL CONVERTIDO → MQL]

Lead moveu para WhatsApp. Registrar como MQL no CRM?

① deal_id (se já existir no pipeline):  [campo]
② Criar novo deal:                      [sim / não]

Se criar novo deal, registrar:
- Canal: Social DM [CONTA]
- Qualificador: [OPERADOR_EMAIL]
- Fase inicial: Dia 1 Conectado
- Dor capturada: [RESUMO DO QUE O LEAD REVELOU]
```

---

## REGRAS GERAIS DA SKILL

```
REGRA 1: Nunca vender produto na DM
  PROIBIDO em qualquer TP: citar G4, Imersão, Club, preço, link de produto
  PROIBIDO: "você conhece o G4?", "temos um programa", "nossa metodologia"
  O produto NÃO existe na DM — só a conversa existe

REGRA 2: Uma mensagem por vez
  Sistema entrega SEMPRE uma única copy
  Nunca duas opções de mensagem (exceto divergência de TP — ver eluci-core.md)
  SDR escolhe quando enviar — sistema não pressiona

REGRA 3: Black Box absoluto na copy
  Nunca vazar: SPICED, CSE, Challenger, CQL, MQL, TP, Tier, ICP, DQI
  Termos internos ficam no backstage — jamais na copy

REGRA 4: Perfil Tóxico → CQL_KILLED imediato
  Empreendedor de Palco detectado (muita exposição, sem empresa real)
  Anti-método detectado ("não acredito em consultoria")
  MEI / Faturamento < R$500k confirmado
  Ação: encerrar sem copy. Log: motivo_killed = [razão]

REGRA 5: Silêncio estratégico
  Após TP3 com Titan: NÃO enviar follow-up antes de 24h
  SDR que cola "ele não respondeu" antes de 24h → sistema aplica wait
  Output: "aguarda. silêncio pós-reframe é processamento. manda amanhã."

REGRA 6: Continuidade de sessão
  Enquanto SDR está na mesma sessão com o mesmo @: sistema lembra o histórico
  Não precisa re-explicar o contexto a cada mensagem
  Se SDR iniciar nova sessão: sistema pede o @ para recarregar contexto
```

---

## MODOS DE TOM — REFERÊNCIA RÁPIDA

| Conta | Saudação | Estrutura | Comprimento | Pontuação |
|---|---|---|---|---|
| Tallis | primeiro nome sem vírgula | frase provocadora nua | 1-2 linhas | zero ponto final |
| Nardon | Nome + vírgula | observação + pergunta | 2-4 linhas | pontuação normal |
| Alfredo | Nome + exclamação | afirmação + gancho | 2-3 linhas | ponto final + energia |
| G4 Scale | Nome + vírgula | observação institucional leve | 2-3 linhas | pontuação normal |
| G4 Educação | Nome + vírgula | consultivo + pergunta | 2-4 linhas | pontuação normal |

---

## SKILLS QUE INTEGRAM

| Skill | Integração |
|---|---|
| `eluci-core.md` MODO A | Esta skill implementa o MODO A em detalhe |
| `signals.md` sinal #11 | CQL_STATE rastreado aqui é o mesmo do sinal CQL_STATE |
| `conversion.md` | Fluxo CQL→MQL detalhado em conversion.md |
| `sdr-comecar-dia.md` | Leads de Social DM aparecem na tabela do dia (canal = Social DM) |
| `iron-dome.md` | Validar perfil tóxico antes de gerar copy |
| `hot-handoff.md` | Quando CQL_CONVERTED + Tier 1 → acionar hot handover |
| `NOTE_MODE` | Após conversão, SDR pode digitar "nota" → DATA_CONTRACT_001 |
