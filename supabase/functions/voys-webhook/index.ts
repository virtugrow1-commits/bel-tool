import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Voys/VoIPGRID sends call status webhooks
    // Can be form-encoded or JSON depending on config
    let data: Record<string, string> = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await req.json();
    } else if (contentType.includes('form')) {
      const form = await req.formData();
      form.forEach((v, k) => { data[k] = String(v); });
    } else {
      // Try URL params (GET webhook)
      const url = new URL(req.url);
      url.searchParams.forEach((v, k) => { data[k] = v; });
    }

    console.log('[voys-webhook] Received:', JSON.stringify(data));

    const callerNumber = data.caller_id || data.caller_number || data.from || data.a_number || '';
    const calledNumber = data.called_number || data.to || data.b_number || '';
    const callId = data.call_id || data.callid || data.unique_id || '';
    const status = data.status || data.direction || 'ringing';

    // Only process incoming/ringing calls
    if (!callerNumber) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no caller number' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize number for matching
    let normalized = callerNumber.replace(/[\s\-\(\)]/g, '');
    if (normalized.startsWith('+31')) normalized = '0' + normalized.substring(3);

    // Insert incoming call record - frontend picks it up via realtime
    const { error } = await supabase.from('incoming_calls').insert({
      caller_number: callerNumber,
      called_number: calledNumber,
      call_id: callId,
      status: 'ringing',
    });

    if (error) {
      console.error('[voys-webhook] Insert error:', error);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[voys-webhook] Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});