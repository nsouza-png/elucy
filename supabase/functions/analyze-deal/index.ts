// Elucy — Edge Function: analyze-deal
// Roda o motor Elucy na nuvem via Claude API.
// SDR não precisa de G4 OS — análise, copy e relatório acontecem aqui.
// Token Anthropic nunca sai do servidor (Supabase Secret).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── ELUCY SYSTEM PROMPT (comprimido para Edge Function) ────────────────────
const ELUCY_SYSTEM = `Voce e o ELUCI — Enhanced Logic & Unified Commercial Intelligence.
Motor de decisao comercial B2B high-ticket do G4 Educacao.
Nao um assistente. Um Arquiteto de Decisoes.

PRIME DIRECTIVE: "Nao venda o produto errado. Nao venda para o cliente errado."
A integridade do Ecossistema G4 e superior a meta do mes.

PERSONAS:
- Titan (CEO/Fundador >1MM ARR): Challenger ONLY. Nunca SPICED. Tensao de custo de inacao.
- Builder (CEO/Diretor crescendo): SPICED. Clareza de ROI. Foco em sistema.
- Executor (Gestor/Diretor operacional): SPIN + Champion Selling. Foco em problema tecnico.

TIERS:
- Diamond/Gold = Tier 1 (>1MM faturamento) — elegivel todas imersoes
- Silver = Tier 2 (500k-1MM) — elegivel imersoes online, Club
- Bronze = Tier 3 (<500k) — elegivel apenas Online e Traction

ETAPAS DO FUNIL: MQL → SAL (D1/D2/D3) → Conectado → Agendado → Negociacao → Oportunidade → Ganho/Perdido
D1/D2/D3 = dias de prospeccao dentro do SAL. NAO sao etapas separadas.

KILL SWITCHES (inviolaveis):
- KS-01: Titan = Challenger ONLY (SPICED proibido para Titan)
- KS-02: Tier <Silver bloqueado de Imersoes Presenciais
- KS-03: CEO de MEI = downgrade automatico de Authority Score
- KS-04: Black Box Protocol — NUNCA expor metodologia interna ao lead
- KS-05: DQI > receita imediata como metrica de qualidade
- KS-06: Copy para lead SEMPRE passa por fip.md + blde.md

CANAIS (utm_medium → tom):
- ig_tallis / instagram_tallis → Tom confrontacional, caixa baixa, urgencia
- ig_nardon / instagram_nardon → Tom racional, cirurgico, dados
- ig_alfredo / instagram_alfredo → Tom energia, execucao, movimento
- chat / whatsapp → Tom direto, conversacional

OUTPUT OBRIGATORIO — sempre seguir este formato exato:

[ELUCI REPORT]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ELUCI CONTEXT]
Persona:         [Titan/Builder/Executor]
ICP Tier:        [diamond/gold/silver/bronze → 1A/1B/2/3]
Revenue Line:    [produto adequado]
CSE State:       [Cold/Aware/Curious/Problem-Aware/Tensioned/Aligned/Blocked/Disqualified]
CDS Score:       [0-5]
DQI Estimado:    [0-100]

[DIAGNOSTIC CORE]
Problem:         [dor real ou [NAO DECLARADO]]
Impact:          [valor/consequencia ou [NAO DECLARADO]]
Critical Event:  [data/evento ou [NAO DECLARADO]]
Decision:        [estrutura decisoria ou [NAO DECLARADO]]
Evidence:        "[trecho ou dado que sustenta]"

[STRATEGIC DIRECTIVE]
Objetivo:        [micro-goal desta interacao]
Framework:       [Challenger/SPICED/SPIN]
Tatica:          [acao especifica]
BLOQUEADO:       [o que NAO fazer agora]

[NEXT BEST ACTION]
Acao:            [acao clara]
Quem:            [SDR/Closer/Operador]
Quando:          [prazo ou condicao]
CTA:             [mensagem exata, se aplicavel]

[BENCHMARK CANAL]
Canal:           [utm_medium do deal]
Perfil ICP:      [tier mapeado]
% MQL->Won:      [benchmark historico do canal+perfil]
Ticket Medio:    R$ [benchmark] | Deal Atual: R$ [revenue ou estimado]
Posicao:         [ACIMA DA MEDIA / NA MEDIA / ABAIXO DA MEDIA / OUTLIER POSITIVO]
Insight:         [1 linha — o que o benchmark indica sobre este deal]

[GOVERNANCE FLAGS]
Risco:           [descricao ou NENHUM]
Bloqueio:        [motivo ou NENHUM]
Confianca:       [Alta/Media/Baixa]

[ELUCI VERDICT]
DQI: [score] | Recomendacao: [AVANCAR/AGUARDAR/BLOQUEAR/ESCALAR/DOWNSELL]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[COPY SUGERIDA — WhatsApp]
[copy pronta, sem aspas, tom do canal correto, max 3 linhas]

[COPY SUGERIDA — CRM]
[nota objetiva para o CRM, apenas fatos declarados, sem inferencias]`

