# Produtos G4 - Camada Semantica Elucy v2

## Definicao

Este MCP contem o catalogo completo de produtos da G4 Educacao com regras de elegibilidade, roteamento e protecao do ecossistema. Toda recomendacao de produto deve respeitar as regras aqui definidas. Vender produto errado para perfil errado e violacao grave de governanca.

---

## ONTOLOGIA CANONICA — REVENUE & CHANNEL MAP

Esta e a tabela de verdade do sistema. Nao e descricao. Nao e exemplo. E lookup obrigatorio.

### REGRA DE GOVERNANCA (INVIOLAVEL)

Se o input do operador NAO declarar explicitamente o canal OU a linha de receita:

**O ELUCY NAO CLASSIFICA. NAO RECOMENDA. DEVOLVE ERRO OPERACIONAL.**

Resposta padrao do sistema:
```
[ELUCY — ERRO DE INPUT]
Canal ou linha de receita nao identificados.
Informe: canal de origem do lead OU linha de receita alvo.
Sem isso, qualquer recomendacao seria alucinacao.
```

Isso nao e falha do sistema. E educacao do operador e protecao da integridade dos dados.

---

### TABELA DE VERDADE — CANAL → LINHA DE RECEITA

| CANAL (input do operador) | LINHA_DE_RECEITA | TIPO | VENDA_DIRETA |
|---|---|---|---|
| Instagram Tallis | SOCIAL_DM | Aquisicao Founder-Led | NAO — converter em call |
| Instagram Nardon | SOCIAL_DM | Aquisicao Founder-Led | NAO — converter em call |
| Instagram Alfredo | SOCIAL_DM | Aquisicao Founder-Led | NAO — converter em call |
| Social DM | SOCIAL_DM | Aquisicao Founder-Led | NAO — converter em call |
| Social DM Perfil K | SOCIAL_DM | Aquisicao Founder-Led | NAO — converter em call |
| Meta / Facebook Ads | MIDIA_PAGA | Aquisicao Paga | SIM — qualificar e avançar |
| Google Ads | MIDIA_PAGA | Aquisicao Paga | SIM — qualificar e avançar |
| Midia Paga Frio | MIDIA_PAGA | Aquisicao Paga (fria) | NAO — nurturing primeiro |
| Midia Paga Morno | MIDIA_PAGA | Aquisicao Paga (morna) | SIM com qualificacao |
| Midia Paga Quente | MIDIA_PAGA | Aquisicao Paga (quente) | SIM — prioridade alta |
| Form G4 (Instagram/Facebook/Google) | INBOUND_FORM | Aquisicao Inbound | SIM — SDR prioridade |
| Form G4 K | INBOUND_FORM | Aquisicao Inbound (K) | SIM — SDR prioridade |
| Form G4 Incompleto | INBOUND_FORM | Aquisicao Inbound Parcial | NAO — completar qualificacao |
| Form Meta | INBOUND_FORM | Aquisicao Inbound Meta | SIM — qualificar |
| CRM WhatsApp | CRM_RELACIONAMENTO | Retencao / Reengajamento | SIM — contexto existente |
| CRM Email | CRM_RELACIONAMENTO | Retencao / Reengajamento | SIM — contexto existente |
| Chat | CRM_RELACIONAMENTO | Inbound Chat | SIM — qualificar |
| Reativacao | CRM_RELACIONAMENTO | Base Fria Reengajada | SIM com cuidado |
| Base Lost | CRM_RELACIONAMENTO | Oportunidade Perdida | SIM — nova abordagem |
| Site | INBOUND_ORGANICO | Aquisicao Organica | SIM — qualificar |
| Indicacao | INDICACAO | Aquisicao por Referral | SIM — prioridade alta |
| Aplicativo G4 | INBOUND_ORGANICO | Aquisicao Organica App | SIM — qualificar |
| Social organico | SOCIAL_ORGANICO | Aquisicao Organica | NAO — nurturing |
| Evento / G4 Valley / G4 Day | EVENTO | Aquisicao em Evento | SIM — qualificar pos-evento |
| Field Sales | FIELD_SALES | Upsell Presencial | SIM — contexto de imersao |
| Abandono de Carrinho | DIGITAL_ONLINE | Recuperacao Digital | SIM — urgencia |
| Chat Online | DIGITAL_ONLINE | Inbound Digital | SIM — qualificar |
| Self-Checkout | DIGITAL_ONLINE | Compra Autonoma | N/A — sem SDR |
| Outros / Nao definida | RUIDO_OPERACIONAL | Indefinido | NAO — investigar antes |

---

### TABELA DE VERDADE — LINHA DE RECEITA → PRODUTO PERMITIDO

