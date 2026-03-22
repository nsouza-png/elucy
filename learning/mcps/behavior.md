# Behavior - Camada Semantica Elucy v2

## Definicao

Este MCP define padroes comportamentais observaveis a partir dos dados da G4 Educacao. Comportamentos sao sinais que, quando interpretados corretamente, permitem prever intencao de compra, risco de perda e janelas de oportunidade. A Elucy deve ler esses sinais antes de qualquer recomendacao.

---

## Padroes Comportamentais

### 1. fast_response_high_intent
**Definicao:** Lead que responde em menos de 24 horas a qualquer contato do SDR. Indica alto interesse e engajamento ativo no processo de compra.

**Evidencia nos dados:**
- Tempo entre envio de mensagem/email e resposta < 24h
- Consistente em multiplas interacoes (nao apenas na primeira)
- Abre emails rapidamente, clica em links, responde WhatsApp no mesmo dia

**Interpretacao:**
- Lead esta em modo ativo de busca por solucao
- Provavelmente tem um critical event proximo
- Pode haver concorrencia (esta avaliando opcoes em paralelo)
- Janela de oportunidade curta - se nao agir rapido, pode fechar com outro

**Acao recomendada:**
- Acelerar o ciclo. Nao esperar 3 dias pra mandar proposta
- Encurtar intervalo entre interacoes (proximo passo em 24-48h, nao 1 semana)
- Priorizar este lead sobre deals mais frios
- Confirmar critical event para entender a urgencia

---

### 2. slow_response_enterprise
**Definicao:** Lead enterprise (Elite/Titan) que demora 3-5 dias para responder. Diferente de outros perfis, isso e comportamento normal e NAO e sinal de risco.

**Evidencia nos dados:**
- Lead classificado como Tier Elite (>R$10MM) ou Soberano/Titan
- Tempo de resposta entre 3 e 5 dias uteis
- Quando responde, respostas sao substanciais e engajadas
- Agenda cheia evidenciada por reagendamentos (nao cancelamentos)

**Interpretacao:**
- Titans tem dezenas de prioridades concorrentes
- Resposta lenta NAO significa desinteresse
- O que importa e a qualidade da resposta, nao a velocidade
- Sinal de risco real e resposta monossilabica ou delegacao para subordinado

**Acao recomendada:**
- Manter cadencia paciente (follow-up a cada 5-7 dias)
- Nao enviar multiplos follow-ups em sequencia (soa desesperado)
- Usar cada interacao para entregar valor (insight, case, dado novo)
- Nao interpretar como risco - nao ativar risk_recovery prematuramente

---

### 3. no_reply_risk
**Definicao:** Lead que nao responde ha 3 ou mais dias uteis (exceto enterprise/Titan). Sinal de risco que requer acao imediata.

**Evidencia nos dados:**
- Ultimo contato ha 3+ dias sem resposta
- Lead NAO e Tier Elite ou Soberano/Titan
- Emails nao abertos ou abertos sem resposta
- Mensagens WhatsApp com check azul mas sem reply

**Interpretacao:**
- Lead pode ter perdido interesse
- Pode estar avaliando concorrente
- Pode ter mudado prioridades internamente
- Pode estar esperando aprovacao interna e nao sabe como comunicar

**Acao recomendada:**
- Enviar mensagem de break-up pattern (ex: "Percebi que o timing pode nao ser ideal agora...")
- Mudar canal de comunicacao (se tentou email, tentar WhatsApp ou LinkedIn)
- Oferecer algo de valor novo (case, insight, convite para evento)
- Se 7+ dias sem resposta: mover para nurturing e liberar bandwidth

---

### 4. multiple_meetings_high_prob
**Definicao:** Lead que participou de 2 ou mais reunioes/calls agendadas. Forte sinal de compra - leads que investem tempo estao serios.

**Evidencia nos dados:**
- 2+ meetings registradas no CRM
- Lead compareceu (nao apenas agendou)
- Meetings com conteudo progressivo (nao repetitivo)
- Presenca de stakeholders adicionais em meetings subsequentes

**Interpretacao:**
- Investimento de tempo e o sinal mais forte de intencao
- Probabilidade de conversao sobe significativamente apos 2a reuniao
- Se trouxe mais gente na 2a meeting, esta fazendo alinhamento interno
- Deal esta pronto para closing_strategy

