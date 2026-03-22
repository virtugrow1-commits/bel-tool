import { useState, useCallback, useRef } from 'react';

interface ToastState {
  msg: string;
  type: string;
}

export function useFlash() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const flash = useCallback((msg: string, type?: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg, type: type || 'ok' });
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const clearToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, flash, clearToast };
}
