# Architecture rules
- Use hosted email/password Auth and link immutable legacy profile IDs through auth_user_id; never trust cached user objects for access.
- Mount one AuthProvider for session bootstrap and profile hydration; consumers use its context, and synchronous auth listeners never perform database/auth calls, preventing session-lock deadlocks. Server JWT validation and protected RLS remain authoritative.
- Authorize roles from protected user_roles and determine organizations from the authenticated profile on the server; client IDs never confer authority.
- Expose only safe_organizations to browsers; all organization settings and invitations go through authenticated admin edge functions.
- Tracking tables default organization_id from the authenticated profile and enforce same-organization RLS; profile identifiers remain compatible with existing scores and callback ownership.
- Public survey/booking clients use public-booking only: a strict action allowlist, server-selected CliqMakers credentials, contact-location checks and service-only hashed IP counters preserve staff isolation.
- Save staff outcomes atomically through save_call_result, keyed by request_id, then synchronize CLIQ notes/tags with visible retry errors; reports count persisted sessions, never local scores.