| LINHA_DE_RECEITA | PRODUTOS PERMITIDOS | TIER MINIMO | OBJETIVO |
|---|---|---|---|
| SOCIAL_DM | Nenhum — apenas agendamento de call | Tier 1 preferencial | Converter em reuniao |
| MIDIA_PAGA | Qualquer produto do tier do lead | Tier 1, 2 ou 3 conforme fat. | Qualificar e vender |
| INBOUND_FORM | Qualquer produto do tier do lead | Tier 1, 2 ou 3 conforme fat. | Qualificar e vender |
| CRM_RELACIONAMENTO | Produto adequado ao historico | Tier do perfil ja cadastrado | Retenção / upsell |
| INDICACAO | Imersoes Presenciais preferencialmente | Tier 1 preferencial | Fechar rapido |
| EVENTO | Produto de entrada (Traction/Skills) | Tier 2/3 | Capturar e nutrir |
| FIELD_SALES | Imersoes / Club / Upsell | Tier 1 | Fechar no campo |
| DIGITAL_ONLINE | Traction / Skills / Formacoes | Tier 2/3 | Converter digital |
| RUIDO_OPERACIONAL | BLOQUEADO — nao operar | N/A | Investigar canal |

---

### SEPARACAO FUNDAMENTAL

**Revenue Line** = onde a receita entra (o produto vendido)
**Canal de Aquisicao** = como o lead chegou (nao e produto, nao gera receita direta)

Confundir os dois e erro operacional. Canal alimenta Revenue Line. Nao sao equivalentes.

---

## REVENUE LINE 1 — IMERSOES PRESENCIAIS (CORE / HIGH-TICKET)

**Regra de Tier:** BLOQUEADO para Tier 2 e Tier 3. Apenas Tier 1 (faturamento > R$1MM).

### Produtos desta linha:
- **G4 Gestao e Estrategia** — Perfil: C-Level/Socio, Fat > R$10MM
- **G4 Frontier** — Perfil: C-Level/Socio, Fat > R$10MM
- **G4 Pelo Brasil** — Perfil: C-Level/Socio, Fat > R$10MM
- **Scale Experience** — Perfil: Tier 1, Alumni ou pre-qualificado
- **Reuniao Estrategica** — Perfil: C-Level, formato consultivo
- **Field / Expansao** — Upsell presencial em evento ou imersao ativa
- **Especialista** — Perfil especializado dentro de imersao
- **G4 Sales** (ligado a Imersao) — Fat > R$5MM, foco em vendas
- **CS Corporativo** (pre/pos Imersao) — Suporte ao ciclo da imersao
- **G4 Expansao de Negocios** — C-Level/Presidente/Socio, Fat > R$10MM
- **G4 Sucessao e Governanca** — C-Level/Socio, empresas familiares, Fat > R$10MM
- **G4 Gestao Empresarial** — C-Level/Socio, Fat > R$10MM, 8 semanas hibrido
- **G4 Scale** — C-Level/Presidente/Socio, Fat > R$10MM
- **G4 Marketing & Growth** — C-Level/Diretor/Socio, Fat > R$5MM
- **G4 Customer Experience** — C-Level/Diretor/Socio, Fat > R$5MM
- **G4 Gestao de Pessoas** — C-Level/Diretor/Socio, Fat > R$5MM
- **G4 Sprints** (Receita / Planejamento / Cultura) — C-Level/Diretor/Socio, Fat > R$5MM
- **Journey** — C-Level/Socio, Fat > R$10MM

---

## REVENUE LINE 2 — CLUB & COMUNIDADES (RETENCAO / LTV)

**Regra:** Exclusivo para Alumni de Imersoes Presenciais. Nunca abordar com tom comercial.

### Produtos desta linha:
- **G4 Club** — Comunidade peer-to-peer de founders. Postura relacional, nao de venda.
- **G4 Club Renovacao** — Retencao de membros ativos
- **G4 Scale Renovacao** — Retencao de alumni Scale
- **G4 Alumni** — Base de ex-alunos para reengajamento e upsell
- **Farmer** — Gestao de relacionamento com base ativa
- **Renovacao** — Renovacao generica de qualquer produto de comunidade
- **Expansao** (base ativa) — Upsell para quem ja e membro

---

## REVENUE LINE 3 — FIELD SALES (UPSELL PRESENCIAL)

**Regra:** Ocorre dentro de eventos e imersoes. Oportunidade de captura em contexto de alto engajamento.

### Produtos desta linha:
- **Field Sales** — Venda presencial em evento/imersao
- **Expansao** — Upsell de produto no campo
- **Especialista** — Venda de modulo especializado
- **Time de Vendas** (em evento/imersao) — Acao coordenada de time comercial
- **G4 Sales** (cross/upsell) — Venda cruzada de programa de vendas

---

## REVENUE LINE 4 — EVENTOS & LANCAMENTOS (AQUISICAO & BRAND)

**Regra critica:** NAO vende profundidade. Evento e awareness e captura de lead. Nao confundir com conversao final.

