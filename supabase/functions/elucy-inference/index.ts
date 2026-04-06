// Elucy Inference — Edge Function com Prompt Caching
// Browser → Edge Function → Claude API (com cache_control nos MCPs)
// API key segura via Supabase Secret, rate limiting por operador.
// Substitui callIntelligenceAPI() direto do browser.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': 'https://nsouza-png.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// MCP_MAP — quais documentos injetar por request type
// Budget: ~30k system tokens (prompt caching amortiza custo)
// eluci-core = 15k tokens (mandatory), demais priorizados por impacto no output
const MCP_MAP: Record<string, string[]> = {
  analyze: ['eluci-core','mece-intelligence','signals','behavior','output-schema'],
  copy: ['eluci-core','blde','sdr-social-dm','output-schema'],
  note: ['eluci-core','output-schema'],
  business_analysis: ['eluci-core','mece-intelligence','strategy'],
  dm_copy: ['eluci-core','sdr-social-dm','blde','output-schema'],
  coaching: ['eluci-core','sdr-coaching','playbook-sdr'],
  briefing: ['eluci-core','mece-intelligence','output-schema'],
  batch_classify: ['eluci-core','signals','output-schema'],
  competitive: ['eluci-core','mece-intelligence','strategy'],
  rt_assist: ['eluci-core','blde','fip','sdr-social-dm','output-schema'],
  downsell: ['eluci-core','mece-intelligence','guardrails','output-schema'],
  conv_enrichment: ['eluci-core','signals','behavior','output-schema'],
}

// In-memory MCP cache (warm across invocations within same Deno isolate)
let _mcpCache: Record<string, string> | null = null
let _mcpCacheTs = 0
const MCP_CACHE_TTL = 300_000 // 5 minutes

// Rate limit: in-memory sliding window (per Deno isolate)
const _rateLimits: Record<string, number[]> = {}
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 8 // 8 requests per minute per operator

function checkRateLimit(email: string): boolean {
  const now = Date.now()
  if (!_rateLimits[email]) _rateLimits[email] = []
  _rateLimits[email] = _rateLimits[email].filter(t => now - t < RATE_LIMIT_WINDOW)
  if (_rateLimits[email].length >= RATE_LIMIT_MAX) return false
  _rateLimits[email].push(now)
  return true
}

