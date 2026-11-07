# Step 1 security handover

- Hosted email/password authentication replaces email-only local login. No public signup or anonymous accounts. Willem's original profile ID and organization are preserved through auth_user_id; his invitation was accepted by the email service, delivery/inbox acceptance is not verified.
- Roles are read from protected user_roles; profiles.role is deprecated and is not used for authorization. Profile writes and staff invites require server-verified same-organization admins. Database trigger enforces five profiles, including pending invitations, under an organization row lock. Emails are case-insensitively unique.
- Browser organization reads use safe_organizations: id, name, voipzeker_outbound_number, has_ghl_key, voipzeker_connected only. Table access is revoked for anon/authenticated, including admins. Settings updates accept an explicit allowlist server-side and never return keys.
- Staff CLIQ and VoIPzeker functions validate the bearer with Auth getUser, derive organization from auth_user_id, reject mismatched client organization IDs, and never borrow global organization credentials. VoIPzeker provision, extensions and connection tests require admin role. Calls use server-stored personal extension with organization fallback. DNC is checked server-side.
- Tracking tables were created using a new secure migration rather than applying the unsafe legacy 003_call_tracking.sql (which includes public policies, disallowed application foreign keys and a conflicting scores definition). All requested tables enforce authenticated organization membership. Realtime is enabled for callbacks and sessions. Generated types match the live schema.
- Legacy Voys call/webhook endpoints were disabled to prevent bypassing the new authentication boundaries. Browser data caches are organization-scoped; cached user objects cannot authenticate.

## Verified

- UI rejects an incorrect Willem password and a forged local admin object.
- Willem's managed authenticated session opens the original calling screen and can save his profile in Settings; data is read back through the UI.
- Live API tests deny anonymous reads of all requested tables, deny organization secrets even to signed-in users, return exactly the five safe organization fields, deny cross-organization proxy calls, deny cross-organization inserts, and return no other-organization profiles.
- Authenticated CLIQ getCalendars succeeds. A real tracking insert receives the server-derived organization and was cleaned up.
- The database accepted five temporary profiles and rejected a sixth; all temporary data was cleaned up.
- Unit tests cover admin role checks, organization mismatch rejection and the five-member limit.
- Linter warnings for restricted security-definer RLS helpers and intentionally locked organizations are reviewed and expected.

## Administrator actions and limits

1. Publish the updated frontend before using the invitation. Open the invitation sent to willem@cliqmakers.nl and set the first password. If necessary use Wachtwoord vergeten. The email inbox and actual password-link completion were not tested; no Willem password was chosen or disclosed.
2. Invite up to four colleagues in Settings → Gebruikersbeheer with their own email, role and VoIPzeker extension. End-to-end invitation delivery for a colleague and a caller-role hosted session remain unverified; caller restrictions are implemented centrally and covered by rule tests.
3. Rotate existing CLIQ/Voys/VoIPzeker tokens at their providers because organizations previously exposed them publicly; save replacement CLIQ keys through admin Settings and reconnect VoIPzeker. No real call was placed.
4. Public survey and booking integration is now blocked by the required authenticated staff proxy. A separately constrained public endpoint is needed in a later step; do not reopen the staff proxy or organization tables. Public page rendering remains available, but external contact prefill, submission and appointment creation are not operational for signed-out visitors.

## Step 2 results

- Restricted public-booking deployed: server-selected CliqMakers, validated action schemas, same-location contact checks and hashed IP counters. Staff endpoints remain authenticated.
- Staff outcomes use transactional session/attempt storage, request-id retry protection, callbacks and DNC, followed by CLIQ note/tag synchronization. Save errors block advancing and offer retry.
- Reports and leaderboards aggregate persisted own-organization sessions. Legacy Voys endpoints return 410 and frontend legacy provider fields were removed.
- Verified: test contact loaded in staff UI, reached outcome saved through UI; callback saved with 42-second duration, both sessions and attempts persisted, retry created no duplicate callback; CLIQ synchronization succeeded. Reporting displayed both results. Signed-out survey completed and persisted; booking prefill, live slots and confirmation screen verified. Unsupported public actions and organization override rejected. Four unit tests passed.
- Not fully verified: final external appointment creation was not submitted, DNC outcome and all remaining result buttons were not exercised end-to-end, callback form completion and standalone leaderboard were not browser-tested. Browser session restoration intermittently produced Auth lock warnings; no access bypass was observed.
- VoIPzeker ping reports not connected. Administrator must connect VoIPzeker and assign employee extensions before real outbound calls can be checked. No real phone call was placed.
- Publish updated pages. CLIQ Adviesgesprekken calendar currently returns free slots. Existing security handover invitation/token-rotation actions still apply; public integration is no longer blocked as described in Step 1.
