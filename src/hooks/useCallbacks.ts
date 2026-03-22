import { useState, useEffect, useCallback } from 'react';
import { store } from '@/lib/beltool-store';
import type { CallbackEntry } from '@/types/beltool';

export function useCallbacks() {
  const [callbacks, setCallbacks] = useState<CallbackEntry[]>(() => store.get('callbacks', []));
  const [showCallbackQueue, setShowCallbackQueue] = useState(false);
  const [callbackPopup, setCallbackPopup] = useState<CallbackEntry | null>(null);
  const [dismissedCallbacks, setDismissedCallbacks] = useState<Set<number>>(new Set());

  const todayStr = new Date().toISOString().split('T')[0];
  const dueCallbacks = callbacks.filter(cb => cb.date <= todayStr && cb.status === 'scheduled');
  const scheduledCallbacks = callbacks.filter(cb => cb.status === 'scheduled');

  // Check for due callbacks every 30s and show popup
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const nowStr = now.toISOString().split('T')[0];
      const nowTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const due = callbacks.find(cb =>
        cb.status === 'scheduled' &&
        !dismissedCallbacks.has(cb.id) &&
        (cb.date < nowStr || (cb.date === nowStr && cb.time <= nowTime))
      );
      if (due && (!callbackPopup || callbackPopup.id !== due.id)) {
        setCallbackPopup(due);
      }
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [callbacks, dismissedCallbacks, callbackPopup]);

  const saveCallback = useCallback((cb: Omit<CallbackEntry, 'id' | 'userId'>, userId?: string) => {
    const next = [...callbacks, { ...cb, id: Date.now(), userId }] as CallbackEntry[];
    setCallbacks(next);
    store.set('callbacks', next);
    return next;
  }, [callbacks]);

  const completeCallback = useCallback((cbId: number) => {
    const next = callbacks.map(cb => cb.id === cbId ? { ...cb, status: 'done' as const } : cb);
    setCallbacks(next);
    store.set('callbacks', next);
    return callbacks.find(c => c.id === cbId);
  }, [callbacks]);

  const dismissPopup = useCallback(() => {
    if (callbackPopup) {
      setDismissedCallbacks(prev => new Set([...prev, callbackPopup.id]));
      setCallbackPopup(null);
    }
  }, [callbackPopup]);

  const clearPopup = useCallback(() => {
    setCallbackPopup(null);
  }, []);

  return {
    callbacks,
    showCallbackQueue,
    setShowCallbackQueue,
    callbackPopup,
    dismissedCallbacks,
    dueCallbacks,
    scheduledCallbacks,
    todayStr,
    saveCallback,
    completeCallback,
    dismissPopup,
    clearPopup,
  };
}
