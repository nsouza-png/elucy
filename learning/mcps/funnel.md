# MCP: Funnel
## Camada Semantica - Estagios do Funil de Vendas G4 Educacao

---

## Definicao

Este MCP define os estagios do funil de vendas utilizado pela G4 Educacao, incluindo metricas esperadas por estagio, regras de saude do funil e padroes de comportamento por segmento. O funil e a espinha dorsal da operacao de SDR e Sales, e cada estagio possui criterios claros de entrada e saida.

---

## Estagios do Funil

### 1. MQL (Marketing Qualified Lead)
- **Codigo:** `mql`
- **Definicao:** Lead que demonstrou interesse via canal de marketing (formulario, evento, conteudo, indicacao) e atende criterios minimos de qualificacao
- **Criterios de entrada:**
  - Preencheu formulario com dados validos
  - Faixa de faturamento identificada
  - Cargo identificado
  - Nao esta em blacklist ou duplicado
- **Conversao esperada para proximo estagio:** 40-50%
- **Tempo maximo no estagio:** 48 horas (apos isso, lead esfria)

### 2. SDR Contact (Contato Realizado)
- **Codigo:** `sdr_contact`
- **Definicao:** SDR fez contato efetivo com o lead (conversa real, nao apenas tentativa)
- **Criterios de entrada:**
  - Conversa bidirecional realizada (telefone, WhatsApp ou email com resposta)
  - Lead confirmou interesse minimo em continuar conversa
- **Conversao esperada para proximo estagio:** 50-60%
- **Tempo maximo no estagio:** 5 dias uteis

### 3. Meeting Scheduled (Reuniao Agendada)
- **Codigo:** `meeting_scheduled`
- **Definicao:** Reuniao de qualificacao/discovery agendada com data e horario confirmados
- **Criterios de entrada:**
  - Data e horario confirmados pelo lead
  - Convite enviado e aceito
  - Briefing pre-reuniao preparado
- **Conversao esperada para proximo estagio:** 60-70%
- **Tempo maximo no estagio:** 7 dias (reuniao deve acontecer em ate 7 dias do agendamento)
- **Alerta:** Taxa de no-show esperada: 15-20%. Se acima de 25%, revisar qualidade do agendamento

### 4. Qualification (Qualificacao)
- **Codigo:** `qualification`
- **Definicao:** Reuniao realizada, lead qualificado com framework aplicado (SPICED ou Challenger conforme perfil)
- **Criterios de entrada:**
  - Reuniao aconteceu (nao foi no-show)
  - Framework de qualificacao aplicado (minimo 3 de 5 criterios SPICED mapeados)
  - DQI (Data Quality Index) >= 3/5
  - Dor identificada e articulada pelo lead
- **Conversao esperada para proximo estagio:** 50-60%
- **Tempo maximo no estagio:** 10 dias uteis

### 5. Proposal (Proposta)
- **Codigo:** `proposal`
- **Definicao:** Proposta comercial enviada ao lead com produto, preco e condicoes
- **Criterios de entrada:**
  - Qualificacao concluida com DQI >= 4/5
  - Produto identificado (Imersao, Club, Digital, etc.)
  - Proposta enviada formalmente
  - Decisor identificado e envolvido (ou estrategia multi-thread ativa)
- **Conversao esperada para proximo estagio:** 55-65%
- **Tempo maximo no estagio:** 15 dias uteis (enterprise: 30 dias)

### 6. Negotiation (Negociacao)
- **Codigo:** `negotiation`
- **Definicao:** Lead esta negociando ativamente - discutindo preco, condicoes, data, formato
- **Criterios de entrada:**
  - Lead deu feedback sobre proposta
  - Ha interacao ativa (nao esta ghosting)
  - Objecoes mapeadas e sendo tratadas
- **Conversao esperada para proximo estagio:** 65-75%
- **Tempo maximo no estagio:** 10 dias uteis (enterprise: 20 dias)

### 7. Close (Fechamento)
- **Codigo:** `closed_won` ou `closed_lost`
- **Definicao:** Deal finalizado - ganho ou perdido
- **Criterios de entrada (won):**
  - Contrato assinado ou pagamento confirmado
  - Produto e data definidos
