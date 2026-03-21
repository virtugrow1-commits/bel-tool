import { cn } from '@/lib/utils';
import type { CallState } from '@/types/beltool';

interface CallStateBarProps {
  callState: CallState;
  onHangup?: () => void;
}

export function CallStateBar({ callState, onHangup }: CallStateBarProps) {
  const config: Record<string, { color: string; label: string }> = {
    dialing: { color: 'text-warning', label: 'Bellen...' },
    ringing: { color: 'text-warning', label: 'Gaat over...' },
    active: { color: 'text-success', label: 'In gesprek' },
  };
  const c = config[callState];
  if (!c) return null;

  return (
    <div className={cn('flex items-center gap-2 px-3.5 py-1 rounded-full border', 
      callState === 'active' ? 'bg-success/10 border-success/20' : 'bg-warning/10 border-warning/20'
    )}>
      <div
        className={cn('w-[7px] h-[7px] rounded-full', 
          callState === 'active' ? 'bg-success' : 'bg-warning'
        )}
        style={{ animation: callState === 'active' ? 'blink 1.5s infinite' : 'none' }}
      />
      <span className={cn('text-[11px] font-bold', c.color)}>{c.label}</span>
      {callState === 'active' && onHangup && (
        <button
          onClick={onHangup}
          className="ml-1 bg-destructive border-none rounded-xl px-2 py-0.5 text-[10px] font-bold text-white active:scale-95 transition-transform"
        >
          Ophangen
        </button>
      )}
    </div>
  );
}