async function loadMCPs(supabaseUrl: string, serviceKey: string): Promise<Record<string, string>> {
  // Check in-memory cache first
  if (_mcpCache && Date.now() - _mcpCacheTs < MCP_CACHE_TTL) return _mcpCache

  // Try Supabase Storage bucket "mcps" — each MCP as individual .md file
  // Fallback: try mcps.json from storage
  const sb = createClient(supabaseUrl, serviceKey)

  // Attempt 1: mcps.json from storage bucket
  try {
    const { data: fileData } = await sb.storage.from('mcps').download('mcps.json')
    if (fileData) {
      const text = await fileData.text()
      const bundle = JSON.parse(text)
      const result: Record<string, string> = {}
      for (const [key, val] of Object.entries(bundle)) {
        result[key] = (val as any).content || ''
      }
      _mcpCache = result
      _mcpCacheTs = Date.now()
      return result
    }
  } catch (e) { console.warn('MCP load from storage failed:', (e as Error).message) }

  // Attempt 2: mcps table in database
  try {
    const { data: rows } = await sb.from('mcps').select('slug,content').limit(50)
    if (rows && rows.length > 0) {
      const result: Record<string, string> = {}
      for (const row of rows) result[row.slug] = row.content || ''
      _mcpCache = result
      _mcpCacheTs = Date.now()
      return result
    }
  } catch (e) { console.warn('MCP load from DB failed:', (e as Error).message) }

  // Attempt 3: fetch from GitHub Pages (public)
  try {
    const resp = await fetch('https://nsouza-png.github.io/elucy/mcps.json')
    if (resp.ok) {
      const bundle = await resp.json()
      const result: Record<string, string> = {}
      for (const [key, val] of Object.entries(bundle)) {
        result[key] = (val as any).content || ''
      }
      _mcpCache = result
      _mcpCacheTs = Date.now()
      return result
    }
  } catch (e) { console.warn('MCP load from GitHub Pages failed:', (e as Error).message) }

  console.error('All MCP load attempts failed — returning empty')
  return {}
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const startTime = Date.now()

  try {
    // ── 1. Auth ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured as Supabase secret' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const sbAdmin = createClient(supabaseUrl, serviceKey)

    // Validate user — use sbAdmin.auth.getUser(jwt) to avoid anon key mismatch
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: userErr } = await sbAdmin.auth.getUser(jwt)
    if (userErr || !user || !user.email) {
      console.warn('[elucy-inference] auth.getUser failed:', userErr?.message || 'no user/email')
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    const userEmail = user.email

    // Check operator approval
    const { data: operator } = await sbAdmin
      .from('operators')
      .select('approved, qualificador_name, name, role')
      .eq('email', userEmail)
      .maybeSingle()

    if (!operator?.approved) {
      return new Response(JSON.stringify({ error: 'Operator not approved' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Rate limit ──
    if (!checkRateLimit(userEmail)) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Maximo 8 requests por minuto. Aguarde alguns segundos.',
      }), {
        status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. Parse body ──
    // Accepts two formats:
    //   Legacy (browser): { requestType, userMessage, model, dealId }
    //   Structured:       { request_type, deal_context, history, prompt, extra_context, deal_id, deal_data, model_override }
    let body: any
    try {
      body = await req.json()
    } catch (_) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    const request_type = body.request_type || body.requestType || 'analyze'
    const deal_context = body.deal_context || ''
    const history = body.history || ''
    const prompt = body.prompt || ''
    const extra_context = body.extra_context || ''
    const deal_id = body.deal_id || body.dealId || ''
    const deal_data = body.deal_data || null
    const model_override = body.model_override || body.model || ''
    // Legacy format: browser sends pre-built userMessage with everything concatenated
    const legacyUserMessage = body.userMessage || ''

    if (!deal_context && !prompt && !legacyUserMessage) {
      return new Response(JSON.stringify({ error: 'deal_context or prompt required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 4. Build system prompt with MCPs + cache_control ──
    const mcps = await loadMCPs(supabaseUrl, serviceKey)
    const slugs = MCP_MAP[request_type] || MCP_MAP.analyze

    // System messages: each MCP as a separate block with cache_control
    // cache_control on eluci-core (mandatory, stable, 15k tokens) — caches the biggest prefix
    // Also cache_control on last MCP block to cache the full MCP set
    const systemBlocks: any[] = []
    const lastMcpIdx = slugs.length - 1

    slugs.forEach((slug, idx) => {
      const content = mcps[slug]
      if (!content) { console.warn(`MCP slug "${slug}" not found for ${request_type}`); return }
      const block: any = {
        type: 'text',
        text: `<document name="${slug}">\n${content}\n</document>`,
      }
      // Cache eluci-core (stable, biggest block) AND last MCP (full prefix)
      if (slug === 'eluci-core' || idx === lastMcpIdx) {
        block.cache_control = { type: 'ephemeral' }
      }
      systemBlocks.push(block)
    })

    // Add operator context (NOT cached — changes per operator)
    systemBlocks.push({
      type: 'text',
      text: `OPERADOR: ${operator.name || userEmail} | Role: ${operator.role || 'sdr'} | Qualificador: ${operator.qualificador_name || 'N/A'}`,
    })

    // Output format enforcer — last system block, overrides any MCP formatting
    const OUTPUT_FORMATS: Record<string, string> = {
      copy: 'INSTRUÇÃO FINAL OBRIGATÓRIA: Responda APENAS com a copy pronta. Use EXATAMENTE este formato:\n\nVERSÃO WHATSAPP:\n(mensagem pronta para colar no WhatsApp — sem markdown, sem análise, sem headers internos, tom humano e direto)\n\nNOTA CRM:\n(nota curta: ação + próximo passo + DQI)\n\nNÃO inclua diagnóstico, análise, SOURCE_ROUTING, DVL_GATE, estratégia ou qualquer backstage. O operador vai copiar e colar direto.',
      dm_copy: 'INSTRUÇÃO FINAL OBRIGATÓRIA: Responda APENAS com a DM pronta. Use EXATAMENTE este formato:\n\nDM PRONTO PARA COLAR:\n(texto da DM direto — sem formatação, sem headers, copiar e colar no Instagram)\n\nNOTA CRM:\n(nota curta para CRM)\n\nNÃO inclua análise, diagnóstico ou backstage.',
      note: 'INSTRUÇÃO FINAL OBRIGATÓRIA: Responda APENAS com a nota de qualificação CRM no formato canônico do output-schema.',
    }
    if (OUTPUT_FORMATS[request_type]) {
      systemBlocks.push({
        type: 'text',
        text: OUTPUT_FORMATS[request_type],
      })
    }

    // User message: use legacy pre-built message if available, otherwise assemble from parts
    const userMessage = legacyUserMessage || [
      deal_context,
      history,
      prompt,
      extra_context ? `\nCONTEXTO EXTRA: ${extra_context}` : '',
    ].filter(Boolean).join('\n\n')

    // ── 5. Call Claude API with prompt caching ──
    const ALLOWED_MODELS = ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-5-20251001']
    const model = (model_override && ALLOWED_MODELS.includes(model_override)) ? model_override : 'claude-sonnet-4-20250514'
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 6144,
        system: systemBlocks,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text().catch(() => '')
      return new Response(JSON.stringify({
        error: 'Claude API error',
        status: claudeRes.status,
        detail: errText.slice(0, 300),
      }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const claudeData = await claudeRes.json()
    const text = (claudeData.content || [])
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n')

    const usage = claudeData.usage || {}
    const elapsed = Date.now() - startTime

    // ── 6. Save response to cockpit_responses ──
    try {
      await sbAdmin.from('cockpit_responses').insert({
        operator_id: userEmail,
        deal_id: deal_id || 'unknown',
        request_type,
        output: text,
        model_used: `edge-${model}`,
        metadata: {
          usage,
          elapsed_ms: elapsed,
          cache_creation_input_tokens: usage.cache_creation_input_tokens || 0,
          cache_read_input_tokens: usage.cache_read_input_tokens || 0,
        },
      })
    } catch (_) { /* don't block response */ }

    // ── 7. Return ──
    return new Response(JSON.stringify({
      intelligence: text,
      model: claudeData.model,
      usage: {
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cache_creation_input_tokens: usage.cache_creation_input_tokens || 0,
        cache_read_input_tokens: usage.cache_read_input_tokens || 0,
      },
      elapsed_ms: elapsed,
    }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
