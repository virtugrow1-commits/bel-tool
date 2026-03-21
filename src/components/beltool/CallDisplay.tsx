import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, PhoneForwarded, Mic, MicOff, Pause, Play, Hash, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompanyContact, Company, CallState } from '@/types/beltool';

interface CallDisplayProps {
  callState: CallState;
  contact: CompanyContact;
  company: Company;
  onHangup: () => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const DTMF_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

export function CallDisplay({ callState, contact, company, onHangup }: CallDisplayProps) {
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [dtmfInput, setDtmfInput] = useState('');
  const startRef = useRef<number | null>(null);

  // Timer
  useEffect(() => {
    if (callState === 'active') {
      if (!startRef.current) startRef.current = Date.now();
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startRef.current || Date.now())) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else if (callState === 'idle' || callState === 'ended') {
      startRef.current = null;
      setElapsed(0);
    }
  }, [callState]);

  if (callState === 'idle' || callState === 'ended') return null;

  const isActive = callState === 'active';
  const isConnecting = callState === 'dialing' || callState === 'ringing';
  const contactName = `${contact.firstName} ${contact.lastName}`;
  const initials = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[320px] animate-in slide-in-from-bottom-4 duration-300">
      <div className={cn(
        'rounded-2xl border shadow-2xl overflow-hidden transition-colors duration-300',
        isActive ? 'bg-card border-success/20 shadow-success/5' : 'bg-card border-warning/20 shadow-warning/5'
      )}>
        {/* Header pulse bar */}
        <div className={cn(
          'h-1 transition-colors',
          isActive ? 'bg-success' : 'bg-warning',
          isConnecting && 'animate-pulse'
        )} />

        {/* Contact info */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <div className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all',
            isActive
              ? 'bg-success/15 text-success ring-2 ring-success/20'
              : 'bg-warning/15 text-warning ring-2 ring-warning/20'
          )}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-foreground truncate">{contactName}</div>
            <div className="text-[11px] text-muted-foreground truncate">{company.name}</div>
            <div className="text-[11px] text-muted-foreground/60 tabular-nums">{contact.phone}</div>
          </div>
          <div className="text-right">
            {isActive ? (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-bold text-success tabular-nums">{formatDuration(elapsed)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                <span className="text-xs font-semibold text-warning">
                  {callState === 'dialing' ? 'Verbinden...' : 'Gaat over...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* DTMF display */}
        {dtmfInput && (
          <div className="mx-4 mb-1 px-3 py-1.5 rounded-lg bg-foreground/[0.04] border border-border/40 flex items-center justify-between">
            <span className="text-sm font-mono font-bold text-foreground tracking-widest">{dtmfInput}</span>
            <button onClick={() => setDtmfInput('')} className="p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors">
              <X size={12} />
            </button>
          </div>
        )}

        {/* DTMF Keypad */}
        {showKeypad && (
          <div className="px-4 pb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="grid grid-cols-3 gap-1.5">
              {DTMF_KEYS.flat().map(key => (
                <button
                  key={key}
                  onClick={() => setDtmfInput(prev => prev + key)}
                  className="h-11 rounded-lg bg-foreground/[0.05] hover:bg-foreground/[0.1] active:scale-95 text-foreground font-bold text-base transition-all duration-100"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-4 pb-4 pt-1">
          {isActive ? (
            <div className="flex items-center justify-center gap-2">
              {/* Mute */}
              <button
                onClick={() => setMuted(!muted)}
                title={muted ? 'Unmute' : 'Mute'}
                className={cn(
                  'w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95',
                  muted
                    ? 'bg-destructive/15 text-destructive border border-destructive/20'
                    : 'bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] border border-transparent'
                )}
              >
                {muted ? <MicOff size={17} /> : <Mic size={17} />}
              </button>

              {/* Hold */}
              <button
                onClick={() => setHeld(!held)}
                title={held ? 'Hervatten' : 'Pauze'}
                className={cn(
                  'w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95',
                  held
                    ? 'bg-warning/15 text-warning border border-warning/20'
                    : 'bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] border border-transparent'
                )}
              >
                {held ? <Play size={17} /> : <Pause size={17} />}
              </button>

              {/* Keypad toggle */}
              <button
                onClick={() => setShowKeypad(!showKeypad)}
                title="Toetsen"
                className={cn(
                  'w-11 h-11 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95',
                  showKeypad
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] border border-transparent'
                )}
              >
                <Hash size={17} />
              </button>

              {/* Transfer */}
              <button
                onClick={() => {/* Transfer is handled on softphone */}}
                title="Doorschakelen"
                className="w-11 h-11 rounded-full flex items-center justify-center bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] transition-all duration-150 active:scale-95 border border-transparent"
              >
                <PhoneForwarded size={17} />
              </button>

              {/* Hang up */}
              <button
                onClick={onHangup}
                title="Ophangen"
                className="w-12 h-12 rounded-full flex items-center justify-center bg-destructive text-white hover:bg-destructive/90 transition-all duration-150 active:scale-95 shadow-lg shadow-destructive/20"
              >
                <PhoneOff size={19} />
              </button>
            </div>
          ) : (
            /* Connecting state — just show cancel */
            <div className="flex items-center justify-center">
              <button
                onClick={onHangup}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-destructive text-white text-sm font-semibold hover:bg-destructive/90 transition-all duration-150 active:scale-95 shadow-lg shadow-destructive/20"
              >
                <PhoneOff size={15} />
                Annuleren
              </button>
            </div>
          )}
        </div>

        {/* Status hints */}
        {(muted || held) && (
          <div className="px-4 pb-3 flex gap-2 justify-center">
            {muted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold">
                <MicOff size={10} /> Gedempt
              </span>
            )}
            {held && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-[10px] font-bold">
                <Pause size={10} /> In de wacht
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