### Produtos desta linha:
- **G4 Valley** — Top-of-funnel, volume, branding
- **G4 Day** — Evento de marca, captura
- **Outros Eventos** — Eventos genericos G4
- **Ingressos Eventos** — Venda de ingresso avulso
- **Aniversario G4** — Evento de relacionamento com base
- **Black Friday** — Lancamento promocional
- **Lancamentos** (IA, SAL, TRA, etc.) — Novos produtos em lancamento
- **Eventos** (generico) — Categoria residual de eventos

---

## REVENUE LINE 5 — DIGITAL / ONLINE (ENTRADA & SMB)

**Regra:** Porta de entrada para o ecossistema G4. Tier 2 e Tier 3. Nao e downsell — e o produto correto para o momento.

### Produtos desta linha:
- **G4 Traction** — Fat ate R$10MM, porta de entrada, Fat > R$250k recomendado
- **G4 Skills** — C-Level a Coordenador, Fat > R$1MM
- **Formacoes** (ex: formacao-ia) — Qualquer cargo, sem restricao de faturamento
- **Self-Checkout** (FG4/Outros) — Compra autonoma, sem SDR
- **Abandono de Carrinho** — Reengajamento de quem iniciou compra
- **Chat Online** — Lead via chat do site
- **Customer Success Online** — CS para base digital
- **Ementas** — Conteudo de qualificacao e captura

---

## PREMIUM / CONSULTING

### G4 Consulting
- **Perfil:** Founders
- **Faturamento:** > R$30MM ate R$500MM
- **Pre-requisito:** Ter feito GE (Gestao Empresarial)
- **4 Pilares:** Planejar / Acompanhar / Apoiar / Capacitar

---

## CANAIS DE AQUISICAO (NAO SAO REVENUE LINE)

Alimentam todas as Revenue Lines acima. Nao geram receita diretamente.
Identificar o canal correto muda a abordagem e o script — nao o produto.

### Social / Founder Led
- Social DM — DM direto via perfil de Founder
- Social DM Perfil K — DM via perfil secundario
- Instagram Tallis / Instagram Nardon / Instagram Alfredo — Modo Founder Proxy (ver eluci-core.md)
- Social organico / testes

### Midia Paga
- Meta / Facebook Ads
- Google Ads
- Midia Paga Frio / Morno / Quente (temperatura do lead)
- Paid Testes

### Formularios
- Form G4 (Instagram / Facebook / Google / Outros)
- Form G4 K
- Form G4 Incompleto (lead parcial, requer qualificacao adicional)
- Form Meta

### CRM / Relacionamento
- CRM WhatsApp
- CRM Email
- Chat
- Reativacao (base fria reengajada)
- Base Lost (oportunidade perdida em reabordagem)
- Site
- Indicacao / Aplicativo G4

### Outros
- Outros / Nao definida (ruido operacional — nao qualificar sem investigar)
- Lifecycle Testes / Social Paid Testes (experimentos, nao operar como pipeline real)

---

## Regras de Roteamento por Tier

### Tier 1 Elite (> R$10MM, Perfis A/B)
- **Produtos elegíveis:** Imersoes Presenciais, Club, Mentoria, Black Class, Consulting
- **Prioridade:** Profundidade e personalizacao

### Tier 1B Builders (R$1M - R$10M, Perfis C/D)
- **Produtos elegíveis:** Imersoes core, Sprints, upgrade para Traction
- **Prioridade:** Crescimento acelerado

### Tier 2 (< R$1MM, Perfis I/J/K/L/M)
- **Produtos elegíveis:** G4 Traction, Skills, Online, Formacoes, Eventos
- **BLOQUEIO:** PROIBIDO vender Imersao Presencial para Tier 2

---

## Regras Criticas de Protecao

### Regra de Upsell Imediato
- Se um lead Tier 1 cai em produto Online (Traction, Skills, etc), **ESCALAR imediatamente** para Imersao Presencial
- Tier 1 em produto Online e sub-alocacao de potencial. O lead merece produto de maior profundidade

### Tier 2 Block - Downsell Honesto Obrigatorio
- **PROIBIDO** vender Imersao Presencial para Tier 2, independente do interesse do lead
- Aplicar Downsell Honesto: explicar que o produto ideal para o momento da empresa e Online/Traction
- Proteger o ecossistema: lead Tier 2 em sala de Imersao contamina a experiencia dos Tier 1

### Diferenciador Harvard Partnership
- A parceria com Harvard e diferenciador de credibilidade
- Elimina a percepcao de "infoproduto" que pode surgir no mercado
- Usar como argumento de autoridade quando lead questionar seriedade ou profundidade do programa

---

## Skills que Usam

- **iron-dome**: Validacao de elegibilidade de produto por tier
- **product-recommender**: Selecao de produto adequado ao perfil
- **strategy-builder**: Roteamento de produto na estrategia de abordagem
- **orchestrator**: Verificacao de regras de bloqueio antes de qualquer recomendacao
- **sdr-coach**: Ensino das regras de roteamento e protecao do ecossistema
