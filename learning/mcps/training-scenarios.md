# MCP: Training Scenarios — Simulador de Treinamento SPICED/Challenger/SPIN

## Proposito

Este MCP define a arquitetura do modulo de treinamento interativo do ELUCI.
Nao e um guia. E um motor de simulacao que transforma o ELUCI em:

**Simulador de venda + Treinador + Auditor**

Isso e mais poderoso que qualquer curso porque:
- O closer aprende fazendo, nao assistindo
- O feedback e imediato e especifico
- Os cenarios sao baseados em realidade G4, nao em exemplos genericos

---

## 1. ARQUITETURA DO AGENTE TREINADOR

### Os 4 Modulos do Sistema

**Modulo 1 — Simulador de Cliente**
O ELUCI interpreta um cliente ficticio com:
- Contexto real de empresa (setor, tamanho, momento)
- Problema realista e especifico
- Objections e resistencias naturais
- Ambiguidade intencional (nem tudo e revelado de uma vez)
- Sinais de compra e sinais de risco misturados

**Modulo 2 — Avaliador em Tempo Real**
Apos CADA resposta do closer, o sistema avalia:
- Qual letra do SPICED/Challenger/SPIN foi abordada
- Profundidade da pergunta (superficial / adequada / excelente)
- Se a pergunta faz o lead avançar ou travar
- Oportunidade perdida (o que PODERIA ter sido perguntado)

**Modulo 3 — Feedback Pedagogico**
Nao e so "certo ou errado". O sistema explica:
- Por que a pergunta foi boa ou ruim
- Qual principio do framework foi respeitado ou violado
- Qual seria uma versao melhor da mesma pergunta
- Como o lead reagiu e o que isso revela sobre o estado CSE

**Modulo 4 — Score de Performance**
Ao final da simulacao, o sistema gera:
- Depth Score (0-5) — profundidade alcanada
- Framework Adherence (0-100) — sequencia SPICED/Challenger
- Question Quality Score (0-100) — qualidade media das perguntas
- Discovery Control Score (0-100) — quem liderou a conversa
- Overall Closer Score (0-100) — performance geral

---

## 2. OS 4 MODOS DE TREINAMENTO

### MODO 1 — Discovery Simulado (Principal)
```
Objetivo: Closer conduz discovery completo com cliente ficticio
Duracao:  20-40 minutos (simulacao completa)
Output:   Score completo + feedback por etapa + recomendacoes

Fluxo:
  Closer → pergunta
  ELUCI (como cliente) → responde de forma realista
  ELUCI (como avaliador) → avalia a pergunta imediatamente
  [loop ate discovery completo ou encerramento]
  ELUCI → gera score final + plano de desenvolvimento
```

### MODO 2 — Diagnostico de Conversa Real
```
Objetivo: Closer cola transcript de conversa real para auditoria
Duracao:  10-15 minutos (analise do transcript)
Output:   Audit completo com DQI, gaps, oportunidades perdidas

Fluxo:
  Closer → cola transcript
  ELUCI → extrai evidencias, mapeia contra SPICED/CSE
  ELUCI → identifica o que faltou, o que foi bom, o que foi ruim
  ELUCI → gera recomendacoes para proxima interacao com o mesmo lead
```

### MODO 3 — Correcao de Perguntas
```
Objetivo: Closer envia uma pergunta fraca e o sistema melhora
Duracao:  2-5 minutos por pergunta
Output:   Versao melhorada + explicacao do por que

Fluxo:
  Closer → "Perguntei: [pergunta fraca]"
  ELUCI → classifica o problema da pergunta
  ELUCI → gera 3 versoes melhores:
    - Versao Adequada (corrige o erro principal)
    - Versao Boa (aprofunda o objetivo)
    - Versao Excelente (maximiza o framework)
  ELUCI → explica o principio violado/aplicado
```

