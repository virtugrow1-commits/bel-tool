import { SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[997] flex items-center justify-center bg-black/30"
      style={{ animation: 'fadeIn 0.15s ease', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl p-6 w-[380px]"
        style={{ animation: 'slideToast 0.25s ease' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold text-foreground">Sneltoetsen</div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="flex items-center gap-3 py-2 px-1 border-b border-border/30 last:border-0">
              <kbd className="inline-flex items-center justify-center min-w-[36px] h-7 px-2 rounded-md bg-muted border border-border text-[12px] font-mono font-bold text-foreground shadow-sm">
                {s.label}
              </kbd>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-foreground">{s.description}</div>
                <div className="text-[11px] text-muted-foreground">{s.when}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center text-[11px] text-muted-foreground/50">
          Druk op <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">?</kbd> of <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Esc</kbd> om te sluiten
        </div>
      </div>
    </div>
  );
}
