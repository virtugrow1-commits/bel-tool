import type { CallbackEntry } from '@/types/beltool';

interface CallbackPopupProps {
  popup: CallbackEntry | null;
  onDismiss: () => void;
  onCall: (id: number) => void;
}

export function CallbackPopup({ popup, onDismiss, onCall }: CallbackPopupProps) {
  if (!popup) return null;

  return (
    <div
      className="fixed inset-0 z-[998] flex items-center justify-center bg-black/30"
      style={{ animation: 'fadeIn 0.2s ease', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl p-6 w-[340px]"
        style={{ animation: 'slideToast 0.3s ease' }}
      >
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🔔</div>
          <div className="text-lg font-bold text-foreground">Terugbellen!</div>
          <div className="text-[13px] text-muted-foreground mt-1">Geplande callback is nu</div>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 mb-4 border border-border">
          <div className="font-semibold text-[14px] text-foreground">{popup.contactName}</div>
          <div className="text-[12px] text-muted-foreground mt-0.5">{popup.companyName}</div>
          <div className="text-[11px] text-muted-foreground mt-1">📅 {popup.date} om {popup.time}</div>
          {popup.note && (
            <div className="text-[11px] text-muted-foreground mt-1.5 italic">"{popup.note}"</div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-xl border border-border bg-muted text-muted-foreground text-[12px] font-semibold hover:bg-muted/80 active:scale-[0.97] transition-all"
          >
            Later
          </button>
          <button
            onClick={() => onCall(popup.id)}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[12px] font-semibold hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm"
          >
            📞 Nu bellen
          </button>
        </div>
      </div>
    </div>
  );
}
