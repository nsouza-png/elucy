# MCP: Conversion
## Camada Semantica - Benchmarks de Conversao G4 Educacao

---

## Definicao

Este MCP define os benchmarks de conversao do sistema Elucy v2, incluindo taxas esperadas por segmento, canal e estagio, indicadores de funil saudavel vs doente, e o DQI (Data Quality Index) que determina prontidao para handoff. Esses benchmarks sao a referencia contra a qual todo deal e pipeline e avaliado.

---

## Benchmarks de Conversao por Segmento

### Enterprise (>R$10MM / Tier Elite)

| Metrica | Benchmark | Range Aceitavel | Alerta |
|---------|-----------|----------------|--------|
| MQL-to-Meeting | 25-35% | 20-40% | < 20% |
| Meeting-to-Qualification | 60-70% | 50-75% | < 50% |
| Qualification-to-Proposal | 45-55% | 40-60% | < 40% |
| Proposal-to-Close | 40-50% | 35-55% | < 35% |
| **Meeting-to-Close (total)** | **~25%** | **20-30%** | **< 20%** |
| Ciclo medio | 45-90 dias | 30-120 dias | > 120 dias |
| No-show rate | 10-15% | 5-20% | > 20% |
| Ticket medio | Alto | - | - |

### Mid-Market (R$1MM-R$10MM / Tier Builders)

| Metrica | Benchmark | Range Aceitavel | Alerta |
|---------|-----------|----------------|--------|
| MQL-to-Meeting | 35-45% | 30-50% | < 30% |
| Meeting-to-Qualification | 65-75% | 55-80% | < 55% |
| Qualification-to-Proposal | 55-65% | 45-70% | < 45% |
| Proposal-to-Close | 55-65% | 50-70% | < 50% |
| **Meeting-to-Close (total)** | **~35-40%** | **30-45%** | **< 30%** |
| Ciclo medio | 15-30 dias | 10-45 dias | > 45 dias |
| No-show rate | 15-20% | 10-25% | > 25% |
| Ticket medio | Medio | - | - |

### SMB (<R$1MM / Tier 2)

| Metrica | Benchmark | Range Aceitavel | Alerta |
|---------|-----------|----------------|--------|
| MQL-to-Meeting | 40-50% | 35-55% | < 35% |
| Meeting-to-Qualification | 70-80% | 60-85% | < 60% |
| Qualification-to-Proposal | 60-70% | 50-75% | < 50% |
| Proposal-to-Close | 60-70% | 55-75% | < 55% |
| **Meeting-to-Close (total)** | **~40-45%** | **35-50%** | **< 35%** |
| Ciclo medio | 7-15 dias | 5-20 dias | > 20 dias |
| No-show rate | 20-25% | 15-30% | > 30% |
| Ticket medio | Baixo | - | - |

---

## Benchmarks de Conversao por Canal

### Inbound

| Metrica | Benchmark | Observacao |
|---------|-----------|-----------|
| SQL-to-Close (geral) | ~35% | Lead ja demonstrou intencao |
| Tempo de primeiro contato | < 5 minutos | SLA critico - cada minuto reduz conversao |
| Inbound MQL-to-Meeting | 45-55% | Intencao alta = mais meetings |
| Inbound Meeting-to-Close | 40-50% | Qualificacao mais facil |

### Outbound

| Metrica | Benchmark | Observacao |
|---------|-----------|-----------|
| SQL-to-Close (geral) | ~20% | Lead nao estava buscando ativamente |
| Tentativas para contato | 5-8 tentativas | Mix de canais (telefone, WhatsApp, email, LinkedIn) |
| Outbound MQL-to-Meeting | 20-30% | Mais dificil agendar |
| Outbound Meeting-to-Close | 25-35% | Precisa de discovery mais profundo |

### Comparativo Inbound vs Outbound

```
Inbound:
  - Vantagem: intencao ja existe, ciclo mais curto
  - Desvantagem: volume limitado, dependente de marketing
  - SQL-to-Close: ~35%
  - Ciclo medio: -30% vs outbound

Outbound:
  - Vantagem: volume controlavel, pode mirar perfil ideal
  - Desvantagem: ciclo mais longo, conversao menor
  - SQL-to-Close: ~20%
  - Ciclo medio: +30% vs inbound
```

---

## Funil Saudavel - Definicao

### Criterios de Funil Saudavel (Mid-Market como referencia)

