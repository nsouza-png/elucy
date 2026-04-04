# MECE Intelligence Engine — Organizacao Contextual de Dados do Deal

> DOC_ID: MECE_001
> Versao: 1.0
> Ultima atualizacao: 2026-04-03

---

## PROPOSITO

Antes de gerar QUALQUER copy ou output FRONTSTAGE, o sistema DEVE organizar todos os dados disponiveis do deal em uma estrutura MECE (Mutuamente Exclusivo, Coletivamente Exaustivo). Isso garante:

1. **Zero desperdicio** — cada dado e usado exatamente uma vez
2. **Zero lacuna** — nenhuma dimensao relevante fica sem cobertura
3. **Inferencias explicitas** — dados derivados (ex: DDD → localizacao) sao declarados como inferencia, nao como fato
4. **Profundidade consultiva** — copy gerada com inteligencia de negocio, nao generica

---

## ARVORE MECE — 8 DIMENSOES EXCLUSIVAS

Cada deal DEVE ser decomposto nestas 8 dimensoes. Nenhum dado pode pertencer a mais de uma dimensao. Todas devem ser preenchidas (mesmo que com "NAO DISPONIVEL").

### D1. IDENTIDADE DO LEAD
> Quem e esta pessoa?

| Campo | Fonte | Tipo |
|-------|-------|------|
| `contact_name` / `nome` | persons_overview | Fato |
| `email` | funil_comercial | Fato |
| `cargo` | funil_comercial | Fato |
| `p_instagram` | deals (Supabase) | Fato |
| `p_telefone` / `telefone` | persons_overview / deals | Fato |
| **DDD inferido** | Extrair de `p_telefone` | **Inferencia** |
| **Localizacao estimada** | DDD → cidade/estado | **Inferencia** |
| **Fuso horario** | Localizacao → timezone | **Inferencia** |

**Regras de inferencia DDD:**
```
EXTRAIR DDD do telefone (2 digitos apos +55):
  11 → Sao Paulo capital/GR SP
  21 → Rio de Janeiro capital/GR RJ
  31 → Belo Horizonte/GR BH
  41 → Curitiba/GR Curitiba
  51 → Porto Alegre/GR POA
  61 → Brasilia/DF
  71 → Salvador/GR Salvador
  81 → Recife/GR Recife
  85 → Fortaleza/GR Fortaleza
  92 → Manaus/GR Manaus
  ... (tabela completa de DDDs brasileiros)

SE DDD nao disponivel → marcar localizacao = "NAO DISPONIVEL"
NUNCA inventar localizacao sem evidencia
```

**Uso na copy:**
- Adaptar referencias culturais regionais (ex: "aqui no sul" se DDD 41/51)
- Ajustar horarios de contato ao fuso (ex: DDD 92 = GMT-4)
- Identificar proximidade a eventos G4 presenciais

---

### D2. EMPRESA E PORTE
> Que empresa e e qual o tamanho?

| Campo | Fonte | Tipo |
|-------|-------|------|
| `nome_do_negocio` | funil_comercial | Fato |
| `faixa_de_faturamento` | funil_comercial | Fato |
| `faixa_de_funcionarios` | funil_comercial | Fato |
| `p_segmento` | deals (Supabase) | Fato |
| `tier_da_oportunidade` | funil_comercial | Fato |
| **Porte inferido** | faturamento + funcionarios | **Inferencia** |
| **Maturidade estimada** | segmento + porte + cargo | **Inferencia** |

**Regras de inferencia porte:**
```
SE faixa_de_faturamento:
  "Ate 1MM" ou "1MM a 5MM" → PME
  "5MM a 10MM" → Mid-Market
  "10MM a 50MM" → Upper Mid-Market
  "50MM+" → Enterprise

SE faixa_de_faturamento = NULL:
  TENTAR inferir de tier_da_oportunidade:
    diamond → provavel Enterprise/Upper Mid
    gold → provavel Mid-Market
    silver → provavel PME grande
    bronze → provavel PME

SE ambos NULL → "PORTE NAO DISPONIVEL"
```