**Acao recomendada:**
- Ativar closing_strategy imediatamente
- Preparar proposta personalizada para proxima interacao
- Mapear todos os stakeholders que participaram
- Definir next_steps claros com datas especificas

---

### 5. champion_only_risk
**Definicao:** Deal onde apenas o Executor/Braco Direito esta engajado e o CEO/decisor e desconhecido ou inacessivel. Risco de trava na hora da decisao.

**Evidencia nos dados:**
- Todas as interacoes sao com cargo de Diretor, Head, Gerente
- Nenhuma menção ao CEO/founder nas conversas
- Contato diz "vou falar com meu chefe" sem data definida
- Deal avanca em informacao mas nao em decisao

**Interpretacao:**
- O champion pode estar genuinamente interessado mas nao tem autonomia
- Existe risco alto de "preciso de aprovacao" na hora H
- O CEO pode ter prioridades completamente diferentes
- Sem acesso ao decisor, o SDR esta na mao do champion

**Acao recomendada:**
- Ativar multi_thread_strategy urgentemente
- Pedir ao champion para incluir CEO na proxima call
- Preparar material especifico para CEO (diferente do que foi usado com Executor)
- Se champion resiste a incluir CEO: sinal de que deal pode nao ser real
- Considerar abordagem direta ao CEO via LinkedIn DM

---

### 6. late_stage_stall
**Definicao:** Deal que esta em estagio de negociacao ha mais de 15 dias sem movimentacao. O deal "morreu em pe" - ninguem cancelou mas ninguem avanca.

**Evidencia nos dados:**
- Deal em stage "Negotiation" ou "Proposal Sent" ha 15+ dias
- Nenhuma nova interacao registrada nos ultimos 10 dias
- Proposta enviada sem feedback
- Follow-ups enviados sem resposta substantiva

**Interpretacao:**
- Algo mudou do lado do lead (prioridade, budget, stakeholder)
- O lead pode estar usando a proposta como benchmark com concorrente
- Pode ter surgido objecao interna que o champion nao consegue resolver
- Deal pode estar morto mas ninguem formalizou

**Acao recomendada:**
- Ativar risk_recovery_strategy
- Enviar mensagem direta reconhecendo o stall: "Notei que faz 2 semanas que nao tivemos retorno. Algo mudou do lado de voces?"
- Oferecer call de 10 min para realinhar (baixa barreira)
- Se nao responder em 5 dias: mover para lost com motivo "stall" e agendar reativacao em 30 dias

---

### 7. reactivation_window
**Definicao:** Deal perdido ha 30-90 dias que entra em janela otima de reativacao. Tempo suficiente para contexto ter mudado, mas recente o bastante para o lead lembrar da G4.

**Evidencia nos dados:**
- Deal marcado como lost ha 30-90 dias no CRM
- Motivo de perda registrado e tratavel (nao "competitor won" definitivo)
- Lead ainda ativo no mercado (empresa nao fechou, cargo nao mudou)
- Novo trigger disponivel (evento G4, produto novo, case do segmento)

**Interpretacao:**
- 30-90 dias e a janela ideal: o "nao" esfriou mas a memoria persiste
- Menos de 30 dias: cedo demais, parece insistencia
- Mais de 90 dias: tarde demais, precisa quase comecar do zero
- Se o motivo_lost foi timing ou budget, ha boa chance de que algo mudou

**Acao recomendada:**
- Ativar reactivation_strategy
- Abordagem obrigatoriamente diferente da original
- Referenciar a conversa anterior: "Na epoca nao era o momento por [motivo]. Queria compartilhar algo novo..."
- Entregar valor antes de pedir meeting (case, insight, dado)
- Maximo 3 tentativas. Se nao engajar, respeitar e mover para nurturing longo

---

### 8. quick_close_pattern
**Definicao:** Builder com dor clara, budget confirmado e urgencia real. Perfil que pode fechar em 1-2 semanas se abordagem for correta.

**Evidencia nos dados:**
- Lead classificado como Trator/Builder (R$1M-R$10M)
- Pain_discovery completo com dor mensuravel
- Budget verificado e dentro da faixa
- Critical event identificado (ex: "preciso resolver antes do proximo trimestre")
- Respostas rapidas e engajamento alto

