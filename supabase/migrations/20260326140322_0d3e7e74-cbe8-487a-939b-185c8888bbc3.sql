ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS voys_api_token text,
  ADD COLUMN IF NOT EXISTS voys_email text,
  ADD COLUMN IF NOT EXISTS voys_device_id text,
  ADD COLUMN IF NOT EXISTS voys_outbound_number text;