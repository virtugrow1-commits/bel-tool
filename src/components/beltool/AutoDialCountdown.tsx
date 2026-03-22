import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AutoDialCountdownProps {
  active: boolean;
  nextContactName: string;
  seconds?: number;
  onDial: () => void;
  onPause: () => void;
  onSkip: () => void;
}

export function AutoDialCountdown({ active, nextContactName, seconds = 5, onDial, onPause, onSkip }: AutoDialCountdownProps) {
  const [remaining, setRemaining] = useState(seconds);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!active) {
      setRemaining(seconds);
      return;
    }

    startRef.current = Date.now();
    setRemaining(seconds);

    const iv = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const left = Math.max(0, seconds - elapsed);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(iv);
        onDial();
      }
    }, 100);

    return () => clearInterval(iv);
  }, [active, seconds, onDial]);

  if (!active) return null;

  return (
    <div className="border border-primary/20 bg-primary/[0.04] rounded-xl p-4 animate-fade-in">
      <div className="text-center mb-3">
        <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Auto-dial</div>
        <div className="text-[14px] font-semibold text-foreground">{nextContactName}</div>
        <div className="text-[42px] font-bold text-primary tabular-nums leading-none my-2">{remaining}</div>
        <div className="text-[11px] text-muted-foreground">seconden tot automatisch bellen</div>
      </div>

      {/* Circular progress */}
      <div className="flex justify-center mb-3">
        <svg width="60" height="60" className="-rotate-90">
          <circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
          <circle
            cx="30" cy="30" r="26"
            fill="none" stroke="hsl(174 100% 38%)" strokeWidth="3"
            strokeDasharray={2 * Math.PI * 26}
            strokeDashoffset={2 * Math.PI * 26 * (remaining / seconds)}
            strokeLinecap="round"
            className="transition-all duration-200"
          />
        </svg>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onPause}
          className="flex-1 py-2.5 rounded-lg bg-muted text-foreground text-[12px] font-semibold hover:bg-muted/80 active:scale-[0.97] transition-all border border-border"
        >
          ⏸ Pauze
        </button>
        <button
          onClick={onDial}
          className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 active:scale-[0.97] transition-all"
        >
          📞 Bel nu
        </button>
        <button
          onClick={onSkip}
          className="px-3 py-2.5 rounded-lg bg-muted text-muted-foreground text-[12px] font-semibold hover:bg-muted/80 active:scale-[0.97] transition-all border border-border"
        >
          Sla over
        </button>
      </div>
    </div>
  );
}