```
FUNIL_SAUDAVEL:
  MQL-to-Meeting > 30%
  Meeting-to-Proposal > 40%
  Proposal-to-Close > 50%
  Ciclo medio dentro do range do segmento
  Distribuicao equilibrada entre estagios (sem gargalo)
  No-show rate < 25%
  Motivos de lost diversificados (nenhum motivo > 40% do total)
  Tempo medio no estagio < maximo definido
  Pipeline coverage >= 3x meta (deals suficientes para atingir target)
```

### Criterios de Funil Saudavel por Segmento

| Criterio | Enterprise | Mid-Market | SMB |
|----------|-----------|------------|-----|
| MQL-to-Meeting | > 20% | > 30% | > 35% |
| Meeting-to-Proposal | > 30% | > 40% | > 50% |
| Proposal-to-Close | > 35% | > 50% | > 55% |
| Ciclo maximo | 120 dias | 45 dias | 20 dias |
| Pipeline coverage | >= 4x | >= 3x | >= 2.5x |

---

## Indicadores de Funil Doente

### Sinais de Alerta Critico

```
ALERTA_VERMELHO (acao imediata):
  - MQL-to-Meeting < 20% (todos os segmentos)
    Diagnostico: MQLs de baixa qualidade OU SDR nao esta convertendo
    Acao: revisar criterios de MQL, treinar SDR, verificar SLA de contato

  - Meeting-to-Qualification < 50%
    Diagnostico: reunioes improdutivas
    Acao: revisar qualidade do agendamento, treinar discovery/framework

  - Proposal-to-Close < 30%
    Diagnostico: propostas sendo enviadas cedo demais ou mal calibradas
    Acao: revisar criterios de envio de proposta, verificar DQI minimo

  - Ciclo > 2x o esperado para o segmento
    Diagnostico: deals travados ou segmento errado
    Acao: revisar deals em stall, ativar late_stage_recovery

  - No-show > 30%
    Diagnostico: leads nao qualificados ou agendamento fraco
    Acao: melhorar confirmacao, enviar lembrete, qualificar melhor antes de agendar

  - Um motivo_lost > 50% dos lost
    Diagnostico: problema sistemico (ex: preco muito alto, produto errado)
    Acao: investigar causa raiz, ajustar oferta ou targeting
```

### Sinais de Alerta Moderado

```
ALERTA_AMARELO (monitorar):
  - Pipeline coverage < 3x meta
    Diagnostico: pipeline insuficiente para atingir meta
    Acao: aumentar volume de prospeccao

  - Tempo medio no estagio > 80% do maximo
    Diagnostico: deals desacelerando
    Acao: revisar deals individuais, buscar blockers

  - Taxa de reativacao < 10%
    Diagnostico: leads perdidos nao estao sendo reaproveitados
    Acao: ativar playbook de reactivation

  - Distribuicao de pipeline invertida (mais deals avancados que iniciais)
    Diagnostico: pipeline vai secar em 30-60 dias
    Acao: aumentar geracao de demanda urgentemente
```

---

## DQI - Data Quality Index

### Definicao

O DQI (Data Quality Index) mede a completude e qualidade dos dados de qualificacao de um lead antes do handoff SDR > AE. Score de 0 a 5.

### Criterios de Pontuacao

| Ponto | Criterio | Descricao |
|-------|----------|-----------|
| 1 | **Perfil completo** | Nome, cargo, empresa, faturamento, segmento preenchidos e validados |
| 1 | **Dor identificada** | Problem do SPICED documentado com frase do lead |
| 1 | **Impacto quantificado** | Impact do SPICED com numero ou consequencia concreta |
| 1 | **Decisor mapeado** | Quem decide, como decide, quem mais influencia (Decision) |
| 1 | **Timing definido** | Critical Event ou urgencia mapeada com data ou prazo |

### Thresholds de Acao