**Uso na copy:**
- PME: focar em crescimento, escala, "sair do operacional"
- Mid-Market: focar em profissionalizacao, gestao, processos
- Enterprise: focar em inovacao, benchmark, vantagem competitiva
- Ajustar linguagem (PME = mais direto / Enterprise = mais consultivo)

---

### D3. HISTORICO COMERCIAL
> Qual a relacao previa com o G4?

| Campo | Fonte | Tipo |
|-------|-------|------|
| `p_negociacoes_ganhas` | deals (Supabase) | Fato |
| `p_receita_total` | deals (Supabase) | Fato |
| `p_primeiro_produto` | deals (Supabase) | Fato |
| `p_ultimo_produto` | deals (Supabase) | Fato |
| `p_produtos_comprados` | deals (Supabase) | Fato |
| `p_data_primeira_compra` | deals (Supabase) | Fato |
| `p_data_ultima_compra` | deals (Supabase) | Fato |
| `p_comprou_scale` | deals (Supabase) | Fato |
| `p_comprou_club` | deals (Supabase) | Fato |
| `p_pa_cliente` | deals (Supabase) | Fato |
| `p_cluster_rfm` | deals (Supabase) | Fato |
| **Jornada inferida** | produtos + datas | **Inferencia** |
| **Lifetime Value** | receita_total + recencia | **Inferencia** |

**Classificacao MECE de relacionamento:**
```
SE p_negociacoes_ganhas = 0 ou NULL → NOVO (first-time buyer)
SE p_negociacoes_ganhas = 1 → RETORNO (second purchase)
SE p_negociacoes_ganhas >= 2 → RECORRENTE (multi-buyer)
SE p_pa_cliente = true → PA_CLIENTE (privilegiado)

NUNCA misturar: um lead e EXATAMENTE UMA dessas categorias
```

**Uso na copy:**
- NOVO: zero referencia a experiencias passadas, focar em "primeira vez"
- RETORNO: referenciar produto anterior SEM nomear ("na sua ultima experiencia com o G4...")
- RECORRENTE: tratar como insider, linguagem de comunidade
- PA_CLIENTE: tom de exclusividade, acesso privilegiado

---

### D4. DEAL ATUAL
> O que esta sendo negociado agora?

| Campo | Fonte | Tipo |
|-------|-------|------|
| `deal_id` | funil_comercial | Fato |
| `linha_de_receita_vigente` | funil_comercial | Fato |
| `grupo_de_receita` | funil_comercial | Fato |
| `revenue` | funil_comercial | Fato |
| `valor_da_oportunidade` | funil_comercial | Fato |
| `status_do_deal` | funil_comercial | Fato |
| `created_at` | funil_comercial | Fato |
| `nome_do_evento` | funil_comercial | Fato |
| `tipo_de_evento` | funil_comercial | Fato |
| `selfbooking` | funil_comercial | Fato |
| `motivo_lost` | funil_comercial | Fato |
| `_revLine` | enrichDealContext | Derivado |
| `_oppValue` / `_oppBreakdown` | enrichDealContext | Derivado |

**REGRA:** Esta dimensao trata APENAS do deal corrente. Historico vai em D3.

---

### D5. POSICAO NO FUNIL
> Onde o deal esta no processo?

| Campo | Fonte | Tipo |
|-------|-------|------|
| `fase_atual_no_processo` | funil_comercial | Fato (D2 taxonomia) |
| `etapa_atual_no_pipeline` | funil_comercial | Fato (D1 taxonomia) |
| `fase_anterior_no_processo` | funil_comercial | Fato |
| `delta_t` | funil_comercial | Fato |
| `event_skipped` | funil_comercial | Fato |
| `_aging` / `aging_band` | deal_runtime | Derivado |
| `_timeline` | enrichDealContext | Derivado |
| `_advanceState` | enrichDealContext | Derivado |
| `current_stage_order` | deal_runtime | Derivado |
| `dt_sal_conectado` | deal_runtime | Derivado |
| `dt_conectado_agendado` | deal_runtime | Derivado |
| `dt_agendado_opp` | deal_runtime | Derivado |
| `dt_opp_negociacao` | deal_runtime | Derivado |
| `velocity_score` | deal_runtime | Derivado |
| `stall_flag` | deal_runtime | Derivado |

