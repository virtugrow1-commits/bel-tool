import type { User } from '@/lib/beltool-data';
import type { Scores } from '@/lib/beltool-scoring';

interface MobileHeaderProps {
  user: User;
  scores: Scores;
  onToggleSidebar: () => void;
  dueCallbackCount: number;
}

export function MobileHeader({ user, scores, onToggleSidebar, dueCallbackCount }: MobileHeaderProps) {
  return (
    <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
      <button
        onClick={onToggleSidebar}
        className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground border border-border active:scale-95 transition-transform relative"
        aria-label="Menu openen"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="3" y1="5" x2="15" y2="5" />
          <line x1="3" y1="9" x2="15" y2="9" />
          <line x1="3" y1="13" x2="15" y2="13" />
        </svg>
        {dueCallbackCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white text-[8px] font-bold flex items-center justify-center">
            {dueCallbackCount}
          </span>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold tracking-tight text-foreground">Praktijkonderzoek</div>
      </div>

      {/* Inline mini stats */}
      <div className="flex items-center gap-2">
        {[
          { v: scores.gebeld, c: 'hsl(222, 66%, 15%)' },
          { v: scores.enquetes, c: 'hsl(174, 100%, 38%)' },
          { v: scores.afspraken, c: 'hsl(152, 56%, 42%)' },
        ].map((s, i) => (
          <span key={i} className="text-[13px] font-extrabold tabular-nums" style={{ color: s.c }}>{s.v}</span>
        ))}
      </div>

      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[8px] font-bold text-white shrink-0">
        {user.avatar}
      </div>
    </div>
  );
}