```
DQI = 5/5: READY FOR HANDOFF
  - Lead completamente qualificado
  - Todos os criterios SPICED documentados
  - Handoff para AE imediato
  - Probabilidade de conversao: maxima para o segmento

DQI = 4/5: NEAR READY
  - Falta 1 criterio
  - Handoff permitido com nota sobre item faltante
  - AE deve completar na primeira interacao
  - Recomendacao: SDR tente completar antes do handoff

DQI = 3/5: DEEPEN BEFORE HANDOFF
  - Faltam 2 criterios
  - NAO fazer handoff ainda
  - SDR deve agendar nova interacao para aprofundar
  - Focar nos criterios faltantes na proxima conversa
  - Se apos 2 tentativas nao completar, avaliar desqualificacao

DQI = 2/5: INCOMPLETE
  - Faltam 3 criterios
  - Lead nao esta qualificado
  - SDR deve retornar ao discovery
  - Considerar se lead e realmente qualificavel

DQI = 1/5: MINIMAL
  - Apenas dados basicos
  - Lead pode nao ser qualificado
  - Reavaliar se deve continuar no pipeline

DQI = 0/5: DO NOT HANDOFF - DESCARTE OU REQUALIFICACAO
  - Nenhum dado de qualificacao
  - Lead nao deve estar no pipeline
  - Mover para nurturing ou descartar
```

### DQI por Segmento - Requisito Minimo para Handoff

| Segmento | DQI Minimo para Handoff | Ideal |
|----------|------------------------|-------|
| Enterprise | 4/5 | 5/5 |
| Mid-Market | 3/5 | 4/5 |
| SMB | 3/5 | 4/5 |

### Regras de DQI

```
REGRA 1: DQI < 3 = NUNCA fazer handoff
  Motivo: AE vai desperdicar tempo requalificando
  Impacto: reduz conversao Proposal-to-Close e destroi confianca SDR-AE

REGRA 2: DQI Enterprise < 4 = NUNCA fazer handoff
  Motivo: Enterprise exige preparacao maxima, erro e caro
  Impacto: perder um Titan por handoff prematuro e inaceitavel

REGRA 3: DQI melhora a cada interacao
  Se DQI nao subiu apos 2 interacoes: lead provavelmente nao e qualificado
  Acao: desqualificar ou mover para nurturing

REGRA 4: DQI impacta probabilidade de conversao
  DQI 5/5 = probabilidade baseline do segmento * 1.2 (boost de 20%)
  DQI 4/5 = probabilidade baseline do segmento * 1.0
  DQI 3/5 = probabilidade baseline do segmento * 0.7 (reducao de 30%)
  DQI < 3 = NAO CALCULAR (nao deveria estar no pipeline)
```

---

## Metricas de Conversao por Linha de Receita

| Linha de Receita | Meeting-to-Close | Ciclo Medio | Observacao |
|-----------------|------------------|-------------|-----------|
| Imersoes Presenciais | 30-40% | 20-45 dias | Maior ticket, maior conversao pos-meeting |
| Retencao / Club | 25-35% | 15-30 dias | Depende de experiencia anterior |
| Field Sales | 20-30% | 15-25 dias | Venda consultiva, meio do caminho |
| Eventos | 35-45% | 7-15 dias | Ticket menor, decisao rapida |
| Digital / Online | 30-40% | 5-10 dias | Self-serve parcial, ciclo curto |

---

## Mapeamento Databricks

### Tabela: `distribuicao_leads_resultado`

| Campo | Uso nos Benchmarks |
|-------|-------------------|
| Resultado da distribuicao | Mede se lead foi distribuido corretamente |
| Tempo de primeiro contato | Valida SLA de contato (<5 min para inbound) |
| Canal de origem | Diferencia inbound vs outbound para benchmarks |
| SDR responsavel | Permite benchmark por SDR individual |

### Tabela: `aquisicao`

| Campo | Uso nos Benchmarks |
|-------|-------------------|
| status_do_deal | Calcula win rate e lost rate |
| pipeline_name | Diferencia pipelines para benchmarks especificos |
| etapa_anterior | Calcula conversao entre estagios |
| motivo_lost | Analise de causa raiz de lost |
| data_criacao / data_fechamento | Calcula ciclo medio |

### Tabela: `customer_360_sales_table`

| Campo | Uso nos Benchmarks |
|-------|-------------------|
| Historico completo do cliente | Calcula LTV e recorrencia |
| Produtos adquiridos | Mede cross-sell e upsell |

### Tabela: `order_items`

| Campo | Uso nos Benchmarks |
|-------|-------------------|
| Itens comprados | Ticket medio por segmento e produto |
| Data de compra | Sazonalidade de conversao |

### Tabela: `tb_comissionamento`

| Campo | Uso nos Benchmarks |
|-------|-------------------|
| Comissao por deal | Correlaciona incentivo com performance |
| SDR/AE | Benchmark individual de conversao |