- **Criterios de entrada (lost):**
  - Lead declinou explicitamente OU
  - Sem resposta apos X tentativas (varia por estagio) OU
  - Desqualificado (faturamento incompativel, etc.)
  - `motivo_lost` obrigatoriamente preenchido

---

## Metricas por Estagio - Resumo

| Estagio | Conversao Esperada | Tempo Max | Alerta Se |
|---------|-------------------|-----------|-----------|
| MQL > SDR Contact | 40-50% | 48h | < 30% ou > 72h |
| SDR Contact > Meeting | 50-60% | 5 dias | < 40% |
| Meeting > Qualification | 60-70% | 7 dias | No-show > 25% |
| Qualification > Proposal | 50-60% | 10 dias | DQI < 3/5 |
| Proposal > Negotiation | 55-65% | 15 dias | Sem feedback em 7 dias |
| Negotiation > Close | 65-75% | 10 dias | Ghosting > 5 dias |

### Conversao Total Esperada (MQL a Close)

| Segmento | MQL-to-Close | Ciclo Medio |
|----------|-------------|-------------|
| Enterprise (Titan) | 8-15% | 45-90 dias |
| Mid-market (Builder) | 15-25% | 15-30 dias |
| SMB (Tier 2) | 20-30% | 7-15 dias |
| Inbound qualificado (todos) | 25-35% | 10-20 dias |

---

## Regras de Diagnostico do Funil

### Funil Saudavel
```
- MQL-to-Meeting > 30%
- Meeting-to-Proposal > 40%
- Proposal-to-Close > 50% (mid-market)
- Ciclo medio dentro do esperado para o segmento
- Distribuicao equilibrada entre estagios (nao ha gargalo)
- Motivos de lost diversificados (nao concentrados em um unico motivo)
```

### Funil Doente - Padroes de Problema

#### Padrao 1: Drop apos Meeting
```
SINAL: Conversion Meeting > Qualification < 50%
DIAGNOSTICO: Problema de qualificacao
CAUSAS PROVAVEIS:
  - SDR nao aplicou SPICED/Challenger corretamente
  - Lead nao era qualificado (MQL ruim)
  - Reuniao nao gerou valor percebido
ACAO: Revisar gravacoes, retreinar framework, melhorar criterios de MQL
```

#### Padrao 2: Ciclo Longo
```
SINAL: Ciclo > 2x o esperado para o segmento
DIAGNOSTICO: Padrao enterprise em lead mid-market OU deal travado
CAUSAS PROVAVEIS:
  - Decisor nao envolvido (falha multi-thread)
  - Urgencia nao estabelecida (Critical Event nao mapeado)
  - Concorrencia ou avaliacao interna
ACAO: Ativar multi-thread, criar urgencia, verificar se ha blocker
```

#### Padrao 3: Close Rapido
```
SINAL: Ciclo < 50% do esperado
DIAGNOSTICO: Padrao SMB/Builder com alta intencao
INTERPRETACAO POSITIVA: SPICED bem feito + timing certo
INTERPRETACAO NEGATIVA: Pode indicar desconto excessivo ou promessa acima do entregavel
ACAO: Verificar se qualificacao foi completa, validar expectativas
```

#### Padrao 4: Funil com Barriga
```
SINAL: Acumulo desproporcional em Proposal ou Negotiation
DIAGNOSTICO: Deals travados em fase final
CAUSAS PROVAVEIS:
  - Objecao de preco nao resolvida
  - Falta de urgencia (Critical Event ausente)
  - Decisor ausente do processo
ACAO: Late-stage recovery, renegociacao ou descarte
```

#### Padrao 5: Funil Invertido
```
SINAL: Mais deals em estagios avancados que em estagios iniciais
DIAGNOSTICO: Pipeline secando - problema de geracao de demanda
CAUSAS PROVAVEIS:
  - Volume de MQL insuficiente
  - SDR focando em deals existentes e nao prospectando
ACAO: Aumentar outbound, revisar campanhas de marketing
```

---

## Mapeamento Databricks

### Tabela: `aquisicao`

| Campo Databricks | Uso no Funnel | Mapeamento |
|-------------------|---------------|------------|
| `status_do_deal` | Estagio atual do deal | "open", "won", "lost" |
| `pipeline_name` | Identifica qual pipeline (SDR, AE, Inbound, etc.) | Nome do pipeline no CRM |
| `etapa_anterior` | Ultimo estagio antes da movimentacao | Usado para calcular velocidade e dropoff |
| `motivo_lost` | Razao do lost (obrigatorio) | "Preco", "Timing", "Concorrente", "Sem resposta", etc. |
| `data_criacao` | Data de entrada no pipeline | Calculo de ciclo |
| `data_fechamento` | Data de won ou lost | Calculo de ciclo |

