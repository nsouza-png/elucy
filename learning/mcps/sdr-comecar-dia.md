# MCP: SDR Começar Dia
# DOCUMENT_ID: ELUCI_SKILL_SDR_DAY
# TRIGGER: operador digita "sdrcomeçardia" ou "sdr comecar dia" ou "comecar dia"
# OUTPUT: tabela de pipeline do dia + links WhatsApp com copy personalizada

---

## DEFINICAO

Skill de abertura de turno do SDR.
Quando acionada, busca todos os leads ativos do operador no pipeline,
classifica cada um pelo dia de follow-up (D1-D6), gera a estrategia do dia
e monta um link WhatsApp clicavel com a copy ja personalizada e codificada.

O SDR vai clicando nos links em sequencia e enviando. Zero digitacao manual.

---

## GATILHO

```
INPUT ACEITO:
  - "sdrcomeçardia"
  - "sdr comecar dia"
  - "comecar dia"
  - "pipeline do dia"
  - "meu dia"

ACAO IMEDIATA: executar query Databricks + montar tabela + gerar links
NAO perguntar nada antes de executar. Dados vem do Databricks pelo qualificador_name do operador.
```

---

## ETAPA 1 — RESOLUCAO DO OPERADOR (Email → Nome)

O sistema usa o **email do operador logado no G4 OS** como âncora de identidade.
Os campos no Databricks são `qualificador_name` e `proprietario_name` (texto, não email).
É necessário resolver o email para o nome antes de filtrar.

**PASSO 1A — Resolver nome a partir do email do operador:**

Coluna `qualificador_email` NÃO existe em `funil_comercial`. Usar SEMPRE o fallback por LIKE no qualificador_name:

```sql
-- Derivar nome do email (parte antes do @)
-- Ex: n.souza@g4educacao.com → EMAIL_USERNAME = 'n.souza' → busca por 'souza'
SELECT DISTINCT
  qualificador_name
FROM production.diamond.funil_comercial
WHERE LOWER(qualificador_name) LIKE LOWER('%${EMAIL_USERNAME}%')
  AND qualificador_name IS NOT NULL
LIMIT 1
```

Onde `${EMAIL_USERNAME}` = parte APÓS o ponto no prefixo do email.
Ex: `n.souza@g4educacao.com` → usar `'souza'` (não `'n.souza'`) para maior recall.

**PASSO 1B — Confirmar resolução:**
- Se nome resolvido com sucesso: usar `${OPERADOR_NAME_RESOLVED}` na query principal
- Se não resolvido: retornar `[ELUCY — não consegui identificar seu usuário no CRM. Qual é o seu nome completo como aparece no sistema?]`

---

## ETAPA 2 — QUERY PRINCIPAL DO PIPELINE

```sql
-- Pipeline ativo do SDR no dia
-- JOIN por g4_personal_account_id (chave real das duas tabelas)
-- telefone SOMENTE em persons_overview — NÃO existe em funil_comercial
-- fase = fase_atual_no_processo (nome real da coluna)
-- linha_de_receita_vigente = campo correto para revenue line (revenue é double numérico)
SELECT
  fc.deal_id,
  fc.fase_atual_no_processo,
  fc.delta_t,
  fc.tier_da_oportunidade,
  fc.qualificador_name,
  fc.proprietario_name,
  fc.linha_de_receita_vigente,
  fc.origem_da_receita,
  fc.event_skipped,
  fc.status_do_deal,
  fc.faixa_de_faturamento,
  fc.cargo,
  fc.email,
  po.nome,
  po.telefone,
  po.lista_telefones
FROM production.diamond.funil_comercial fc
LEFT JOIN production.diamond.persons_overview po
  ON fc.g4_personal_account_id = po.g4_personal_account_id
WHERE
  (
    LOWER(fc.qualificador_name) = LOWER('${OPERADOR_NAME_RESOLVED}')
    OR LOWER(fc.proprietario_name) = LOWER('${OPERADOR_NAME_RESOLVED}')
  )
  AND fc.fase_atual_no_processo IN (
    'Novo Lead',
    'Dia 1 Conectado',
    'Dia 2 Conectado',
    'Dia 3 Conectado',
    'Dia 4 Conectado',
    'Reagendamento',
    'Entrevista Agendada'
  )
  AND fc.status_do_deal NOT IN ('won', 'lost', 'disqualified')
ORDER BY
  CASE fc.fase_atual_no_processo
    WHEN 'Novo Lead'           THEN 1
    WHEN 'Dia 1 Conectado'     THEN 2
    WHEN 'Dia 2 Conectado'     THEN 3
    WHEN 'Dia 3 Conectado'     THEN 4
    WHEN 'Dia 4 Conectado'     THEN 5
    WHEN 'Reagendamento'       THEN 6
    WHEN 'Entrevista Agendada' THEN 7
  END ASC,
  fc.delta_t DESC
```

