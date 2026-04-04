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
    const { thread_id, body: messageBody, channel, contact_phone } = body;

    if (!thread_id || !messageBody) {
      return new Response(JSON.stringify({ error: 'thread_id and body are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let externalStatus = 'sent';
    let externalId = null;

    // WhatsApp: send via Cloud API
    if (channel === 'whatsapp') {
      const waToken = Deno.env.get('WHATSAPP_TOKEN');
      const waPhoneId = Deno.env.get('WHATSAPP_PHONE_ID');

      if (!waToken || !waPhoneId) {
        return new Response(JSON.stringify({ error: 'WhatsApp not configured (missing secrets)' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
        console.error('[chat-proxy] WhatsApp error:', JSON.stringify(waResult));
        externalStatus = 'failed';
      } else {
        externalId = waResult.messages?.[0]?.id || null;
        externalStatus = 'sent';
      }
    } else if (channel === 'instagram') {
      // Instagram: queue for worker pickup
      externalStatus = 'queued';
    }

    // Log to chat_messages
    const { data: msgData, error: insertError } = await sbAdmin
      .from('chat_messages')
      .insert({
        thread_id,
        operator_email: operatorEmail,
        channel: channel || 'whatsapp',
        direction: 'outbound',
        body: messageBody,
        contact_phone: contact_phone || null,
        status: externalStatus,
        external_id: externalId,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[chat-proxy] Insert error:', insertError.message);
      return new Response(JSON.stringify({ error: 'Failed to save message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, message: msgData, status: externalStatus }), {
      status: 200,
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