### Tabela: `distribuicao_leads_resultado`

| Campo | Uso |
|-------|-----|
| Resultado da distribuicao | Mede eficiencia do routing de leads |
| Tempo de primeiro contato | SLA de resposta ao MQL |

### Tabela: `funil_comercial` (PREFERENCIAL para analise de funil)

Tabela mais rica que `aquisicao` — 75 colunas com fases granulares, delta_t entre fases, tier calculado, e flag de etapa pulada.

| Campo Databricks | Uso no Funnel | Diferencial vs aquisicao |
|-------------------|---------------|--------------------------|
| `fase_atual_no_processo` | Fase atual granular | Mais detalhado que etapa_anterior |
| `fase_anterior_no_processo` | Fase anterior | Permite calcular transicoes exatas |
| `delta_t` | Tempo entre fases (bigint) | Nao precisa calcular DATEDIFF |
| `event_skipped` | Se pulou etapa (boolean) | Detecta jornada encurtada |
| `tier_da_oportunidade` | Tier ja calculado | Nao precisa inferir de faixa_faturamento |
| `qualificador_name` | Quem qualificou | Filtro por operador |
| `revenue` | Receita do deal | Valor real, nao estimado |
| `valor_da_oportunidade` | Valor do deal | Complementar a revenue |
| `selfbooking` | Se foi self-booking | Identifica leads auto-agendados |

### 3 Eixos de Contexto do Deal (NAO misturar)

**EIXO 1 — LINHA DE RECEITA** (campo proprio — NAO e UTM, NAO e canal):

| Campo | O que significa | Exemplo |
|---|---|---|
| `linha_de_receita_vigente` | **A linha de receita do deal** | [IM] Form Facebook Ads, [SKL] Midia Paga |
| `origem_da_receita` | Time responsavel | Time Imersao, Time SKILLS, Time Online |
| `grupo_de_receita` | Agrupamento da receita | Funil de Marketing, Projetos e Eventos |
| `area_geracao_demanda` | Como a demanda foi gerada | Paid, Organico |
| `area_captura_receita` | Quem capturou | Aquisicao |

**EIXO 2 — CANAL DE ORIGEM** (utm_medium + complementos UTM):

| Campo | O que significa | Exemplo |
|---|---|---|
| `utm_medium` | **Canal/Founder de origem** | tallis, alfredo, nardon, cpc, whatsapp |
| `utm_source` | Plataforma | instagram, facebook, google, hubspot |
| `utm_campaign` | Campanha especifica | always-on, isca-ote-manychat |
| `utm_content` | Peca criativa | stories, manychat, video, aftermovie |
| `utm_term` | Termo de busca / segmento | g4 educacao, gestao |
| `canal_de_marketing` | Categoria macro | Paid Media, Social Media, Prospeccao |
| `fonte_original` | Canal macro | PAID_SOCIAL, PAID_SEARCH, OFFLINE, DIRECT_TRAFFIC |

**EIXO 3 — MECANICA DE ENTRADA:**

| Campo | O que significa | Exemplo |
|---|---|---|
| `origem_do_deal` | Como entrou | Form G4, Form Facebook Ads, Reativacao, Demo |
| `tipo_de_conversao` | Tipo especifico | Form G4 - Generico, Reativacao Base Lost |
| `email_do_indicador` | Quem indicou | Se preenchido = lead de indicacao |

**Mapa utm_medium → Founder (para Social DM):**

| utm_medium | Founder | Founder Mode |
|---|---|---|
| tallis, instagram_tallis_stories, joao, jon | Tallis Gomes | TALLIS MODE |
| alfredo, theo, riedo | Alfredo Soares | ALFREDO MODE |
| nardon, basaglia, bernardinho, vabo | Bruno Nardon | NARDON MODE |
| cpc, g4, whatsapp, email, chat, qrcode, etc. | NAO e Social DM | Alertar operador |

### Queries de Referencia

