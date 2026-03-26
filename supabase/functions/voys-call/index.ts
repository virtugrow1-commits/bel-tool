import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Retry wrapper for Voys API
async function fetchVoys(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(12_000) });
      if ([502, 503, 504].includes(res.status) && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 600 * Math.pow(2, attempt)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt >= maxRetries) throw err;
      await new Promise(r => setTimeout(r, 600 * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

/** Resolve Voys credentials: org-specific from DB first, then global secrets as fallback */
async function getVoysCredentials(organizationId?: string) {
  if (organizationId) {
    try {
      const sb = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data } = await sb
        .from('organizations')
        .select('voys_api_token, voys_email, voys_device_id, voys_outbound_number')
        .eq('id', organizationId)
        .single();

      if (data?.voys_api_token && data?.voys_email) {
        console.log(`[voys-call] Using org-specific Voys credentials for org ${organizationId}`);
        return {
          email: data.voys_email,
          token: data.voys_api_token,
          device: data.voys_device_id || Deno.env.get('VOYS_DEVICE_ID') || '',
          outbound: data.voys_outbound_number || null,
        };
      }
    } catch (err) {
      console.warn('[voys-call] Failed to fetch org credentials, falling back to global:', err);
    }
  }

  // Fallback to global secrets
  return {
    email: Deno.env.get('VOYS_EMAIL') || '',
    token: Deno.env.get('VOYS_API_TOKEN') || '',
    device: Deno.env.get('VOYS_DEVICE_ID') || '',
    outbound: Deno.env.get('VOYS_OUTBOUND_NUMBER') || null,
  };
}

/** Normalize phone to E.164 */
function normalizePhone(phone: string): string {
  let n = phone.replace(/[\s\-\(\)]/g, '');
  if (n.startsWith('06')) n = '+316' + n.substring(2);
  else if (n.startsWith('0')) n = '+31' + n.substring(1);
  else if (!n.startsWith('+')) n = '+31' + n;
  return n;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, organizationId } = body;

    // ── HANGUP ──
    if (action === 'hangup') {
      const { callId } = body;
      if (!callId) {
        return new Response(
          JSON.stringify({ success: false, error: 'callId is verplicht' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const creds = await getVoysCredentials(organizationId);
      const authHeader = `Token ${creds.email}:${creds.token}`;

      console.log('Voys hangup:', callId);
      const res = await fetchVoys(`https://api.voipgrid.nl/api/clicktodial/${callId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader, 'Accept': 'application/json' },
      });
      console.log('Voys hangup response:', res.status);

      if (res.ok || res.status === 204) {
        return new Response(
          JSON.stringify({ success: true, message: 'Gesprek beëindigd' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const text = await res.text();
      if (text.includes('already disconnected')) {
        return new Response(
          JSON.stringify({ success: true, message: 'Gesprek was al beëindigd' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: `Ophangen mislukt (${res.status})`, details: text }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── STATUS CHECK ──
    if (action === 'status') {
      const { callId } = body;
      if (!callId) {
        return new Response(
          JSON.stringify({ success: false, error: 'callId is verplicht' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const creds = await getVoysCredentials(organizationId);
      const authHeader = `Token ${creds.email}:${creds.token}`;

      const res = await fetchVoys(`https://api.voipgrid.nl/api/clicktodial/${callId}/`, {
        method: 'GET',
        headers: { 'Authorization': authHeader, 'Accept': 'application/json' },
      });
      if (!res.ok) {
        return new Response(
          JSON.stringify({ success: false, status: 'unknown', error: `Status check failed (${res.status})` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      let voysStatus: Record<string, unknown> = {};
      try { voysStatus = await res.json(); } catch { /* empty */ }
      const callStatus = voysStatus.callid ? (voysStatus.status || 'ringing') : 'unknown';
      return new Response(
        JSON.stringify({ success: true, status: callStatus, raw: voysStatus }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── INITIATE CALL ──
    const { phone, leadId, leadName, deviceId } = body;
    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telefoonnummer is verplicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    const creds = await getVoysCredentials(organizationId);

    if (!creds.email || !creds.token || !creds.device) {
      return new Response(
        JSON.stringify({ success: false, error: 'Voys configuratie ontbreekt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = `Token ${creds.email}:${creds.token}`;
    const voysBody: Record<string, string> = {
      a_number: deviceId || creds.device,
      b_number: normalizedPhone,
    };
    if (creds.outbound) {
      voysBody.b_cli = creds.outbound;
    }

    console.log('Voys request:', JSON.stringify({ ...voysBody, auth_type: 'Token', email: creds.email, org: organizationId || 'global' }));

    const voysResponse = await fetchVoys('https://api.voipgrid.nl/api/clicktodial/', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(voysBody),
    });

    let voysData: Record<string, unknown> = {};
    const responseText = await voysResponse.text();
    console.log('Voys response:', voysResponse.status, responseText);

    try { voysData = JSON.parse(responseText); } catch { voysData = { raw: responseText }; }

    // Log to GHL webhook if configured
    const ghlWebhookUrl = Deno.env.get('GHL_WEBHOOK_URL');
    if (ghlWebhookUrl) {
      fetch(ghlWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizedPhone, lead_id: leadId, lead_name: leadName,
          call_id: voysData.callid || 'unknown',
          status: voysResponse.ok ? 'initiated' : 'failed',
          timestamp: new Date().toISOString(), source: 'lovable_beltool',
        }),
      }).catch(() => {});
    }

    if (voysResponse.ok) {
      return new Response(
        JSON.stringify({ success: true, callId: voysData.callid, message: 'Gesprek wordt gestart...' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ success: false, error: voysData.error || voysData.message || `Voys API error (${voysResponse.status})`, details: voysData }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Voys call error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