**Mapeamento de colunas reais (não alterar):**
- `fase_atual_no_processo` = nome real (NÃO `fase_atual`)
- `linha_de_receita_vigente` = campo string para revenue line (NÃO `revenue` — que é double numérico)
- `g4_personal_account_id` = chave de JOIN entre as duas tabelas (NÃO `person_id`)
- `po.nome` = nome da pessoa (NÃO `nome_completo`)
- `po.telefone` = campo de telefone (só existe em persons_overview, NUNCA em funil_comercial)
- `po.lista_telefones` = array de telefones alternativos (fallback se `telefone` nulo)

**Resolução do telefone para link WhatsApp:**
```
SE po.telefone NOT NULL → usar po.telefone
SE po.telefone NULL AND po.lista_telefones NOT NULL → usar lista_telefones[0]
SE ambos NULL → coluna mostra [SEM TELEFONE — atualizar CRM]
```

**Limpeza do número antes de montar o link:**
- Remover todos os caracteres não numéricos: `(`, `)`, ` `, `-`
- Prefixo `55` (Brasil) — verificar se já começa com 55 antes de adicionar
- Ex: `(51) 99900-0993` → `5551999000993`

**Regra de deduplicação:** se o mesmo deal aparecer como qualificador E proprietário → exibir uma única vez.
**Fallback se nome nulo:** usar `fc.email` como identificador na tabela.

---

## ETAPA 3 — MAPEAMENTO D1→D6

| Fase no Funil | Dia de Follow-up | Estado CSE Esperado | Framework |
|---|---|---|---|
| Novo Lead | D1 | COLD / AWARE | TP1 — Curiosidade pura |
| Dia 1 Conectado | D2 | CURIOUS | TP2 — Diagnóstico de dor |
| Dia 2 Conectado | D3 | CURIOUS / PROBLEM-AWARE | TP2→TP3 — Aprofundar |
| Dia 3 Conectado | D4 | PROBLEM-AWARE | TP3 — Reframe + tensão |
| Dia 4 Conectado | D5 | PROBLEM-AWARE / TENSIONED | TP4 — CTA direto |
| Reagendamento | D5* | TENSIONED / BLOCKED | TP4 + recuperação |
| Entrevista Agendada | D6 | ALIGNED | Confirmação + briefing |

**Regra delta_t:** se lead está na fase há mais dias do que o esperado → sinalizar como ATRASADO na tabela.
Threshold por fase:
- D1 (Novo Lead): > 1 dia → ATRASADO
- D2-D4: > 2 dias → ATRASADO
- D5 (Reagendamento): > 1 dia → CRÍTICO
- D6 (Entrevista Agendada): qualquer dia → CONFIRMAR HOJE

---

## ETAPA 4 — GERADOR DE COPY POR DIA E CANAL

### D1 — NOVO LEAD (TP1: Curiosidade)

**Canal WhatsApp / Inbound:**
```
[NOME_PRIMEIRO], vi que você comanda a [EMPRESA].

Empresários na faixa de [FATURAMENTO] que chegam até a gente geralmente
estão travando num ponto específico — o time não acompanha o ritmo do crescimento.

Esse cenário faz sentido pra você hoje?
```

**Canal Social DM (Tom Tallis):**
```
[NOME_PRIMEIRO]

empresa faturando [FATURAMENTO] e o time ainda n acompanha o ritmo

isso ta acontecendo com vcs?
```

**Canal Social DM (Tom Nardon):**
```
[NOME_PRIMEIRO], analisei o contexto da [EMPRESA].

Empresas na sua faixa de faturamento geralmente enfrentam um gargalo específico
de gestão nesse estágio. Faz sentido conversar sobre isso?
```

---

### D2 — DIA 1 CONECTADO (TP2: Diagnóstico)

```
[NOME_PRIMEIRO], você mencionou [DOR_IDENTIFICADA ou "que está num momento de crescimento"].

Uma coisa que a maioria dos empresários no seu estágio ainda não resolveu:
saber exatamente qual problema está custando mais caro agora.

Qual é o maior travamento que você sente na operação hoje?
```

---

### D3 — DIA 2 CONECTADO (TP2→TP3: Aprofundar impacto)

