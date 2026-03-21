import { useState } from 'react';
import { Phone, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface CallButtonProps {
  phoneNumber: string;
  leadId: string;
  leadName: string;
  deviceId?: string;
  onCallStarted?: (callId: string) => void;
  className?: string;
}

export function CallButton({ phoneNumber, leadId, leadName, deviceId, onCallStarted, className }: CallButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCall = async () => {
    if (!phoneNumber) return;
    setState('loading');
    setErrorMsg('');

    try {
      const { data, error } = await supabase.functions.invoke('voys-call', {
        body: { phone: phoneNumber, leadId, leadName },
      });

      if (error) throw new Error(error.message || 'Functie aanroep mislukt');
      if (!data?.success) throw new Error(data?.error || 'Onbekende fout');

      setState('success');
      onCallStarted?.(data?.callId || '');
      setTimeout(() => setState('idle'), 2500);
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message || 'Bellen mislukt');
      setTimeout(() => setState('idle'), 4000);
    }
  };

  return (
    <button
      onClick={handleCall}
      disabled={state === 'loading' || !phoneNumber}
      className={cn(
        'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97]',
        state === 'idle' && 'bg-emerald-600 hover:bg-emerald-500 text-white',
        state === 'loading' && 'bg-emerald-700 text-white/80 cursor-wait',
        state === 'success' && 'bg-emerald-500 text-white',
        state === 'error' && 'bg-destructive text-white',
        !phoneNumber && 'opacity-40 cursor-not-allowed',
        className,
      )}
      title={state === 'error' ? errorMsg : `Bel ${phoneNumber}`}
    >
      {state === 'idle' && <><Phone size={13} /> Bellen</>}
      {state === 'loading' && <><Loader2 size={13} className="animate-spin" /> Verbinden...</>}
      {state === 'success' && <><CheckCircle size={13} /> Gestart!</>}
      {state === 'error' && <>{errorMsg.length > 25 ? 'Fout' : errorMsg}</>}
    </button>
  );
}
