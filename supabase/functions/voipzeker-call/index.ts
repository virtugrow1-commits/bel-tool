import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE = 'https://api.voipzeker.nl/unite/v1';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

interface VzResponse {
  status?: boolean;
  errorCode?: number;
  message?: string;
  data?: unknown;
}

/** POST form-encoded to the VoIPzeker Unite API */
async function vzPost(path: string, params: Record<string, string>): Promise<{ http: number; body: VzResponse }> {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let body: VzResponse;
  try { body = JSON.parse(text); } catch { body = { status: false, message: text.slice(0, 300) }; }
  return { http: res.status, body };
}

/** In-memory accesstoken cache per organization (token lives 30 min at VoIPzeker) */
const tokenCache = new Map<string, { token: string; expires: number }>();

async function getLoginToken(organizationId?: string): Promise<string> {
  if (organizationId) {
    const { data } = await admin()
      .from('organizations')
      .select('voipzeker_login_token')
      .eq('id', organizationId)
      .maybeSingle();
    if (data?.voipzeker_login_token) return data.voipzeker_login_token as string;
  }
  return Deno.env.get('VOIPZEKER_LOGIN_TOKEN') || '';
}

async function getAccessToken(organizationId: string | undefined, force = false): Promise<string> {
  const key = organizationId || 'global';
  const cached = tokenCache.get(key);
  if (!force && cached && cached.expires > Date.now()) return cached.token;

  const logintoken = await getLoginToken(organizationId);
  if (!logintoken) throw new Error('VoIPzeker is nog niet gekoppeld — vul eerst de koppelcode (invitation ID) in bij Instellingen.');

  const { http, body } = await vzPost('applogin', { logintoken });
  const token = (body?.data as { accesstoken?: string } | undefined)?.accesstoken;
  if (!body?.status || !token) {
    if (http === 429) throw new Error('Te veel verzoeken naar VoIPzeker — probeer het over een minuut opnieuw.');
    throw new Error(body?.message || `Inloggen bij VoIPzeker mislukt (${http})`);
  }
  tokenCache.set(key, { token, expires: Date.now() + 25 * 60 * 1000 });
  return token;
}

/** Call an authenticated endpoint, retrying once with a fresh token on 21/90 */
async function vzAuthed(path: string, params: Record<string, string>, organizationId?: string) {
  let accesstoken = await getAccessToken(organizationId);
  let res = await vzPost(path, { ...params, accesstoken });
  if (res.body?.errorCode === 21 || res.body?.errorCode === 90) {
    accesstoken = await getAccessToken(organizationId, true);
    res = await vzPost(path, { ...params, accesstoken });
  }
  return res;
}

/** Normalize phone to E.164 */
function normalizePhone(phone: string): string {
  let n = phone.replace(/[\s\-()\.]/g, '');
  if (n.startsWith('06')) n = '+316' + n.substring(2);
  else if (n.startsWith('0')) n = '+31' + n.substring(1);
  else if (!n.startsWith('+')) n = '+31' + n;
  return n;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, organizationId } = body as { action?: string; organizationId?: string };

    // ── PROVISION: invitation ID → logintoken ──
    if (action === 'provision') {
      const invitationid = String(body.invitationId || '').trim();
      if (!invitationid) return json({ success: false, error: 'Koppelcode (invitation ID) is verplicht' }, 400);

      const { http, body: res } = await vzPost('appprovision', { invitationid });
      const logintoken = (res?.data as { logintoken?: string } | undefined)?.logintoken;
      if (!res?.status || !logintoken) {
        return json({
          success: false,
          error: res?.message || `Koppelen mislukt (${http}). Controleer of de App-provisioning template in het Unite-portaal actief staat.`,
        }, 400);
      }

      if (organizationId) {
        await admin().from('organizations').update({
          voipzeker_invitation_id: invitationid,
          voipzeker_login_token: logintoken,
        }).eq('id', organizationId);
        tokenCache.delete(organizationId);
      }

      return json({ success: true, message: 'VoIPzeker gekoppeld', stored: !!organizationId });
    }

    // ── EXTENSIONS: list available extensions ──
    if (action === 'extensions') {
      const { http, body: res } = await vzAuthed('listextensions', { pagelimit: '0' }, organizationId);
      if (!res?.status) return json({ success: false, error: res?.message || `Extensies ophalen mislukt (${http})` }, 400);
      const items = ((res.data as { items?: Record<string, unknown>[] } | undefined)?.items || []).map((e) => ({
        id: String(e.id ?? ''),
        username: String(e.username ?? ''),
        name: String(e.name ?? ''),
        extno: String(e.extno_format ?? e.extno ?? ''),
        email: String(e.email ?? ''),
        callerid: String(e.callerid ?? ''),
      }));
      return json({ success: true, extensions: items });
    }

    // ── PING: verify the connection without calling ──
    if (action === 'ping') {
      const { http, body: res } = await vzAuthed('listextensions', { pagelimit: '1' }, organizationId);
      return json({
        success: !!res?.status,
        httpStatus: http,
        error: res?.status ? undefined : (res?.message || `Verbinding mislukt (${http})`),
        extensionCount: (res?.data as { itemcount?: string } | undefined)?.itemcount ?? null,
      });
    }

    // ── CALL (default) ──
    const { phone, extension } = body as { phone?: string; extension?: string };
    if (!phone) return json({ success: false, error: 'Telefoonnummer is verplicht' }, 400);

    let username = String(extension || '').trim();
    if (!username && organizationId) {
      const { data } = await admin()
        .from('organizations')
        .select('voipzeker_outbound_number')
        .eq('id', organizationId)
        .maybeSingle();
      username = String(data?.voipzeker_outbound_number || '').trim();
    }
    if (!username) {
      return json({ success: false, error: 'Geen toestel (extensie) ingesteld voor deze gebruiker — stel dit in bij Instellingen.' }, 400);
    }

    const call_number = normalizePhone(phone);
    const { http, body: res } = await vzAuthed('callnumber', { username, call_number }, organizationId);

    console.log('[voipzeker-call]', JSON.stringify({ username, call_number, http, errorCode: res?.errorCode, message: res?.message }));

    if (!res?.status) {
      if (http === 429) return json({ success: false, error: 'Te veel verzoeken naar VoIPzeker — probeer het zo opnieuw.' }, 429);
      return json({ success: false, error: res?.message || `Bellen mislukt (${http})` }, 400);
    }

    // VoIPzeker returns no call id — the tool tracks call state itself.
    return json({ success: true, callId: '', message: 'Gesprek wordt gestart...' });
  } catch (error) {
    console.error('[voipzeker-call] error:', error);
    return json({ success: false, error: error instanceof Error ? error.message : 'Onbekende fout' }, 500);
  }
});
