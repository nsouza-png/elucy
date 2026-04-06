// ============================================================================
// transition-validator — Edge Function
// Valida transicoes de etapa no pipeline SDR/Closer
// Parte do D2 Pipeline Update — Elucy Revenue Intelligence
// Data: 2026-04-06
//
// POST /transition-validator
// Auth: JWT obrigatorio
// Rate limit: 30 req/min por operador (sliding window)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- CORS ---
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://nsouza-png.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Rate Limiter (in-memory sliding window, 30 req/min) ---
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000
const rateBuckets: Map<string, number[]> = new Map()

function checkRateLimit(operatorEmail: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(operatorEmail) ?? []
  const filtered = bucket.filter((ts) => now - ts < RATE_WINDOW_MS)
  if (filtered.length >= RATE_LIMIT) {
    rateBuckets.set(operatorEmail, filtered)
    return false
  }
  filtered.push(now)
  rateBuckets.set(operatorEmail, filtered)
  return true
}

// --- Types ---
interface GateResult {
  name: string
  passed: boolean
  detail: string
}

interface KillSwitchResult {
  name: string
  blocked: boolean
  detail: string
}

interface TransitionResponse {
  valid: boolean
  transition_type: string
  gates: GateResult[]
  kill_switches: KillSwitchResult[]
  recommendation: string
  signal_snapshot: Record<string, unknown>
  reason?: string
}

// --- Gate Evaluators ---
async function evaluateGate(
  gateName: string,
  dealId: string,
  deal: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>
): Promise<GateResult> {
  switch (gateName) {
    case 'contact_initiated': {
      const { data } = await supabase
        .from('deal_interactions')
        .select('id, type, created_at')
        .eq('deal_id', dealId)
        .in('type', ['call', 'whatsapp', 'email'])
        .limit(1)
      const passed = (data?.length ?? 0) > 0
      return {
        name: gateName,
        passed,
        detail: passed
          ? `Contato realizado via ${data![0].type} em ${data![0].created_at}`
          : 'Inicie um contato (call, WhatsApp ou email) antes de avancar',
      }
    }

    case 'bidirectional_response': {
      const { data } = await supabase
        .from('deal_interactions')
        .select('id, created_at')
        .eq('deal_id', dealId)
        .eq('direction', 'inbound')
        .limit(1)
      const passed = (data?.length ?? 0) > 0
      return {
        name: gateName,
        passed,
        detail: passed
          ? `Resposta recebida em ${data![0].created_at}`
          : 'Aguarde uma resposta do lead antes de avancar para Conectados',
      }
    }

    case 'meeting_proposed': {
      const passed = deal.meeting_date != null
      return {
        name: gateName,
        passed,
        detail: passed
          ? `Reuniao proposta para ${deal.meeting_date}`
          : 'Proponha uma data e horario para a reuniao',
      }
    }

    case 'invite_accepted': {
      const passed = deal.meeting_confirmed === true
      return {
        name: gateName,
        passed,
        detail: passed
          ? 'Convite aceito pelo lead'
          : 'O lead ainda nao confirmou o convite da reuniao',
      }
    }

    case 'no_show_or_reschedule': {
      const passed =
        deal.no_show === true || deal.reschedule_requested === true
      return {
        name: gateName,
        passed,
        detail: passed
          ? deal.no_show
            ? 'No-show registrado'
            : 'Reagendamento solicitado pelo lead'
          : 'Nao ha registro de no-show ou pedido de reagendamento',
      }
    }

    case 'dqi_gte_4': {
      const { data } = await supabase
        .from('deal_data_quality_runtime')
        .select('data_trust_score')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
        .limit(1)
      const score = data?.[0]?.data_trust_score ?? 0
      const passed = score >= 0.8
      return {
        name: gateName,
        passed,
        detail: passed
          ? `Qualidade dos dados: Excelente`
          : `Melhore a qualidade dos dados antes de avancar para Fechamento`,
      }
    }

    case 'spiced_complete': {
      const fields = ['situation', 'pain', 'impact', 'critical_event', 'decision']
      const missing = fields.filter((f) => !deal[f])
      const passed = missing.length === 0
      return {
        name: gateName,
        passed,
        detail: passed
          ? 'Qualificacao completa'
          : `Complete os campos: ${missing.join(', ')}`,
      }
    }

    case 'handoff_approved': {
      // Auto-approved se DQI >= 4.5 (score >= 0.9), senao precisa override manual
      const { data } = await supabase
        .from('deal_data_quality_runtime')
        .select('data_trust_score')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
        .limit(1)
      const score = data?.[0]?.data_trust_score ?? 0
      const autoApproved = score >= 0.9
      const passed = autoApproved || deal.override_by != null
      return {
        name: gateName,
        passed,
        detail: passed
          ? autoApproved
            ? 'Handoff aprovado automaticamente'
            : 'Handoff aprovado pelo gerente'
          : 'Solicite aprovacao do gerente para o handoff',
      }
    }

    case 'reactivation_post_silence': {
      const deltaT = Number(deal.delta_t ?? 0)
      const passed = deltaT > 7
      return {
        name: gateName,
        passed,
        detail: passed
          ? `Silencio confirmado (${deltaT} dias)`
          : `Aguarde pelo menos 7 dias de silencio antes de reativar (atual: ${deltaT} dias)`,
      }
    }

    case 'double_no_show': {
      const { data } = await supabase
        .from('deal_transition_events')
        .select('id')
        .eq('deal_id', dealId)
        .eq('to_stage', 'Reagendamento')
      const count = data?.length ?? 0
      const passed = count >= 2
      return {
        name: gateName,
        passed,
        detail: passed
          ? `${count} no-shows registrados`
          : `Apenas ${count} no-show(s) registrado(s). Sao necessarios pelo menos 2`,
      }
    }

    case 'cold_reentry_30d': {
      const deltaT = Number(deal.delta_t ?? 0)
      const passed = deltaT > 30
      return {
        name: gateName,
        passed,
        detail: passed
          ? `Lead frio ha ${deltaT} dias — reentrada permitida`
          : `Aguarde pelo menos 30 dias para reentrada (atual: ${deltaT} dias)`,
      }
    }

    default:
      return { name: gateName, passed: false, detail: `Gate desconhecido: ${gateName}` }
  }
}

