# SDR Coaching - Camada Semantica Elucy v2

## Definicao

Este MCP define as regras de coaching para melhoria continua dos SDRs da G4 Educacao. O coaching e estruturado em regras IF-THEN que mapeiam gaps de performance para acoes corretivas especificas. Inclui tambem os erros mais comuns no contexto G4 e como evita-los.

---

## Regras IF-THEN de Coaching

### Regra 1: low_pain_discovery
**IF** o SDR consistentemente nao identifica dor real nas calls (pain_discovery ausente ou superficial em 50%+ das calls)

**THEN** orientar:
- Fazer mais perguntas de Problem e Implication (SPIN)
- Substituir "qual seu desafio?" por "o que esta te custando mais dinheiro hoje que voce nao consegue resolver?"
- Praticar drill-down: para cada resposta, perguntar "e qual o impacto disso em reais?"
- Estudar cases de dores comuns por segmento no Databricks para ja chegar preparado
- Meta: nas proximas 5 calls, identificar pelo menos 1 dor mensuravel por call

---

### Regra 2: no_budget_check
**IF** o SDR avanca para proposta sem validar capacidade de pagamento

**THEN** orientar:
- Incluir budget check como etapa obrigatoria antes de qualquer proposta
- Usar abordagem indireta: "Empresas do seu porte geralmente investem entre X e Y em educacao executiva. Isso esta no radar de voces?"
- Cruzar com dados do Databricks: verificar faturamento da empresa (persons_overview, aquisicao) ANTES da call
- Regra: se empresa e Tier 2 (<R$1MM), nao oferecer Imersao sem validar budget explicitamente
- Meta: zero propostas enviadas sem budget qualificado

---

### Regra 3: no_authority_identified
**IF** o SDR chega em proposta/negociacao sem saber quem decide

**THEN** orientar:
- Iniciar multi_thread_strategy imediatamente
- Incluir mapeamento de decisao como pergunta padrao na 1a call: "Alem de voce, quem mais participa dessa decisao?"
- Se contato e Executor/Braco Direito, perguntar explicitamente: "Seu CEO/socio tambem estaria envolvido nessa decisao?"
- Nunca enviar proposta para quem nao decide (ou enviar COM pedido de introducao ao decisor)
- Meta: 100% dos deals com stakeholder map antes de proposta

---

### Regra 4: stall_detected
**IF** deal do SDR esta parado ha 10+ dias sem movimentacao

**THEN** orientar:
- Mudar angulo de abordagem (se tentou email, tentar WhatsApp ou LinkedIn DM)
- Enviar conteudo de valor ao inves de cobrar resposta ("Vi esse case que me lembrou da sua situacao...")
- Se 2 tentativas de reengajamento falharam, escalar para gestor ou Closer
- Revisar se o deal ainda e viavel - nem todo deal vale salvar
- Regra: maximo 3 tentativas de reengajamento antes de mover para nurturing
- Meta: nenhum deal parado mais de 15 dias sem decisao (avanca ou move para lost)

---

### Regra 5: low_engagement
**IF** leads do SDR consistentemente desengajam durante calls (respostas curtas, desligam rapido, nao comparecem)

**THEN** orientar:
- Encurtar o pitch. Se esta falando mais de 60% do tempo, esta falando demais
- Fazer mais perguntas e ouvir mais. Proporcao ideal: SDR fala 30-40%, lead fala 60-70%
- Comecar calls com hook de valor, nao com apresentacao institucional
- Eliminar "eu gostaria de te apresentar a G4" e substituir por "vi que sua empresa [dado especifico], e tenho um insight sobre [problema do segmento]"
- Usar dados do Databricks para personalizar abertura
- Meta: aumentar duracao media das calls em 30% nas proximas 2 semanas

---

### Regra 6: feature_dump
**IF** o SDR lista funcionalidades, modulos, conteudos programaticos ao inves de articular valor e impacto

**THEN** orientar:
- PARAR de falar sobre "o que o produto tem" e comecar a falar sobre "o que o produto faz pelo lead"
- Substituir "A Imersao tem 3 dias e 8 modulos" por "Empresarios que fizeram a Imersao cresceram em media X% em 12 meses"
- Para cada feature mencionada, traduzir em beneficio: "Voce vai ter acesso a rede de 200 empresarios" vira "Voce vai resolver problemas em 1 ligacao que hoje levam semanas porque vai ter acesso direto a quem ja resolveu"
- CRITICO: feature dump com Titan/Soberano e o erro mais grave. Titan quer resultado, nao conteudo
- Meta: zero mentions de "modulos" ou "conteudo programatico" nas proximas calls com Titan

