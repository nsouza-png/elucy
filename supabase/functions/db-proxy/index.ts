// db-proxy — Proxy Databricks SQL API sem CORS
// Cockpit (GitHub Pages) → Edge Function (Supabase) → Databricks
// O token do operador é passado no header X-DB-Token (nunca exposto no Supabase)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': 'https://nsouza-png.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-db-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const DB_HOST = 'https://dbc-8acefaf9-a170.cloud.databricks.com';

serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    // Auth: JWT do Supabase obrigatório
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    // Token Databricks: prioriza Supabase Secret, fallback para X-DB-Token (legado)
    const dbToken = Deno.env.get('DATABRICKS_TOKEN') || req.headers.get('x-db-token');
    if (!dbToken || dbToken.length < 10) {
      return new Response(JSON.stringify({ error: 'Databricks token not configured. Set DATABRICKS_TOKEN in Supabase Secrets.' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    // Suporta: POST /db-proxy  → /api/2.0/sql/statements
    //          GET  /db-proxy?stmt_id=xxx → /api/2.0/sql/statements/{id}
    const stmtId = url.searchParams.get('stmt_id');
    const dbPath = stmtId
      ? `/api/2.0/sql/statements/${stmtId}`
      : '/api/2.0/sql/statements';

    const dbMethod = stmtId ? 'GET' : 'POST';
    const body = dbMethod === 'POST' ? await req.text() : undefined;

    const dbRes = await fetch(`${DB_HOST}${dbPath}`, {
      method: dbMethod,
      headers: {
        'Authorization': `Bearer ${dbToken}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await dbRes.text();
    return new Response(data, {
      status: dbRes.status,
      headers: { ...CORS, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }
});
