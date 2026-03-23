-- WA Messages — WhatsApp conversation log per operator
-- Raw text comes in from cockpit, G4 OS worker parses and organizes,
-- cockpit reads back the organized messages to render chat UI.
-- Each row = 1 message line, ready for individual CRM registration.

CREATE TABLE IF NOT EXISTS public.wa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_email TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  session_id TEXT NOT NULL,              -- groups messages into a conversation session

  -- Raw input (what the SDR pastes)
  raw_text TEXT,                          -- original pasted text block (only on first msg of batch)

  -- Parsed fields (filled by G4 OS worker)
  sender TEXT NOT NULL DEFAULT 'lead',    -- 'lead' or 'operator'
  message TEXT NOT NULL,                  -- cleaned message text
  msg_timestamp TIMESTAMPTZ,             -- extracted or assigned timestamp
  msg_order INTEGER NOT NULL DEFAULT 0,  -- sequence within session

  -- Metadata
  signal TEXT,                            -- CQL signal detected: BUY, INTEREST, INTENT, etc.
  crm_synced BOOLEAN DEFAULT false,       -- true after pushed to CRM
  status TEXT NOT NULL DEFAULT 'parsed',  -- 'raw' = just inserted, 'parsed' = processed by worker

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wa_messages_operator ON public.wa_messages(operator_email);
CREATE INDEX idx_wa_messages_deal ON public.wa_messages(deal_id, operator_email);
CREATE INDEX idx_wa_messages_session ON public.wa_messages(session_id);
CREATE INDEX idx_wa_messages_status ON public.wa_messages(status) WHERE status = 'raw';

-- RLS: each operator only sees/writes their own messages
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;

-- Anon can read (cockpit uses publishable key + operator_email filter)
CREATE POLICY "Operators read own messages" ON public.wa_messages
  FOR SELECT USING (true);

-- Service role can do everything (worker writes parsed results)
CREATE POLICY "Service role full access" ON public.wa_messages
  FOR ALL USING (auth.role() = 'service_role');

-- Authenticated users can insert their own raw messages
CREATE POLICY "Operators insert own messages" ON public.wa_messages
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON public.wa_messages TO anon;
GRANT SELECT, INSERT ON public.wa_messages TO authenticated;
GRANT ALL ON public.wa_messages TO service_role;

COMMENT ON TABLE public.wa_messages IS 'WhatsApp conversation log per operator. Raw text → G4 OS worker → parsed messages → CRM sync. Isolated per operator_email.';
