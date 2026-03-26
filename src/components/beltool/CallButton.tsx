/**
 * CallButton — Initiates a Voys click-to-dial call.
 *
 * Improvements:
 *  • DNC (do-not-call) check before dialing
 *  • Phone number normalisation shown in tooltip
 *  • Better error messages
 *  • Registers call in incoming_calls for realtime status tracking
 */
import { useState } from 'react';
import { Phone, Loader2, CheckCircle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface CallButtonProps {
  phoneNumber:    string;
  leadId:         string;
  leadName:       string;
  deviceId?:      string;
  organizationId?: string;
  onCallStarted?: (callId: string) => void;
  className?:     string;
}

/** Normalise to E.164 for DNC check */
function normalizeE164(phone: string): string {
  let n = phone.replace(/[\s\-\(\)\.]/g, '');
  if (n.startsWith('06'))       n = '+316' + n.substring(2);
  else if (n.startsWith('0'))   n = '+31'  + n.substring(1);
  else if (!n.startsWith('+'))  n = '+31'  + n;
  return n;
}

async function isDNC(phone: string): Promise<boolean> {
  try {
    const norm = normalizeE164(phone);
    const { data } = await (supabase as any)
      .from('dnc_list')
      .select('id')
      .eq('phone_norm', norm)
      .limit(1)
      .maybeSingle();
    return !!data;
  } catch {
    return false; // On error, allow the call
  }
}

export function CallButton({ phoneNumber, leadId, leadName, deviceId, organizationId, onCallStarted, className }: CallButtonProps) {
  const [state,    setState]    = useState<'idle' | 'loading' | 'success' | 'error' | 'dnc'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCall = async () => {
    if (!phoneNumber || state === 'loading') return;
    setState('loading');
    setErrorMsg('');

    try {
      // DNC check
      const blocked = await isDNC(phoneNumber);
      if (blocked) {
        setState('dnc');
        setTimeout(() => setState('idle'), 5000);
        return;
      }

      const { data, error } = await supabase.functions.invoke('voys-call', {
        body: { phone: phoneNumber, leadId, leadName, ...(deviceId ? { deviceId } : {}), ...(organizationId ? { organizationId } : {}) },
      });

      if (error) throw new Error(error.message || 'Functie aanroep mislukt');
      if (!data?.success) throw new Error(data?.error || 'Onbekende fout van Voys');

      const callId = data?.callId || '';

      // Register outgoing call for realtime status tracking
      if (callId) {
        await supabase.from('incoming_calls').insert({
          caller_number: normalizeE164(phoneNumber),
          call_id:       callId,
          contact_id:    leadId,
          status:        'ringing',
        }).then(({ error: insertErr }) => {
          if (insertErr) console.warn('[CallButton] Could not register outgoing call:', insertErr);
        });
      }

      setState('success');
      onCallStarted?.(callId);
      setTimeout(() => setState('idle'), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bellen mislukt';
      setState('error');
      setErrorMsg(msg);
      console.error('[CallButton]', msg);
      setTimeout(() => setState('idle'), 5000);
    }
  };

  const label = {
    idle:    <><Phone size={13} /> Bellen</>,
    loading: <><Loader2 size={13} className="animate-spin" /> Verbinden...</>,
    success: <><CheckCircle size={13} /> Gestart!</>,
    error:   <>{errorMsg.length > 20 ? 'Fout — probeer opnieuw' : errorMsg}</>,
    dnc:     <><Ban size={13} /> Geblokkeerd (DNC)</>,
  }[state];

  return (
    <button
      data-call-button
      onClick={handleCall}
      disabled={state === 'loading' || !phoneNumber}
      title={
        state === 'error' ? errorMsg
        : state === 'dnc' ? 'Dit nummer staat op de DNC-lijst'
        : `Bel ${phoneNumber}`
      }
      className={cn(
        'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97]',
        state === 'idle'    && 'bg-emerald-600 hover:bg-emerald-500 text-white',
        state === 'loading' && 'bg-emerald-700 text-white/80 cursor-wait',
        state === 'success' && 'bg-emerald-500 text-white',
        state === 'error'   && 'bg-destructive text-white',
        state === 'dnc'     && 'bg-orange-600 text-white',
        !phoneNumber        && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      {label}
    </button>
  );
}