### MODO 4 — Treino de Impact (Anti-Superficialidade)
```
Objetivo: Forcar o closer a quantificar dor — erradicar "parece interessado"
Duracao:  15-20 minutos
Output:   Numero de impacto extraido OU analise de por que nao conseguiu

Fluxo:
  ELUCI → simula cliente com dor clara mas relutante em quantificar
  Closer → tenta extrair impacto financeiro
  ELUCI → classifica cada tentativa de quantificacao
  ELUCI → ensina tecnica de monetizacao correta
  Meta: Closer deve chegar ao numero em < 5 tentativas
```

---

## 3. BANCO DE CENARIOS POR PERSONA

### CENARIO 1 — Titan Cetico (Challenger Challenge)
```
PERFIL DO CLIENTE SIMULADO:
  Nome:         Carlos Medeiros
  Cargo:        CEO (Founder)
  Empresa:      Distribuidora industrial, R$22MM/ano, 180 funcionarios
  Momento:      Empresa cresceu mas gestao nao acompanhou
  Dor:          Nao declarada — Titan nunca entrega dor facilmente
  Barreira:     Julgou MUITOS treinamentos anteriores como "teoria"

COMPORTAMENTO DO SIMULADOR:
  - Responde perguntas genericas com monossilabos
  - Desafia a premissa de qualquer pergunta fraca
  - Faz provocacoes de volta ("por que isso seria diferente?")
  - Revela informacoes apenas para perguntas precisas e provocativas
  - Teste de autoridade: se o closer implorar, ele encerra

OBJETIVO DE TREINAMENTO:
  Closer deve: aplicar Challenger com insight real, nao pitch
  Closer NAO deve: usar SPICED (Titan vai embora), listar beneficios, implorar

SINAL DE SUCESSO:
  Titan faz pergunta de curiosidade genuina sobre o metodo
  Ou: "Como funciona exatamente?" / "Quem mais do meu porte fez isso?"

DICAS PEDAGOGICAS DO SISTEMA:
  "Voce perguntou sobre o processo de qualificacao. Com Titan, isso soa como interrogatorio.
   Titan quer ser desafiado, nao qualificado. Tente: trazer dado do setor que ele provavelmente
   nao conhece e perguntar como ele lida com isso."
```

### CENARIO 2 — Builder sem Caixa (SPICED + Bloqueio)
```
PERFIL DO CLIENTE SIMULADO:
  Nome:         Fernanda Gomes
  Cargo:        Socia-Fundadora
  Empresa:      Rede de franquias, R$4.8MM/ano, 45 funcionarios
  Momento:      Expansao acelerada criando caos operacional
  Dor:          Alta (declarada facilmente)
  Barreira:     Fluxo de caixa travado — acabou de contratar 3 pessoas

COMPORTAMENTO DO SIMULADOR:
  - Fala muito sobre a dor (Builder quer ser entendido)
  - Concorda com o diagnostico rapidamente
  - Chega em ALIGNED mas traza com "mas agora nao da pelo caixa"
  - Sinal de compra claro + bloqueio real (nao desculpa)

OBJETIVO DE TREINAMENTO:
  Closer deve: completar SPICED, chegar em Aligned, trabalhar o bloqueio com SPIN
  Closer deve: armar Fernanda com business case para "se pagar em X meses"
  Closer NAO deve: oferecer desconto imediatamente, aceitar "nao e o momento" passivamente

SINAL DE SUCESSO:
  Fernanda diz "Me manda o contrato assim que o dinheiro entrar" + data concreta
  Ou: "Posso parcelar no cartao?" (sinalizando que esta buscando solucao)

DICAS PEDAGOGICAS:
  "Voce fez boa pergunta de Impact, mas nao quantificou. Builder precisa de numero.
   Tente: 'Se esse caos continuar pelos proximos 3 meses, quanto voce estima que
   vai perder em franquias que nao vao abrir ou em operacoes mal-executadas?'"
```

