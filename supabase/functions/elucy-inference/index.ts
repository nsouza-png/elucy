// Elucy Inference — Edge Function com Prompt Caching
// Browser → Edge Function → Claude API (com cache_control nos MCPs)
// API key segura via Supabase Secret, rate limiting por operador.
// Substitui callIntelligenceAPI() direto do browser.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// MCP_MAP — quais documentos injetar por request type
// Budget: ~25k system tokens max (30k org limit - 5k for deal_context+prompt)
// eluci-core = 15k (mandatory), mece-intelligence = 4k, so ~6k for extras
const MCP_MAP: Record<string, string[]> = {
  analyze: ['eluci-core','mece-intelligence','signals','output-schema'],
  copy: ['eluci-core','mece-intelligence','blde','output-schema'],
  note: ['eluci-core','output-schema'],
  business_analysis: ['eluci-core','mece-intelligence','strategy'],
  dm_copy: ['eluci-core','mece-intelligence','blde','fip'],
  coaching: ['eluci-core','sdr-coaching'],
  briefing: ['eluci-core','mece-intelligence','output-schema'],
  batch_classify: ['eluci-core','signals','output-schema'],
  competitive: ['eluci-core','mece-intelligence','strategy'],
  rt_assist: ['eluci-core','mece-intelligence','blde','output-schema'],
  downsell: ['eluci-core','mece-intelligence','output-schema'],
  conv_enrichment: ['eluci-core','signals','output-schema'],
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
  } catch (_) { /* fall through */ }

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
  } catch (_) { /* fall through */ }

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
  } catch (_) { /* fall through */ }

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
    const sbUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    // Validate user
    const { data: { user }, error: userErr } = await sbUser.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Check operator approval
    const { data: operator } = await sbAdmin
      .from('operators')
      .select('approved, qualificador_name, name, role')
      .eq('email', user.email!)
      .maybeSingle()

    if (!operator?.approved) {
      return new Response(JSON.stringify({ error: 'Operator not approved' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Rate limit ──
    if (!checkRateLimit(user.email!)) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Maximo 8 requests por minuto. Aguarde alguns segundos.',
      }), {
        status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. Parse body ──
    const body = await req.json()
    const {
      request_type = 'analyze',
      deal_context = '',   // pre-built by buildDealContext() in browser
      history = '',        // pre-built by loadDealFullHistory() in browser
      prompt = '',         // pre-built by REQUEST_PROMPTS[type] in browser
      extra_context = '',
      deal_id = '',
      deal_data = null,    // raw deal data for saving
      model_override = '', // optional model override
    } = body

    if (!deal_context && !prompt) {
      return new Response(JSON.stringify({ error: 'deal_context or prompt required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 4. Build system prompt with MCPs + cache_control ──
    const mcps = await loadMCPs(supabaseUrl, serviceKey)
    const slugs = MCP_MAP[request_type] || MCP_MAP.analyze

    // System messages: each MCP as a separate block with cache_control
    // The LAST system block gets cache_control — Anthropic caches the prefix
    const systemBlocks: any[] = []

    slugs.forEach((slug, idx) => {
      const content = mcps[slug]
      if (!content) return
      const block: any = {
        type: 'text',
        text: `<document name="${slug}">\n${content}\n</document>`,
      }
      // Apply cache_control to last MCP block — this caches ALL preceding system content
      if (idx === slugs.length - 1) {
        block.cache_control = { type: 'ephemeral' }
      }
      systemBlocks.push(block)
    })

    // Add operator context as final system block (NOT cached — changes per operator)
    systemBlocks.push({
      type: 'text',
      text: `OPERADOR: ${operator.name || user.email} | Role: ${operator.role || 'sdr'} | Qualificador: ${operator.qualificador_name || 'N/A'}`,
    })

    // User message: deal context + history + prompt
    const userMessage = [
      deal_context,
      history,
      prompt,
      extra_context ? `\nCONTEXTO EXTRA: ${extra_context}` : '',
    ].filter(Boolean).join('\n\n')

    // ── 5. Call Claude API with prompt caching ──
    const model = model_override || 'claude-sonnet-4-20250514'
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
        max_tokens: 4096,
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
        operator_id: user.email,
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