### Queries de Referencia

```sql
-- Win rate por segmento
SELECT
  CASE
    WHEN po.faixa_de_faturamento = '>10MM' THEN 'Enterprise'
    WHEN po.faixa_de_faturamento IN ('1M-10M', '5M-10M', '1M-5M') THEN 'Mid-Market'
    ELSE 'SMB'
  END as segmento,
  COUNT(CASE WHEN a.status_do_deal = 'won' THEN 1 END) * 100.0 / COUNT(*) as win_rate,
  AVG(DATEDIFF(a.data_fechamento, a.data_criacao)) as ciclo_medio
FROM aquisicao a
JOIN persons_overview po ON a.person_id = po.person_id
WHERE a.status_do_deal IN ('won', 'lost')
GROUP BY segmento

-- Conversao por estagio (funil completo)
SELECT
  etapa_anterior as de_estagio,
  LEAD(etapa_anterior) OVER (PARTITION BY deal_id ORDER BY data_movimentacao) as para_estagio,
  COUNT(*) as movimentacoes
FROM aquisicao
GROUP BY de_estagio, para_estagio

-- Benchmark real vs esperado (distribuicao_leads_resultado)
SELECT
  canal_origem,
  COUNT(*) as total_leads,
  AVG(tempo_primeiro_contato_minutos) as tempo_medio_contato,
  COUNT(CASE WHEN tempo_primeiro_contato_minutos <= 5 THEN 1 END) * 100.0 / COUNT(*) as pct_dentro_sla
FROM distribuicao_leads_resultado
GROUP BY canal_origem

-- DQI medio por SDR (proxy: campos preenchidos)
SELECT
  sdr_responsavel,
  AVG(
    CASE WHEN perfil IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN dor_identificada IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN impacto_quantificado IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN decisor_mapeado IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN timing_definido IS NOT NULL THEN 1 ELSE 0 END
  ) as dqi_medio
FROM qualificacao_sdr
GROUP BY sdr_responsavel
ORDER BY dqi_medio DESC
```

---

## Skills que Usam

| Skill | Como Usa os Benchmarks de Conversao |
|-------|-------------------------------------|
| `pipeline-analyzer` | Compara metricas reais com benchmarks para diagnostico |
| `forecast-engine` | Usa conversao esperada por segmento para previsao ponderada |
| `deal-coach` | Avalia se deal esta dentro dos benchmarks ou se precisa de intervencao |
| `alert-system` | Dispara alertas quando metricas ficam abaixo dos thresholds |
| `qualification-engine` | Calcula DQI e valida prontidao para handoff |
| `reporting-dash` | Exibe benchmarks vs real em dashboards |
| `sdr-performance` | Avalia performance individual de SDR contra benchmarks |
| `handoff-validator` | Bloqueia handoff quando DQI < minimo para o segmento |

---

## DQI Pentagon Score - 5 Dimensoes (Doc 12)

### Definicao Expandida

O DQI Pentagon e o modelo avancado de avaliacao de qualidade com 5 dimensoes independentes, cada uma pontuada de 0 a 100. Substitui o modelo simplificado de 0-5 para avaliacao de profundidade.

### As 5 Dimensoes

```
1. ICP_FIT_ACCURACY (0-100):
   Mede: Se o produto recomendado corresponde a Revenue Taxonomy do lead
   Score 100: Tier 1 encaminhado para Imersao/Club. Tier 2 encaminhado para Online/Traction
   Score 0: Tier 2 encaminhado para Senior Closer. Produto fora do tier elegivel
   Regra: Produto DEVE combinar com faixa de faturamento

2. FRAME_INTEGRITY (0-100):
   Mede: Se o framework correto foi aplicado conforme a persona
   Score 100: Challenger com Titan, SPICED com Builder, SPIN com Executor
   Score 0: SPICED com Titan (proibido), Challenger com Tier 2 SMB
   Regra: NUNCA implorar para Titan. Nunca "mendigar" reuniao com Soberano

3. STATE_TIMING (0-100):
   Mede: Se o SDR esperou o estado correto antes de propor
   Score 100: Proposta SOMENTE apos lead estar Problem-Aware
   Score 0: Tentativa de close com lead ainda em estado Cold ou Curious
   Regra: Esperar sinal de Problem-Aware antes de qualquer proposta

4. ECOSYSTEM_PROTECTION (0-100):
   Mede: Capacidade de bloquear leads toxicos antes do Closer
   Score 100: Lead toxico identificado e BLOQUEADO (nao passou para Closer)
   Score 0: Lead toxico empurrado para Closer para "bater meta"
   Regra: Bloquear lead toxico = pontuacao MAXIMA nesta dimensao

5. DATA_DENSITY (0-100):
   Mede: Completude do Intelligence Block no handoff
   Score 100: Todos os campos preenchidos com dados reais e verificados
   Score 0: Campos com [NAO DECLARADO] ou resumos genericos/preguicosos
   Regra: Para campos sem informacao, usar [NAO DECLARADO] em vez de inventar
```

