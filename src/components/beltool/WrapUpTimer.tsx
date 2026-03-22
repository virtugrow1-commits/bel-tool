import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface WrapUpTimerProps {
  active: boolean;
  contactName: string;
  onComplete: () => void;
  onExtend: () => void;
  durationSeconds?: number;
}

export function WrapUpTimer({ active, contactName, onComplete, onExtend, durationSeconds = 30 }: WrapUpTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [expired, setExpired] = useState(false);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!active) {
      setRemaining(durationSeconds);
      setExpired(false);
      return;
    }

    startRef.current = Date.now();
    setRemaining(durationSeconds);
    setExpired(false);

    const iv = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const left = Math.max(0, durationSeconds - elapsed);
      setRemaining(left);
      if (left <= 0) {
        setExpired(true);
        clearInterval(iv);
      }
    }, 200);

    return () => clearInterval(iv);
  }, [active, durationSeconds]);

  if (!active) return null;

  const pct = (remaining / durationSeconds) * 100;
  const isUrgent = remaining <= 10;

  return (
    <div className={cn(
      'border rounded-xl p-3 transition-colors',
      expired ? 'bg-warning/[0.06] border-warning/20' : isUrgent ? 'bg-destructive/[0.04] border-destructive/15' : 'bg-muted/30 border-border'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[13px]">{expired ? '⏰' : '✍️'}</span>
        <div className="flex-1 text-[12px] font-semibold text-foreground">
          {expired ? 'Wrap-up tijd voorbij' : `Notities afronden — ${contactName}`}
        </div>
        <div className={cn(
          'text-[14px] font-bold tabular-nums',
          expired ? 'text-warning' : isUrgent ? 'text-destructive' : 'text-foreground'
        )}>
          {expired ? '0:00' : `0:${remaining.toString().padStart(2, '0')}`}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden mb-2">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-200',
            expired ? 'bg-warning' : isUrgent ? 'bg-destructive' : 'bg-primary'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex gap-2">
        {expired ? (
          <>
            <button
              onClick={onComplete}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 active:scale-[0.97] transition-all"
            >
              Volgende contact →
            </button>
            <button
              onClick={onExtend}
              className="px-3 py-2 rounded-lg bg-muted text-muted-foreground text-[12px] font-semibold hover:bg-muted/80 active:scale-[0.97] transition-all border border-border"
            >
              +30s
            </button>
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground">
            Rond je notities af en selecteer een resultaat...
          </div>
        )}
      </div>
    </div>
  );
}