// ── BENCHMARKS POR CANAL (comprimidos) ────────────────────────────────────
const BENCH = `BENCHMARKS G4 2025 (canal+perfil → % MQL->Won | Ticket Medio):
[IM] Chat: A=6.2%|R$36k, B=4.6%|R$30k, C=5.0%|R$17.6k, D=2.2%|R$13.9k, E=3.7%|R$28.9k, G=4.0%|R$10.1k, I=5.7%|R$10.7k, J=5.2%|R$17.4k, K=11.1%|R$6.8k
Instagram Tallis: A=12.1%|R$49.9k, B=10.8%|R$59.7k, C=7.4%|R$20k, E=4.5%|R$27.1k, I=3.1%|R$20k, J=2.5%|R$9.2k, K=9.1%|R$17.3k
Instagram G4: A=6.9%|R$43.7k, B=5.7%|R$36.7k, C=6.0%|R$22.4k, D=5.0%|R$25.8k, E=5.4%|R$22.4k, I=3.7%|R$15.4k, J=2.9%|R$13.1k
Instagram Alfredo: A=7.4%|R$34.2k, B=5.0%|R$108k(outlier), C=5.1%|R$25k, E=6.0%|R$32.5k, I=3.6%|R$21.4k
Instagram Nardon: A=6.7%|R$43.4k, C=4.3%|R$21.1k, H=11.1%|R$20.8k, I=3.7%|R$19.7k, J=2.2%|R$14.4k
Mapeamento tier->perfil: diamond=A/B | gold=C/D | silver=E/F | bronze=G+`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Autentica o operador
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    const sbAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const sbUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userErr } = await sbUser.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Verifica aprovacao
    const { data: operator } = await sbAdmin
      .from('operators')
      .select('approved, qualificador_name, name, role')
      .eq('email', user.email!)
      .maybeSingle()

    if (!operator?.approved) {
      return new Response(JSON.stringify({ error: 'Operator not approved' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Le o body da requisicao
    const body = await req.json()
    const { deal_id, deal_data, mode = 'analyze' } = body

    if (!deal_data) {
      return new Response(JSON.stringify({ error: 'deal_data required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Monta o prompt com os dados do deal
    const dealContext = `
DADOS DO DEAL (vindos do funil_comercial via Supabase):
- deal_id: ${deal_data.deal_id || deal_id || 'N/A'}
- Nome do lead: ${deal_data.contact_name || deal_data.nome || 'N/A'}
- Email: ${deal_data.email_lead || 'N/A'}
- Cargo: ${deal_data.cargo || 'N/A'}
- Empresa: ${deal_data.empresa || 'N/A'}
- Fase atual: ${deal_data.fase_atual_no_processo || 'N/A'}
- Etapa pipeline: ${deal_data.etapa_atual_no_pipeline || 'N/A'}
- Tier: ${deal_data.tier_da_oportunidade || 'N/A'}
- Delta_t (dias na fase): ${deal_data.delta_t || 'N/A'}
- Produto (linha de receita): ${deal_data.linha_de_receita_vigente || 'N/A'}
- Grupo de receita: ${deal_data.grupo_de_receita || 'N/A'}
- Canal de marketing: ${deal_data.canal_de_marketing || 'N/A'}
- UTM Medium: ${deal_data.utm_medium || 'N/A'}
- Revenue: ${deal_data.revenue || 'N/A'}
- Event skipped: ${deal_data.event_skipped || false}
- Status: ${deal_data.status_do_deal || 'N/A'}
- Qualificador: ${deal_data.qualificador_name || operator.qualificador_name || 'N/A'}
- Closer (proprietario): ${deal_data.proprietario_name || 'N/A'}
- Criado em: ${deal_data.created_at_crm || 'N/A'}

BENCHMARKS DE REFERENCIA:
${BENCH}

OPERADOR: ${operator.name || user.email} | Role: ${operator.role || 'sdr'}`

    const modeInstructions: Record<string, string> = {
      analyze: 'Execute ANALYSIS_MODE — ELUCI REPORT completo com todos os blocos obrigatorios.',
      copy: `Execute COPY_MODE — gere copy para o canal ${body.canal || 'WhatsApp'} no tom correto do utm_medium. Inclua [COPY SUGERIDA] pronta para colar.`,
      brief: 'Execute BRIEF_MODE — briefing comprimido: SPICED snapshot + CSE State + proxima acao. Formato conciso.',
      report: 'Execute ANALYSIS_MODE completo + gere [COPY SUGERIDA] para WhatsApp E nota CRM.',
    }

    const instruction = modeInstructions[mode] || modeInstructions.analyze

    // 5. Chama Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        system: ELUCY_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `${dealContext}\n\n---\n\nINSTRUCAO: ${instruction}`,
          },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      return new Response(JSON.stringify({ error: 'Claude API error', detail: err }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const claudeData = await claudeRes.json()
    const fullOutput = claudeData.content?.[0]?.text || ''

    // 6. Extrai secoes do output
    function extractSection(text: string, name: string): string {
      const re = new RegExp(`\\[${name}\\]\\s*([\\s\\S]*?)(?=\\[\\w|━|$)`, 'i')
      const m = text.match(re)
      return m ? m[1].trim() : ''
    }

    const copyWA = extractSection(fullOutput, 'COPY SUGERIDA — WhatsApp') ||
                   extractSection(fullOutput, 'COPY SUGERIDA')
    const copyCRM = extractSection(fullOutput, 'COPY SUGERIDA — CRM')

    // 7. Salva analise no Supabase para historico
    await sbAdmin.from('deal_analyses').upsert({
      deal_id: deal_id || deal_data.deal_id,
      operator_email: user.email,
      mode,
      report: fullOutput,
      analyzed_at: new Date().toISOString(),
    }, { onConflict: 'deal_id,operator_email,mode', ignoreDuplicates: false }).catch(() => {})
    // ignora erro de tabela nao existente — nao bloqueia o retorno

    return new Response(JSON.stringify({
      report: fullOutput,
      copy_wa: copyWA,
      copy_crm: copyCRM,
      deal_id: deal_id || deal_data.deal_id,
      mode,
      operator: user.email,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
