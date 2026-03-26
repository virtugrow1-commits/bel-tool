ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS enquete_link text DEFAULT 'https://enquete.cliqmakers.nl/enquete/tV6XNgzJO54vbuCuiuvA',
  ADD COLUMN IF NOT EXISTS booking_link text DEFAULT 'https://adviesgesprekken.cliqmakers.nl/',
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS whatsapp_templates jsonb;