```sql
-- Conversao por estagio (usando funil_comercial)
SELECT
  fase_atual_no_processo,
  status_do_deal,
  COUNT(*) as total,
  AVG(delta_t) as tempo_medio_fase
FROM production.diamond.funil_comercial
WHERE qualificador_name = '{operator_name}'
GROUP BY fase_atual_no_processo, status_do_deal

-- Motivos de lost por estagio
SELECT
  fase_atual_no_processo,
  motivo_lost,
  COUNT(*) as total
FROM production.diamond.funil_comercial
WHERE status_do_deal = 'lost'
AND qualificador_name = '{operator_name}'
GROUP BY fase_atual_no_processo, motivo_lost
ORDER BY total DESC

-- Funil com barriga (deals lentos por fase)
SELECT
  fase_atual_no_processo,
  COUNT(*) as deals_lentos,
  AVG(delta_t) as tempo_medio
FROM production.diamond.funil_comercial
WHERE status_do_deal = 'open'
AND delta_t > 604800
GROUP BY fase_atual_no_processo

-- Velocidade do funil do operador (ultimos 30 dias)
SELECT
  fase_atual_no_processo,
  fase_anterior_no_processo,
  COUNT(*) as transicoes,
  AVG(delta_t) as tempo_medio,
  SUM(CASE WHEN event_skipped THEN 1 ELSE 0 END) as etapas_puladas
FROM production.diamond.funil_comercial
WHERE qualificador_name = '{operator_name}'
AND event_timestamp >= DATE_SUB(CURRENT_DATE(), 30)
GROUP BY fase_atual_no_processo, fase_anterior_no_processo
ORDER BY transicoes DESC
```

---

## Skills que Usam

| Skill | Como Usa o Funnel |
|-------|-------------------|
| `pipeline-analyzer` | Diagnostica saude do funil usando regras acima |
| `deal-coach` | Identifica estagio atual e recomenda acoes conforme regras |
| `qualification-engine` | Valida se criterios de entrada do estagio foram cumpridos |
| `forecast-engine` | Calcula probabilidade ponderada por estagio e segmento |
| `alert-system` | Dispara alertas quando metricas saem do range saudavel |
| `reporting-dash` | Gera visualizacao do funil com benchmarks |
| `reactivation-engine` | Usa motivo_lost e estagio de saida para calibrar re-abordagem |

---

## Notas Importantes

1. **Estagios nao podem ser pulados** - cada movimentacao deve respeitar a sequencia (exceto lost, que pode acontecer em qualquer estagio)
2. **motivo_lost e obrigatorio** - deals sem motivo_lost corrompem a analise do funil
3. **Tempo no estagio e relativo ao segmento** - 30 dias em Proposal e normal para Enterprise, mas alarme para Mid-market
4. **No-show nao e lost** - e retorno para SDR Contact com flag de reagendamento
5. **Linhas de receita diferentes podem ter funis com metricas diferentes** - Imersoes Presenciais tem ciclo mais longo que Digital/Online

---

## 8 Estados CSE - Customer State Engine (Canonico - Doc 10)

O CSE define o estado psicologico/comportamental do lead ao longo do funil. Cada estado tem uma tatica dominante e regras de saida.

| # | Estado | Tatica Dominante | Descricao |
|---|--------|-----------------|-----------|
| 1 | **COLD** | Pattern Interrupt | Lead frio, sem consciencia do problema. Precisa de ruptura de padrao para captar atencao. |
| 2 | **AWARE** | Social Proof | Lead sabe que a G4 existe. Usar prova social (cases, depoimentos, nomes) para gerar curiosidade. |
| 3 | **CURIOUS** | PERIGO - Armadilha do Vendedor Junior | Lead curioso mas superficial. Junior tenta vender aqui. CORRETO: redirecionar com pergunta SPICED para aprofundar. |
| 4 | **PROBLEM-AWARE** | SPICED | Lead reconhece o problema. Aplicar SPICED completo. SAIDA SOMENTE quando impacto financeiro confirmado pelo lead. |
| 5 | **TENSIONED** | Silencio Tatico (pos-Challenger) | Lead esta tenso com a realidade mostrada. NAO falar demais. Silencio tatico. Deixar a tensao trabalhar. |
| 6 | **ALIGNED** | Facilitacao | Lead alinhado, quer resolver. Remover friccao, facilitar processo, nao adicionar complexidade. |
| 7 | **BLOCKED** | SPIN Selling | Lead QUER comprar mas tem travas (preco, socio, timing, processo). Usar SPIN para desbloquear. |
| 8 | **DISQUALIFIED** | Downsell ou Nurture automatico | Lead nao se qualifica. Redirecionar para produto menor (Downsell) ou colocar em Nurture automaticamente. |

