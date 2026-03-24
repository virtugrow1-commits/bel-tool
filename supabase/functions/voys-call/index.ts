const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Retry wrapper for Voys API — connection resets occasionally happen
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const voysEmail = Deno.env.get('VOYS_EMAIL');
    const voysToken = Deno.env.get('VOYS_API_TOKEN');
    const voysDevice = Deno.env.get('VOYS_DEVICE_ID');
    const voysOutbound = Deno.env.get('VOYS_OUTBOUND_NUMBER');
    const authHeader = `Token ${voysEmail}:${voysToken}`;

    // ── HANGUP ──
    if (action === 'hangup') {
      const { callId } = body;
      if (!callId) {
        return new Response(
          JSON.stringify({ success: false, error: 'callId is verplicht' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Voys hangup:', callId);

      const res = await fetchVoys(`https://api.voipgrid.nl/api/clicktodial/${callId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
        },
      });

      console.log('Voys hangup response:', res.status);

      // 204 No Content = success for DELETE
      if (res.ok || res.status === 204) {
        return new Response(
          JSON.stringify({ success: true, message: 'Gesprek beëindigd' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const text = await res.text();
        // If call was already disconnected, treat as success
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
    }

    // ── STATUS CHECK (for polling) ──
    if (action === 'status') {
      const { callId } = body;
      if (!callId) {
        return new Response(
          JSON.stringify({ success: false, error: 'callId is verplicht' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

      // Voys status values: 'connected', 'disconnected', 'failed', 'dialing'
      const callStatus = voysStatus.callid ? (voysStatus.status || 'ringing') : 'unknown';

      return new Response(
        JSON.stringify({ success: true, status: callStatus, raw: voysStatus }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    const { phone, leadId, leadName, deviceId } = body;

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Telefoonnummer is verplicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number to E.164
    let normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (normalizedPhone.startsWith('06')) {
      normalizedPhone = '+316' + normalizedPhone.substring(2);
    } else if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+31' + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+31' + normalizedPhone;
    }

    if (!voysEmail || !voysToken || !voysDevice) {
      return new Response(
        JSON.stringify({ success: false, error: 'Voys configuratie ontbreekt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const voysBody: Record<string, string> = {
      a_number: deviceId || voysDevice,
      b_number: normalizedPhone,
    };
    if (voysOutbound) {
      voysBody.b_cli = voysOutbound;
    }

    console.log('Voys request:', JSON.stringify({ ...voysBody, auth_type: 'Token', email: voysEmail }));

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

    try {
      voysData = JSON.parse(responseText);
    } catch {
      voysData = { raw: responseText };
    }

    // Log to GHL webhook if configured
    const ghlWebhookUrl = Deno.env.get('GHL_WEBHOOK_URL');
    if (ghlWebhookUrl) {
      fetch(ghlWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizedPhone,
          lead_id: leadId,
          lead_name: leadName,
          call_id: voysData.callid || 'unknown',
          status: voysResponse.ok ? 'initiated' : 'failed',
          timestamp: new Date().toISOString(),
          source: 'lovable_beltool',
        }),
      }).catch(() => {});
    }

    if (voysResponse.ok) {
      return new Response(
        JSON.stringify({ success: true, callId: voysData.callid, message: 'Gesprek wordt gestart...' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: voysData.error || voysData.message || `Voys API error (${voysResponse.status})`, details: voysData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Voys call error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
