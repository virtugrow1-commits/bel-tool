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
    let data: Record<string, string> = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      data = await req.json();
    } else if (contentType.includes('form')) {
      const form = await req.formData();
      form.forEach((v, k) => { data[k] = String(v); });
    } else {
      const url = new URL(req.url);
      url.searchParams.forEach((v, k) => { data[k] = v; });
    }

    console.log('[voys-webhook] Received:', JSON.stringify(data));

    const callerNumber = data.caller_id || data.caller_number || data.from || data.a_number || '';
    const calledNumber = data.called_number || data.to || data.b_number || '';
    const callId = data.call_id || data.callid || data.unique_id || '';
    const status = (data.status || data.direction || 'ringing').toLowerCase();

    if (!callerNumber) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no caller number' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map Voys statuses to our internal statuses
    const statusMap: Record<string, string> = {
      'ringing': 'ringing',
      'in-progress': 'answered',
      'answered': 'answered',
      'connected': 'answered',
      'completed': 'ended',
      'ended': 'ended',
      'hangup': 'ended',
      'no-answer': 'ended',
      'busy': 'ended',
      'failed': 'ended',
      'cancelled': 'ended',
    };
    const mappedStatus = statusMap[status] || status;

    // If we have a call_id and this is an update (answered/ended), update existing record
    if (callId && mappedStatus !== 'ringing') {
      const { data: existing } = await supabase
        .from('incoming_calls')
        .select('id')
        .eq('call_id', callId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('incoming_calls')
          .update({ status: mappedStatus })
          .eq('call_id', callId);
        if (error) console.error('[voys-webhook] Update error:', error);
        console.log(`[voys-webhook] Updated call ${callId} → ${mappedStatus}`);
        return new Response(JSON.stringify({ ok: true, updated: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // New ringing call — insert
    if (mappedStatus === 'ringing') {
      const { error } = await supabase.from('incoming_calls').insert({
        caller_number: callerNumber,
        called_number: calledNumber,
        call_id: callId || null,
        status: 'ringing',
      });
      if (error) console.error('[voys-webhook] Insert error:', error);
    } else {
      // Non-ringing event without existing record — insert with current status
      const { error } = await supabase.from('incoming_calls').insert({
        caller_number: callerNumber,
        called_number: calledNumber,
        call_id: callId || null,
        status: mappedStatus,
      });
      if (error) console.error('[voys-webhook] Insert error:', error);
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
