import { createClient } from 'npm:@supabase/supabase-js@2';
import { enforceOrganization, requireAdmin } from './security-rules.ts';
export class AccessError extends Error { constructor(message: string, public status: number) { super(message); } }
export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Serverconfiguratie ontbreekt');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function authorize(req: Request, requestedOrg?: unknown, adminOnly = false) {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) throw new AccessError('Log eerst in', 401);
  const db = serviceClient();
  // Local JWT signature check (JWKS) — avoids one auth-server round trip per request.
  const { data: claimData, error } = await db.auth.getClaims(header.slice(7));
  const claims = claimData?.claims;
  if (error || !claims?.sub) throw new AccessError('Ongeldige of verlopen sessie', 401);
  const data = { user: { id: String(claims.sub), email: typeof claims.email === 'string' ? claims.email : undefined } };
  const { data: profile } = await db.from('profiles').select('id, organization_id, voipzeker_extension, device_id').eq('auth_user_id', data.user.id).single();
  if (!profile?.organization_id) throw new AccessError('Geen medewerkerprofiel', 403);
  const { data: grant } = await db.from('user_roles').select('role').eq('user_id', data.user.id).single();
  try {
    enforceOrganization(profile.organization_id, requestedOrg);
    if (adminOnly) requireAdmin(grant?.role || '');
  } catch (e) { throw new AccessError(e instanceof Error ? e.message : 'Geen toegang', 403); }
  return { db, profile, user: data.user, role: grant?.role || 'caller', organizationId: profile.organization_id };
}