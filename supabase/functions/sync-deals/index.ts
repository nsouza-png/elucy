// Elucy — Edge Function: sync-deals
// Executa query no Databricks como o operador autenticado e upserta deals no Supabase.
// Token Databricks nunca sai do servidor (Supabase Secret).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DATABRICKS_HOST = 'https://dbc-8acefaf9-a170.cloud.databricks.com'
const DATABRICKS_WAREHOUSE = 'bbae754ea44f67e0'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://nsouza-png.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Autentica o operador via JWT do Supabase
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const databricksToken = Deno.env.get('DATABRICKS_TOKEN')!

    // Cliente com service role para writes (bypassa RLS onde necessário)
    const sbAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Cliente com JWT do usuário para ler apenas o registro dele
    const sbUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    // 2. Busca o operador autenticado
    const { data: { user }, error: userErr } = await sbUser.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const operatorEmail = user.email!

    // 3. Verifica aprovação e pega qualificador_name
    const { data: operator, error: opErr } = await sbAdmin
      .from('operators')
      .select('approved, qualificador_name, name')
      .eq('email', operatorEmail)
      .maybeSingle()

    if (opErr || !operator) {
      return new Response(JSON.stringify({ error: 'Operator not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!operator.approved) {
      return new Response(JSON.stringify({ error: 'Operator not approved' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const qualName = operator.qualificador_name || operator.name

    // 4. Executa query no Databricks — busca todos os campos CRM-relevantes
    const dbQuery = `
      SELECT
        f.deal_id,
        f.fase_atual_no_processo,
        f.etapa_atual_no_pipeline,
        f.tier_da_oportunidade,
        f.delta_t,
        f.qualificador_name,
        f.proprietario_name,
        f.linha_de_receita_vigente,
        f.grupo_de_receita,
        f.created_at_crm,
        f.event_skipped,
        f.status_do_deal,
        f.revenue,
        f.valor_da_oportunidade,
        f.probabilidade_de_previsao,
        f.nome_do_evento,
        f.tipo_de_evento,
        f.tipo_de_conversao,
        f.selfbooking,
        COALESCE(f.coproprietario_name, '') AS coproprietario_name,
        COALESCE(f.email, '') AS email_lead,
        COALESCE(f.cargo, '') AS cargo,
        COALESCE(f.canal_de_marketing, '') AS canal_de_marketing,
        COALESCE(f.utm_medium, '') AS utm_medium,
        COALESCE(f.utm_source, '') AS utm_source,
        COALESCE(f.utm_campaign, '') AS utm_campaign,
        COALESCE(f.perfil, '') AS perfil,
        COALESCE(f.motivo_lost, '') AS motivo_lost,
        COALESCE(f.origem_do_deal, '') AS origem_do_deal,
        COALESCE(f.faixa_de_faturamento, p.faixa_de_faturamento, '') AS faixa_de_faturamento,
        COALESCE(p.nome, '') AS contact_name,
        COALESCE(p.telefone, '') AS p_telefone,
        COALESCE(p.segmento, '') AS p_segmento,
        COALESCE(p.cluster_rfm, '') AS p_cluster_rfm,
        COALESCE(p.negociacoes_ganhas, 0) AS p_negociacoes_ganhas,
        COALESCE(p.receita_total, 0) AS p_receita_total,
        COALESCE(CAST(p.pa_cliente AS STRING), 'false') AS p_pa_cliente,
        COALESCE(p.primeiro_produto, '') AS p_primeiro_produto,
        COALESCE(p.ultimo_produto, '') AS p_ultimo_produto,
        COALESCE(CAST(p.produtos_comprados AS STRING), '') AS p_produtos_comprados,
        COALESCE(CAST(p.data_primeira_compra AS STRING), '') AS p_data_primeira_compra,
        COALESCE(CAST(p.data_ultima_compra AS STRING), '') AS p_data_ultima_compra,
        COALESCE(CAST(p.comprou_scale AS STRING), 'false') AS p_comprou_scale,
        COALESCE(CAST(p.comprou_club AS STRING), 'false') AS p_comprou_club
      FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY deal_id ORDER BY event_timestamp DESC) AS rn
        FROM production.diamond.funil_comercial
        WHERE qualificador_name = :qualName
          AND fase_atual_no_processo NOT IN ('Ganho', 'Perdido', 'Desqualificado')
      ) f
      LEFT JOIN production.diamond.persons_overview p
        ON f.email = p.email
      WHERE f.rn = 1
      ORDER BY f.delta_t DESC
      LIMIT 300
    `

    const dbRes = await fetch(`${DATABRICKS_HOST}/api/2.0/sql/statements`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${databricksToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        warehouse_id: DATABRICKS_WAREHOUSE,
        statement: dbQuery,
        parameters: [{ name: 'qualName', value: qualName, type: 'STRING' }],
        wait_timeout: '30s',
        on_wait_timeout: 'CONTINUE',
      }),
    })

    if (!dbRes.ok) {
      const errText = await dbRes.text()
      return new Response(JSON.stringify({ error: 'Databricks error', detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const dbData = await dbRes.json()

    // Se statement ainda processando, faz poll (max 10s)
    let result = dbData
    if (result.status?.state === 'PENDING' || result.status?.state === 'RUNNING') {
      const stmtId = result.statement_id
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 2000))
        const pollRes = await fetch(`${DATABRICKS_HOST}/api/2.0/sql/statements/${stmtId}`, {
          headers: { Authorization: `Bearer ${databricksToken}` },
        })
        result = await pollRes.json()
        if (result.status?.state === 'SUCCEEDED') break
        if (result.status?.state === 'FAILED' || result.status?.state === 'CANCELED') {
          return new Response(JSON.stringify({ error: 'Databricks query failed', state: result.status?.state }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    const cols: string[] = result.manifest?.schema?.columns?.map((c: any) => c.name) || []
    const rows: any[][] = result.result?.data_array || []

    if (!rows.length) {
      return new Response(JSON.stringify({ synced: 0, message: 'No active deals found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. Transforma rows em objetos e upserta no Supabase
    const colIdx = (name: string) => cols.indexOf(name)

    const deals = rows.map(row => {
      const str = (name: string) => row[colIdx(name)] ?? ''
      const num = (name: string) => row[colIdx(name)] != null ? Number(row[colIdx(name)]) : null
      return ({
      deal_id: row[colIdx('deal_id')] ?? '',
      operator_email: operatorEmail,
      fase_atual_no_processo: str('fase_atual_no_processo') || null,
      etapa_atual_no_pipeline: str('etapa_atual_no_pipeline') || null,
      tier_da_oportunidade: str('tier_da_oportunidade') || null,
      delta_t: num('delta_t'),
      qualificador_name: str('qualificador_name') || null,
      proprietario_name: str('proprietario_name') || null,
      linha_de_receita_vigente: str('linha_de_receita_vigente') || null,
      grupo_de_receita: str('grupo_de_receita') || null,
      created_at_crm: str('created_at_crm') || null,
      event_skipped: row[colIdx('event_skipped')] === 'true' || row[colIdx('event_skipped')] === true,
      status_do_deal: str('status_do_deal') || null,
      revenue: num('revenue'),
      valor_da_oportunidade: num('valor_da_oportunidade'),
      probabilidade_de_previsao: num('probabilidade_de_previsao'),
      nome_do_evento: str('nome_do_evento'),
      tipo_de_evento: str('tipo_de_evento'),
      tipo_de_conversao: str('tipo_de_conversao'),
      selfbooking: str('selfbooking'),
      coproprietario_name: str('coproprietario_name'),
      contact_name: str('contact_name'),
      faixa_de_faturamento: str('faixa_de_faturamento'),
      email_lead: str('email_lead'),
      cargo: str('cargo'),
      canal_de_marketing: str('canal_de_marketing'),
      utm_medium: str('utm_medium'),
      utm_source: str('utm_source'),
      utm_campaign: str('utm_campaign'),
      perfil: str('perfil'),
      motivo_lost: str('motivo_lost'),
      origem_do_deal: str('origem_do_deal'),
      p_telefone: str('p_telefone'),
      p_segmento: str('p_segmento'),
      p_cluster_rfm: str('p_cluster_rfm'),
      p_instagram: '',
      p_negociacoes_ganhas: num('p_negociacoes_ganhas') ?? 0,
      p_receita_total: num('p_receita_total') ?? 0,
      p_pa_cliente: str('p_pa_cliente') || 'false',
      p_primeiro_produto: str('p_primeiro_produto'),
      p_ultimo_produto: str('p_ultimo_produto'),
      p_produtos_comprados: str('p_produtos_comprados'),
      p_data_primeira_compra: str('p_data_primeira_compra'),
      p_data_ultima_compra: str('p_data_ultima_compra'),
      p_comprou_scale: str('p_comprou_scale') || 'false',
      p_comprou_club: str('p_comprou_club') || 'false',
      synced_at: new Date().toISOString(),
    })})

    // Apaga deals antigos do operador e reinsere (upsert por deal_id+operator_email)
    const { error: upsertErr } = await sbAdmin
      .from('deals')
      .upsert(deals, { onConflict: 'deal_id,operator_email', ignoreDuplicates: false })

    if (upsertErr) {
      return new Response(JSON.stringify({ error: 'Supabase upsert failed', detail: upsertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Remove deals que saíram do funil (deal_ids que não vieram mais no resultado)
    // SEC-03: Safety check — never delete if result is suspiciously small (network error protection)
    const activeDealIds = deals.map(d => d.deal_id)
    if (activeDealIds.length >= 3) {
      await sbAdmin
        .from('deals')
        .delete()
        .eq('operator_email', operatorEmail)
        .not('deal_id', 'in', `(${activeDealIds.map(id => `"${id}"`).join(',')})`)
    } else {
      console.warn(`[sync-deals] Skipping delete: only ${activeDealIds.length} deals returned — possible query error`)
    }

    return new Response(JSON.stringify({ synced: deals.length, operator: operatorEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