### Exemplos de DQI Pentagon (Doc 12)

```
EXEMPLO 1 - DOWNSELL PERFEITO (DQI = 96):
  Contexto: Lead Tier 2 queria Imersao Presencial (R$15k+)
  Acao SDR: Identificou que faturamento < R$500k, NEGOU Imersao
            Redirecionou para G4 Traction (produto correto para o tier)
            Vendeu Traction com Business Case adequado
  Resultado: ICP_Fit=100, Frame=95, State=95, Ecosystem=100, Data=90
  Licao: Downsell correto > Upsell forcado. Proteger ecossistema = DQI alto

EXEMPLO 2 - VENDA TOXICA (DQI = 40):
  Contexto: Lead Tier 1 com perfil toxico (Empreendedor de Palco)
  Acao SDR: Ignorou sinais de perfil toxico, forcou qualificacao
            Empurrou para Senior Closer para "bater meta"
  Resultado: ICP_Fit=60, Frame=40, State=50, Ecosystem=0, Data=50
  Licao: Lead toxico no Closer = destruicao de ecossistema. Score Ecosystem = 0
```

---

## Formula COI - Custo da Inacao (Doc 14.1)

### Calculo

```
COI = Faturamento_Anual x %Ineficiencia x 12_meses

Exemplo:
  Empresa fatura R$5MM/ano
  Ineficiencia estimada em vendas: 15%
  COI = R$5.000.000 x 0.15 x 1 = R$750.000/ano perdidos

Uso: Apresentar para o lead quanto ele PERDE por nao agir.
     "Voce esta perdendo R$750k por ano por nao resolver esse problema."
```

---

## Formula ROI - Retorno sobre Investimento (Doc 14.1)

### Calculo do BreakEven

```
BreakEven = Investimento / Margem_Liquida_Mensal_Gerada

Exemplo:
  Investimento no programa G4: R$30.000
  Margem liquida incremental esperada: R$10.000/mes
  BreakEven = R$30.000 / R$10.000 = 3 meses para se pagar

Uso: Mostrar que o investimento se paga em X meses.
     "Em 3 meses o programa ja se pagou. Os outros 9 meses do ano sao lucro puro."
```

---

## Logica "Viver o Dinheiro" (Doc 14.1)

### Reframe do Preco Total como Impacto Mensal

```
REGRA_VIVER_O_DINHEIRO:
  Objetivo: Transformar o preco total em impacto no fluxo de caixa mensal

  Exemplo:
    Preco total: R$30.000
    Parcelado em 12x: R$2.500/mes
    COI mensal do problema: R$62.500/mes (R$750k/12)

    Reframe: "Voce investe R$2.500/mes para resolver um problema
              que te custa R$62.500/mes. Para cada R$1 investido,
              voce economiza R$25."

  Quando usar: Sempre que lead levantar objecao de preco
  Quando NAO usar: Se lead nao tem dor quantificada (precisa do COI primeiro)
```

---

## Bloqueio de Prematuridade (Doc 10)

### Regra de Prematurity Block

```
REGRA_PREMATURITY_BLOCK:
  SE tentativa_de_close E estado_lead < "Problem-Aware":
    BLOQUEAR tentativa
    RETORNAR erro: "ERRO DE PROCESSO: Lead ainda nao esta Problem-Aware.
                    Volte para discovery antes de tentar fechar."

  Estados do lead (CSE - Customer State Engine):
    1. COLD - Nao sabe que tem problema
    2. CURIOUS - Interessado mas nao conectou com dor
    3. PROBLEM-AWARE - Sabe que tem problema e sente a dor
    4. SOLUTION-AWARE - Sabe que existem solucoes
    5. DECISION-READY - Pronto para decidir

  Fechar so e permitido a partir de SOLUTION-AWARE
  Propor so e permitido a partir de PROBLEM-AWARE
```

