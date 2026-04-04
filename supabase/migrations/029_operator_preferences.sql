-- Add preferences JSONB column to operators table for cross-device settings sync
ALTER TABLE operators ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
COMMENT ON COLUMN operators.preferences IS 'Operator UI preferences: voice_mode, challenger_tension, auto_draft, auto_focus, alerts, slack_webhook';
