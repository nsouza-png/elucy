# ELUCY SYSTEM BRAIN
## Arquivo de Raciocínio e Julgamento do Sistema
> Consultar ANTES de interpretar qualquer dado do pipeline, cockpit ou Databricks.
> Última atualização: 25/03/2026

---

## 1. COMO O DATABRICKS FUNCIONA DE VERDADE

### funil_comercial é event-sourced (NÃO é tabela de deals)
- Cada linha = 1 evento de transição de fase (MQL, SAL, Conectado, Agendado...)
- 1 deal real = múltiplas linhas (média de 3 eventos por deal)
- **REGRA DE OURO:** SEMPRE usar `ROW_NUMBER() OVER (PARTITION BY deal_id ORDER BY event_timestamp DESC) = 1` para pegar estado atual de cada deal
- NUNCA usar `COUNT(*)` direto — vai retornar eventos, não deals
- NUNCA usar `COUNT(DISTINCT email)` — 1 pessoa pode ter 2 deals ativos

### Campos corretos (nunca adivinhar)
- `fase_atual_no_processo` = classificação de qualificação (SAL, Conectado, Oportunidade...)
- `etapa_atual_no_pipeline` = etapa operacional (Novo Lead, Dia 02, Dia 03, Conectados, Agendamento...)
- MQL/SAL **NÃO são etapas de pipeline** — são classificações de qualificação
- D1-D5 = etapas operacionais de prospecção (dentro de SAL como classificação)
- Colunas de fase: `fase_atual_no_processo` / `fase_anterior_no_processo` (NUNCA sem sufixo `_no_processo`)

### Tiers reais
- diamond, gold, silver, bronze (NUNCA "Tier 1/2/3" como string)

### Como validar contagem
- Sempre comparar `COUNT(DISTINCT deal_id)` contra CRM do Nathan
- Se número vier muito maior que esperado = está contando eventos, não deals
- Referência real de Nathan em março/2026: ~26 em Conectado, não 72+

---

## 2. COMO O COCKPIT FUNCIONA DE VERDADE

### Classificação de Revenue Line (`resolveRevenueLine`)
O engine classifica cada deal numa `_revLine` baseado em:
```
linha_de_receita_vigente | grupo_de_receita | utm_medium
```

**Regra atual:**
- `social_dm` → linha contém "social dm/media/[im] social" OU utm é tallis/nardon/alfredo
- `imersao` → fallback padrão para tudo que não bateu

**Problema conhecido:** Leads D1-D5 vindos de Form G4 Google, Iscas, LinkedIn Ads são classificados como `imersao` mesmo que o operador os trabalhe via prospecção ativa. Isso não é erro — são canais diferentes. Social DM real = origem Instagram via perfil do founder.

### Contagem "5 Social DM" vs realidade
- Os 5 Social DM mostrados são leads com `utm_medium = tallis/nardon/alfredo` — correto
- Os leads D1-D5 colados (Form G4 Google, Iscas) = leads de prospecção inbound — aparecem no pipeline geral, não como Social DM
- São canais operacionalmente distintos — não misturar

### Fluxo de dados do Cockpit
1. `sync-cockpit-supabase` (7h30 diário) → puxa Databricks → insere em `deals` no Supabase
2. `cockpit-engine.js` → lê `deals` do Supabase via Realtime
3. `cockpit-data.js` → fallback estático (dados podem estar velhos se sync não rodou)
4. `elucy-cockpit-worker` (a cada 2min) → processa `cockpit_requests` → escreve `cockpit_responses`

### Tabelas Supabase usadas pelo Cockpit
- `deals` — deals ativos por operador (sincronizado do Databricks)
- `deal_runtime` — estado operacional de cada deal (tarefas, próximas ações)
- `cockpit_requests` / `cockpit_responses` — fila de análises ELUCI
- `activity_log` — rastreamento de ações do operador
- `social_dm_leads` — leads de Social DM separados (pipeline Instagram)
- `social_dm_touchpoints` — histórico de touchpoints DM

---

## 3. COMO O ELUCY INTERPRETA DADOS (REGRAS DE JULGAMENTO)

### Antes de qualquer análise de pipeline
1. Perguntar: "Esses números batem com o CRM do Nathan?"
2. Se não bater → provavelmente query contando eventos, não deals
3. Validar com `ROW_NUMBER` antes de concluir qualquer coisa

### Mapeamento canônico de Grupos de Receita (resolveRevenueLine)
Fonte da verdade: `grupo_de_receita` do Databricks (8 grupos reais + fallbacks)
NUNCA inventar categorias que não existem no Databricks.