```
[NOME_PRIMEIRO], com o que você me contou —

Se esse problema continuar por mais 6 meses, o que acontece?
Estou perguntando porque o número muda tudo sobre o próximo passo.
```

---

### D4 — DIA 3 CONECTADO (TP3: Reframe + tensão)

```
[NOME_PRIMEIRO], empresários que passaram por esse travamento e não agiram
perderam em média [X]% de margem no ciclo seguinte.

O que torna isso urgente pra você agora — tem algum evento que muda o jogo
nos próximos 60-90 dias?
```

---

### D5 — DIA 4 CONECTADO (TP4: CTA direto)

```
[NOME_PRIMEIRO], com base no que você me contou,
a conversa com o [NOME_CLOSER] faz sentido agora.

São 30 minutos — ele vai te mostrar exatamente o que empresas
no seu tamanho estão fazendo diferente.

Essa semana funciona pra você?
```

---

### D5* — REAGENDAMENTO (Recuperação)

```
[NOME_PRIMEIRO], ficamos de falar e não conseguimos nos alinhar.

Vou ser direto: o cenário que você descreveu tem uma janela de oportunidade
que não fica aberta para sempre.

Vale um encontro rápido ainda essa semana?
```

---

### D6 — ENTREVISTA AGENDADA (Confirmação)

```
[NOME_PRIMEIRO], só confirmando nossa conversa de [DATA_HORA].

O [NOME_CLOSER] já reservou o tempo e vai estudar o cenário da [EMPRESA]
antes do encontro.

Até lá!
```

---

## ETAPA 5 — MONTAGEM DO LINK WHATSAPP

### Formato do link

```
https://api.whatsapp.com/send?phone=55[TELEFONE_LIMPO]&text=[COPY_ENCODED]
```

**Regras de montagem:**
- `TELEFONE_LIMPO`: remover todos os caracteres não numéricos do campo telefone do Databricks
  - Ex: `(19) 99535-3374` → `19995353374`
  - Prefixo: sempre `55` (Brasil)
  - Se telefone já começa com `55`: não duplicar
- `COPY_ENCODED`: aplicar URL encoding completo na copy gerada
  - Espaço → `%20`
  - Quebra de linha → `%0a`
  - Vírgula → `%2C`
  - Ponto final → `.` (manter)
  - Acentos: manter como UTF-8 encoded (`ã` → `%C3%A3`, `é` → `%C3%A9`, etc.)
- `NOME_PRIMEIRO`: primeiro token do campo `nome_completo` do Databricks
- `EMPRESA`: campo `empresa` do Databricks
- `FATURAMENTO`: mapear `faixa_de_faturamento` para linguagem humana:
  - `>10MM` → `acima de R$10MM`
  - `1M-10M` / `5M-10M` / `1M-5M` → `entre R$1MM e R$10MM`
  - `500k-1M` → `perto de R$1MM`
  - demais → omitir faixa, usar "empresas em crescimento"

### Exemplo de link montado

Lead: Renan | Telefone: (19) 99535-3374 | D2 | Canal: WhatsApp

Copy gerada:
```
Renan, você mencionou que está num momento de crescimento.

Uma coisa que a maioria dos empresários no seu estágio ainda não resolveu:
saber exatamente qual problema está custando mais caro agora.

Qual é o maior travamento que você sente na operação hoje?
```

Link final:
```
https://api.whatsapp.com/send?phone=5519995353374&text=Renan%2C%20voc%C3%AA%20mencionou%20que%20est%C3%A1%20num%20momento%20de%20crescimento.%0a%0aUma%20coisa%20que%20a%20maioria%20dos%20empres%C3%A1rios%20no%20seu%20est%C3%A1gio%20ainda%20n%C3%A3o%20resolveu%3A%0asaber%20exatamente%20qual%20problema%20est%C3%A1%20custando%20mais%20caro%20agora.%0a%0aQual%20%C3%A9%20o%20maior%20travamento%20que%20voc%C3%AA%20sente%20na%20opera%C3%A7%C3%A3o%20hoje%3F
```

---

## ETAPA 6 — FORMATO DE OUTPUT (TABELA DO DIA)

⚠ OBRIGATÓRIO: cada linha da tabela DEVE conter o link WhatsApp clicável na última coluna.
PROIBIDO substituir o link por blocos de copy separados.
PROIBIDO omitir a coluna WhatsApp.
O link é gerado conforme ETAPA 5. Se telefone ausente → coluna mostra `[SEM TELEFONE]`.