**Interpretacao:**
- Builder com todos os sinais verdes e o deal ideal
- Nao precisa de ciclo longo - esta pronto para comprar
- Excesso de qualification aqui e contraproducente - vai irritar o lead
- Risco: demorar demais e perder a janela

**Acao recomendada:**
- Ativar closing_strategy imediatamente, nao ficar "educando"
- Proposta rapida e personalizada (em 24-48h)
- Next steps agressivos mas respeitosos (call de proposta em 2-3 dias)
- Handoff rapido ao Closer se aplicavel
- Nao complicar: Builder quer eficiencia, nao complexidade

---

## Regras de Interpretacao

### Regras Gerais
1. **Contexto de persona sempre:** O mesmo comportamento tem significados diferentes para Titan vs Builder vs Executor
2. **Padrao > evento isolado:** Um reply rapido nao confirma high_intent. Padrao consistente sim
3. **Dados > feeling:** Usar timestamps reais, contagem de interacoes, dias em stage. Nao "achar" que esta engajado
4. **Combinacao de sinais:** Um sinal isolado e indicativo. Dois sinais combinados sao confirmativos. Tres sao decisivos

### Regras de Prioridade de Leitura
1. Ler sinais de RISCO primeiro (no_reply, stall, champion_only)
2. Depois ler sinais de OPORTUNIDADE (fast_response, multiple_meetings, quick_close)
3. Por ultimo, ler sinais de CONTEXTO (slow_response_enterprise, reactivation_window)

### Combinacoes Criticas
| Combinacao | Significado | Acao |
|---|---|---|
| fast_response + multiple_meetings | Deal quente, fechar agora | closing_strategy urgente |
| champion_only + late_stage_stall | Deal travado por falta de decisor | multi_thread imediato |
| no_reply + late_stage_stall | Deal provavelmente morto | risk_recovery ou mover para lost |
| quick_close + no_reply | Algo mudou, investigar | Mensagem direta e honesta |
| reactivation_window + fast_response | Lead voltou com interesse | Acelerar, tratar como deal novo quente |

---

## Mapeamento Databricks

| Padrao | Tabelas | Campos |
|---|---|---|
| fast_response_high_intent | customer_360_sales_table | timestamps_interacoes, tempo_resposta |
| slow_response_enterprise | persons_overview, customer_360_sales_table | tier, cargo, tempo_resposta |
| no_reply_risk | customer_360_sales_table | ultimo_contato, dias_sem_resposta |
| multiple_meetings_high_prob | customer_360_sales_table | qtd_meetings, datas_meetings |
| champion_only_risk | persons_overview | cargo, stakeholders_mapeados |
| late_stage_stall | customer_360_sales_table | deal_stage, days_in_stage |
| reactivation_window | customer_360_sales_table | data_lost, motivo_lost |
| quick_close_pattern | persons_overview, skills_pql_user | tier, score_pql, faturamento |

---

## Skills que Usam

- **deal-diagnostics**: Leitura primaria de comportamentos para diagnostico de saude do deal
- **strategy-builder**: Usa padroes comportamentais como input para selecao de estrategia
- **sdr-coach**: Ensina SDR a ler e interpretar sinais comportamentais
- **orchestrator**: Usa sinais para priorizar e rotear acoes
- **call-analyzer**: Verifica se SDR leu sinais corretamente antes/durante a call

---

## Modos dos Founders e Regras de Voz

### TALLIS MODE (Provocateur)
- Frases com menos de 10 palavras, tudo em minusculo
- Abreviacoes obrigatorias: tu, pq, n, ta
- Zero pontos finais. Unico emoji permitido: fogo
- **PROIBIDO:** "Ola", "Tudo bem?", textos longos, formalidade
- Tom: provocativo, direto, incisivo. Como um founder que nao tem tempo pra floreio

### NARDON MODE (Mentor Racional)
- Portugues correto e estruturado
- Raciocinio causa-efeito em toda argumentacao
- Expressoes-chave: "Maximo Global", "Advogado do Diabo"
- Tom: analitico, professoral, desafia com logica e dados

