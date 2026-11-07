CREATE UNIQUE INDEX profiles_login_email_unique ON public.profiles(lower(email));
COMMENT ON FUNCTION public.safe_organizations() IS 'Intentionally callable by authenticated users: returns five non-secret fields for current organization only.';
COMMENT ON FUNCTION public.current_org_id() IS 'RLS helper restricted to caller auth.uid(), no parameters or cross-user lookup.';
COMMENT ON FUNCTION public.current_profile_id() IS 'RLS helper restricted to caller auth.uid(), no parameters or cross-user lookup.';
COMMENT ON FUNCTION public.is_org_admin() IS 'Protected role lookup for caller auth.uid(), never profile.role.';