---

## Autoridade pelo Silencio (Doc 15)

### Regra Authority by Silence

```
REGRA_AUTHORITY_BY_SILENCE:
  SE resposta_lead IN ["ok", "show", "manda", emoji, mensagem curta]:
    E DEPOIS silencio_total:
      Interpretacao: Lead demonstrou interesse mas nao tem autoridade
                     OU esta testando se SDR vai perseguir
      Acao: NAO perseguir desesperadamente
            Aplicar silencio estrategico (24-48h)
            Retomar com valor, nao com cobranca
            Exemplo: "Vi um case que tem tudo a ver com o desafio que voce
                      mencionou. Posso compartilhar?"
```

---

## Positive_Tension > Closing (Doc 8)

### Classificacao de reaction_sentiment

```
REGRA_POSITIVE_TENSION:
  Quando framework Challenger gera tensao positiva:
    reaction_sentiment = "positive_tension"
    Significado: Lead foi desafiado, sentiu desconforto produtivo,
                 esta reconsiderando suas certezas
    Acao: AVANCAR para closing. Tensao positiva e sinal de compra

  Quando tensao e negativa:
    reaction_sentiment = "negative_tension"
    Significado: Lead se sentiu atacado, defensivo, ofendido
    Acao: RECUAR imediatamente. Pedir desculpas e retomar rapport
```

---

## Regra Zero Impact (Doc 7)

### Bloqueio de Venda Consultiva sem Impacto Quantificado

```
REGRA_ZERO_IMPACT:
  SE lead NAO consegue quantificar impacto negativo do problema:
    BLOQUEAR venda consultiva
    Motivo: Sem numero de impacto, nao ha Business Case
            Sem Business Case, a venda depende de emocao pura
            Emocao pura = alto risco de cancelamento/arrependimento

  Acao: Voltar para discovery e ajudar o lead a quantificar
        "Quanto voce estima que esse problema te custa por mes?"
        "Quantos clientes voce perde por causa disso?"

  Excecao: Tier 2 / SMB pode fechar sem Business Case formal
           (decisao rapida, ticket baixo, emocao e suficiente)
```

---

## Proibicao de Urgencia Alucinada (Doc 7)

### Hallucinated Urgency Ban

```
REGRA_HALLUCINATED_URGENCY_BAN:
  PROIBIDO inventar Critical Events artificiais
  PROIBIDO criar urgencia que nao existe na realidade do lead

  EXEMPLOS PROIBIDOS:
    - "So temos 2 vagas" (quando tem 20)
    - "O preco sobe semana que vem" (quando nao sobe)
    - "O CEO do G4 vai estar nessa turma" (quando nao vai)
    - "Essa condicao e so para hoje" (quando e padrao)

  EXEMPLOS PERMITIDOS:
    - "A proxima turma e em marco, se voce quer resolver antes do Q2..."
      (urgencia REAL baseada em calendario do lead)
    - "Voce mencionou que o board cobra resultados em abril..."
      (urgencia do LEAD, nao inventada)

  Penalidade: Urgencia alucinada detectada = DQI Frame_Integrity = 0
```

---

## Fluxo CQL -> MQL (Canal Social DM)

### Definicao

No canal Social DM, o funil nao comeca no MQL — comeca no CQL (Conversa Qualificada para Lead).
CQL e uma etapa pre-MQL exclusiva do Social DM, gerada pela conversao de atencao difusa em intencao privada.

```
FLUXO_SOCIAL_DM:
  Atencao Difusa (Like / Comentario / View)
    → [TP1: Gatilho de Curiosidade] — SDR abre conversa na DM
    → [TP2: Diagnostico] — Lead responde com dor ou contexto
    → CQL GERADO (Conversa Qualificada)
    → [TP3: Reframe / Provocacao] — Sistema gera tensao positiva
    → [TP4: Conversao] — CTA para WhatsApp ou Call
    → MQL CONFIRMADO (Lead Qualificado por Marketing/Conversa)
    → Handoff para SDR humano
```

### Criterios de CQL (Social DM)

