import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface WrapUpTimerProps {
  active: boolean;
  contactName: string;
  onComplete: () => void;
  durationSeconds?: number;
}

export function WrapUpTimer({ active, contactName, onComplete, durationSeconds = 30 }: WrapUpTimerProps) {
  const [totalDuration, setTotalDuration] = useState(durationSeconds);
  const [remaining, setRemaining] = useState(durationSeconds);
  const [expired, setExpired] = useState(false);
  const startRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const startTimer = useCallback((duration: number) => {
    startRef.current = Date.now();
    setTotalDuration(duration);
    setRemaining(duration);
    setExpired(false);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
      if (left <= 0) {
        setExpired(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 200);
  }, []);

  useEffect(() => {
    if (active) {
      startTimer(durationSeconds);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setRemaining(durationSeconds);
      setExpired(false);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, durationSeconds, startTimer]);

  const handleExtend = () => {
    startTimer(30);
  };

  if (!active) return null;

  const pct = totalDuration > 0 ? (remaining / totalDuration) * 100 : 0;
  const isUrgent = remaining <= 10 && !expired;

  return (
    <div className={cn(
      'border rounded-xl p-3 transition-colors',
      expired ? 'bg-warning/[0.06] border-warning/20' : isUrgent ? 'bg-destructive/[0.04] border-destructive/15' : 'bg-muted/30 border-border'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[13px]">{expired ? '⏰' : '✍️'}</span>
        <div className="flex-1 text-[12px] font-semibold text-foreground">
          {expired ? 'Wrap-up tijd voorbij — rond af of ga door' : `Notities afronden — ${contactName}`}
        </div>
        <div className={cn(
          'text-[14px] font-bold tabular-nums',
          expired ? 'text-warning' : isUrgent ? 'text-destructive' : 'text-foreground'
        )}>
          0:{remaining.toString().padStart(2, '0')}
        </div>
      </div>

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
        <button
          onClick={onComplete}
          className={cn(
            'flex-1 py-2 rounded-lg text-[12px] font-semibold active:scale-[0.97] transition-all',
            expired
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'
          )}
        >
          {expired ? 'Volgende contact →' : 'Klaar — volgende'}
        </button>
        <button
          onClick={handleExtend}
          className="px-3 py-2 rounded-lg bg-muted text-muted-foreground text-[12px] font-semibold hover:bg-muted/80 active:scale-[0.97] transition-all border border-border"
        >
          +30s
        </button>
      </div>
    </div>
  );
}
