// intel-sync — Runs 15 intelligence queries on Databricks, caches results in Supabase
// Called by scheduler (every 30min) or manually from cockpit
// No user auth needed — uses service role + Databricks server token

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DB_HOST = 'https://dbc-8acefaf9-a170.cloud.databricks.com'
const DB_WH = 'bbae754ea44f67e0'

const CORS = {
  'Access-Control-Allow-Origin': 'https://nsouza-png.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Month filter for current month
const MF = "YEAR(event_timestamp)=YEAR(CURRENT_DATE()) AND MONTH(event_timestamp)=MONTH(CURRENT_DATE())"

const QUERIES: Record<string, string> = {
  funil: `SELECT linha_de_receita_vigente AS canal,
    COUNT(DISTINCT deal_id) AS mql,
    COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('SAL','Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END) AS sal,
    COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END) AS sql_,
    COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END) AS won,
    ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('SAL','Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT deal_id),0),1) AS cr_mql_sal,
    ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('SAL','Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END),0),1) AS cr_sal_sql,
    ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END),0),1) AS cr_sql_won,
    ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT deal_id),0),1) AS win_rate,
    ROUND(SUM(CASE WHEN fase_atual_no_processo='Ganho' THEN revenue ELSE 0 END),0) AS receita,
    ROUND(AVG(CASE WHEN fase_atual_no_processo='Ganho' THEN revenue END),0) AS ticket_medio
  FROM production.diamond.funil_comercial
  WHERE ${MF} AND linha_de_receita_vigente IS NOT NULL AND linha_de_receita_vigente!=''
  GROUP BY linha_de_receita_vigente HAVING COUNT(DISTINCT deal_id)>=5 ORDER BY mql DESC LIMIT 15`,

  totais: `SELECT
    COUNT(DISTINCT deal_id) AS mql,
    COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('SAL','Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END) AS sal,
    COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END) AS sql_,
    COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END) AS won,
    ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('SAL','Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT deal_id),0),1) AS cr01,
    ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('SAL','Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END),0),1) AS cr03,
    ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END),0),1) AS cr04,
    ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT deal_id),0),1) AS win_rate,
    ROUND(SUM(CASE WHEN fase_atual_no_processo='Ganho' THEN revenue ELSE 0 END),0) AS receita,
    ROUND(AVG(CASE WHEN fase_atual_no_processo='Ganho' THEN revenue END),0) AS ticket
  FROM production.diamond.funil_comercial WHERE ${MF}`,

  sdr: `SELECT qualificador_name AS sdr,
    COUNT(DISTINCT deal_id) AS mql,
    COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('SAL','Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END) AS sal,
    COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END) AS sql_,
    COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END) AS won,
    ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('SAL','Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT deal_id),0),1) AS cr01,
    ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('SAL','Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END),0),1) AS saop,
    ROUND(AVG(CASE WHEN fase_atual_no_processo='Ganho' THEN revenue END),0) AS ticket
  FROM production.diamond.funil_comercial WHERE ${MF} AND qualificador_name IS NOT NULL AND qualificador_name!=''
  GROUP BY qualificador_name HAVING COUNT(DISTINCT deal_id)>=3 ORDER BY mql DESC LIMIT 20`,

  perda: `SELECT fase_anterior_no_processo AS fase, motivo_lost, COUNT(DISTINCT deal_id) AS perdidos, ROUND(AVG(delta_t),1) AS avg_dias
  FROM production.diamond.funil_comercial WHERE fase_atual_no_processo='Perdido' AND ${MF} AND motivo_lost IS NOT NULL AND motivo_lost!=''
  GROUP BY fase_anterior_no_processo, motivo_lost HAVING COUNT(DISTINCT deal_id)>=2 ORDER BY perdidos DESC LIMIT 12`,

  ironDome: `SELECT fase_atual_no_processo AS fase, etapa_atual_no_pipeline AS etapa, COUNT(DISTINCT deal_id) AS deals, ROUND(AVG(delta_t),1) AS avg_dias, ROUND(SUM(revenue),0) AS receita
  FROM production.diamond.funil_comercial WHERE delta_t>7 AND fase_atual_no_processo NOT IN ('Ganho','Perdido') AND ${MF}
  GROUP BY fase_atual_no_processo, etapa_atual_no_pipeline HAVING COUNT(DISTINCT deal_id)>=2 ORDER BY receita DESC LIMIT 10`,

  mensal: `SELECT DATE_FORMAT(event_timestamp,'yyyy-MM') AS mes,
    COUNT(DISTINCT deal_id) AS mql,
    COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('SAL','Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END) AS sal,
    COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END) AS sql_,
    COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END) AS won,
    ROUND(SUM(CASE WHEN fase_atual_no_processo='Ganho' THEN revenue ELSE 0 END),0) AS receita,
    ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('SAL','Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT deal_id),0),1) AS cr01,
    ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('SAL','Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END),0),1) AS cr03,
    ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Conectado','Agendado','Negociação','Ganho','Perdido') THEN deal_id END),0),1) AS cr04
  FROM production.diamond.funil_comercial WHERE event_timestamp>=ADD_MONTHS(CURRENT_DATE(),-3) AND event_timestamp<=CURRENT_DATE()
  GROUP BY DATE_FORMAT(event_timestamp,'yyyy-MM') ORDER BY mes`,

  velocidade: `SELECT linha_de_receita_vigente AS linha, fase_anterior_no_processo AS de, fase_atual_no_processo AS para, COUNT(*) AS transicoes, ROUND(AVG(delta_t),1) AS avg_dias, ROUND(PERCENTILE_APPROX(delta_t,0.5),1) AS mediana, MAX(delta_t) AS max_dias
  FROM production.diamond.funil_comercial WHERE delta_t IS NOT NULL AND delta_t>0 AND YEAR(event_timestamp)>=YEAR(CURRENT_DATE()) AND fase_anterior_no_processo IN ('MQL','SAL','Conectado','Agendado','Negociação') AND fase_atual_no_processo IN ('SAL','Conectado','Agendado','Negociação','Ganho','Perdido')
  GROUP BY linha_de_receita_vigente,fase_anterior_no_processo,fase_atual_no_processo HAVING COUNT(*)>=5 ORDER BY linha,de,para`,

  closer: `SELECT proprietario_name AS closer, COUNT(DISTINCT deal_id) AS deals, COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END) AS ganhos, COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Perdido' THEN deal_id END) AS perdidos, ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT deal_id),0),1) AS win_rate, ROUND(AVG(CASE WHEN fase_atual_no_processo='Ganho' THEN revenue END),0) AS ticket, ROUND(SUM(CASE WHEN fase_atual_no_processo='Ganho' THEN revenue ELSE 0 END),0) AS receita, ROUND(AVG(CASE WHEN fase_atual_no_processo='Ganho' THEN delta_t END),1) AS dias_ganho
  FROM production.diamond.funil_comercial WHERE ${MF} AND proprietario_name IS NOT NULL AND proprietario_name!='' AND fase_atual_no_processo IN ('Ganho','Perdido','Negociação')
  GROUP BY proprietario_name HAVING COUNT(DISTINCT deal_id)>=3 ORDER BY receita DESC LIMIT 20`,

  skip: `SELECT qualificador_name AS sdr, linha_de_receita_vigente AS linha, COUNT(DISTINCT deal_id) AS deals_skip, ROUND(AVG(delta_t),1) AS avg_delta
  FROM production.diamond.funil_comercial WHERE event_skipped=true AND ${MF}
  GROUP BY qualificador_name,linha_de_receita_vigente HAVING COUNT(DISTINCT deal_id)>=2 ORDER BY deals_skip DESC LIMIT 15`,

  tier: `SELECT linha_de_receita_vigente AS linha, tier_da_oportunidade AS tier, COUNT(DISTINCT deal_id) AS deals, ROUND(AVG(revenue),0) AS ticket, COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END) AS ganhos, ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT deal_id),0),1) AS win_rate
  FROM production.diamond.funil_comercial WHERE ${MF} AND tier_da_oportunidade IS NOT NULL AND tier_da_oportunidade!=''
  GROUP BY linha_de_receita_vigente,tier_da_oportunidade HAVING COUNT(DISTINCT deal_id)>=3 ORDER BY linha,deals DESC LIMIT 30`,

  ig: `SELECT CASE WHEN linha_de_receita_vigente LIKE '%Tallis%' THEN 'Tallis' WHEN linha_de_receita_vigente LIKE '%Alfredo%' THEN 'Alfredo' WHEN linha_de_receita_vigente LIKE '%Nardon%' THEN 'Nardon' WHEN linha_de_receita_vigente LIKE '%G4%' AND linha_de_receita_vigente LIKE '%Instagram%' THEN 'G4' ELSE 'Outros' END AS conta, COUNT(DISTINCT deal_id) AS sals, COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Negociação','Ganho','Perdido') THEN deal_id END) AS opps, ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Negociação','Ganho','Perdido') THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT deal_id),0),1) AS cr_sal_opp, COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END) AS ganhos, ROUND(AVG(CASE WHEN fase_atual_no_processo='Ganho' THEN revenue END),0) AS ticket
  FROM production.diamond.funil_comercial WHERE linha_de_receita_vigente LIKE '%Instagram%' AND ${MF} GROUP BY 1 ORDER BY sals DESC`,

  socialDM: `SELECT linha_de_receita_vigente AS linha, COUNT(DISTINCT deal_id) AS mqls, COUNT(DISTINCT CASE WHEN fase_atual_no_processo NOT IN ('MQL') THEN deal_id END) AS sals, COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Negociação','Ganho','Perdido') THEN deal_id END) AS opps, COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END) AS ganhos, ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo IN ('Negociação','Ganho','Perdido') THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT deal_id),0),1) AS cr_mql_opp, ROUND(AVG(CASE WHEN fase_atual_no_processo='Ganho' THEN revenue END),0) AS ticket
  FROM production.diamond.funil_comercial WHERE linha_de_receita_vigente LIKE '%Social DM%' AND ${MF} GROUP BY linha_de_receita_vigente ORDER BY mqls DESC`,

  icp: `SELECT perfil, COUNT(DISTINCT deal_id) AS deals, COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END) AS ganhos, ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT deal_id),0),1) AS win_rate, ROUND(AVG(CASE WHEN fase_atual_no_processo='Ganho' THEN revenue END),0) AS ticket, ROUND(AVG(delta_t),1) AS velocidade
  FROM production.diamond.funil_comercial WHERE ${MF} AND perfil IS NOT NULL AND perfil!=''
  GROUP BY perfil HAVING COUNT(DISTINCT deal_id)>=5 ORDER BY win_rate DESC`,

  pipeline: `SELECT fase_atual_no_processo AS fase, COUNT(DISTINCT deal_id) AS deals, ROUND(SUM(revenue),0) AS receita_bruta, ROUND(SUM(revenue*CASE WHEN fase_atual_no_processo='SAL' THEN 0.10 WHEN fase_atual_no_processo='Conectado' THEN 0.20 WHEN fase_atual_no_processo='Agendado' THEN 0.40 WHEN fase_atual_no_processo='Negociação' THEN 0.60 WHEN fase_atual_no_processo='Ganho' THEN 1.0 ELSE 0.05 END),0) AS receita_pond, ROUND(AVG(revenue),0) AS ticket
  FROM production.diamond.funil_comercial WHERE fase_atual_no_processo NOT IN ('Perdido') AND ${MF} AND revenue>0
  GROUP BY fase_atual_no_processo ORDER BY CASE fase_atual_no_processo WHEN 'MQL' THEN 1 WHEN 'SAL' THEN 2 WHEN 'Conectado' THEN 3 WHEN 'Agendado' THEN 4 WHEN 'Negociação' THEN 5 WHEN 'Ganho' THEN 6 END`,

  abandono: `SELECT linha_de_receita_vigente AS linha, COUNT(DISTINCT deal_id) AS abandonos, COUNT(DISTINCT CASE WHEN fase_atual_no_processo NOT IN ('MQL') THEN deal_id END) AS contatados, COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END) AS recuperados, ROUND(COUNT(DISTINCT CASE WHEN fase_atual_no_processo='Ganho' THEN deal_id END)*100.0/NULLIF(COUNT(DISTINCT deal_id),0),1) AS taxa_rec, ROUND(SUM(CASE WHEN fase_atual_no_processo='Ganho' THEN revenue ELSE 0 END),0) AS receita_rec
  FROM production.diamond.funil_comercial WHERE (linha_de_receita_vigente LIKE '%Abandono%' OR linha_de_receita_vigente LIKE '%carrinho%') AND ${MF} GROUP BY linha_de_receita_vigente`,
}

async function runDbQuery(sql: string, token: string): Promise<any[][]> {
  const res = await fetch(`${DB_HOST}/api/2.0/sql/statements`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ warehouse_id: DB_WH, statement: sql, wait_timeout: '30s', on_wait_timeout: 'CONTINUE' }),
  })
  if (!res.ok) return []
  let data = await res.json()

  // Poll if pending
  if (data.status?.state === 'PENDING' || data.status?.state === 'RUNNING') {
    const stmtId = data.statement_id
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const pollRes = await fetch(`${DB_HOST}/api/2.0/sql/statements/${stmtId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      data = await pollRes.json()
      if (data.status?.state === 'SUCCEEDED' || data.status?.state === 'FAILED') break
    }
  }

  return data.result?.data_array || []
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // AUTH: Require X-Sync-Key header (Supabase Secret) or valid user JWT
    const syncKey = Deno.env.get('SYNC_API_KEY')
    const reqSyncKey = req.headers.get('x-sync-key')
    const authHeader = req.headers.get('Authorization')

    let authorized = false

    // Path 1: Scheduler/admin uses X-Sync-Key
    if (syncKey && reqSyncKey && reqSyncKey === syncKey) {
      authorized = true
    }

    // Path 2: Authenticated operator with admin role
    if (!authorized && authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
      const { createClient: cc } = await import('https://esm.sh/@supabase/supabase-js@2')
      const sbUser = cc(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
      const { data: { user } } = await sbUser.auth.getUser()
      if (user?.email) {
        const sbAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        const { data: op } = await sbAdmin.from('operators').select('approved, role').eq('email', user.email).maybeSingle()
        if (op?.approved && (op.role === 'admin' || op.role === 'manager')) authorized = true
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized — requires X-Sync-Key header or admin JWT' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const dbToken = Deno.env.get('DATABRICKS_TOKEN')!

    const sb = createClient(supabaseUrl, serviceKey)
    const queryIds = Object.keys(QUERIES)
    const results: Record<string, { rows: number }> = {}

    // Run queries in batches of 3
    for (let i = 0; i < queryIds.length; i += 3) {
      const batch = queryIds.slice(i, i + 3)
      const batchResults = await Promise.all(
        batch.map(async (qid) => {
          const rows = await runDbQuery(QUERIES[qid], dbToken)
          return { qid, rows }
        })
      )

      // Upsert each result into intelligence_cache
      for (const { qid, rows } of batchResults) {
        const { error } = await sb
          .from('intelligence_cache')
          .upsert({
            query_id: qid,
            data: rows,
            row_count: rows.length,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'query_id' })

        if (error) {
          console.error(`[INTEL-SYNC] ${qid} upsert error:`, error.message)
        }
        results[qid] = { rows: rows.length }
      }
    }

    return new Response(JSON.stringify({ ok: true, synced: Object.keys(results).length, results, updated_at: new Date().toISOString() }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