**REGRA:** NUNCA misturar D1 (etapa operacional) com D2 (fase de qualificacao). Ver g4-revops-blueprint.md.

---

### D6. CANAL E ORIGEM
> Como este lead chegou?

| Campo | Fonte | Tipo |
|-------|-------|------|
| `canal_de_marketing` | funil_comercial | Fato (D5 taxonomia) |
| `utm_source` | funil_comercial | Fato |
| `utm_medium` | funil_comercial | Fato |
| `utm_campaign` | funil_comercial | Fato |
| `origem_do_deal` | funil_comercial | Fato |
| `origem_da_receita` | funil_comercial | Fato |
| `perfil` | funil_comercial | Fato |
| `tipo_de_conversao` | funil_comercial | Fato |
| `_channelConversion` | enrichDealContext | Derivado |
| **Canal real inferido** | utm_medium → founder routing | **Inferencia** |

**Regras de inferencia canal:**
```
SE utm_medium contém "tallis" → FOUNDER_TALLIS
SE utm_medium contém "nardon" → FOUNDER_NARDON
SE utm_medium contém "alfredo" → FOUNDER_ALFREDO
SE canal_de_marketing = "Social Media" + utm contem founder → SOCIAL_FOUNDER
SE canal_de_marketing = "Paid Media" → PAID (ajustar tom: mais direto)
SE canal_de_marketing = "Organico" → ORGANIC (lead ja pesquisou, mais informado)
SE canal_de_marketing = "MGM" → REFERRAL (mencionar comunidade)
SE canal_de_marketing = "Eventos" → EVENT (referenciar experiencia presencial)
```

**Uso na copy:**
- PAID: lead frio, precisa de mais contexto
- ORGANIC: lead informado, ir direto ao ponto
- REFERRAL: alavancar prova social
- EVENT: referenciar a experiencia
- FOUNDER: aplicar FIP (Founder Identity Protocol)

---

### D7. INTELIGENCIA OPERACIONAL
> O que o sistema ja calculou?

| Campo | Fonte | Tipo |
|-------|-------|------|
| `_persona` | enrichDealContext | Derivado |
| `_framework` | enrichDealContext | Derivado |
| `_nextAction` | enrichDealContext | Derivado |
| `_signal` | enrichDealContext | Derivado |
| `_urgency` | enrichDealContext | Derivado |
| `_forecastV6` | forecast_runtime | Derivado |
| `_spinAudit` | enrichDealContext | Derivado |
| `_objections` | enrichDealContext | Derivado |
| `_enterpriseScore` | enrichDealContext | Derivado |
| `_trustedAdvisor` | enrichDealContext | Derivado |
| `_gtmMisaligned` | enrichDealContext | Derivado |
| `_bowtieLeg` | enrichDealContext | Derivado |
| `_frameworkCompliance` | enrichDealContext | Derivado |
| `_contextConfidence` | enrichDealContext | Derivado |
| `temperature_score` | deal_runtime | Derivado |
| `priority_score` | deal_runtime | Derivado |
| `risk_state` | deal_runtime | Derivado |
| `signal_state` | deal_runtime | Derivado |
| Forecast breakdown | forecast_runtime | Derivado |
| Signal scores | deal_signal_runtime | Derivado |
| Framework coverage | deal_framework_runtime | Derivado |
| Note quality | note_analysis | Derivado |

**REGRA:** Estes dados sao BACKSTAGE — informam a decisao do sistema mas NUNCA aparecem na copy FRONTSTAGE.

---

### D8. CONTEXTO DE MERCADO (INFERIDO)
> O que podemos inferir sobre o mercado deste lead?

Esta dimensao e 100% inferida. Usa dados de D1-D7 para construir um micro plano de negocio contextual.

