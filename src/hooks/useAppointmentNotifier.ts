/**
 * useAppointmentNotifier
 *
 * Luistert via Supabase Realtime naar nieuwe call_sessions met result='afspraak'
 * EN nieuwe inkomende GHL webhook-tags (beltool-afspraak-gepland).
 *
 * Gebruik: als een prospect zelf een afspraak boekt via adviesgesprekken.cliqmakers.nl
 * of de Afspraak-pagina, wordt de bel-tool automatisch bijgewerkt:
 *   • flash-melding voor de beller
 *   • lead stage → 'afspraak' in de lokale lijst
 *   • GHL pipeline → 'afspraak gepland' (via reloadLeads)
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@/lib/beltool-data';

interface UseAppointmentNotifierOptions {
  user:             User | null;
  updateCompStage:  (compId: string, stage: 'afspraak') => void;
  companies:        Array<{ id: string; contacts: Array<{ id: string }> }>;
  flash:            (msg: string, type?: string) => void;
  reloadLeads:      () => Promise<void>;
}

export function useAppointmentNotifier({
  user,
  updateCompStage,
  companies,
  flash,
  reloadLeads,
}: UseAppointmentNotifierOptions) {
  const reloadRef = useRef(reloadLeads);
  reloadRef.current = reloadLeads;

  useEffect(() => {
    if (!user) return;

    // Listen for new call_sessions with result='afspraak'
    // This fires when:
    // 1. Beller boekt afspraak via de bel-tool zelf
    // 2. Prospect boekt via de publieke Afspraak-pagina
    const channel = supabase
      .channel('appointment-notifier')
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'call_sessions',
          filter: 'result=eq.afspraak',
        },
        (payload: any) => {
          const row = payload.new;
          const contactId  = row.contact_id  as string;
          const contactName = row.contact_name as string;
          const companyName = row.company_name as string;

          // Find company in local list by contactId
          const comp = companies.find(c =>
            c.contacts.some(ct => ct.id === contactId)
          );

          if (comp) {
            updateCompStage(comp.id, 'afspraak');
          }

          // Flash notification for caller
          flash(
            `📅 Afspraak geboekt${contactName ? ` — ${contactName}` : ''}${companyName ? ` (${companyName})` : ''}`,
            'info',
          );

          // Reload leads from GHL after short delay so pipeline is in sync
          setTimeout(() => {
            reloadRef.current().catch(() => {});
          }, 2000);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, companies, updateCompStage, flash]);
}
