# MCP: Segments
## Camada Semantica - Segmentos de Mercado G4 Educacao

---

## Definicao

Este MCP define os segmentos de mercado utilizados pelo sistema Elucy v2, mapeando tiers internos da G4 Educacao a categorias operacionais de vendas. O segmento determina o ciclo esperado, os produtos elegiveis, a complexidade da venda e as metricas de benchmark.

---

## Segmentos por Faturamento (Tiers G4)

### 1. Enterprise (Tier Elite)
- **Codigo:** `enterprise`
- **Faixa de faturamento:** > R$10MM anuais
- **Tier G4:** Elite
- **Persona predominante:** Soberano / Titan
- **Ciclo medio de venda:** 45-90 dias
- **Ticket medio:** Alto (Imersoes Premium, programas customizados)
- **Complexidade:** Alta

**Caracteristicas:**
- Multiplos stakeholders envolvidos na decisao
- Processo de compra formalizado (procurement, compliance)
- CEO acessivel mas com agenda restrita
- Sensivel a exclusividade e networking de alto nivel
- Compara com concorrentes sofisticados (Endeavor, programas internacionais)

**Regras de operacao:**
- Obrigatorio framework Challenger Sale
- Multi-thread recomendado desde o inicio
- Discovery profundo antes de qualquer proposta
- Business case com ROI obrigatorio
- Minimo 2 reunioes antes de enviar proposta
- Nunca oferecer desconto sem justificativa estrategica

**Produtos elegiveis:** Todos (Imersoes Presenciais, Club, Scale, Digital, Eventos)
**Linha de receita prioritaria:** Imersoes Presenciais, Retencao/Club

### 2. Mid-Market (Tier Builders)
- **Codigo:** `mid_market`
- **Faixa de faturamento:** R$1MM a R$10MM anuais
- **Tier G4:** Tier 1-B / Builders
- **Persona predominante:** Trator / Builder
- **Ciclo medio de venda:** 15-30 dias
- **Ticket medio:** Medio
- **Complexidade:** Media

**Caracteristicas:**
- CEO geralmente acessivel e decide rapido
- Processo de compra menos formalizado
- Alta sensibilidade a prova social (quem mais participa)
- Busca aceleracao de crescimento e networking pratico
- Responde bem a urgencia e escassez

**Regras de operacao:**
- Framework SPICED obrigatorio
- Objetivo: fechar em 2-3 interacoes
- SPICED completo na primeira reuniao
- Proposta pode ser enviada na primeira reuniao se sinais de buy
- Urgencia natural: "proxima turma em X dias"
- Case de empresario similar e arma principal

**Produtos elegiveis:** Todos (Imersoes Presenciais, Club, Scale, Digital, Eventos)
**Linha de receita prioritaria:** Imersoes Presenciais, Field Sales

### 3. SMB (Tier 2)
- **Codigo:** `smb`
- **Faixa de faturamento:** < R$1MM anuais
- **Tier G4:** Tier 2
- **Persona predominante:** Operador / Empreendedor inicial
- **Ciclo medio de venda:** 7-15 dias
- **Ticket medio:** Baixo
- **Complexidade:** Baixa

**Caracteristicas:**
- Decisor unico (geralmente o proprio empresario)
- Decisao emocional e rapida
- Sensivel a preco
- Busca conhecimento basico e inspiracao
- Menos networking-driven, mais conteudo-driven

**Regras de operacao:**
- Framework SPIN basico (Situation, Problem, Implication, Need-payoff)
- Ciclo curto: fechar em 1-2 interacoes
- **BLOQUEIO: Nao elegivel para Imersoes Presenciais** (ticket incompativel)
- Direcionar para produtos Digital/Online e Eventos
- Automacao de follow-up preferencial (eficiencia)
- Nao investir tempo excessivo em discovery

**Produtos elegiveis:** Digital/Online, Eventos (Imersoes Presenciais BLOQUEADO)
**Linha de receita prioritaria:** Digital/Online, Eventos

---

## Segmentos por Verticais de Industria

