import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Sliding window rate limit: 30 messages/min per operator
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(operatorEmail: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(operatorEmail) || [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    rateLimitMap.set(operatorEmail, recent);
    return false;
  }
  recent.push(now);
  rateLimitMap.set(operatorEmail, recent);
  return true;
}

// ── Evolution API helpers ──

async function evolutionRequest(path: string, method: string, body?: any): Promise<any> {
  const baseUrl = Deno.env.get('EVOLUTION_BASE_URL');
  const apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!baseUrl || !apiKey) throw new Error('Evolution API not configured (missing EVOLUTION_BASE_URL or EVOLUTION_API_KEY)');

  const resp = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error(`[chat-proxy] Evolution API error ${resp.status}:`, JSON.stringify(data));
    throw new Error(data.message || `Evolution API ${resp.status}`);
  }
  return data;
}

async function handleEvolutionCreateInstance(sbAdmin: any, operatorEmail: string, body: any) {
  const instanceName = body.instance_name || `elucy-${operatorEmail.split('@')[0]}`;

  // Create instance on Evolution API
  const result = await evolutionRequest('/instance/create', 'POST', {
    instanceName,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
    webhook: {
      url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/wa-webhook`,
      byEvents: false,
      base64: true,
      headers: {
        'X-Webhook-Secret': Deno.env.get('EVOLUTION_WEBHOOK_SECRET') || '',
      },
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE',
        'QRCODE_UPDATED',
      ],
    },
  });

  // Save instance to Supabase
  const { error: upsertErr } = await sbAdmin
    .from('evolution_instances')
    .upsert({
      instance_name: instanceName,
      operator_email: operatorEmail,
      status: 'qr_pending',
      qr_code: result.qrcode?.base64 || null,
      webhook_configured: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'instance_name' });

  if (upsertErr) console.error('[chat-proxy] Upsert instance error:', upsertErr.message);

  return { instance_name: instanceName, qr_code: result.qrcode?.base64 || null, status: 'qr_pending' };
}

async function handleEvolutionQR(sbAdmin: any, operatorEmail: string, body: any) {
  const instanceName = body.instance_name;
  if (!instanceName) throw new Error('instance_name required for QR action');

  const result = await evolutionRequest(`/instance/connect/${instanceName}`, 'GET');

  // Update QR in Supabase
  if (result.base64) {
    await sbAdmin
      .from('evolution_instances')
      .update({ qr_code: result.base64, status: 'qr_pending', updated_at: new Date().toISOString() })
      .eq('instance_name', instanceName);
  }

  return { instance_name: instanceName, qr_code: result.base64 || null };
}

async function handleEvolutionStatus(body: any) {
  const instanceName = body.instance_name;
  if (!instanceName) throw new Error('instance_name required for status action');

  const result = await evolutionRequest(`/instance/connectionState/${instanceName}`, 'GET');
  return { instance_name: instanceName, state: result.instance?.state || 'unknown' };
}

async function handleEvolutionSend(sbAdmin: any, operatorEmail: string, body: any) {
  const { instance_name, contact_phone, body: messageBody, deal_id } = body;
  if (!instance_name || !contact_phone || !messageBody) {
    throw new Error('instance_name, contact_phone, and body required');
  }

  const phone = (contact_phone || '').replace(/\D/g, '');
  const result = await evolutionRequest(`/message/sendText/${instance_name}`, 'POST', {
    number: phone,
    text: messageBody,
  });

  const threadId = `wa-${phone}`;
  const externalId = result.key?.id || null;

  // Save to chat_messages
  const { data: msgData, error: insertErr } = await sbAdmin
    .from('chat_messages')
    .insert({
      thread_id: threadId,
      operator_email: operatorEmail,
      channel: 'whatsapp',
      provider: 'evolution',
      direction: 'outbound',
      body: messageBody,
      contact_phone: phone,
      contact_name: body.contact_name || null,
      status: 'sent',
      external_id: externalId,
      evolution_msg_id: externalId,
      instance_name,
      deal_id: deal_id || null,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertErr) console.error('[chat-proxy] Insert msg error:', insertErr.message);

  return { ok: true, message: msgData, status: 'sent', provider: 'evolution' };
}

// ── Meta Cloud API handler (original logic) ──

async function handleMetaSend(sbAdmin: any, operatorEmail: string, body: any) {
  const { thread_id, body: messageBody, contact_phone, deal_id } = body;
  const waToken = Deno.env.get('WHATSAPP_TOKEN');
  const waPhoneId = Deno.env.get('WHATSAPP_PHONE_ID');

  let externalStatus = 'sent';
  let externalId = null;

  if (waToken && waPhoneId) {
    const phone = (contact_phone || '').replace(/\D/g, '');
    const waResp = await fetch(
      `https://graph.facebook.com/v21.0/${waPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${waToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: messageBody },
        }),
      }
    );

    const waResult = await waResp.json();
    if (!waResp.ok) {
      console.error('[chat-proxy] WhatsApp Meta error:', JSON.stringify(waResult));
      externalStatus = 'failed';
    } else {
      externalId = waResult.messages?.[0]?.id || null;
      externalStatus = 'sent';
    }
  } else {
    return { error: 'WhatsApp Meta not configured (missing WHATSAPP_TOKEN or WHATSAPP_PHONE_ID)' };
  }

  const { data: msgData, error: insertErr } = await sbAdmin
    .from('chat_messages')
    .insert({
      thread_id: thread_id || `wa-${(contact_phone || '').replace(/\D/g, '')}`,
      operator_email: operatorEmail,
      channel: 'whatsapp',
      provider: 'meta',
      direction: 'outbound',
      body: messageBody,
      contact_phone: contact_phone || null,
      status: externalStatus,
      external_id: externalId,
      deal_id: deal_id || null,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertErr) console.error('[chat-proxy] Insert error:', insertErr.message);

  return { ok: true, message: msgData, status: externalStatus, provider: 'meta' };
}