**Motor de inferencia:**
```
DADO: localizacao (D1) + segmento (D2) + porte (D2) + produto (D4) + canal (D6)

INFERIR:
  1. MERCADO_LOCAL
     - DDD → estado → PIB estadual relativo
     - DDD → estado → verticais dominantes (ex: SP=servicos, RS=agro+industria, MG=mineracao+agro)
     - Segmento + estado → concorrencia estimada (alta/media/baixa)

  2. DOR_PROVAVEL
     - Porte PME + segmento servicos → "dificuldade de escalar sem perder qualidade"
     - Porte Mid + segmento industria → "profissionalizar gestao para proximo patamar"
     - Porte Enterprise + qualquer → "inovacao e benchmark com pares"
     - Cargo C-level + PME → "preso no operacional"
     - Cargo gerente + Mid → "precisa de autonomia e metodo"

  3. PRODUTO_FIT
     - Mapear linha_de_receita_vigente para valor percebido por porte:
       Imersoes Presenciais + PME → "virada de chave, experiencia transformadora"
       Imersoes Presenciais + Enterprise → "networking C-level, benchmark"
       Online + PME → "acesso a metodologia sem deslocamento"
       Skills + qualquer → "capacitacao do time, multiplicar metodo"
       Consulting + Enterprise → "consultoria dedicada, resultado mensuravel"

  4. TIMING_MERCADO
     - Q1 (jan-mar): planejamento anual, orcamento aberto → urgencia alta
     - Q2 (abr-jun): execucao, meio do ano → urgencia media
     - Q3 (jul-set): revisao de metas, ajuste de rota → urgencia media-alta
     - Q4 (out-dez): fechamento, urgencia por resultado → urgencia maxima

  5. PLANO_DE_NEGOCIO_CONTEXTUAL
     Combinar 1-4 em um paragrafo de contexto que o LLM usa para
     calibrar profundidade e angulo da copy.

     Formato:
     "[LEAD] opera no segmento [SEGMENTO] em [LOCALIZACAO], mercado com
     [CONCORRENCIA]. Empresa de porte [PORTE] ([FATURAMENTO]) com
     [FUNCIONARIOS] funcionarios. Dor provavel: [DOR]. O [PRODUTO]
     atende esta dor via [VALOR_PERCEBIDO]. Timing: [TIMING]."
```

**IMPORTANTE:** Toda inferencia DEVE ser marcada com grau de confianca:
- **ALTA** — dado direto disponivel (ex: faixa_de_faturamento preenchida)
- **MEDIA** — inferencia de 1 grau (ex: DDD → cidade)
- **BAIXA** — inferencia de 2+ graus (ex: DDD → estado → vertical dominante)

**PROIBIDO:**
- Apresentar inferencia de confianca BAIXA como fato na copy
- Usar inferencia de mercado para fazer afirmacoes especificas sobre a empresa do lead
- Inventar dados nao disponveis (usar "NAO DISPONIVEL" e ajustar copy)

---

## PROTOCOLO DE EXECUCAO

### Passo 1: COLETAR
Extrair todos os campos disponiveis do `dealData` e `enrichDealContext`.

### Passo 2: CLASSIFICAR
Alocar cada campo em exatamente UMA das 8 dimensoes (D1-D8).
Se um campo parece caber em duas dimensoes → usar a dimensao PRIMARIA (mais especifica).

### Passo 3: PREENCHER LACUNAS
Para cada dimensao, verificar campos obrigatorios:
```
D1: OBRIGATORIO pelo menos nome OU email
D2: OBRIGATORIO pelo menos nome_do_negocio OU faixa_de_faturamento
D3: OPCIONAL (pode ser lead novo)
D4: OBRIGATORIO deal_id + linha_de_receita_vigente
D5: OBRIGATORIO fase_atual_no_processo + etapa_atual_no_pipeline
D6: OBRIGATORIO canal_de_marketing (minimo)
D7: AUTOMATICO (sempre preenchido pelo engine)
D8: INFERIDO (sempre gerado, com graus de confianca)
```

