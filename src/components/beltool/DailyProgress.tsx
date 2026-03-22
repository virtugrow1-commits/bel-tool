import { cn } from '@/lib/utils';
import { store } from '@/lib/beltool-store';
import type { Scores } from '@/lib/beltool-scoring';

interface DailyTargets {
  calls: number;
  appointments: number;
  surveys: number;
}

interface DailyProgressProps {
  scores: Scores;
  compact?: boolean;
}

function ProgressRing({ value, target, color, size = 36 }: { value: number; target: number; color: string; size?: number }) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/50" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

export function DailyProgress({ scores, compact }: DailyProgressProps) {
  const targets: DailyTargets = store.get('dailyTargets', { calls: 50, appointments: 5, surveys: 10 });

  const metrics = [
    { label: 'Gebeld', value: scores.gebeld, target: targets.calls, color: 'hsl(222 66% 30%)' },
    { label: 'Enquêtes', value: scores.enquetes, target: targets.surveys, color: 'hsl(174 100% 38%)' },
    { label: 'Afspraken', value: scores.afspraken, target: targets.appointments, color: 'hsl(152 56% 42%)' },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {metrics.map(m => {
          const pct = m.target > 0 ? Math.min(m.value / m.target, 1) * 100 : 0;
          return (
            <div key={m.label} className="flex items-center gap-1" title={`${m.label}: ${m.value}/${m.target}`}>
              <div className="w-10 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', pct >= 100 && 'animate-pulse')}
                  style={{ width: `${pct}%`, background: m.color }}
                />
              </div>
              <span className="text-[9px] font-mono text-muted-foreground tabular-nums">{m.value}/{m.target}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="px-3 pb-2">
      <div className="bg-muted/30 border border-border rounded-xl p-2.5">
        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Dagdoelen</div>
        <div className="flex justify-around">
          {metrics.map(m => {
            const done = m.value >= m.target;
            return (
              <div key={m.label} className="flex flex-col items-center gap-1">
                <div className="relative">
                  <ProgressRing value={m.value} target={m.target} color={m.color} size={34} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {done ? (
                      <span className="text-[9px]">✓</span>
                    ) : (
                      <span className="text-[8px] font-bold tabular-nums text-foreground">{m.value}</span>
                    )}
                  </div>
                </div>
                <div className="text-[8px] text-muted-foreground font-medium">{m.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