// ── Instagram handler (queue only) ──

async function handleInstagramSend(sbAdmin: any, operatorEmail: string, body: any) {
  const { thread_id, body: messageBody, contact_phone, deal_id } = body;

  const { data: msgData, error: insertErr } = await sbAdmin
    .from('chat_messages')
    .insert({
      thread_id: thread_id || `ig-${Date.now()}`,
      operator_email: operatorEmail,
      channel: 'instagram',
      provider: 'instagram',
      direction: 'outbound',
      body: messageBody,
      contact_phone: contact_phone || null,
      status: 'queued',
      deal_id: deal_id || null,
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertErr) console.error('[chat-proxy] IG insert error:', insertErr.message);

  return { ok: true, message: msgData, status: 'queued', provider: 'instagram' };
}

// ── Main handler ──

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // JWT auth
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const sbUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await sbUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const operatorEmail = user.email || '';

    // Check operator approval
    const sbAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: opData } = await sbAdmin
      .from('operators')
      .select('status')
      .eq('email', operatorEmail)
      .single();

    if (!opData || opData.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Operator not approved' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit
    if (!checkRateLimit(operatorEmail)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded (30/min)' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const provider = body.provider || 'evolution';  // default to evolution
    const action = body.action || 'send';
    const channel = body.channel || 'whatsapp';

    let result: any;

    // Route by provider + action
    if (provider === 'evolution') {
      switch (action) {
        case 'create_instance':
          result = await handleEvolutionCreateInstance(sbAdmin, operatorEmail, body);
          break;
        case 'qr':
          result = await handleEvolutionQR(sbAdmin, operatorEmail, body);
          break;
        case 'status':
          result = await handleEvolutionStatus(body);
          break;
        case 'send':
          result = await handleEvolutionSend(sbAdmin, operatorEmail, body);
          break;
        default:
          result = { error: `Unknown action: ${action}` };
      }
    } else if (provider === 'meta') {
      result = await handleMetaSend(sbAdmin, operatorEmail, body);
    } else if (channel === 'instagram') {
      result = await handleInstagramSend(sbAdmin, operatorEmail, body);
    } else {
      result = { error: `Unknown provider: ${provider}` };
    }

    const status = result.error ? 400 : 200;
    return new Response(JSON.stringify(result), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[chat-proxy] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