### Passo 4: INFERIR
Executar motor de inferencia D8 com dados de D1-D7.

### Passo 5: GERAR CONTEXTO MECE
Montar string de contexto organizada por dimensao:
```
=== CONTEXTO MECE DO DEAL [deal_id] ===

[D1] IDENTIDADE: [nome], [cargo], [localizacao_inferida] (confianca: [X])
[D2] EMPRESA: [empresa], [porte], [segmento], [faturamento]
[D3] HISTORICO: [classificacao] — [resumo]
[D4] DEAL: [produto], [valor], [status]
[D5] FUNIL: [fase] / [etapa], delta_t=[X]d, aging=[band]
[D6] CANAL: [canal_real], utm=[source/medium/campaign]
[D7] INTEL: persona=[X], framework=[X], signal=[X], forecast=[score]
[D8] MERCADO: [plano_contextual] (confianca geral: [X])
```

### Passo 6: VALIDAR MECE
Checklist automatico:
- [ ] Nenhum dado aparece em mais de uma dimensao?
- [ ] Todas as 8 dimensoes tem pelo menos 1 campo preenchido?
- [ ] Inferencias estao marcadas com grau de confianca?
- [ ] Dados BACKSTAGE (D7) nao vazam para copy FRONTSTAGE?

---

## INTEGRACAO COM PIPELINE

Este MCP e carregado no step `[14] GENERATE_BASE_RESPONSE`.
O LLM DEVE executar o protocolo MECE ANTES de redigir qualquer copy.

Ordem de execucao dentro do step 14:
1. Coletar dados brutos do deal_context
2. Executar protocolo MECE (passos 1-6)
3. Usar contexto MECE como base para gerar copy
4. Nunca gerar copy sem ter completado a organizacao MECE

---

## EXEMPLO DE APLICACAO

**Input:** Deal 12345, telefone (11) 99999-0000, segmento "Tecnologia", faixa "5MM a 10MM", cargo "CEO", produto "Imersao Presencial", canal "Paid Media"

**MECE gerado:**
```
[D1] IDENTIDADE: Joao Silva, CEO, Sao Paulo-SP (confianca: ALTA — DDD 11)
[D2] EMPRESA: TechCorp, Mid-Market, Tecnologia, 5-10MM
[D3] HISTORICO: NOVO (zero compras previas)
[D4] DEAL: Imersao Presencial, R$35k, Ativo
[D5] FUNIL: Conectado / Dia 03, delta_t=2d, aging=green
[D6] CANAL: PAID (Google Ads), sem founder routing
[D7] INTEL: persona=Builder, framework=SPICED, signal=NEUTRAL, forecast=0.42
[D8] MERCADO: CEO de tech mid-market em SP, mercado altamente competitivo.
     Dor provavel: profissionalizar gestao para proximo patamar.
     Imersao Presencial atende via networking C-level e benchmark.
     Timing: Q2 (urgencia media). Confianca geral: MEDIA.
```

**Copy gerada com MECE vs sem MECE:**

SEM MECE (generico):
> "Oi Joao, tudo bem? Vi que voce se interessou pela nossa imersao. E uma experiencia incrivel..."

COM MECE (contextual):
> "Joao, um CEO de tech nesse patamar de faturamento geralmente enfrenta o mesmo dilema: escalar sem perder o controle da operacao. A imersao coloca voce numa sala com fundadores que ja passaram por isso — nao e teoria, e benchmark real de quem fez."

---

## TABELA DDD → ESTADO (REFERENCIA)

```
11-19: SP | 21-24: RJ | 27-28: ES | 31-38: MG | 41-46: PR
47-49: SC | 51-55: RS | 61: DF | 62-64: GO | 65-66: MT
67: MS | 68-69: AC/RO | 71-77: BA | 79: SE | 81-87: PE/AL/PB/RN
85-88: CE/PI | 89: PI | 91-97: PA/AP/MA/AM/RR | 92: AM | 98-99: MA
```

Para mapeamento completo DDD → cidade, usar tabela ANATEL.
