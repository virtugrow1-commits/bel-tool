import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Company, CompanyContact } from '@/types/beltool';
import type { User } from '@/lib/beltool-data';

export interface IncomingCallInfo {
  id: string;
  callerNumber: string;
  contactName?: string;
  companyName?: string;
  contactId?: string;
  companyId?: string;
}

interface UseIncomingCallsOptions {
  user: User | null;
  companies: Company[];
  activeCallId: string | null;
  setCallState: (state: 'active' | 'ended' | 'idle') => void;
  flash: (msg: string, type?: string) => void;
}

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[\s\-\(\)]/g, '');
  if (normalized.startsWith('+31')) normalized = '0' + normalized.substring(3);
  return normalized;
}

function findContactByPhone(companies: Company[], callerNumber: string): { contact?: CompanyContact; company?: Company } {
  const normalized = normalizePhone(callerNumber);
  for (const comp of companies) {
    for (const ct of comp.contacts) {
      const ctNorm = normalizePhone(ct.phone);
      if (ctNorm === normalized || ct.phone.replace(/[\s\-\(\)]/g, '') === callerNumber) {
        return { contact: ct, company: comp };
      }
    }
  }
  return {};
}

export function useIncomingCalls({ user, companies, activeCallId, setCallState, flash }: UseIncomingCallsOptions) {
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('incoming-calls')
      // Only listen for UPDATE events — incoming calls go to GHL, not this tool
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incoming_calls' }, (payload: any) => {
        const row = payload.new;
        const callId = row.call_id;

        // Match on activeCallId for outgoing calls only
        if (row.status === 'answered' && callId && callId === activeCallId) {
          setCallState('active');
          flash('📞 Gesprek opgenomen', 'info');
        }
        if (row.status === 'ended' && callId && callId === activeCallId) {
          setCallState('ended');
          flash('📞 Gesprek beëindigd');
          setTimeout(() => setCallState('idle'), 2000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, companies, activeCallId, incomingCall, setCallState, flash]);

  const answerCall = async () => {
    if (!incomingCall) return;
    await supabase.from('incoming_calls').update({ status: 'answered' }).eq('id', incomingCall.id);
    const result = { ...incomingCall };
    setIncomingCall(null);
    return result;
  };

  const dismissCall = async () => {
    if (!incomingCall) return;
    await supabase.from('incoming_calls').update({ status: 'dismissed' }).eq('id', incomingCall.id);
    setIncomingCall(null);
  };

  return {
    incomingCall,
    answerCall,
    dismissCall,
  };
}
