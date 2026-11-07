# Architecture rules
- Use hosted email/password Auth and link immutable legacy profile IDs through auth_user_id; never trust cached user objects for access.
- Authorize roles from protected user_roles and determine organizations from the authenticated profile on the server; client IDs never confer authority.
- Expose only safe_organizations to browsers; all organization settings and invitations go through authenticated admin edge functions.
- Tracking tables default organization_id from the authenticated profile and enforce same-organization RLS; profile identifiers remain compatible with existing scores and callback ownership.
- Public survey/booking clients cannot use the authenticated staff proxy; a separately constrained public endpoint is required before anonymous integration is restored.