---

### Regra 7: wrong_framework
**IF** o SDR usa framework errado para a persona

**THEN** orientar conforme a persona:

**Titan/Soberano (CEO >R$10MM):**
- NAO usar SPICED (Titan nao aceita ser qualificado com perguntas basicas)
- USAR Challenger Sale: chegar com insight provocativo, ensinar algo novo, desafiar a visao atual
- Exemplo: "A maioria dos CEOs do seu porte acha que o problema e comercial, mas os dados mostram que e retencao de lideranca. Posso te mostrar por que?"

**Builder/Trator (CEO R$1M-R$10M):**
- SPICED funciona bem. Builder aceita processo estruturado
- Complementar com SPIN para aprofundar dor
- Exemplo: "Me conta a situacao atual da empresa [Situation]. Qual o principal problema que esta limitando o crescimento? [Problem]"

**Executor/Braco Direito (Diretores, Heads):**
- USAR SPIN (Situation, Problem, Implication, Need-Payoff)
- NAO usar Challenger (Executor nao responde bem a provocacao, precisa de logica e processo)
- Exemplo: "Se esse problema de rotatividade continuar, qual o impacto no resultado do ano? [Implication]"

- Meta: 100% das calls usando framework correto para a persona nas proximas 2 semanas

---

### Regra 8: no_next_step
**IF** calls do SDR terminam sem proximo passo concreto (sem data, sem acao especifica)

**THEN** orientar:
- REGRA INVIOLAVEL: toda call deve terminar com acao especifica + data + horario
- Nunca aceitar "a gente se fala" ou "te mando um email". Ancorar em compromisso
- Template: "Entao [acao] na [dia] as [hora]. Vou mandar o invite agora. Funciona?"
- Se lead resiste a comprometer data: sinal de que algo nao esta certo. Investigar
- Treinar: os ultimos 5 minutos da call sao para fechar next_step, nao para "mais alguma pergunta?"
- Meta: 100% das calls com next_step definido. Tolerancia zero

---

### Regra 9: objection_missed
**IF** lead levantou objecao e SDR ignorou, desviou ou combateu diretamente

**THEN** orientar:
- Passo 1: RECONHECER a objecao ("Entendo sua preocupacao, faz sentido")
- Passo 2: EXPLORAR ("Me conta mais sobre isso. O que especificamente te preocupa?")
- Passo 3: REFRAMAR ("Se eu te mostrar que [dado/case] resolve exatamente isso, faria diferenca?")
- NUNCA combater diretamente ("Nao, voce esta errado" ou "Mas o valor e justo")
- NUNCA ignorar e mudar de assunto (lead percebe e perde confianca)
- Objecoes comuns G4 e reframes: ver banco de objecoes no learning/memory/
- Meta: toda objecao tratada com o ciclo Reconhecer > Explorar > Reframar

---

### Regra 10: no_show_handling
**IF** lead agendou reuniao e nao compareceu (no-show)

**THEN** protocolo de recuperacao:

**Imediato (ate 15 min apos horario):**
1. Enviar WhatsApp: "Oi [nome], estou na sala te esperando. Aconteceu algo?"
2. Se nao responder em 5 min: ligar uma vez
3. Se nao atender: enviar segunda mensagem com tom compreensivo: "Sem problema, imprevistos acontecem. Vou te mandar outro horario"

**Reagendamento (ate 2h apos no-show):**
4. Propor 2 horarios alternativos (proximo dia util, manha e tarde)
5. NUNCA perguntar "quando voce pode?" — ancorar em opcoes concretas
6. Template: "[Nome], entendo que o dia ficou corrido. Tenho [dia] as [hora] ou [dia] as [hora]. Qual funciona melhor?"

**Avaliacao (apos 2 no-shows):**
7. Se 2 no-shows consecutivos: avaliar se lead e real
8. Verificar sinais: qualificacao foi superficial? Lead tinha interesse real? Timing estava certo?
9. Se qualificacao fraca causou o no-show: nao reagendar, voltar para discovery
10. Se 3 no-shows: mover para lost com motivo "no-show recorrente"

**Prevencao de no-show (ANTES da reuniao):**
- D-1: mensagem de confirmacao: "[Nome], amanha as [hora] temos nossa conversa. Confirma pra mim?"
- D-0 (1h antes): lembrete: "Daqui 1h nos falamos. O link e [link]. Te espero la"
- Se nao confirmar D-1: ligar para confirmar. Se nao atender e nao responder: considerar reagendar