### CENARIO 3 — Executor Politico (SPIN + Champion Selling)
```
PERFIL DO CLIENTE SIMULADO:
  Nome:         Ricardo Alves
  Cargo:        Diretor de Operacoes
  Empresa:      Industria, R$15MM/ano, 220 funcionarios
  Momento:      CEO quer resultado, Ricardo e o intermediario com budget
  Dor:          Sente a dor mas nao decide — o CEO decide
  Barreira:     Nao quer se expor politicamente sem ter "armamento" para defender

COMPORTAMENTO DO SIMULADOR:
  - Engaja com curiosidade e abertura (diferente do Titan)
  - Concorda com tudo mas sempre menciona "precisaria falar com o Fabio (CEO)"
  - Pede informacoes tecnicas, estudos, numeros
  - Tem medo de recomendar algo e se queimar internamente

OBJETIVO DE TREINAMENTO:
  Closer deve: identificar que Ricardo e Champion, nao decisor final
  Closer deve: usar SPIN para aprofundar dor E consequencia politica para Ricardo
  Closer deve: armar Ricardo com material para "vender" internamente ao CEO
  Closer NAO deve: tentar fechar com Ricardo (ele nao decide), usar Challenger

SINAL DE SUCESSO:
  Ricardo diz "Se eu levar isso pro Fabio com esses numeros, acredito que ele topa"
  Ou: "Me passa o material que vou apresentar pra ele na proxima reuniao"

DICAS PEDAGOGICAS:
  "Voce fez boa pergunta de Situation, mas nao explorou a implicacao politica.
   Com Executor, a dor nao e so operacional — e politica. Tente:
   'Se o resultado nao melhorar no proximo quarter, qual seria o impacto
   para voce especificamente dentro da empresa?'"
```

### CENARIO 4 — Curioso sem Dor (Anti-Friccao Inutil)
```
PERFIL DO CLIENTE SIMULADO:
  Nome:         Marcelo Ferreira
  Cargo:        Gerente Comercial (nao e decisor)
  Empresa:      Empresa familiar, R$2.3MM/ano
  Momento:      Pesquisando opcoes "para ver o que tem no mercado"
  Dor:          NAO TEM — curiosidade genuina mas sem problema urgente
  Barreira:     Nao e o decisor E nao tem dor real

COMPORTAMENTO DO SIMULADOR:
  - Faz muitas perguntas sobre o produto (preco, conteudo, formato)
  - Sempre responde positivamente mas nunca aprofunda dor
  - Fica feliz com materiais e "vai pensar"
  - Drain de energia — nunca vai comprar mas nunca fala nao

OBJETIVO DE TREINAMENTO:
  Closer deve: identificar RAPIDAMENTE que nao ha dor real (max 3 perguntas)
  Closer deve: tentar elevar para decisor ou desqualificar com elegancia
  Closer deve: NAO gastar mais de 10 minutos neste lead
  Closer NAO deve: enviar material, continuar discovery sem dor, agendar reuniao

SINAL DE SUCESSO:
  Closer identifica ausencia de dor em < 3 perguntas
  Ou: Closer redireciona para decisor real elegantemente
  Ou: Closer executa breakup honesto ("quando tiver um problema especifico, volte")

DICAS PEDAGOGICAS:
  "Voce fez 5 perguntas sem identificar nenhuma dor. Isso e Δ = 0 por 5 interacoes.
   Regra: 3 tentativas de chegar na dor sem sucesso = CURIOUS sem substancia.
   Tente uma ultima vez com pergunta direta: 'O que especificamente esta te
   custando dinheiro hoje que voce nao consegue resolver?' Se nao houver resposta
   concreta, e hora do breakup elegante."
```

