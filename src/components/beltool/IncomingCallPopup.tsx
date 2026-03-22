import type { IncomingCallInfo } from '@/hooks/useIncomingCalls';

interface IncomingCallPopupProps {
  call: IncomingCallInfo | null;
  onAnswer: () => void;
  onDismiss: () => void;
}

export function IncomingCallPopup({ call, onAnswer, onDismiss }: IncomingCallPopupProps) {
  if (!call) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30"
      style={{ animation: 'fadeIn 0.15s ease', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl p-6 w-[360px]"
        style={{ animation: 'incomingRing 0.5s ease infinite alternate' }}
      >
        <div className="text-center mb-4">
          <div className="text-5xl mb-3" style={{ animation: 'phoneShake 0.4s ease infinite' }}>📱</div>
          <div className="text-lg font-bold text-foreground">Inkomend gesprek</div>
          <div className="text-[13px] text-muted-foreground mt-1">
            {call.contactName ? 'Lead belt terug!' : 'Onbekend nummer'}
          </div>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 mb-4 border border-border">
          {call.contactName ? (
            <>
              <div className="font-bold text-[16px] text-foreground">{call.contactName}</div>
              <div className="text-[13px] text-muted-foreground mt-0.5">{call.companyName}</div>
            </>
          ) : (
            <div className="font-bold text-[16px] text-foreground">Onbekend contact</div>
          )}
          <div className="text-[13px] text-primary mt-2 font-mono">{call.callerNumber}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[13px] font-semibold hover:bg-destructive/20 active:scale-[0.97] transition-all"
          >
            ✕ Weigeren
          </button>
          <button
            onClick={onAnswer}
            className="flex-1 py-3 rounded-xl bg-success text-white text-[13px] font-semibold hover:bg-success/90 active:scale-[0.97] transition-all shadow-sm"
            style={{ animation: 'pulse 1.5s ease infinite' }}
          >
            📞 Opnemen
          </button>
        </div>
      </div>
    </div>
  );
}