**Diagnostico de no-show recorrente:**
| Causa provavel | Indicador | Acao |
|---|---|---|
| Qualificacao fraca | Lead nao tinha dor real | Melhorar discovery antes de agendar |
| Timing ruim | Lead disse "agora nao e o melhor momento" | Respeitar timing, mover para nurturing |
| Abordagem errada | Lead desengajou antes da reuniao | Revisar mensagens pre-reuniao |
| Falta de confirmacao | SDR nao confirmou 24h antes | Implementar ritual de confirmacao D-1 |

- Meta: no-show rate < 20%. Se > 25%, revisar qualidade do agendamento

---

### Regra 11: follow_up_structured
**IF** lead nao responde apos contato inicial ou conversa interrompida

**THEN** seguir protocolo de follow-up estruturado:

**Sequencia padrao (5 tentativas em 10 dias):**

| Tentativa | Dia | Canal | Tipo de mensagem |
|---|---|---|---|
| 1 | D+1 | WhatsApp | Valor: case, dado, insight relevante ao setor |
| 2 | D+3 | Email | Conteudo: artigo, report ou convite pra evento |
| 3 | D+5 | Telefone | Call direta — objetivo: conversa de 3 min |
| 4 | D+7 | WhatsApp | Prova social: "Conversei com [empresa similar] e..." |
| 5 | D+10 | Email | Breakup: "Vou encerrar aqui, mas fico disponivel" |

**Regras de follow-up:**
- NUNCA repetir a mesma mensagem ou angulo
- NUNCA enviar "oi, tudo bem?" ou "viu minha mensagem?"
- Cada follow-up DEVE entregar algo novo (case, dado, insight, convite)
- Se nao tem nada de valor para entregar, nao faca follow-up — va buscar algo primeiro
- Alternar canais: WhatsApp → Email → Telefone → WhatsApp → Email
- Se lead respondeu negativamente ("nao tenho interesse"): PARAR imediatamente. Respeitar
- Se lead respondeu com duvida ou objecao: tratar a objecao, nao fazer follow-up generico
- Apos 5 tentativas sem resposta: mover para nurturing ou lost

- Meta: zero follow-ups do tipo "so passando pra saber". 100% com valor agregado

---

## Erros Comuns no Contexto G4

### Erro 1: Tratar Titan como Builder
**O que acontece:** SDR usa SPICED com CEO de empresa >R$10MM, faz perguntas basicas de qualificacao, trata como "mais um lead".
**Por que e grave:** Titan se sente subestimado. Perde interesse em 2 minutos. Deal morto antes de comecar.
**Como corrigir:** Chegar com Challenger approach. Pesquisar antes. Trazer insight que o Titan nao conhece. Tratar como par, nao como prospect.

### Erro 2: Vender Imersao para Tier 2
**O que acontece:** SDR empurra Imersao (R$15k+) para empresa com faturamento <R$1MM que claramente nao tem budget.
**Por que e grave:** Perda de tempo do SDR, do Closer e do lead. Lead fica frustrado. Pode manchar a marca.
**Como corrigir:** Verificar faturamento no Databricks ANTES. Se Tier 2, direcionar para produtos de entrada (Gestao e Estrategia, cursos online). Se insistir em Imersao, aplicar redirect_tier2 via Iron Dome.

### Erro 3: Pular qualificacao
**O que acontece:** SDR fica animado com lead "quente" e pula direto para proposta sem validar SPICED completo.
**Por que e grave:** Proposta sem base gera objecoes inesperadas, pedidos de desconto, ghost.
**Como corrigir:** Disciplina. Mesmo com lead quente, rodar checklist minimo: dor confirmada, budget ok, decisor mapeado, timing claro. Excepcao: quick_close_pattern com Builder (nesse caso, agilizar sim, mas nao pular).

### Erro 4: Handoff frio sem Intelligence Block
**O que acontece:** SDR transfere deal para Closer com "fala com o Fulano, ele tem interesse". Sem contexto, sem historico, sem SPICED.
**Por que e grave:** Closer entra cego. Repete perguntas que o lead ja respondeu. Lead sente que a empresa e desorganizada.
**Como corrigir:** Todo handoff obrigatoriamente com Intelligence Block contendo: resumo SPICED, historico de interacoes, objecoes levantadas, stakeholders mapeados, proximo passo sugerido.

