const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, leadId, leadName } = await req.json();

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

    const voysEmail = Deno.env.get('VOYS_EMAIL');
    const voysToken = Deno.env.get('VOYS_API_TOKEN');
    const voysDevice = Deno.env.get('VOYS_DEVICE_ID');
    const voysOutbound = Deno.env.get('VOYS_OUTBOUND_NUMBER');

    if (!voysEmail || !voysToken || !voysDevice) {
      return new Response(
        JSON.stringify({ success: false, error: 'Voys configuratie ontbreekt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Voys Click-to-Dial API
    const voysBody: Record<string, string> = {
      a_number: voysDevice,
      b_number: normalizedPhone,
    };
    if (voysOutbound) {
      voysBody.b_cli = voysOutbound;
    }

    const voysResponse = await fetch('https://api.voipgrid.nl/api/clicktodial/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${voysEmail}:${voysToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(voysBody),
    });

    let voysData: Record<string, unknown> = {};
    try {
      voysData = await voysResponse.json();
    } catch {
      const text = await voysResponse.text();
      voysData = { raw: text };
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
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