### Verticais Relevantes para G4

| Vertical | Codigo | Caracteristicas no Contexto G4 | Prevalencia |
|----------|--------|-------------------------------|-------------|
| Educacao | `educacao` | Donos de escolas, cursos, EdTechs. Empatia natural com produto. | Alta |
| SaaS / Tecnologia | `saas` | Founders de startups e scale-ups. Data-driven, ciclo rapido. | Alta |
| Varejo | `varejo` | Donos de redes, franquias, e-commerce. Foco em escala e gestao. | Alta |
| Servicos | `servicos` | Consultorias, agencias, escritorios. Networking-driven. | Media |
| Industria | `industria` | Fabricantes, distribuidores. Ciclo mais longo, decisao racional. | Media |
| Agro | `agro` | Produtores rurais, agrotech. Sazonalidade forte, ticket alto. | Media |
| Saude | `saude` | Clinicas, hospitais, health-techs. Regulamentacao influencia. | Media |
| Construcao | `construcao` | Incorporadoras, construtoras. Ciclico, sensivel a economia. | Baixa-Media |
| Franquias | `franquias` | Franqueadores e multi-franqueados. Foco em escala e padronizacao. | Media |
| Financeiro | `financeiro` | Fintechs, assessorias, gestoras. Sofisticado, compara muito. | Baixa-Media |

### Regras por Vertical

```
SE vertical = "saas":
  - Abordagem data-driven (metricas, unit economics, benchmarks)
  - Ciclo tende a ser mais curto (founders decidem rapido)
  - Interesse em networking com outros founders
  - Case de SaaS similar e muito efetivo

SE vertical = "varejo":
  - Foco em gestao de pessoas e escala operacional
  - Interesse em metodologia de execucao
  - Sazonalidade: pico de interesse pos-Black Friday e inicio de ano
  - Multi-unidade = decisao mais complexa

SE vertical = "industria":
  - Ciclo mais longo, decisao racional
  - Precisa de ROI comprovado com numeros
  - Menos sensivel a prova social, mais a resultado concreto
  - Pode envolver diretoria/conselho

SE vertical = "agro":
  - Sazonalidade forte (pos-safra = maior disponibilidade e liquidez)
  - Ticket alto mas sensibilidade a timing
  - Networking regional importante
  - Deslocamento para presencial pode ser barreira

SE vertical = "servicos":
  - Networking e a principal motivacao
  - Busca diferenciacao e posicionamento
  - Ciclo medio, decisao do socio fundador
  - Case de servicos similar e critico
```

---

## Matriz Segmento x Produto

| Produto | Enterprise | Mid-Market | SMB |
|---------|-----------|------------|-----|
| Imersoes Presenciais | Prioritario | Prioritario | BLOQUEADO |
| Retencao / Club | Estrategico | Estrategico | Acessivel |
| Field Sales | Ativo | Prioritario | Limitado |
| Eventos | Complementar | Ativo | Prioritario |
| Digital / Online | Complementar | Ativo | Prioritario |

---

## Regras de Comportamento por Segmento

### Enterprise (>R$10MM)
```
ciclo_esperado = "longo" (45-90 dias)
stakeholders = "multiplos" (CEO + Diretoria + Financeiro)
framework = "Challenger Sale"
multi_thread = OBRIGATORIO
discovery_profundidade = "alta" (minimo 2 reunioes)
proposta_timing = "somente apos discovery completo"
desconto_politica = "somente estrategico com aprovacao"
playbooks_aplicaveis = ["outbound_enterprise", "inbound_complex", "multi_thread_strategy", "champion_building"]
alerta_stall = 14 dias sem atividade
```

### Mid-Market (R$1MM-R$10MM)
```
ciclo_esperado = "medio" (15-30 dias)
stakeholders = "unico_ou_poucos" (CEO, maximo CEO + socio)
framework = "SPICED"
multi_thread = OPCIONAL (ativar se Executor)
discovery_profundidade = "media" (1 reuniao pode ser suficiente)
proposta_timing = "pode ser na primeira reuniao se sinais positivos"
desconto_politica = "condicoes padrao, flexibilidade moderada"
playbooks_aplicaveis = ["outbound_builder", "inbound_fast", "upsell", "expansion"]
alerta_stall = 7 dias sem atividade
```