### Erro 5: Follow-up generico
**O que acontece:** SDR envia "Oi, tudo bem? So passando pra saber se viu meu email" repetidamente.
**Por que e grave:** Zero valor agregado. Lead ignora. SDR parece vendedor desesperado.
**Como corrigir:** Todo follow-up deve entregar algo: case novo, dado relevante, insight do setor, convite para evento. Regra: se nao tem nada de valor para entregar, nao faca follow-up. Va buscar algo de valor primeiro.

---

## Regras de Frequencia de Coaching

| Situacao | Frequencia |
|---|---|
| SDR novo (< 30 dias) | Coaching apos toda call |
| SDR em ramp (30-90 dias) | Coaching diario com revisao de 2-3 calls |
| SDR maduro (90+ dias) | Coaching semanal focado em gaps especificos |
| Erro critico detectado (Titan como Builder, etc) | Coaching imediato, independente de senioridade |
| Deal perdido | Post-mortem obrigatorio com coaching associado |

---

## Mapeamento Databricks

| Regra de Coaching | Tabelas de Suporte | Uso |
|---|---|---|
| wrong_framework | persons_overview | Verificar tier e persona para selecionar framework |
| no_budget_check | aquisicao, persons_overview | Verificar faturamento antes de proposta |
| feature_dump | order_items | Buscar cases e resultados para substituir features |
| no_authority_identified | persons_overview | Mapear stakeholders e hierarquia |
| stall_detected | customer_360_sales_table | Verificar days_in_stage e ultimo_contato |

---

## Skills que Usam

- **sdr-coach**: Skill principal que consome este MCP para gerar recomendacoes de coaching
- **call-analyzer**: Identifica gaps que ativam regras de coaching
- **orchestrator**: Detecta quando coaching e necessario e roteia para sdr-coach
- **deal-diagnostics**: Identifica padroes de erro recorrentes que requerem coaching
- **strategy-builder**: Ajusta estrategia baseado no nivel de maturidade do SDR

---

## 3 Pecados Capitais do SDR

### 1. Frame Break
- **O que e:** Tratar Titan como Executor. Usar SPICED com CEO de R$50MM, fazer perguntas basicas, tratar como lead comum
- **Consequencia:** Titan se sente subestimado, desengaja em 2 minutos. Deal morto antes de comecar
- **Correcao:** Challenger obrigatorio para Titan. Pesquisar antes. Chegar com insight, nao com questionario

### 2. Room Contamination
- **O que e:** Vender Imersao Presencial para lead Tier 2 para bater quota do mes
- **Consequencia:** Lead sem perfil fecha, nao extrai valor, vira detrator. Contamina a sala com perfil inadequado
- **Correcao:** Downsell Honesto obrigatorio. Tier 2 vai para produtos Online/Traction. Meta nao justifica risco ao ecossistema

### 3. Product Hallucination
- **O que e:** Inventar features, beneficios ou resultados que o produto nao entrega
- **Consequencia:** Expectativa quebrada, churn, reclamacao, dano a marca
- **Correcao:** Usar apenas informacoes documentadas. Se nao sabe, dizer que vai verificar. Zero improviso sobre produto

---

## Regra de Empatia

- **Principio:** Duro com o problema, respeitoso com a pessoa
- **PERMITIDO:** Atacar o metodo - "Seu processo comercial e amador, esta queimando lead qualificado"
- **PROIBIDO:** Atacar o carater - "Voce e incompetente" ou qualquer variacao pessoal
- Provocacao Challenger sempre mira o problema ou o processo, nunca a pessoa

---

## Regra de Base Factual

- **Principio:** Nunca provocar sem dado que sustente
- Provocacao sem dado = opiniao. Provocacao com dado = consultoria
- Toda provocacao Challenger deve ser ancorada em numero, case, benchmark ou evidencia concreta
- Se nao tem dado para sustentar a provocacao, nao provoque. Busque o dado primeiro

---

## Kill Switch

- **Trigger:** Lead demonstra fragilidade emocional extrema (luto, crise pessoal, colapso emocional)
- **Acao imediata:** Challenger DESATIVADO. Troca automatica para modo Support
- **Modo Support:** Escuta ativa, acolhimento, zero provocacao, zero pressao
- Retomar Challenger apenas quando lead sinalizar estabilidade emocional

---

## Protocolo de Duvida

1. **STOP:** Parar imediatamente qualquer acao em andamento
2. **TAG:** Marcar interacao com [REVIEW NEEDED]
3. **ESCALAR:** Enviar para Head of Sales com contexto completo
4. **Principio:** Melhor atrasar 10 minutos do que queimar um Titan
- Aplicar sempre que houver duvida sobre classificacao, abordagem ou qualquer output da IA

---

## SLA de Tempo por Perfil