```
CQL_CRITERIOS:
  OBRIGATORIO para classificar como CQL:
  - Lead respondeu a DM de forma substantiva (nao apenas emoji)
  - Mencionou empresa, cargo OU dor de negocio
  - Nao desqualificado imediatamente (Perfil I/J < R$500k)
  - Conversa chegou ao TP2 (Diagnostico)

  NAO e CQL:
  - Lead respondeu apenas com emoji ou "ok"
  - Lead pediu preco na DM (killer question — cortar)
  - Lead nao identificado ou bot
  - Perfil I/J (<R$500k): direcionar para automacao, nao gera CQL
```

### CQL vs MQL — Diferenca Critica

| Dimensao | CQL | MQL |
|----------|-----|-----|
| Origem | Social DM (conversa privada) | Qualquer canal com interesse declarado |
| Validacao | Respondeu e revelou contexto | ICP confirmado + dor mapeada |
| Proximo Passo | Mover para WhatsApp/Call | Handoff para SDR Sênior |
| Produto na cabeca | NENHUM — objetivo e reuniao | Produto pode ser discutido |
| Quem opera | Founder Proxy (modo Tallis/Nardon/Alfredo) | SDR Humano Sênior |

### Regras de Conversao CQL → MQL

```
REGRA_CQL_PARA_MQL:
  SE CQL atingiu TP3 (Reframe) E lead mostrou tensao positiva:
    → CTA Imperativo: "manda teu zap q o Nathan te mostra o modelo"
    → CQL PROMOVIDO A MQL
    → Ativar Hot Handover para Tier 1 (>R$10MM)

  SE CQL travou no TP2 sem aprofundar:
    → Nao promover. Retornar ao TP1 com nova provocacao
    → Maximo 2 tentativas. Se nao evoluir → Silence Protocol

  SE CQL revelou Perfil Toxico (Palco, Anti-Metodo):
    → BLOQUEIO IMEDIATO. Nao converter em MQL.
    → Log no CRM: motivo_lost = "Perfil Toxico Social DM"
```

### Hot Handover (Tier 1 Elite)

```
HOT_HANDOVER_PROTOCOL:
  Gatilho: Lead Tier 1 (>R$10MM) responde positivamente no TP4
  Acao: SDR envia link do Meet/Zoom JA ABERTO
  Script: "O Nathan ta na sala agora, entra ai pra ele te mostrar o modelo."
  Objetivo: Blindar Show Rate proximo de 100%
  PROIBIDO: Agendamento assincrono para Tier 1 Elite em Social DM
```

### Matematica do Social DM (RPL)

```
RPL_SOCIAL_DM:
  Lead Elite Social DM (Perfil A/B, Tier 1): RPL = R$8.400
  Lead Comum (outros canais): RPL = R$1.200
  Ratio: 1 Lead Elite Social DM = 7 Leads Comuns

  Implicacao para SDR: Prioridade Zero = Perfil A/B no Social DM
  80% do tempo SDR Sênior deve estar neste perfil
```

### Regra: Social DM Nao Vende Produto

```
REGRA_SOCIAL_DM_NAO_VENDE:
  PROIBIDO na DM:
  - Apresentar produto ou programa
  - Mencionar preco
  - Enviar material (ebook, deck, proposta)
  - Responder perguntas tecnicas ("tem certificado?")

  PERMITIDO na DM:
  - Criar curiosidade
  - Mapear dor superficialmente
  - Provocar reframe
  - Converter para WhatsApp/Call (o produto NUNCA e vendido na DM)

  SE lead insistir em tecnico/preco na DM:
    KILL SWITCH: Ignorar a pergunta tatica
    Devolver com curiosidade estrategica: "depende do q tu quer resolver primeiro."
```

---

## Notas Importantes

1. **Benchmarks sao referencias, nao absolutos** - devem ser recalibrados trimestralmente com dados reais da `distribuicao_leads_resultado`
2. **Sazonalidade afeta benchmarks** - Jan-Mar e Jul-Set tendem a ter conversao mais alta (epoca de Imersoes)
3. **DQI e o gate mais importante do processo** - handoff prematuro e a principal causa de perda de deals qualificados
4. **Inbound e outbound devem ser analisados separadamente** - misturar corrompe os benchmarks
5. **Pipeline coverage e tao importante quanto conversao** - alta conversao com baixo volume ainda nao bate meta
6. **Motivo_lost e obrigatorio para calibracao** - sem ele, nao ha como ajustar benchmarks
7. **Dados da `distribuicao_leads_resultado` sao a fonte de verdade** - benchmarks deste MCP sao ponto de partida, dados reais devem prevalecer quando disponiveis