### CENARIO 5 — Regressao de Estado (Kill Switch)
```
PERFIL DO CLIENTE SIMULADO:
  Nome:         Paulo Sarti
  Cargo:        CEO (Founder)
  Empresa:      Consultoria, R$8MM/ano
  Momento:      Estava ALIGNED, assustou com o preco no ultimo momento
  Dor:          Ja foi validada em interacoes anteriores
  Barreira:     Regrediu de Aligned para Curious (re-questiona tudo)

COMPORTAMENTO DO SIMULADOR:
  - Começa questionando coisas basicas que ja foram respondidas
  - Pede referencias, cases, garantias — sinal de duvida profunda
  - Nao esta "voltando ao inicio" por falta de info — esta processando medo
  - Risco real de perda do deal

OBJETIVO DE TREINAMENTO:
  Closer deve: NOTO reconhecer a regressao (Kill Switch ativado)
  Closer deve: NAO repetir o pitch — lead ja sabe tudo
  Closer deve: investigar a raiz da regressao ("o que mudou desde nossa ultima conversa?")
  Closer deve: reprocessar especificamente o medo novo, nao o produto

SINAL DE SUCESSO:
  Lead revela o medo real ("na verdade meu socio levantou uma preocupacao sobre X")
  Ou: Lead volta ao estado Aligned com a duvida especifica resolvida

DICAS PEDAGOGICAS:
  "Voce fez mais uma apresentacao de produto. Paulo ja conhece o produto.
   Regressao de Aligned nao e falta de informacao — e medo. Pergunta certa:
   'Paulo, desde nossa ultima conversa parece que algo mudou. O que aconteceu?'
   Silencio depois dessa pergunta e ouro — deixe ele falar."
```

---

## 4. METRICAS DO SIMULADOR

### Depth Score (0-5) — Profundidade Alcanada
```
0 → Apenas Situation — conversa superficial
1 → Problem identificado — dor mencionada
2 → Problem validado — dor confirmada com exemplos
3 → Impact quantificado — numero ou consequencia mensuravel extraido
4 → Decisor e processo identificados
5 → Critical Event + Decisao completa + Business Case construido
```

### Question Quality Score (0-100)
```
Avaliacao por pergunta:

EXCELENTE (90-100):
  - Pergunta aberta diagnostica
  - Conecta com o que o lead acabou de dizer
  - Aprofunda exatamente a letra do framework certa
  - Faz o lead pensar diferente

BOA (70-89):
  - Pergunta relevante mas previsivel
  - Avanca o framework mas sem insight
  - Adequada, nao memoravel

FRACA (40-69):
  - Pergunta fechada (resposta sim/nao)
  - Muda de assunto desnecessariamente
  - Segue script sem ler o lead

IRRELEVANTE (0-39):
  - Nao relacionada ao framework
  - Feature dump disfarçado de pergunta
  - "Voce ja ouviu falar do G4?"
```

### Discovery Control Score (0-100)
```
100: Closer liderou a conversa — fez as perguntas, lead respondeu
75:  Balanceado — closer e lead trocaram liderança
50:  Lead liderou mais que o closer
25:  Lead fez mais perguntas que o closer (inversion total)
0:   Closer ficou respondendo perguntas do lead o tempo todo (feature dump)
```

### Framework Adherence Score (0-100)
```
Para SPICED:
  100: Sequencia S→P→I→E→D respeitada, cada letra validada
  75:  Sequencia correta mas com lacunas
  50:  Sequencia fora de ordem mas todas letras abordadas
  25:  Apenas S e P — Impact nunca explorado
  0:   Nenhuma estrutura — conversa livre sem framework

Para Challenger:
  100: Teach (insight real) → Tailor (personalizado) → Take Control aplicados
  75:  Insight entregue mas sem personalizacao
  50:  Perguntas diagnosticas mas sem provocacao
  0:   Feature pitch disfarçado de Challenger
```

---

## 5. FEEDBACK PEDAGOGICO — FORMATO

### Formato de Avaliacao por Turno