### SMB (<R$1MM)
```
ciclo_esperado = "curto" (7-15 dias)
stakeholders = "unico" (empresario)
framework = "SPIN basico"
multi_thread = NAO_APLICAVEL
discovery_profundidade = "baixa" (direto ao ponto)
proposta_timing = "imediata se qualificado"
desconto_politica = "condicoes fixas, sem negociacao extensa"
playbooks_aplicaveis = ["inbound_fast"]
alerta_stall = 3 dias sem atividade
produto_bloqueado = ["Imersoes Presenciais"]
```

---

## Mapeamento Databricks

### Tabela: `persons_overview`

| Campo Databricks | Uso no Segmento | Exemplo |
|-------------------|----------------|---------|
| `faixa_de_faturamento` | Classificacao primaria do tier | ">10MM", "1M-10M", "<1MM" |
| `segmento` | Vertical de industria | "SaaS", "Varejo", "Servicos" |
| `perfil` | Persona G4 | "Soberano", "Trator", "Braco Direito" |
| `cargo` | Nivel hierarquico | "CEO", "Diretor", "Head" |
| `pa_cliente` | Status de cliente existente | true/false |
| `cluster_rfm` | Segmentacao comportamental (clientes) | "Champions", "At Risk" |

### Queries de Referencia

```sql
-- Distribuicao de leads por segmento
SELECT
  CASE
    WHEN faixa_de_faturamento = '>10MM' THEN 'Enterprise'
    WHEN faixa_de_faturamento IN ('1M-10M', '5M-10M', '1M-5M') THEN 'Mid-Market'
    ELSE 'SMB'
  END as segmento_tier,
  COUNT(*) as total,
  COUNT(CASE WHEN pa_cliente = true THEN 1 END) as clientes
FROM persons_overview
GROUP BY segmento_tier

-- Pipeline por vertical
SELECT
  po.segmento as vertical,
  COUNT(a.deal_id) as deals,
  AVG(DATEDIFF(a.data_fechamento, a.data_criacao)) as ciclo_medio,
  SUM(CASE WHEN a.status_do_deal = 'won' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as win_rate
FROM aquisicao a
JOIN persons_overview po ON a.person_id = po.person_id
GROUP BY po.segmento

-- SMB tentando comprar Imersao (alerta de bloqueio)
SELECT *
FROM persons_overview po
JOIN aquisicao a ON a.person_id = po.person_id
WHERE po.faixa_de_faturamento = '<1MM'
AND a.pipeline_name LIKE '%Imersao%'
```

---

## Skills que Usam

| Skill | Como Usa os Segmentos |
|-------|----------------------|
| `qualification-engine` | Aplica regras de segmento para definir complexidade e framework |
| `playbook-selector` | Usa segmento + persona para selecionar playbook correto |
| `pipeline-analyzer` | Agrupa metricas por segmento para benchmarking |
| `deal-coach` | Ajusta recomendacoes conforme regras do segmento |
| `alert-system` | Usa thresholds de stall por segmento (3/7/14 dias) |
| `forecast-engine` | Aplica conversao esperada por segmento na previsao |
| `product-matcher` | Valida elegibilidade de produto por segmento (bloqueia Imersao para SMB) |
| `routing-engine` | Distribui leads para SDR/AE conforme segmento e complexidade |

---

## Regras Canonicas ELUCI - ICP Fit Accuracy (Doc 12)

### Precisao de Fit por Tier

