# MCP: Lead Profile
## Camada Semantica - Tipos de Lead no Contexto G4 Educacao

---

## Definicao

Este MCP define os tipos de lead utilizados pelo sistema Elucy v2, mapeando as personas internas da G4 Educacao para categorias operacionais de vendas. O perfil do lead determina a complexidade do ciclo, o playbook aplicado e a probabilidade de conversao.

---

## Tipos de Lead (Personas G4)

### 1. Soberano / Titan
- **Categoria operacional:** `enterprise_decision_maker`
- **Quem e:** CEO, Founder ou socio majoritario de empresa com faturamento acima de R$10MM (Tier Elite)
- **Complexidade:** Alta
- **Ciclo medio:** 45-90 dias
- **Caracteristicas:**
  - Decide sozinho, mas tem agenda restrita
  - Responde a provocacao intelectual (Challenger Sale)
  - Nao tolera abordagem generica ou scripts
  - Valoriza dados, cases e ROI comprovado
- **Regras de abordagem:**
  - Obrigatorio usar framework Challenger (teach, tailor, take control)
  - Primeira interacao deve conter insight de mercado relevante
  - Nunca iniciar com pitch de produto
  - Multi-thread recomendado como estrategia de suporte, nao como porta de entrada
- **Probabilidade de conversao:** 15-25% (outbound) | 30-40% (inbound qualificado)

### 2. Trator / Builder
- **Categoria operacional:** `mid_market_ceo`
- **Quem e:** CEO ou Founder de empresa com faturamento entre R$1M e R$10M (Tier Builders)
- **Complexidade:** Media
- **Ciclo medio:** 15-30 dias
- **Caracteristicas:**
  - Acessivel, decide rapido quando ve valor claro
  - Busca crescimento acelerado e networking
  - Sensivel a prova social (quem mais participa)
  - Responde bem a SPICED bem executado
- **Regras de abordagem:**
  - Framework SPICED obrigatorio (Situation, Problem, Impact, Critical Event, Decision)
  - Conectar dor atual com resultado tangivel em 6-12 meses
  - Urgencia natural: janela de crescimento
  - Se SPICED bem feito, ciclo pode fechar em 7-15 dias
- **Probabilidade de conversao:** 25-35% (outbound) | 40-55% (inbound qualificado)

### 3. Braco Direito / Executor
- **Categoria operacional:** `smb_influencer` ou `enterprise_champion`
- **Quem e:** Diretor, Head ou VP de empresa mid-market ou enterprise
- **Complexidade:** Media-Alta (depende do acesso ao decisor)
- **Ciclo medio:** 30-60 dias
- **Caracteristicas:**
  - Nao e o decisor final, mas influencia fortemente
  - Precisa de argumentos para "vender internamente"
  - Valoriza conteudo que pode repassar ao CEO
  - Pode ser convertido em Champion interno
- **Regras de abordagem:**
  - Obrigatorio estrategia multi-thread para chegar ao CEO
  - Fornecer materiais de enablement (cases, ROI calculado, benchmarks)
  - Nunca tratar como decisor final sem confirmar autoridade de compra
  - Mapear organograma: quem mais precisa estar na conversa?
- **Probabilidade de conversao:** 10-20% (se ficar apenas no Executor) | 30-40% (se multi-thread ativado com sucesso)

---

## Categorias Operacionais Complementares

| Categoria | Descricao | Mapeamento G4 |
|-----------|-----------|---------------|
| `enterprise_decision_maker` | Decisor C-level em empresa >R$10MM | Soberano/Titan |
| `mid_market_ceo` | CEO acessivel em empresa R$1M-R$10M | Trator/Builder |
| `smb_influencer` | Influenciador sem poder de decisao final | Executor sem acesso ao CEO |
| `enterprise_champion` | Influenciador que vira aliado interno | Executor com estrategia multi-thread |
| `smb_operator` | Operador em empresa <R$1MM (Tier 2) | Lead Tier 2 - ciclo curto, ticket baixo |
| `inbound_hot` | Qualquer persona com intencao alta de compra declarada | Lead que solicitou contato ou demo |
| `reactivation_target` | Lead que ja passou pelo funil e nao converteu | Ex-oportunidade com motivo_lost mapeado |

---

## Regras de Complexidade

```
SE faixa_de_faturamento > R$10MM:
    complexidade = "alta"
    ciclo_esperado = "longo" (45-90 dias)
    playbook = "outbound_enterprise" ou "inbound_complex"
    framework = "Challenger Sale"

SE faixa_de_faturamento ENTRE R$1MM E R$10MM:
    complexidade = "media"
    ciclo_esperado = "medio" (15-30 dias)
    playbook = "outbound_builder" ou "inbound_fast"
    framework = "SPICED"

SE faixa_de_faturamento < R$1MM:
    complexidade = "baixa"
    ciclo_esperado = "curto" (7-15 dias)
    playbook = "inbound_fast"
    framework = "SPIN basico"
    ALERTA: bloqueado para Imersoes Presenciais (ticket incompativel)

SE cargo IN ("Diretor", "Head", "VP", "Gerente") E faixa_de_faturamento > R$1MM:
    tipo = "executor"
    OBRIGATORIO: ativar multi-thread
    OBJETIVO: mapear e alcançar o CEO
```