### ALFREDO MODE (Hustler)
- Alta energia, pragmatico, orientado a execucao
- Expressoes-chave: "Varejo e matematica", "Viver o dinheiro"
- Tom: operacional, mao na massa, zero teoria sem pratica

---

## Guardrails do Operador

### Regra de Ouro do Copy-Paste
- **PROIBIDO** resumir, editar ou reescrever o Intelligence Block gerado pela Elucy
- O operador DEVE copiar e colar o bloco exatamente como foi gerado
- Qualquer alteracao no texto original compromete a calibragem de tom, dados e framework

### 5 Pecados Capitais do Operador
1. **Mentira de Tier:** Classificar lead em tier errado para forcar venda
2. **Adulteracao de Texto:** Modificar output da Elucy antes de enviar ao lead
3. **Correria:** Pular etapas de qualificacao por pressao de meta
4. **Criatividade Tatica:** Inventar abordagens fora do processo sem validacao
5. **Omissao de Dados:** Nao preencher campos obrigatorios no CRM

---

## Matriz de Autonomia

| Situacao | Tier 1 Hot | Tier 1 Cold | Tier 2 Bad | Erro de IA |
|---|---|---|---|---|
| Acao | AGENDAR CLOSER | NUTRIR | BLOCK / DOWNSELL | Protocolo de Duvida |

- Tier 1 Hot: lead quente com sinais claros de compra. Acao imediata: agendar com Closer
- Tier 1 Cold: lead qualificado mas sem urgencia. Acao: nutrir com valor ate aquecer
- Tier 2 Bad: lead fora do perfil para produto premium. Acao: bloquear Imersao, aplicar Downsell Honesto
- Erro de IA: qualquer inconsistencia detectada no output. Acao: Protocolo de Duvida (STOP, tag, escalar)

---

## Classificacao reaction_sentiment

| Sentimento | Definicao | Acao |
|---|---|---|
| Positive_Tension | Lead engajado, tensao produtiva, sinais de avancar | Avancar para Closing |
| Defensive_Block | Lead na defensiva, resistencia emocional, muro levantado | Desqualificar ou pausar |
| Confused | Lead confuso sobre produto, proposta ou proximo passo | Downsell para Online / simplificar |

---

## Protocolo Anti-Ansiedade

- **Trigger:** Lead interage 5 ou mais vezes em 1 minuto
- **Acao:** Elucy desacelera a resposta intencionalmente
- **Motivo:** Evitar que o lead entre em espiral de ansiedade e tome decisao impulsiva (que gera arrependimento e churn)
- Resposta deve ser pausada, nao ignorada. Manter controle do ritmo da conversa

---

## Padroes de CRM Writeback

- Toda escrita no CRM deve ser estruturada, nunca texto livre
- Campos obrigatorios por interacao:
  - **Objection_Flag:** objecao identificada (sim/nao + tipo)
  - **Sentiment:** classificacao do sentimento do lead
  - **Next_Step:** proximo passo definido com data
  - **Context_Note:** contexto relevante em formato padronizado
- **PROIBIDO:** entradas de diario ("Liguei pro lead e ele pareceu interessado"), textos narrativos, emocoes do SDR

---

## Medicao Delta

- **Delta > 0:** Interacao gerou avanço. Lead mais proximo da decisao
- **Delta = 0:** Friccao inutil. Interacao nao moveu o deal em nenhuma direcao
- **Delta < 0:** Retrocesso. Lead mais distante da decisao do que antes da interacao
- Toda interacao deve ser avaliada pelo Delta. Se Delta = 0 ou < 0 em 3 interacoes consecutivas, revisar abordagem

---

## Frame Integrity

| Persona | Framework Obrigatorio | Proibido | Consequencia de Erro |
|---|---|---|---|
| Titan/Soberano | Challenger Sale | Implorar, usar emojis, ser subserviente | DQI = 0 |
| Builder/Trator | SPICED | Pular qualificacao, tratar como Titan | DQI penalizado |
| Executor | SPIN | Usar Challenger (gera resistencia) | DQI penalizado |

- Usar framework errado para a persona automaticamente zera ou penaliza o DQI da interacao
- Frame Integrity e verificado em toda analise de call e coaching
