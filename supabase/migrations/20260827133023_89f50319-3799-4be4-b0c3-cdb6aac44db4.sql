ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS voipzeker_invitation_id text,
  ADD COLUMN IF NOT EXISTS voipzeker_login_token text,
  ADD COLUMN IF NOT EXISTS voipzeker_outbound_number text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS voipzeker_extension text;