---

## Matriz de Transicao por Persona (Canonico - Doc 10)

Cada persona tem uma rota predominante pelo CSE:

### Titan - Express Route (Rota Expressa)
```
COLD > TENSIONED > ALIGNED
Explicacao: Titans respondem a provocacao direta (Challenger).
Pula etapas intermediarias porque ja tem consciencia de problema.
O Challenger cria tensao imediata, e o Titan decide rapido se faz sentido.
```

### Builder - Standard Route (Rota Padrao)
```
AWARE > PROBLEM-AWARE > BLOCKED > ALIGNED
Explicacao: Builders precisam de diagnostico (SPICED) para reconhecer o problema.
Frequentemente ficam BLOCKED por questoes de caixa ou prioridade.
Desbloqueio via demonstracao de ROI de curto prazo (3 meses).
```

### Executor - Political Route (Rota Politica)
```
CURIOUS > ALIGNED > BLOCKED > ALIGNED
Explicacao: Executores chegam curiosos, alinham rapido pessoalmente,
mas ficam BLOCKED pelo processo de aprovacao interna.
Desbloqueio via Champion Selling (armar com argumentos para o CEO).
Pode oscilar entre ALIGNED e BLOCKED multiplas vezes.
```

---

## Prematurity Block - Bloqueio de Prematuridade (Canonico - Doc 10)

```
REGRA CRITICA:
SE tentativa_de_fechamento = true E cse_state < PROBLEM-AWARE:
    ENTAO: ERRO DE PROCESSO - Bloqueio automatico
    MOTIVO: Tentar fechar antes do lead estar Problem-Aware e venda prematura.
    O lead NAO reconheceu o problema, portanto NAO vai comprar.
    ACAO: Retornar ao SPICED, mapear dor e impacto antes de qualquer tentativa de close.
```

---

## Transition Points - Pontos de Transicao (Canonico - Doc 13)

Mudancas de fase do Deal no CRM devem ser vinculadas a geracao de Intelligence Block:

```
REGRA: Toda mudanca de Deal Phase OBRIGA geracao de novo Intelligence Block
  - O Intelligence Block documenta: PERFIL & CONTEXTO > DIAGNOSTICO SPICED > STATUS CSE > GOVERNANCA & RISCO > NEXT ACTION
  - Mudanca SEM Intelligence Block = deal sem rastreabilidade
  - O bloco e gerado automaticamente pela ELUCI e colado no CRM pelo operador
```

---

## Roteamento por Tier (Canonico - Doc 11)

### Tier 1 - Hot
```
Lead Tier 1 (Perfis A-H) com sinais Hot (buy + urgency + authority):
ACAO: AGENDAR CLOSER IMEDIATAMENTE
Nao nutrir, nao esperar, nao fazer mais discovery. Passar para Closer.
```

### Tier 1 - Cold/Indeciso
```
Lead Tier 1 (Perfis A-H) sem urgencia ou indeciso:
ACAO: NUTRIR (Nurture)
Nao forcar fechamento. Colocar em cadencia de nurture com conteudo de valor.
Reativar quando sinal de timing aparecer.
```

### Tier 2 - Bad Fit
```
Lead Tier 2 (Perfis I-M) ou bad fit identificado:
ACAO: BLOCK ou DOWNSELL
Bloquear para produtos premium (Imersoes).
Oferecer downsell (Digital/Online) se aplicavel.
Nao investir tempo de SDR senior.
```

---

## Logica Nurture vs Closing (Canonico - Doc 7)

```
REGRA FUNDAMENTAL:
SE Critical Event = AUSENTE (nao identificado no SPICED):
    ENTAO: Lead vai para NURTURE, NAO para Closing
    MOTIVO: Sem evento critico nao ha urgencia real.
    Tentar fechar sem urgencia = ciclo infinito + desgaste.

SE Critical Event = PRESENTE (data identificada):
    ENTAO: Lead segue para Closing
    ACAO: Alinhar timeline do deal com a data do Critical Event
```
