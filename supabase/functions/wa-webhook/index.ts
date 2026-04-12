// wa-webhook — receives webhook events from Evolution API
// Auth: X-Webhook-Secret header (not JWT — external webhook)
// Events handled: MESSAGES_UPSERT, CONNECTION_UPDATE, QRCODE_UPDATED
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const webhookSecret = Deno.env.get('EVOLUTION_WEBHOOK_SECRET') || '';

  try {
    // Auth: validate webhook secret
    const incomingSecret = req.headers.get('x-webhook-secret') || req.headers.get('X-Webhook-Secret') || '';
    if (webhookSecret && incomingSecret !== webhookSecret) {
      // Also check apikey header (Evolution sends it this way)
      const apiKeyHeader = req.headers.get('apikey') || '';
      if (apiKeyHeader !== webhookSecret) {
        console.warn('[wa-webhook] Invalid webhook secret');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = await req.json();
    const sbAdmin = createClient(supabaseUrl, serviceRoleKey);

    const event = body.event || '';
    const instanceName = body.instance || body.instanceName || '';

    // ── MESSAGES_UPSERT — new incoming message ──
    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      const messages = body.data || [];
      const msgArray = Array.isArray(messages) ? messages : [messages];

      for (const msg of msgArray) {
        // Skip status messages and protocol messages
        if (msg.messageType === 'protocolMessage' || msg.messageType === 'senderKeyDistributionMessage') continue;
        if (!msg.key) continue;

        const isFromMe = msg.key.fromMe === true;
        if (isFromMe) continue; // We already log outbound via chat-proxy send

        const remoteJid = msg.key.remoteJid || '';
        const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
        if (!phone) continue;

        // Extract message text
        let messageText = '';
        const msgContent = msg.message || {};
        if (msgContent.conversation) {
          messageText = msgContent.conversation;
        } else if (msgContent.extendedTextMessage?.text) {
          messageText = msgContent.extendedTextMessage.text;
        } else if (msgContent.imageMessage?.caption) {
          messageText = msgContent.imageMessage.caption;
        } else if (msgContent.videoMessage?.caption) {
          messageText = msgContent.videoMessage.caption;
        } else if (msgContent.documentMessage?.caption) {
          messageText = msgContent.documentMessage.caption;
        }

        // Extract media info
        let mediaType: string | null = null;
        let mediaUrl: string | null = null;
        if (msgContent.imageMessage) { mediaType = 'image'; mediaUrl = msgContent.imageMessage.url || null; }
        else if (msgContent.audioMessage) { mediaType = 'audio'; mediaUrl = msgContent.audioMessage.url || null; }
        else if (msgContent.videoMessage) { mediaType = 'video'; mediaUrl = msgContent.videoMessage.url || null; }
        else if (msgContent.documentMessage) { mediaType = 'document'; mediaUrl = msgContent.documentMessage.url || null; }
        else if (msgContent.stickerMessage) { mediaType = 'sticker'; }

        // If no text and no media, skip
        if (!messageText && !mediaType) continue;

        const threadId = `wa-${phone}`;
        const contactName = msg.pushName || null;
        const evolutionMsgId = msg.key.id || null;

        // Look up operator for this instance
        const { data: instanceData } = await sbAdmin
          .from('evolution_instances')
          .select('operator_email')
          .eq('instance_name', instanceName)
          .single();

        const operatorEmail = instanceData?.operator_email || 'unknown';

        // Try to find deal_id by phone number (best effort)
        let dealId: string | null = null;
        const { data: existingThread } = await sbAdmin
          .from('chat_messages')
          .select('deal_id')
          .eq('contact_phone', phone)
          .not('deal_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingThread?.deal_id) dealId = existingThread.deal_id;

        const { error: insertErr } = await sbAdmin
          .from('chat_messages')
          .insert({
            thread_id: threadId,
            operator_email: operatorEmail,
            channel: 'whatsapp',
            provider: 'evolution',
            direction: 'inbound',
            body: messageText || `[${mediaType}]`,
            contact_phone: phone,
            contact_name: contactName,
            status: 'sent',
            external_id: evolutionMsgId,
            evolution_msg_id: evolutionMsgId,
            instance_name: instanceName,
            deal_id: dealId,
            media_url: mediaUrl,
            media_type: mediaType,
            sent_at: new Date(msg.messageTimestamp * 1000 || Date.now()).toISOString(),
          });

        if (insertErr) console.error('[wa-webhook] Insert error:', insertErr.message);
      }

      return new Response(JSON.stringify({ ok: true, event: 'messages_upsert' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── CONNECTION_UPDATE — instance status changed ──
    if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
      const state = body.data?.state || body.data?.connection || '';
      let status = 'disconnected';
      if (state === 'open' || state === 'connected') status = 'connected';
      else if (state === 'connecting') status = 'qr_pending';
      else if (state === 'close' || state === 'disconnected') status = 'disconnected';

      const { error: updateErr } = await sbAdmin
        .from('evolution_instances')
        .update({
          status,
          qr_code: status === 'connected' ? null : undefined, // clear QR on connect
          updated_at: new Date().toISOString(),
        })
        .eq('instance_name', instanceName);

      if (updateErr) console.error('[wa-webhook] Status update error:', updateErr.message);

      return new Response(JSON.stringify({ ok: true, event: 'connection_update', status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── QRCODE_UPDATED — new QR code available ──
    if (event === 'qrcode.updated' || event === 'QRCODE_UPDATED') {
      const qrBase64 = body.data?.qrcode?.base64 || body.data?.base64 || null;

      if (qrBase64) {
        const { error: updateErr } = await sbAdmin
          .from('evolution_instances')
          .update({
            qr_code: qrBase64,
            status: 'qr_pending',
            updated_at: new Date().toISOString(),
          })
          .eq('instance_name', instanceName);

        if (updateErr) console.error('[wa-webhook] QR update error:', updateErr.message);
      }

      return new Response(JSON.stringify({ ok: true, event: 'qrcode_updated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Unknown event — log and 200 ──
    console.log(`[wa-webhook] Unhandled event: ${event}`);
    return new Response(JSON.stringify({ ok: true, event: 'ignored' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[wa-webhook] Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