---

## Mapeamento Databricks

### Tabela: `persons_overview`

| Campo Databricks | Uso no Lead Profile | Exemplo de Valor |
|-------------------|---------------------|------------------|
| `perfil` | Classificacao primaria da persona | "Soberano", "Trator", "Braco Direito" |
| `faixa_de_faturamento` | Determina tier e complexidade | ">10MM", "1M-10M", "<1MM" |
| `cargo` | Identifica se e decisor ou influenciador | "CEO", "Founder", "Diretor Comercial" |
| `segmento` | Vertical de atuacao da empresa | "SaaS", "Varejo", "Servicos" |
| `pa_cliente` | Indica se ja e cliente G4 (potencial upsell) | true/false |
| `cluster_rfm` | Segmentacao RFM para clientes existentes | "Champions", "At Risk", "Hibernating" |

### Queries de Referencia

```sql
-- Identificar Titans no pipeline
SELECT * FROM persons_overview
WHERE perfil = 'Soberano'
AND faixa_de_faturamento = '>10MM'

-- Identificar Builders com potencial de conversao rapida
SELECT * FROM persons_overview
WHERE perfil = 'Trator'
AND faixa_de_faturamento BETWEEN '1MM' AND '10MM'

-- Identificar Executores que precisam de multi-thread
SELECT * FROM persons_overview
WHERE perfil = 'Braco Direito'
AND cargo IN ('Diretor', 'Head', 'VP')
AND faixa_de_faturamento > '1MM'
```

---

## Skills que Usam

| Skill | Como Usa o Lead Profile |
|-------|------------------------|
| `qualification-engine` | Determina complexidade e playbook com base no tipo de lead |
| `signal-scorer` | Ajusta peso dos sinais conforme perfil (Titan tem threshold mais alto) |
| `meeting-prep` | Gera briefing adaptado a persona (Challenger para Titan, SPICED para Builder) |
| `deal-coach` | Recomenda proximos passos considerando tipo de lead e estagio |
| `multi-thread-advisor` | Ativado automaticamente para leads tipo Executor |
| `pipeline-analyzer` | Agrupa metricas de conversao por tipo de lead |
| `reactivation-engine` | Usa perfil historico para calibrar re-abordagem |

---

## Notas Importantes

1. **Um lead pode mudar de categoria** durante o ciclo (ex: Executor que revela ser co-founder com poder de decisao)
2. **O perfil Databricks pode estar desatualizado** - sempre validar na primeira conversa
3. **Leads Tier 2 (SMB <R$1MM) nao sao elegíveis para Imersoes Presenciais** - direcionar para produtos Digital/Online
4. **pa_cliente = true muda completamente a abordagem** - de aquisicao para expansao/upsell

---

## Perfis Oficiais A-M (Canonico - Doc 2 ICP + Perfis de Clientes)

Classificacao oficial de perfis por cargo e faturamento da empresa:

| Perfil | Cargo | Faturamento | Descricao |
|--------|-------|-------------|-----------|
| **A** | Socio | >R$10MM | Socio de empresa com faturamento acima de 10 milhoes |
| **B** | CEO | >R$10MM | CEO de empresa com faturamento acima de 10 milhoes |
| **C** | Socio | R$1M-R$10M | Socio de empresa mid-market |
| **D** | CEO | R$1M-R$10M | CEO de empresa mid-market |
| **E** | Diretor | >R$10MM | Diretor de empresa enterprise |
| **F** | VP/C-Level | >R$10MM | VP ou C-Level de empresa enterprise |
| **G** | Diretor | R$1M-R$10M | Diretor de empresa mid-market |
| **H** | VP/C-Level | R$1M-R$10M | VP ou C-Level de empresa mid-market |
| **I** | Socio/CEO | R$500K-R$1M | Socio ou CEO de empresa pequena |
| **J** | VP/Diretor/Gerente | R$500K-R$500M | VP, Diretor ou Gerente em faixa ampla |
| **K** | Socio/CEO/Diretor | <R$500K | Qualquer cargo decisor em microempresa |
| **L** | Coordenador/Analista | Qualquer | Coordenador ou Analista independente do faturamento |
| **M** | Qualquer cargo | Sem faturamento informado | Empresa sem faturamento registrado no sistema |

---

## 3 Personas Oficiais (Canonico - Doc 3)