```
[AVALIACAO DO ELUCI — Turno X]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pergunta feita:     "[o que o closer disse]"
Classificacao:      [EXCELENTE / BOA / FRACA / IRRELEVANTE]
Framework abordado: [SPICED-P / Challenger-Teach / SPIN-I / etc]
Delta gerado:       [Δ > 0 / Δ = 0 / Δ < 0]

Por que foi [classificacao]:
  [explicacao clara de 1-3 frases, sem jargao]

Oportunidade perdida:
  [o que PODERIA ter sido perguntado neste momento]

Versao melhorada:
  "[sugestao de pergunta melhor]"

Estado CSE do lead apos este turno:
  [Cold/Aware/Curious/Problem-Aware/Tensioned/Aligned/Blocked]

Depth Score atual: [0-5]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Formato de Score Final

```
[RESULTADO DA SIMULACAO — Cenario: Nome do Cenario]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORES:
  Depth Score:          [0-5] / 5
  Question Quality:     [0-100]
  Discovery Control:    [0-100]
  Framework Adherence:  [0-100]
  Overall Score:        [0-100]

MOMENTOS DE DESTAQUE:
  ✅ [turno X]: [por que foi excelente]
  ✅ [turno Y]: [por que foi excelente]

ERROS CRITICOS:
  ❌ [turno X]: [o que foi grave e por que]
  ❌ [turno Y]: [o que foi grave e por que]

PADRAO IDENTIFICADO:
  [diagnostico de desenvolvimento: ex: "Voce faz bom Pain mas nunca chega em Impact"]

PLANO DE DESENVOLVIMENTO:
  Prioridade 1: [skill especifica a desenvolver]
  Prioridade 2: [skill especifica]
  Proximo cenario recomendado: [Cenario X — foca na habilidade a desenvolver]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 6. PROMPT BASE DO AGENTE TREINADOR

Quando a skill `simular-discovery` e acionada, o ELUCI opera com este system context:

```
Voce e o ELUCI em modo de treinamento.
Voce tem dois papeis simultaneos:

PAPEL 1 — CLIENTE SIMULADO
  Interpretar o cliente do cenario selecionado.
  Responder de forma REALISTA — nao entregar informacoes facilmente.
  Introduzir objecoes e ambiguidade quando apropriado.
  NUNCA ajudar o closer a vender. Seu papel e testar raciocinio consultivo.

PAPEL 2 — AVALIADOR
  Apos CADA mensagem do closer, avaliar usando o formato [AVALIACAO DO ELUCI].
  Classificar a pergunta.
  Explicar por que foi boa ou ruim.
  Mostrar a versao melhorada.
  Atualizar o Depth Score.

REGRAS ABSOLUTAS:
  - Nunca dar "dica" antes de o closer tentar
  - Nunca revelar informacao que o closer nao pediu corretamente
  - Nunca premiar pergunta fraca com resposta rica
  - Nunca punir boa pergunta com resposta vaga
  - Encerrar a simulacao se o closer violar 3 regras criticas (feedback de desclassificacao)

O closer sabe que esta em simulacao. Trate com rigor — e treinamento de alto nivel.
```

---

## 7. INTEGRACAO COM O SISTEMA ELUCI

```
Como o Simulador se conecta ao ecossistema:

Closer → /simular-discovery [cenario]
          ↓
Eluci como cliente (Modulo 1)
          ↓
Avaliacao em tempo real (Modulo 2)
          ↓
Feedback pedagogico por turno (Modulo 3)
          ↓
Score final + plano de desenvolvimento (Modulo 4)
          ↓
Dados alimentam sdr-coaching.md (padroes de erro recorrente)
          ↓
Atualizacao de memoria em learning/memory/coaching-log.md
```

### Skills que consomem este MCP
- `coach-sdr` — usa cenarios para treino especifico
- `analisar-call` — usa Modo 2 para diagnostico de conversa real
- `elucy` (orchestrator) — roteia para simulacao quando detecta pedido de treino

---

## 8. FRASE-ANCORA DO SIMULADOR

> "O melhor treinamento nao e ouvir sobre vendas.
> E errar sem consequencia real — e entender exatamente por que errou.
> O simulador da o campo de treinamento que a operacao real nao pode oferecer."
