import { useState, useEffect } from 'react';
import { cliq } from '@/lib/beltool-ghl';

type Status = 'connected' | 'checking' | 'disconnected';

export function ConnectionStatus() {
  const [cliqStatus, setCliqStatus] = useState<Status>('checking');

  useEffect(() => {
    let mounted = true;
    let iv: ReturnType<typeof setInterval>;

    const check = async () => {
      if (!mounted || document.hidden) return;
      setCliqStatus('checking');
      try {
        await cliq.getCalendars();
        if (mounted) setCliqStatus('connected');
      } catch {
        if (mounted) setCliqStatus('disconnected');
      }
    };

    check();
    iv = setInterval(check, 300_000); // Re-check every 5 minutes

    // Re-check when tab becomes visible again
    const onVisibility = () => {
      if (!document.hidden && mounted) check();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mounted = false;
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const statusConfig = {
    connected: { color: 'hsl(152 56% 42%)', label: 'CLIQ verbonden', dot: 'bg-success' },
    checking: { color: 'hsl(38 92% 50%)', label: 'Verbinden...', dot: 'bg-warning animate-pulse' },
    disconnected: { color: 'hsl(0 84% 60%)', label: 'CLIQ offline', dot: 'bg-destructive' },
  };

  const cfg = statusConfig[cliqStatus];

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" title={cfg.label}>
      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span className="text-[9px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}