// --- Kill Switch Evaluators ---
function evaluateKillSwitches(
  fromStage: string,
  toStage: string,
  deal: Record<string, unknown>,
  motivo_lost?: string
): KillSwitchResult[] {
  const results: KillSwitchResult[] = []

  // KS-01: premature_close
  const closerStages = ['Fechamento', 'Negociacao']
  const validPreClose = ['Entrevista Agendada']
  if (closerStages.includes(toStage) && !validPreClose.includes(fromStage)) {
    results.push({
      name: 'premature_close',
      blocked: true,
      detail: 'Realize a entrevista antes de avancar para esta etapa',
    })
  }

  // KS-02: authority_missing
  const authorityScore = Number(deal.authority_signal ?? 0)
  if (closerStages.includes(toStage) && authorityScore < 0.4) {
    results.push({
      name: 'authority_missing',
      blocked: true,
      detail: 'Identifique o decisor antes de avancar. Considere uma abordagem multi-thread',
    })
  }

  // KS-03: spiced_lock_titan
  const tier = String(deal.tier ?? '').toLowerCase()
  const framework = String(deal.framework ?? '').toLowerCase()
  if (tier === 'diamond' && framework !== 'challenger') {
    results.push({
      name: 'spiced_lock_titan',
      blocked: true,
      detail: 'Este perfil requer abordagem Challenger. Ajuste o framework antes de continuar',
    })
  }

  // KS-04: tier_mismatch
  const linhaReceita = String(deal.linha_de_receita_vigente ?? '').toLowerCase()
  if (
    ['silver', 'bronze'].includes(tier) &&
    linhaReceita.includes('imers')
  ) {
    results.push({
      name: 'tier_mismatch',
      blocked: true,
      detail: 'Este porte nao e elegivel para imersoes presenciais. Considere uma alternativa online',
    })
  }

  // KS-05: no_motivo_lost
  if (toStage === 'Perdido' && !motivo_lost) {
    results.push({
      name: 'no_motivo_lost',
      blocked: true,
      detail: 'Informe o motivo da perda antes de mover para Perdido',
    })
  }

  return results
}

// --- Build Recommendation ---
function buildRecommendation(
  gateResults: GateResult[],
  killSwitchResults: KillSwitchResult[]
): string {
  const failedGates = gateResults.filter((g) => !g.passed)
  const activeKS = killSwitchResults.filter((ks) => ks.blocked)

  if (failedGates.length === 0 && activeKS.length === 0) {
    return 'Todos os requisitos foram atendidos. Pode avancar.'
  }

  const parts: string[] = []

  if (activeKS.length > 0) {
    parts.push(activeKS.map((ks) => ks.detail).join('. '))
  }

  if (failedGates.length > 0) {
    parts.push(failedGates.map((g) => g.detail).join('. '))
  }

  return parts.join('. ')
}