```
[ELUCY — PIPELINE DO DIA | {DATA} | SDR: {OPERADOR_NAME}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{N} leads ativos | {N_CRITICOS} ações críticas | {N_CALLS} calls hoje

| Lead | Etapa | Dia | Estratégia | WhatsApp |
|---|---|---|---|---|
| [NOME] · [CARGO] · [FAT] | [FASE_ATUAL] | D[N] | [ESTRATEGIA_1_LINHA] | [→ enviar agora](https://api.whatsapp.com/send?phone=55[TEL]&text=[COPY_ENCODED]) |
| ... | ... | ... | ... | ... |

CRÍTICOS (agir primeiro):
  ⚠ [NOME] — D5 · Reagendamento há {N} dias — risco de perda
  ⚠ [NOME] — Entrevista amanhã — confirmar hoje

BLOQUEADOS (sem telefone):
  ✗ [NOME] — telefone não cadastrado no CRM — atualizar antes de contatar
```

**Regras de ordenação:**
1. CRÍTICOS primeiro (ATRASADO + D5/D6)
2. Depois por dia crescente (D1 → D6)
3. Dentro do mesmo dia: maior tier primeiro (Tier 1A > 1B > 2)

**Link `[→ enviar agora]`:** link Markdown clicável com URL WhatsApp completa (Etapa 5).
Ao clicar: abre WhatsApp Web/App com número + mensagem pré-preenchida.
SDR só clica em enviar. Zero digitação manual.

KILL SWITCH: se o sistema gerou blocos de copy separados sem link → output inválido. Remontar com links.

---

## ETAPA 7 — ESTRATEGIA DO DIA (1 LINHA POR LEAD)

Gerar uma linha de estratégia contextualizada para cada lead.
Usar dados disponíveis do Databricks (dor registrada, canal, tier).

| Dia | Template de estratégia |
|---|---|
| D1 | `Primeiro contato — [TOM_CANAL]. Objetivo: provocar resposta, não vender.` |
| D2 | `Lead respondeu. Aprofundar dor com SPICED P→I. Não propor solução ainda.` |
| D3 | `Mapear impacto financeiro. Fazer lead quantificar o custo do problema.` |
| D4 | `Criar tensão positiva. Mostrar custo da inação. Buscar Critical Event.` |
| D5 | `CTA direto para reunião. Remover fricção. Não negociar — facilitar.` |
| D5* | `Lead sumiu. Reengajar com novo ângulo. Fear trigger + nova âncora de valor.` |
| D6 | `Call amanhã/hoje. Confirmar presença. Briefing SPICED pronto para o Closer.` |

Se `dor_identificada` disponível no CRM: incorporar na estratégia.
Ex: D3 com dor registrada → `"Mapear impacto do [DOR]. Quanto custa por mês não resolver?"`.

---

## REGRAS GERAIS DA SKILL

```
REGRA 1: Nunca gerar copy com produto/preço
  Dias D1-D4: PROIBIDO citar produto, valor, imersão, clube
  D5-D6: permitido apenas "conversa com o executivo" — nunca o produto pelo nome

REGRA 2: Tom automático por canal
  canal_de_origem = Instagram Tallis → Tom Tallis
  canal_de_origem = Instagram Nardon → Tom Nardon
  canal_de_origem = Instagram Alfredo → Tom Alfredo
  canal_de_origem = WhatsApp / Inbound / Form → Tom SDR padrão
  canal desconhecido → Tom SDR padrão

REGRA 3: Tier 2 (<R$1MM) na tabela
  Incluir na tabela mas marcar como [TIER 2]
  Copy gerada: redirecionar para produto de entrada, nunca imersão
  Flag visual na tabela: ⚠ TIER 2

REGRA 4: Limite de leads por tabela
  Máximo 20 leads por execução
  Se > 20: mostrar os 20 mais críticos + aviso "X leads adicionais — use /pipeline-completo"

REGRA 5: Dados sensíveis
  Nunca exibir CPF, CNPJ ou dados financeiros do lead na tabela
  Telefone: exibir apenas no link, nunca em texto plano na tabela

REGRA 6: Atualização pós-envio
  Após o SDR usar o link, o sistema NÃO atualiza automaticamente o CRM
  SDR deve registrar manualmente ou usar /nota para gerar a nota de qualificação
```

---

## ETAPA 8 — DRILL-DOWN POR DEAL_ID (dentro do SDR_DAY_MODE)

Após receber a tabela do dia, o SDR pode querer aprofundar um lead específico.
O campo deal_id aparece aqui como o mesmo COMPONENTE DEAL_ID canonico do sistema.

