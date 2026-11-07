import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { authorize, AccessError, serviceClient } from '../_shared/auth.ts';
import { normalizePhone } from '../_shared/phone.ts';

const BASE = 'https://api.voipzeker.nl/unite/v1';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function admin() {
  return serviceClient();
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
  return ''; // Never borrow another organization's global credentials.
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

/** Cache extension username → VoIPzeker id per organization */
const extIdCache = new Map<string, { id: string; expires: number }>();
async function extensionId(organizationId: string, username: string): Promise<string> {
  const key = `${organizationId}:${username}`;
  const hit = extIdCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.id;
  const { body: res } = await vzAuthed('listextensions', { pagelimit: '0' }, organizationId);
  const items = (res?.data as { items?: Record<string, unknown>[] } | undefined)?.items || [];
  const wanted = username.toLowerCase();
  const match = items.find((e) => [e.username, e.extno, e.extno_format].some((v) => String(v ?? '').toLowerCase() === wanted));
  if (!match?.id) throw new Error('Jouw toestel is niet gevonden bij VoIPzeker — controleer je extensie bij Instellingen.');
  extIdCache.set(key, { id: String(match.id), expires: Date.now() + 10 * 60 * 1000 });
  return String(match.id);
}

/** 0=never registered 1=idle 2=offline 3=incoming ringing 4=outgoing ringing 5=outgoing answered 6=incoming answered */
async function extensionStatus(organizationId: string, username: string): Promise<number> {
  const id = await extensionId(organizationId, username);
  const { http, body: res } = await vzAuthed('listextensionsstatus', { 'extensionids[]': id }, organizationId);
  if (http === 429) throw new Error('RATE_LIMIT');
  if (!res?.status) throw new Error(res?.message || `Status ophalen mislukt (${http})`);
  const d = res.data as unknown;
  console.log('[voipzeker-call] status shape', JSON.stringify(d).slice(0, 400));
  const list = Array.isArray(d) ? d : ((d as { items?: unknown[] })?.items ?? (d && typeof d === 'object' ? Object.values(d as object) : []));
  const row = (list as Record<string, unknown>[]).find((r) => String(r?.id ?? r?.extensionid ?? id) === id) ?? (list as Record<string, unknown>[])[0];
  const raw = row && typeof row === 'object' ? (row.status ?? row.state ?? row.code) : row;
  const code = Number(raw);
  if (!Number.isFinite(code)) throw new Error('Onbekende toestelstatus');
  return code;
}

async function resolveUsername(organizationId: string, ext: unknown): Promise<string> {
  let username = String(ext || '').trim();
  if (!username) {
    const { data } = await admin().from('organizations').select('voipzeker_outbound_number').eq('id', organizationId).maybeSingle();
    username = String(data?.voipzeker_outbound_number || '').trim();
  }
  return username;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;
    if (!['provision','extensions','ping','call','status'].includes(action)) return json({error:'Ongeldige actie'},400);
    const { organizationId, profile } = await authorize(req, body.organizationId, ['provision','extensions','ping'].includes(action));

    // ── PROVISION: invitation ID → logintoken ──
    if (action === 'provision') {
      const invitationid = String(body.invitationId || '').trim();
      if (!/^[a-zA-Z0-9]{6}$/.test(invitationid)) return json({ success: false, error: 'Koppelcode (invitation ID) is verplicht' }, 400);

      const { http, body: res } = await vzPost('appprovision', { invitationid });
      const logintoken = (res?.data as { logintoken?: string } | undefined)?.logintoken;
      if (!res?.status || !logintoken) {
        return json({
          success: false,
          error: res?.message || `Koppelen mislukt (${http}). Controleer of de App-provisioning template in het Unite-portaal actief staat.`,
        }, 400);
      }

      if (organizationId) {
        const { error: saveError } = await admin().from('organizations').update({
          voipzeker_invitation_id: invitationid,
          voipzeker_login_token: logintoken,
        }).eq('id', organizationId);
        if (saveError) throw new Error('Koppeling opslaan mislukt');
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

    // ── STATUS: own extension state (for live call tracking) ──
    if (action === 'status') {
      const username = await resolveUsername(organizationId, profile.voipzeker_extension);
      if (!username) return json({ success: false, error: 'Geen toestel ingesteld' }, 400);
      try { return json({ success: true, status: await extensionStatus(organizationId, username) }); }
      catch (e) {
        if (e instanceof Error && e.message === 'RATE_LIMIT') return json({ success: false, rateLimited: true, error: 'Te veel verzoeken' }, 429);
        throw e;
      }
    }

    // ── CALL (default) ──
    const { phone, extension } = body as { phone?: string; extension?: string };
    if (typeof phone !== 'string' || !/^[+0-9 ().-]{6,30}$/.test(phone)) return json({ success: false, error: 'Telefoonnummer is verplicht' }, 400);

    const username = await resolveUsername(organizationId, profile.voipzeker_extension); // Never a colleague's extension.
    if (!username) {
      return json({ success: false, error: 'Geen toestel (extensie) ingesteld voor deze gebruiker — stel dit in bij Instellingen.' }, 400);
    }

    const call_number = normalizePhone(phone, typeof body.country === 'string' ? body.country : null);
    // Pre-call check: never dial when the caller's own device is offline/unregistered.
    try {
      const st = await extensionStatus(organizationId, username);
      if (st === 0 || st === 2) return json({ success: false, offline: true, error: 'Je toestel is offline – open de Unite Phone-app (of je softphone) en probeer opnieuw' }, 409);
    } catch (e) {
      if (!(e instanceof Error && e.message === 'RATE_LIMIT')) console.warn('[voipzeker-call] status check skipped');
    }
    const { data: blocked, error: dncError } = await admin().from('dnc_list').select('id').eq('organization_id', organizationId).eq('phone_norm',call_number).maybeSingle();
    if (dncError) return json({error:'DNC-controle mislukt'},500);
    if (blocked) return json({error:'Dit nummer staat op de DNC-lijst'},403);
    const { http, body: res } = await vzAuthed('callnumber', { username, call_number }, organizationId);

    console.log('[voipzeker-call]', JSON.stringify({ username, call_number, http, errorCode: res?.errorCode, message: res?.message }));

    if (!res?.status) {
      if (http === 429) return json({ success: false, error: 'Te veel verzoeken naar VoIPzeker — probeer het zo opnieuw.' }, 429);
      return json({ success: false, error: res?.message || `Bellen mislukt (${http})` }, 400);
    }

    // VoIPzeker returns no call id — the tool tracks call state itself.
    return json({ success: true, callId: '', message: 'Gesprek wordt gestart...' });
  } catch (error) {
    if (error instanceof AccessError) return json({error:error.message},error.status);
    console.error('[voipzeker-call] request failed');
    return json({ success: false, error: error instanceof Error ? error.message : 'Onbekende fout' }, 500);
  }
});