// --- Build Signal Snapshot ---
function buildSignalSnapshot(deal: Record<string, unknown>): Record<string, unknown> {
  return {
    delta_t: deal.delta_t ?? null,
    temperature: deal.temperature ?? null,
    tier: deal.tier ?? null,
    framework: deal.framework ?? null,
    authority_signal: deal.authority_signal ?? null,
    meeting_confirmed: deal.meeting_confirmed ?? null,
    no_show: deal.no_show ?? null,
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // --- JWT Auth ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'JWT obrigatorio' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Client with user JWT for auth verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token invalido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const operatorEmail = user.email!

    // --- Rate Limit ---
    if (!checkRateLimit(operatorEmail)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit excedido. Tente novamente em 1 minuto.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Parse Request ---
    const body = await req.json()
    const { deal_id, from_stage, to_stage, motivo_lost } = body

    if (!deal_id || !from_stage || !to_stage) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatorios: deal_id, from_stage, to_stage' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service role client for data access (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // --- Step 1: Lookup transition in graph ---
    const { data: edges, error: edgeError } = await supabase
      .from('pipeline_transition_graph')
      .select('*')
      .eq('from_stage', from_stage)
      .eq('to_stage', to_stage)
      .eq('is_active', true)
      .limit(1)

    if (edgeError) {
      throw new Error(`Erro ao consultar grafo: ${edgeError.message}`)
    }

    // No valid edge found
    if (!edges || edges.length === 0) {
      // Log invalid attempt
      await supabase.from('deal_transition_events').insert({
        deal_id,
        operator_email: operatorEmail,
        from_stage,
        to_stage,
        transition_type: 'advance',
        gates_evaluated: [],
        gates_passed: [],
        gates_failed: [{ name: 'graph_edge', passed: false, detail: 'Transicao nao existe no grafo' }],
        kill_switches_triggered: [],
        signal_snapshot: {},
      })

      const response: TransitionResponse = {
        valid: false,
        transition_type: 'advance',
        gates: [],
        kill_switches: [],
        recommendation: 'Esta movimentacao nao e permitida no fluxo atual.',
        signal_snapshot: {},
        reason: 'Transicao nao permitida',
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const edge = edges[0]
    const transitionType: string = edge.transition_type
    const gatesRequired: string[] = edge.gates_required ?? []

    // --- Step 2: Fetch deal ---
    const { data: dealRows, error: dealError } = await supabase
      .from('deals')
      .select('*')
      .eq('deal_id', deal_id)
      .limit(1)

    if (dealError) {
      throw new Error(`Erro ao buscar deal: ${dealError.message}`)
    }

    const deal: Record<string, unknown> = dealRows?.[0] ?? {}

    // --- Step 3: Evaluate gates ---
    const gateResults: GateResult[] = []
    for (const gateName of gatesRequired) {
      const result = await evaluateGate(gateName, deal_id, deal, supabase)
      gateResults.push(result)
    }

    const gatesPassed = gateResults.filter((g) => g.passed)
    const gatesFailed = gateResults.filter((g) => !g.passed)

    // --- Step 4: Evaluate kill switches ---
    const killSwitchResults = evaluateKillSwitches(from_stage, to_stage, deal, motivo_lost)
    const activeKillSwitches = killSwitchResults.filter((ks) => ks.blocked)

    // --- Step 5: Determine validity ---
    const valid = gatesFailed.length === 0 && activeKillSwitches.length === 0

    // --- Step 6: Build response ---
    const signalSnapshot = buildSignalSnapshot(deal)
    const recommendation = buildRecommendation(gateResults, killSwitchResults)

    // DQI for audit
    const { data: dqiRows } = await supabase
      .from('deal_data_quality_runtime')
      .select('data_trust_score')
      .eq('deal_id', deal_id)
      .order('created_at', { ascending: false })
      .limit(1)
    const dqiScore = dqiRows?.[0]?.data_trust_score
      ? Number((dqiRows[0].data_trust_score * 5).toFixed(2))
      : null

    // --- Step 7: Log transition event (always, valid or not) ---
    await supabase.from('deal_transition_events').insert({
      deal_id,
      operator_email: operatorEmail,
      from_stage,
      to_stage,
      transition_type: transitionType,
      gates_evaluated: gateResults,
      gates_passed: gatesPassed,
      gates_failed: gatesFailed,
      kill_switches_triggered: activeKillSwitches.map((ks) => ks.name),
      signal_snapshot: signalSnapshot,
      dqi_at_transition: dqiScore,
    })

    // --- Step 8: Return response ---
    const response: TransitionResponse = {
      valid,
      transition_type: transitionType,
      gates: gateResults,
      kill_switches: killSwitchResults,
      recommendation,
      signal_snapshot: signalSnapshot,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('transition-validator error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
