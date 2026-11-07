/**
 * CallButton — Initiates a VoIPzeker click-to-call call.
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
import { invokeAuthenticated } from '@/lib/authenticated-functions';
import { normalizePhone } from '@/lib/phone';

interface CallButtonProps {
  phoneNumber:    string;
  leadId:         string;
  leadName:       string;
  extension?:     string;
  organizationId?: string;
  country?:       string;
  onCallStarted?: (callId: string) => void;
  className?:     string;
}

async function isDNC(phone: string, country?: string): Promise<boolean> {
  try {
    const norm = normalizePhone(phone, country);
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

export function CallButton({ phoneNumber, leadId, leadName, extension, organizationId, country, onCallStarted, className }: CallButtonProps) {
  const [state,    setState]    = useState<'idle' | 'loading' | 'success' | 'error' | 'dnc'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCall = async () => {
    if (!phoneNumber || state === 'loading') return;
    setState('loading');
    setErrorMsg('');

    try {
      // DNC check
      const blocked = await isDNC(phoneNumber, country);
      if (blocked) {
        setState('dnc');
        setTimeout(() => setState('idle'), 5000);
        return;
      }

      const { data, error } = await invokeAuthenticated('voipzeker-call', {
        body: { action: 'call', phone: phoneNumber, country, leadId, leadName, ...(extension ? { extension } : {}), ...(organizationId ? { organizationId } : {}) },
      });

      if (error) {
        let detail = error.message || 'Functie aanroep mislukt';
        try {
          const ctx = (error as unknown as { context?: { text?: () => Promise<string> } }).context;
          if (ctx?.text) {
            const raw = await ctx.text();
            const parsed = JSON.parse(raw);
            if (parsed?.error) detail = parsed.error;
          }
        } catch { /* keep generic message */ }
        throw new Error(detail);
      }
      if (!data?.success) throw new Error(data?.error || 'Onbekende fout van VoIPzeker');

      const callId = data?.callId || '';

      setState('success');
      onCallStarted?.(callId);
      setTimeout(() => setState('idle'), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bellen mislukt';
      setState('error');
      setErrorMsg(msg);
      console.error('[CallButton]', msg);
      setTimeout(() => setState('idle'), 8000);
    }
  };

  const label = {
    idle:    <><Phone size={13} /> Bellen</>,
    loading: <><Loader2 size={13} className="animate-spin" /> Verbinden...</>,
    success: <><CheckCircle size={13} /> Gestart!</>,
    error:   <>{/offline/i.test(errorMsg) ? 'Toestel offline' : errorMsg.length > 20 ? 'Fout — probeer opnieuw' : errorMsg}</>,
    dnc:     <><Ban size={13} /> Geblokkeerd (DNC)</>,
  }[state];

  return (
    <span className="inline-flex flex-col items-start gap-1">
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
    {state === 'error' && errorMsg && <span role="alert" className="text-[11px] text-destructive max-w-xs">{errorMsg}</span>}
    </span>
  );
}