### Soberano / Titan
- **Perfis mapeados:** A, B
- **Quem e:** CEO ou Founder de empresa com faturamento >R$10MM
- **Framework OBRIGATORIO:** Challenger Sale
- **Motivacao:** Teme se tornar irrelevante no mercado
- **Abordagem:** Peer-to-peer, provocacao intelectual, desafio de premissas

### Trator / Builder
- **Perfis mapeados:** C, D
- **Quem e:** CEO ou Founder de empresa com faturamento R$1M-R$10M
- **Framework OBRIGATORIO:** SPICED
- **Motivacao:** Teme crise de caixa / nao conseguir escalar
- **Abordagem:** Diagnostico rapido, arquitetura de solucao, ROI de 3 meses

### Braco Direito / Executor
- **Perfis mapeados:** E, F, H
- **Quem e:** Diretor, VP ou Head de empresa mid-market ou enterprise
- **Framework OBRIGATORIO:** SPIN + Champion Selling
- **Motivacao:** Teme parecer incompetente internamente
- **Abordagem:** Co-conspirador politico, armar com argumentos para vender internamente

---

## Framework por Persona - REGRA INVIOLAVEL

```
TITAN  = Challenger Sale APENAS (SPICED e PROIBIDO para Titan)
BUILDER = SPICED (framework padrao)
EXECUTOR = SPIN + Champion Selling

VIOLACAO: Usar SPICED com Titan ou Challenger com Builder e ERRO DE PROCESSO.
O sistema DEVE bloquear a execucao se o framework errado for aplicado a persona.
```

---

## Deteccao de CEO de MEI (Canonico - Doc 5)

```
REGRA: CEO de MEI / Microempresa
SE Cargo = "CEO" E Revenue < R$500K:
    ENTAO: System DOWNGRADES Authority Score automaticamente
    MOTIVO: CEO de microempresa nao tem o mesmo peso decisorio que CEO enterprise
    PERFIL REAL: K (nao B ou D)
    ACAO: Tratar como Tier 2, nao aplicar framework Titan/Builder
```

---

## Estrutura SPICED_Object (Canonico - Doc 7)

Campos obrigatorios do objeto SPICED para qualificacao completa:

```json
{
  "spiced_object": {
    "operational_maturity": "nivel de maturidade operacional da empresa",
    "founder_dependency": "grau de dependencia do founder nas operacoes",
    "root_cause": "causa raiz do problema identificado",
    "pain_category": "categoria da dor (growth, retention, operations, leadership)",
    "financial_impact_estimated": "impacto financeiro estimado da dor em R$",
    "compelling_event_date": "data do evento critico que gera urgencia",
    "decision_process": "processo de decisao descrito pelo lead",
    "economic_buyer_identified": "true/false - comprador economico foi identificado"
  }
}
```

---

## CSE_Status Writeback (Canonico - Doc 10)

Estrutura de writeback do estado CSE (Customer State Engine) no sistema:

```json
{
  "cse_status": {
    "current_state": "estado atual do lead no CSE (ex: PROBLEM-AWARE)",
    "previous_state": "estado anterior (ex: CURIOUS)",
    "transition_trigger": "evento que causou a transicao (ex: financial_impact_confirmed)",
    "time_in_state": "tempo em segundos/minutos/horas no estado atual"
  }
}
```

---

## Intelligence Block Template (Canonico - Doc 13)

Template padrao para geracao de blocos de inteligencia do lead. Ordem OBRIGATORIA:

```
1. PERFIL & CONTEXTO
   - Persona identificada, perfil A-M, tier, faturamento, cargo
   - Contexto da empresa e do momento atual

2. DIAGNOSTICO SPICED
   - Situation, Problem, Impact, Critical Event, Decision
   - Campos do SPICED_Object preenchidos

3. STATUS CSE
   - Estado atual, estado anterior, trigger da transicao
   - Tempo no estado atual

4. GOVERNANCA & RISCO
   - Red flags identificados
   - Riscos do deal
   - Compliance de processo (framework correto aplicado?)

5. NEXT ACTION
   - Proxima acao recomendada
   - Playbook ativo
   - Deadline para acao
```

---

## Mapeamento de Buying Committee (Canonico - Doc 9)

Campos para mapeamento do comite de compra em deals enterprise:

```json
{
  "buying_committee": {
    "economic_buyer": "quem assina o cheque (geralmente CEO/CFO)",
    "user_buyer": "quem vai usar o produto/servico",
    "technical_buyer": "quem avalia viabilidade tecnica/operacional",
    "coach": "aliado interno (Champion/Executor)",
    "blocker": "quem pode vetar a compra",
    "influencers": ["lista de influenciadores identificados"]
  },
  "approval_process": {
    "steps": "descricao das etapas de aprovacao",
    "timeline": "tempo estimado do processo de aprovacao",
    "criteria": "criterios usados para aprovar o investimento",
    "budget_owner": "quem controla o orcamento"
  }
}
```