**Acionamento:**
- SDR digita qualquer numero inteiro enquanto a sessao SDR_DAY_MODE ainda esta ativa
- OU SDR digita "mais sobre [nome]" / "aprofunda esse" → sistema aciona COMPONENTE DEAL_ID

**Comportamento:**

```
PASSO 1: Acionar COMPONENTE DEAL_ID
  → inputId: "elucy-deal-id"
  → title: "Qual lead da tabela você quer aprofundar?"
  → campo: deal_id (inteiro)

PASSO 2: Resolver deal_id via Databricks
  → SELECT todos os campos de funil_comercial + persons_overview para o deal_id
  → Confirmar que pertence ao operador logado (seguranca: nao mostrar deals de outro SDR)

PASSO 3: Gerar BRIEF_MODE contextualizado para o dia
  → Mesmo output do BRIEF_MODE padrao (SPICED + CSE_STATE + proxima acao)
  → ADICIONAR: qual e o dia atual do lead (D1-D6), qual a estrategia do dia, copy especifica do dia
  → ADICIONAR: link WhatsApp gerado novamente (caso operador precisar reenviar)

PASSO 4: Retorno ao fluxo do dia
  → Apos o briefing, perguntar em texto simples: "Quer ver outro lead ou ja foi?"
  → Se responder sim/nome → acionar COMPONENTE DEAL_ID novamente
  → Se responder nao/ok → encerrar drill-down
```

**Diferenca do BRIEF_MODE padrao:**
O drill-down dentro do SDR_DAY_MODE entrega o briefing enriquecido com:
- Dia do follow-up (D1-D6) ja contextualizado
- Copy pronta para o dia (mesma da tabela, mas expandida)
- Link WhatsApp regerado
O BRIEF_MODE padrao entrega apenas o estado do deal e proxima acao.

---

## SKILLS QUE INTEGRAM

| Skill | Integração |
|---|---|
| `/nota` (NOTE_MODE) | Após contato, SDR cola a resposta e pede nota → DATA_CONTRACT_001 |
| `sinais-lead` | Para D4-D5, consultar sinais ativos antes de gerar copy |
| `hot-handoff` | Para D6, preparar briefing completo para o Closer |
| `iron-dome` | Validar leads Tier 2 antes de incluir na tabela |
| `HELP_MODE` | Se SDR digitar "ajuda" após ver a tabela → COMPONENTE DEAL_ID → briefing individual |
| `ETAPA 8 / Drill-Down` | SDR digita número inteiro ou "mais sobre X" → COMPONENTE DEAL_ID → BRIEF_MODE contextualizado com D1-D6 + link regenerado |

---

## ERROS E FALLBACKS

| Situação | Fallback |
|---|---|
| Databricks indisponível | BLOQUEIO TOTAL — ver protocolo abaixo |
| Lead sem telefone | Incluir na tabela com `[SEM TELEFONE — atualizar CRM]`, sem link |
| Lead sem nome | Usar nome da empresa como saudação |
| Canal desconhecido | Aplicar tom SDR padrão |
| Fase fora do mapeamento D1-D6 | Ignorar na tabela do dia. Usar /pipeline-completo para ver todos. |
| > 20 leads ativos | Truncar em 20 + aviso de overflow |

---

### PROTOCOLO DE BLOQUEIO — DATABRICKS INDISPONIVEL

**Esta skill DEPENDE EXCLUSIVAMENTE do Databricks.**
Quando o Databricks estiver offline ou nao estiver ativo na sessao:

```
KILL SWITCH ABSOLUTO:
  → NAO usar Google Calendar como substituto
  → NAO usar memória de sessão anterior
  → NAO inferir pipeline a partir de entrevistas do calendário
  → NAO improvsar com qualquer outra fonte
  → NAO gerar tabela parcial ou estimada

OUTPUT OBRIGATORIO (e unico):
  [ELUCY — Databricks offline]
  Não consigo carregar seu pipeline — a fonte de dados está fora do ar ou não está ativa nessa sessão.

  Para ativar: clique em "Sources" abaixo do input e ative o Databricks.
  Depois de ativar, repita: sdrcomeçardia

PROIBIDO qualquer output adicional alem desta mensagem.
PROIBIDO complementar com dados do Google Calendar, Gmail ou qualquer outra fonte.
```

**Razao desta regra:**
O pipeline do SDR existe apenas no Databricks (funil_comercial).
Google Calendar reflete entrevistas JA agendadas — nao o pipeline de leads a trabalhar.
Misturar as duas fontes gera confusao critica no operador e e pior do que nao entregar nada.
