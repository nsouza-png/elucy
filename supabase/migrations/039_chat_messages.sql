-- Chat Messages — unified conversation log for WhatsApp (Evolution + Meta) and Instagram
-- Replaces the informal chat_messages table that chat-proxy was inserting into.
-- Adds deal_id for IA context linking, evolution fields, and media support.

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL,                        -- conversation thread identifier
  operator_email TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',        -- whatsapp | instagram
  provider TEXT NOT NULL DEFAULT 'evolution',      -- evolution | meta
  direction TEXT NOT NULL DEFAULT 'outbound',      -- inbound | outbound
  body TEXT NOT NULL,
  contact_phone TEXT,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'sent',             -- sent | delivered | read | failed | queued
  external_id TEXT,                                -- message ID from provider (Evolution or Meta)
  evolution_msg_id TEXT,                           -- Evolution-specific message key
  instance_name TEXT,                              -- which Evolution instance sent/received
  deal_id TEXT,                                    -- link to deal for IA context
  media_url TEXT,                                  -- URL for images/docs/audio
  media_type TEXT,                                 -- image | audio | document | video | sticker
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_chat_messages_thread ON public.chat_messages(thread_id, created_at);
CREATE INDEX idx_chat_messages_deal ON public.chat_messages(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX idx_chat_messages_phone ON public.chat_messages(contact_phone, created_at DESC);
CREATE INDEX idx_chat_messages_operator ON public.chat_messages(operator_email, created_at DESC);
CREATE INDEX idx_chat_messages_channel ON public.chat_messages(channel, created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators read all messages" ON public.chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Service role full access chat" ON public.chat_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Operators insert messages" ON public.chat_messages
  FOR INSERT WITH CHECK (true);

GRANT SELECT, INSERT ON public.chat_messages TO anon;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;

-- View: chat_conversations — groups messages into conversations for the left panel
CREATE OR REPLACE VIEW public.chat_conversations AS
SELECT
  thread_id,
  contact_phone,
  MAX(contact_name) AS contact_name,
  channel,
  MAX(operator_email) AS operator_email,
  MAX(deal_id) AS deal_id,
  MAX(created_at) AS last_message_at,
  COUNT(*) AS message_count,
  MAX(CASE WHEN direction = 'inbound' THEN created_at END) AS last_inbound_at,
  (SELECT body FROM public.chat_messages cm2
   WHERE cm2.thread_id = cm.thread_id
   ORDER BY cm2.created_at DESC LIMIT 1) AS last_message_preview,
  (SELECT direction FROM public.chat_messages cm2
   WHERE cm2.thread_id = cm.thread_id
   ORDER BY cm2.created_at DESC LIMIT 1) AS last_message_direction,
  COUNT(*) FILTER (WHERE direction = 'inbound' AND status = 'sent') AS unread_count
FROM public.chat_messages cm
GROUP BY thread_id, contact_phone, channel;

GRANT SELECT ON public.chat_conversations TO anon;
GRANT SELECT ON public.chat_conversations TO authenticated;
GRANT SELECT ON public.chat_conversations TO service_role;

COMMENT ON TABLE public.chat_messages IS 'Unified chat messages — WhatsApp (Evolution/Meta) + Instagram. Linked to deals for IA context enrichment.';
COMMENT ON VIEW public.chat_conversations IS 'Aggregated view of chat conversations for the cockpit Chat panel left sidebar.';