| Perfil | Prioridade | SLA | Justificativa |
|---|---|---|---|
| Titans (Tier 1 Elite) | Profundidade | 30-60 min OK se personalizado | Titan valoriza qualidade, nao velocidade |
| Builders (Tier 1B) | Velocidade | < 5 minutos | Builder quer agilidade e eficiencia |
| Social DM (qualquer) | Velocidade maxima | < 3 minutos | Canal social tem expectativa de resposta imediata |

---

## Self-Audit do Operador

Antes de apertar Ctrl+V (colar output da Elucy para o lead):
1. **Verificar campos vazios:** Algum campo do Intelligence Block ficou sem preencher?
2. **Verificar flags ICP RISK:** Ha algum alerta de risco no perfil do lead?
3. **Verificar argumento vs Persona:** O argumento usado corresponde a persona correta? (Challenger para Titan, SPICED para Builder, SPIN para Executor)

Se qualquer verificacao falhar, NAO enviar. Corrigir primeiro

---

## Coaching Baseado em Evidencia (Evidence-Based Coaching)

Alinhado com `inference-constitution.md` — todo coaching deve citar evidencia concreta.

### Principio
Coaching sem dado e opiniao. Coaching com dado e desenvolvimento.

**Proibido:**
- "Voce nao fez um bom discovery" (sem citar o que faltou especificamente)
- "Precisa melhorar as perguntas" (sem mostrar qual pergunta e qual versao melhor)
- "O lead nao estava qualificado" (sem citar qual criterio SPICED falhou)

**Obrigatorio:**
- "No Turno 3 voce perguntou [pergunta]. E fraca porque [motivo]. Versao melhor: [sugestao]"
- "Apos 3 interacoes sem Impact, o Depth Score ficou em 1. Tecnica necessaria: [especifica]"
- "Framework Adherence Score: 45/100. Problema: foi de Situation direto para Decision sem Impact"

### Formato de Coaching por Evidencia

```
[COACHING ELUCI]
Gap identificado: [descricao especifica]
Evidencia:        "[trecho exato da call ou deal]"
Impacto:          [como esse gap afetou o resultado]
Framework ref:    [SPICED-I / Challenger-Teach / CSE-Timing / etc]
Padrao recorrente: [se mesmo gap aparece em 3+ deals]
Exercicio:        [Modo 1-4 do simulador + Cenario especifico]
Proxima revisao:  [prazo]
```

---

## Integracao com Simulador de Treinamento (training-scenarios.md)

O coaching tem um braco proativo: o simulador interativo.

### Quando Acionar o Simulador

| Regra de Coaching | Simulador Recomendado |
|---|---|
| `low_pain_discovery` (Regra 1) | Modo 4 — Treino de Impact |
| `wrong_framework` (Regra 7) | Modo 1 — Cenario da Persona errada |
| `feature_dump` (Regra 6) | Modo 1 — Cenario Titan Cetico |
| `no_next_step` (Regra 8) | Modo 1 — Cenario Builder sem Caixa |
| `objection_missed` (Regra 9) | Modo 3 — Correcao de Perguntas |
| Deal perdido por prematuridade | Modo 1 — Cenario Curioso sem Dor |
| SDR novo (< 30 dias) | Todos os 5 cenarios em sequencia |
| Transcript com DQI < 50 | Modo 2 — Diagnostico de Conversa Real |

### Fluxo: Coaching → Simulador → Feedback Loop
```
1. Elucy detecta gap em call real ou deal perdido
2. Gera coaching baseado em evidencia
3. Recomenda cenario especifico no simulador
4. SDR pratica no simulador
5. Score do simulador alimenta coaching-log.md
6. Head of Sales revisa progresso a cada 15 dias
```

---

## Learning Loop

- A cada 15 dias, cruzar dados Micro (calls, deals) com Macro (conversao, pipeline, segmentos)
- Objetivo: identificar padroes emergentes e atualizar abordagens
- Output alimenta atualizacao de MCPs, memory e estrategias
- Responsavel: Head of Sales + Elucy (sugestoes automaticas)
- Instrumento de treinamento: `training-scenarios.md` (simulador interativo)

---

## Complexity Overflow

- **Trigger:** Lead revela complexidade extrema (governanca familiar, M&A hostil, sucessao litigiosa, estrutura societaria complexa)
- **Acao:** Abortar script padrao imediatamente
- **Escalar:** Enviar para Senior Closer com briefing completo
- **Motivo:** Complexidade desse nivel exige experiencia e senioridade que excedem o escopo do SDR