| _revLine (cockpit) | grupo_de_receita real | Exemplos de linha_de_receita_vigente |
|---|---|---|
| `funil_marketing` | Funil de Marketing | [IM] Form Facebook Ads, Form G4 Google, Iscas, Chat, Social - Testes |
| `turmas` | Turmas | Gestão e Estratégia, G4 Traction, G4 Sales, G4 Frontier, [ON] qualquer |
| `projetos_eventos` | Projetos e Eventos | G4 Pelo Brasil, Scale Experience, reuniao-estrategica, G4 Alumni |
| `social_dm` | Funil de Marketing | [IM] Social DM, Form G4 Instagram Tallis/Nardon/Alfredo |
| `social_dm_segment_k` | Funil de Marketing | Social DM - Perfil K, [IM] Form G4 Facebook Ads - K | (slug renomeado de social_dm_k) |
| `selfcheckout` | Selfcheckout | [ON] Selfcheckout - Outros, [ON] Abandono de carrinho, [ON] Selfcheckout - FG4 |
| `aquisicao` | Time de Vendas - Aquisição | [IM] Time de vendas, [IM] Reativação, [IM] Link de Indicação |
| `field_sales` | Time de Vendas - Field Sales | [FS] Time de vendas, [FS] Outros |
| `expansao` | Expansão | Farmer, CS Corporativo |
| `renovacao` | Renovação | G4 Scale - Renovação, G4 Club - Renovação, [SKL] Renovação |
| `nao_definido` | Não Definido | [SKL] qualquer, ai-aplicada, hr4results, G4 Parceiros |

### NUNCA usar estas categorias (não existem no G4)
- `imersao` (genérico) ❌
- `imersao_presencial` ❌
- `imersao_online` ❌
- `club` (separado) ❌ → vai em `renovacao`
- `scale` (separado) ❌ → vai em `renovacao` ou `turmas`
- `consulting` ❌ → não existe como grupo separado
- `digital` ❌
- `gp` ❌
- `cx` ❌

### Lógica de resolução (ordem)
1. Se `grupo_de_receita` vier preenchido → mapear direto para _revLine
2. Se vazio → inferir por prefixo da `linha_de_receita_vigente` (`[IM]`, `[ON]`, `[FS]`, `[SKL]`)
3. Se utm = tallis/nardon/alfredo → `social_dm`
4. Fallback → `funil_marketing` (forma mais comum de entrada sem grupo)

---

## 4. CONFIGURAÇÃO DO SISTEMA (REFERÊNCIA RÁPIDA)

### Deploy
- Repo GitHub Pages: `nsouza-png/elucy-gh` → https://nsouza-png.github.io/elucy/
- Clone local: `C:\Users\n.souza_g4educacao\Documents\elucy-gh`
- Fonte local: `C:\Users\n.souza_g4educacao\Documents\G4-SDR\projects\`
- Fluxo de deploy: copiar cockpit.html/cockpit-engine.js/cockpit-data.js → commit → push

### Databricks
- Endpoint: `https://dbc-8acefaf9-a170.cloud.databricks.com/api/2.0/sql/statements`
- Warehouse principal: `bbae754ea44f67e0`
- Warehouse GAV: `3eb4836427378537`
- **ENCODING CRÍTICO:** SEMPRE `System.Net.WebClient` com `.Encoding = UTF8` — NUNCA `Invoke-RestMethod`

### Operador Nathan Souza
- `qualificador_name` no Databricks: `'Nathan Souza'`
- Slack: `@n.souza` / ID: `U0735T2RY2D`
- Role: SDR

---

## 5. ERROS JÁ COMETIDOS (NÃO REPETIR)

| Erro | Causa | Correção |
|---|---|---|
| Retornou 318 leads em vez de 26 | COUNT(*) em tabela event-sourced | ROW_NUMBER() PARTITION BY deal_id |
| Retornou 72 "Conectado" em vez de 26 | Idem | ROW_NUMBER() |
| "5 Social DM" vs leads reais | Filtro correto — leads D1-D5 não são Social DM por origem | Não é bug — canais distintos |
| DM Slack falhou | Token sem scope `im:write` | Remover envio DM do briefing |
| Briefing com números inflados | Event-sourced + sem ROW_NUMBER | Query corrigida no agendamento |

---

## 6. NOMENCLATURA OBRIGATÓRIA
- Sempre "o G4" — NUNCA "a G4"
- Titan = Challenger (PROIBIDO SPICED) — Kill Switch: KS-FRAMEWORK-MISMATCH
- Builder = SPICED
- Executor = SPIN + Champion Selling
- Black Box Protocol: PROIBIDO expor metodologia interna ao lead
- Tier bronze (<1MM): BLOQUEADO de Imersoes Presenciais — Kill Switch: KS-TIER-PRODUCT-MISMATCH
- D2 exibe como "Fase Comercial" na UI (campo DB: fase_atual_no_processo — nao muda)
- D5 exibe como "Canal de Origem" na UI (campo DB: canal_de_marketing — nao muda)
- D6 exibe como "Tier" capitalizado na UI — Diamond/Gold/Silver/Bronze (valores DB: minusculo)
