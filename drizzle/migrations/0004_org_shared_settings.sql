ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS shared_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS call_attempts_session_unique ON public.call_attempts(session_id) WHERE session_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.org_shared_settings() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(shared_settings,'{}'::jsonb) FROM public.organizations WHERE id = public.current_org_id();
$$;
REVOKE ALL ON FUNCTION public.org_shared_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_shared_settings() TO authenticated;