// Elucy — Edge Function: elucy-request
// Recebe request do Cockpit, valida operador, insere na fila cockpit_requests.
// O G4 OS do admin monitora a fila via agendamento e processa com o motor Elucy completo.
// Zero Anthropic API — o LLM é o G4 OS do admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://nsouza-png.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const sbAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const sbUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    // Valida usuário
    const { data: { user }, error: userErr } = await sbUser.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verifica operador aprovado
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

    const body = await req.json()
    const { deal_id, deal_data, request_type = 'analyze', copy_mode } = body

    if (!deal_id || !deal_data) {
      return new Response(JSON.stringify({ error: 'deal_id and deal_data required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Rate limit: máx 1 request pendente ou processing por operador
    const { data: pending } = await sbAdmin
      .from('cockpit_requests')
      .select('id')
      .eq('operator_id', user.id)
      .in('status', ['pending', 'processing'])
      .limit(1)

    if (pending && pending.length > 0) {
      return new Response(JSON.stringify({
        error: 'Request already pending',
        message: 'Aguarde a análise anterior terminar antes de solicitar uma nova.'
      }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insere na fila
    const { data: request, error: insertErr } = await sbAdmin
      .from('cockpit_requests')
      .insert({
        operator_id: user.id,
        deal_id,
        request_type,
        copy_mode: copy_mode || null,
        deal_data: {
          ...deal_data,
          _operator_name: operator.name,
          _operator_role: operator.role,
          _qualificador_name: operator.qualificador_name,
        },
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertErr || !request) {
      return new Response(JSON.stringify({ error: 'Failed to queue request' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      request_id: request.id,
      status: 'pending',
      message: 'Request enfileirado. Aguarde o Elucy processar (~30s).',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
