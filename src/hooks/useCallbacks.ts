/**
 * useCallbacks — Supabase-backed callback scheduling.
 *
 * Replaces localStorage-only version. Callbacks now persist across devices
 * and sessions. Realtime subscription ensures popup notifications work even
 * when a colleague plans a callback for you on another machine.
 *
 * Falls back gracefully to localStorage if Supabase auth is not available.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { store } from '@/lib/beltool-store';
import type { CallbackEntry } from '@/types/beltool';

function rowToEntry(row: Record<string, unknown>): CallbackEntry {
  return {
    id: row.id as number,
    contactId: row.contact_id as string,
    contactName: row.contact_name as string,
    companyName: row.company_name as string,
    date: typeof row.scheduled_date === 'string' ? row.scheduled_date : String(row.scheduled_date),
    time: row.scheduled_time as string,
    note: (row.note as string) || '',
    status: (row.status as 'scheduled' | 'done') || 'scheduled',
    userId: row.created_by as string | undefined,
  };
}

function entryToRow(cb: Omit<CallbackEntry, 'id' | 'userId'>, userId?: string) {
  return {
    contact_id:     cb.contactId,
    contact_name:   cb.contactName,
    company_name:   cb.companyName,
    scheduled_date: cb.date,
    scheduled_time: cb.time,
    note:           cb.note || '',
    status:         cb.status || 'scheduled',
    created_by:     userId || null,
  };
}

let _localSeq = Date.now();

export function useCallbacks() {
  const [callbacks, setCallbacks] = useState<CallbackEntry[]>(() =>
    store.get<CallbackEntry[]>('callbacks', [])
  );
  const [showCallbackQueue, setShowCallbackQueue] = useState(false);
  const [callbackPopup, setCallbackPopup] = useState<CallbackEntry | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string | number>>(new Set());
  const [useSupabase, setUseSupabase] = useState(false);
  const loadedRef = useRef(false);

  const todayStr           = new Date().toISOString().split('T')[0];
  const dueCallbacks       = callbacks.filter(cb => cb.date <= todayStr && cb.status === 'scheduled');
  const scheduledCallbacks = callbacks.filter(cb => cb.status === 'scheduled');

  // Load from Supabase on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await (supabase as any)
          .from('callbacks')
          .select('*')
          .in('status', ['scheduled', 'done'])
          .order('scheduled_date', { ascending: true });

        if (error) throw error;

        const entries = (data || []).map(rowToEntry);
        setCallbacks(entries);
        store.set('callbacks', entries);
        setUseSupabase(true);
      } catch (err) {
        console.warn('[Callbacks] Supabase load failed, using localStorage:', err);
      }
    })();
  }, []);

  // Realtime subscription for cross-device sync
  useEffect(() => {
    if (!useSupabase) return;

    const channel = supabase
      .channel('callbacks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'callbacks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const entry = rowToEntry(payload.new as Record<string, unknown>);
          setCallbacks(prev => {
            if (prev.some(c => c.id === entry.id)) return prev;
            const next = [...prev, entry];
            store.set('callbacks', next);
            return next;
          });
        } else if (payload.eventType === 'UPDATE') {
          const entry = rowToEntry(payload.new as Record<string, unknown>);
          setCallbacks(prev => {
            const next = prev.map(c => c.id === entry.id ? entry : c);
            store.set('callbacks', next);
            return next;
          });
        } else if (payload.eventType === 'DELETE') {
          const deletedId = (payload.old as Record<string, unknown>).id;
          setCallbacks(prev => {
            const next = prev.filter(c => c.id !== deletedId);
            store.set('callbacks', next);
            return next;
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [useSupabase]);

  // Popup check every 30s
  useEffect(() => {
    const check = () => {
      const now     = new Date();
      const nowStr  = now.toISOString().split('T')[0];
      const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const due = callbacks.find(cb =>
        cb.status === 'scheduled' &&
        !dismissedIds.has(cb.id) &&
        (cb.date < nowStr || (cb.date === nowStr && cb.time <= nowTime))
      );

      if (due && (!callbackPopup || callbackPopup.id !== due.id)) {
        setCallbackPopup(due);
      }
    };

    check();
    const iv = setInterval(check, 30_000);
    return () => clearInterval(iv);
  }, [callbacks, dismissedIds, callbackPopup]);

  const saveCallback = useCallback(async (
    cb: Omit<CallbackEntry, 'id' | 'userId'>,
    userId?: string
  ): Promise<CallbackEntry[]> => {
    if (useSupabase) {
      try {
        const { data, error } = await (supabase as any)
          .from('callbacks')
          .insert(entryToRow(cb, userId))
          .select()
          .single();

        if (error) throw error;

        const entry = rowToEntry(data);
        const next = [...callbacks, entry];
        setCallbacks(next);
        store.set('callbacks', next);
        return next;
      } catch (err) {
        console.warn('[Callbacks] Supabase insert failed, using localStorage:', err);
      }
    }

    // localStorage fallback
    const entry: CallbackEntry = { ...cb, id: ++_localSeq, userId };
    const next = [...callbacks, entry];
    setCallbacks(next);
    store.set('callbacks', next);
    return next;
  }, [callbacks, useSupabase]);

  const completeCallback = useCallback(async (cbId: number | string): Promise<CallbackEntry | undefined> => {
    const found = callbacks.find(c => c.id === cbId);

    if (useSupabase && found) {
      try {
        await (supabase as any).from('callbacks').update({ status: 'done' }).eq('id', String(cbId));
      } catch (err) {
        console.warn('[Callbacks] Supabase update failed:', err);
      }
    }

    // Optimistic local update
    const next = callbacks.map(cb => cb.id === cbId ? { ...cb, status: 'done' as const } : cb);
    setCallbacks(next);
    store.set('callbacks', next);
    return found;
  }, [callbacks, useSupabase]);

  const dismissPopup = useCallback(() => {
    if (callbackPopup) {
      setDismissedIds(prev => new Set([...prev, callbackPopup.id]));
      setCallbackPopup(null);
    }
  }, [callbackPopup]);

  const clearPopup = useCallback(() => setCallbackPopup(null), []);

  return {
    callbacks,
    showCallbackQueue,
    setShowCallbackQueue,
    callbackPopup,
    dueCallbacks,
    scheduledCallbacks,
    todayStr,
    saveCallback,
    completeCallback,
    dismissPopup,
    clearPopup,
  };
}
