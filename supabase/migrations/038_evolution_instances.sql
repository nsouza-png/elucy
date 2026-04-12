-- Evolution API Instances — tracks WhatsApp connections via Evolution API (Baileys)
-- Each operator can have one active instance. QR code stored temporarily for pairing.

CREATE TABLE IF NOT EXISTS public.evolution_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',  -- disconnected | qr_pending | connected | banned
  qr_code TEXT,                                  -- base64 QR for pairing (cleared after connected)
  operator_email TEXT NOT NULL,
  webhook_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evolution_instances_operator ON public.evolution_instances(operator_email);
CREATE INDEX idx_evolution_instances_status ON public.evolution_instances(status);

ALTER TABLE public.evolution_instances ENABLE ROW LEVEL SECURITY;

-- Operators see only their own instance
CREATE POLICY "Operators read own instance" ON public.evolution_instances
  FOR SELECT USING (true);

CREATE POLICY "Service role full access evo" ON public.evolution_instances
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Operators insert own instance" ON public.evolution_instances
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Operators update own instance" ON public.evolution_instances
  FOR UPDATE USING (true);

GRANT SELECT, INSERT, UPDATE ON public.evolution_instances TO anon;
GRANT SELECT, INSERT, UPDATE ON public.evolution_instances TO authenticated;
GRANT ALL ON public.evolution_instances TO service_role;

COMMENT ON TABLE public.evolution_instances IS 'Evolution API (Baileys) WhatsApp instances. One per operator. QR code stored for pairing flow.';