```
REGRA ICP_FIT_TIER1:
  SE Faturamento > R$10MM (Tier 1 Elite):
    Produtos elegiveis = Imersoes Presenciais, Club, Mentoria, Black Class
    Encaminhamento = Senior Closer OBRIGATORIO
    Score maximo possivel

REGRA ICP_FIT_TIER2:
  SE Faturamento < R$500k (Tier 2):
    Produtos elegiveis = G4 Online, G4 Traction
    NUNCA encaminhar para Senior Closer
    SE Tier 2 enviado para Senior Closer = Score 0 (violacao grave)

REGRA ICP_FIT_INTERMEDIARIO:
  SE Faturamento entre R$500k e R$10MM:
    Avaliar produto conforme sub-tier
    Builder = Imersoes core, Sprints
```

---

## Elegibilidade de Produto por Tier (Doc 1)

| Tier | Codigo | Produtos Elegiveis |
|------|--------|-------------------|
| Tier 1 Elite (>R$10MM) | `elite` | Imersoes Presenciais, Club, Mentoria, Black Class |
| Tier 1B Builders (R$1MM-R$10MM) | `builders` | Imersoes core, Sprints |
| Tier 2 (<R$1MM) | `tier2` | G4 Traction, G4 Skills, Formacoes, Online |

**Regra critica:** Oferecer produto fora da faixa elegivel e violacao de ICP Fit. Score de qualificacao = 0.

---

## Validacao "Barro na Bota" (Doc 5)

### Cross-check Cargo vs Tamanho da Empresa

```
VALIDACAO_BARRO_NA_BOTA:
  Objetivo: Detectar inconsistencias entre cargo declarado e porte real da empresa

  REGRA CEO_DE_MEI:
    SE cargo = "CEO" E empresa = MEI (faturamento < R$81k):
      FLAG = "CEO de MEI detectado"
      Acao: Reclassificar como Tier 2 automaticamente
      Produto elegivel: SOMENTE G4 Online, G4 Traction
      NUNCA tratar como Titan/Soberano

  REGRA CROSS_VALIDATION:
    SE cargo alto (C-Level) E empresa micro:
      Validar CNPJ e quadro societario
      Confirmar se e empresa real ou "empresa de fachada"
    SE cargo operacional E empresa grande:
      Validar se e decisor real ou influenciador
      Ativar multi-thread se necessario
```

---

## Exclusoes Explicitas de ICP (Doc 2)

### Perfis BLOQUEADOS - Nao Sao ICP G4

```
EXCLUSAO_EMPREENDEDOR_DE_PALCO:
  Descricao: Pessoa que busca fama, nao resultado. Quer palco, nao gestao.
  Sinais: Foco excessivo em networking de celebridades, interesse em "aparecer",
          sem dor operacional real, empresa estagnada mas quer "posicionamento"
  Acao: NAO QUALIFICAR. Descartar ou mover para nurturing generico.

EXCLUSAO_ESTUDANTE_ACADEMICO:
  Descricao: Estudante universitario ou academico sem empresa ativa.
  Sinais: Sem CNPJ ativo, sem faturamento, cargo = "estudante" ou "pesquisador"
  Acao: NAO QUALIFICAR. G4 e para empresarios com empresa ativa.

EXCLUSAO_EUPREENDEDOR:
  Descricao: "Empresa" de 1 pessoa so, sem funcionarios, sem estrutura.
  Sinais: Faturamento < R$10k/mes, sem equipe, autonomo disfarado de empresa
  Acao: NAO QUALIFICAR para produtos presenciais. Direcionar para G4 Online
         se houver potencial de crescimento real.
```

**Regra geral de exclusao:** Leads que se enquadram nessas categorias NUNCA devem consumir tempo de SDR Senior ou Closer. Identificacao precoce e obrigatoria.

---

## Notas Importantes

1. **Faixa de faturamento e autodeclarada** e pode estar incorreta - validar na primeira conversa
2. **Um lead SMB pode virar Mid-Market** se a empresa cresceu desde o ultimo cadastro
3. **Vertical influencia o ciclo** independente do tier (Industria e sempre mais lento)
4. **Sazonalidade varia por vertical** - considerar na previsao de pipeline
5. **Enterprise sem multi-thread e red flag** - deve acionar alerta automatico
6. **SMB em pipeline de Imersao e erro** - deve gerar bloqueio ou redirecionamento automatico
