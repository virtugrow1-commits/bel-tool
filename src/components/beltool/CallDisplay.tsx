/**
 * CallDisplay — Floating call widget with:
 *  • Live call timer
 *  • DTMF keypad
 *  • Mute / Hold controls
 *  • Script cheatsheet overlay (visible during active call)
 *  • Voys status polling to auto-detect when call becomes active
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, Hash, X, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompanyContact, Company, CallState } from '@/types/beltool';
import { supabase } from '@/integrations/supabase/client';

function formatDuration(seconds: number) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

const DTMF_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

// Script topics visible during an active call
const CALL_TOPICS = [
  { icon: '⏱️', label: 'Tijdverlies',  text: 'Hoeveel uur per week gaat er verloren aan handmatig werk?' },
  { icon: '🔄', label: 'Taken',         text: 'Welke taken kosten de meeste tijd? Administratie, planning, communicatie?' },
  { icon: '📈', label: 'Groeifase',     text: 'Bent u actief aan het groeien of wilt u eerst intern orde op zaken stellen?' },
  { icon: '🤖', label: 'AI status',     text: 'Heeft u al stappen gezet met AI of automatisering?' },
  { icon: '📅', label: 'Afspraak',      text: 'Ik heb nog een slot beschikbaar op [dag]. Werkt dat voor u?' },
  { icon: '📩', label: 'Voicemail',     text: 'U spreekt met [naam] van CliqMakers. Wij doen onderzoek naar tijdverlies in het MKB. Graag terugbellen of ik probeer het later nog eens.' },
];

// Bezwaren cheatsheet
const QUICK_OBJECTIONS = [
  { trigger: 'Geen tijd',        answer: 'Juist daarom bel ik — mag ik 60 sec uitleggen hoe we 8u/week terugwinnen?' },
  { trigger: 'Stuur mail',       answer: 'Doe ik graag. Eén vraag eerst: waar verliest u nu de meeste tijd?' },
  { trigger: 'Al een partij',    answer: 'Automatiseren ze ook uw interne processen of alleen marketing?' },
  { trigger: 'Niet interessant', answer: 'Mag ik vragen wat de reden is? Dan noteer ik uw voorkeur en laat u met rust.' },
  { trigger: 'Te duur',         answer: 'We beginnen altijd met een gratis 15-minuten adviesgesprek. Geen verplichtingen.' },
];

interface CallDisplayProps {
  callState:          CallState;
  contact:            CompanyContact;
  company:            Company;
  onHangup:           () => void;
  onConfirmConnected?: () => void;
  activeCallId?:      string | null;
  organizationId?:    string;
  onElapsedChange?:   (seconds: number) => void;
}

export function CallDisplay({ callState, contact, company, onHangup, onConfirmConnected, activeCallId, organizationId, onElapsedChange }: CallDisplayProps) {
  const [elapsed,     setElapsed]     = useState(0);
  const [muted,       setMuted]       = useState(false);
  const [held,        setHeld]        = useState(false);
  const [showKeypad,  setShowKeypad]  = useState(false);
  const [showScript,  setShowScript]  = useState(false);
  const [dtmfInput,   setDtmfInput]   = useState('');
  const [scriptTab,   setScriptTab]   = useState<'tips' | 'bezwaren'>('tips');
  const startRef      = useRef<number | null>(null);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'active') {
      if (!startRef.current) startRef.current = Date.now();
      const iv = setInterval(() => {
        const secs = Math.floor((Date.now() - (startRef.current || Date.now())) / 1000);
        setElapsed(secs);
        onElapsedChange?.(secs);
      }, 1000);
      return () => clearInterval(iv);
    } else if (callState === 'idle' || callState === 'ended') {
      startRef.current = null;
      setElapsed(0);
    }
  }, [callState]);

  // ── Voys status polling — auto-confirm when Voys reports call active ───────
  const pollVoysStatus = useCallback(async (callId: string) => {
    try {
      const { data } = await supabase.functions.invoke('voys-call', {
        body: { action: 'status', callId, ...(organizationId ? { organizationId } : {}) },
      });
      if (data?.status === 'connected' || data?.status === 'active') {
        onConfirmConnected?.();
      }
    } catch {
      // Silent fail — user can always confirm manually
    }
  }, [onConfirmConnected, organizationId]);

  useEffect(() => {
    if (callState === 'ringing' && activeCallId) {
      // Poll every 4s to detect when lead answers
      pollRef.current = setInterval(() => {
        pollVoysStatus(activeCallId);
      }, 4000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [callState, activeCallId, pollVoysStatus]);

  if (callState === 'idle' || callState === 'ended') return null;

  const isActive      = callState === 'active';
  const isConnecting  = callState === 'dialing' || callState === 'ringing';
  const contactName   = `${contact.firstName} ${contact.lastName}`;
  const initials      = `${contact.firstName[0] || ''}${contact.lastName[0] || ''}`;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] animate-in slide-in-from-bottom-4 duration-300">
      <div className={cn(
        'rounded-2xl border shadow-xl overflow-hidden bg-card',
        isActive ? 'border-success/25' : 'border-warning/25',
      )}>
        {/* Status bar */}
        <div className={cn(
          'h-1 transition-colors',
          isActive ? 'bg-success' : 'bg-warning',
          isConnecting && 'animate-pulse',
        )} />

        {/* Contact info */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <div className={cn(
            'w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
            isActive
              ? 'bg-success/15 text-success ring-2 ring-success/20'
              : 'bg-warning/15 text-warning ring-2 ring-warning/20',
          )}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-foreground truncate">{contactName}</div>
            <div className="text-[11px] text-muted-foreground truncate">{company.name}</div>
            <div className="text-[11px] text-muted-foreground/60 tabular-nums font-mono">{contact.phone}</div>
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

        {/* DTMF input display */}
        {dtmfInput && (
          <div className="mx-4 mb-1 px-3 py-1.5 rounded-lg bg-muted border border-border font-mono text-sm text-center tracking-widest">
            {dtmfInput}
          </div>
        )}

        {/* Script overlay */}
        {showScript && isActive && (
          <div className="mx-3 mb-2 rounded-xl bg-muted/60 border border-border overflow-hidden">
            {/* Tab headers */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setScriptTab('tips')}
                className={cn(
                  'flex-1 py-1.5 text-[11px] font-semibold transition-colors',
                  scriptTab === 'tips' ? 'text-primary bg-primary/5' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                📋 Script tips
              </button>
              <button
                onClick={() => setScriptTab('bezwaren')}
                className={cn(
                  'flex-1 py-1.5 text-[11px] font-semibold transition-colors',
                  scriptTab === 'bezwaren' ? 'text-destructive bg-destructive/5' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                🛡️ Bezwaren
              </button>
            </div>

            {scriptTab === 'tips' ? (
              <div className="divide-y divide-border/40 max-h-[200px] overflow-y-auto">
                {CALL_TOPICS.map(t => (
                  <div key={t.label} className="px-3 py-2 flex gap-2.5 items-start">
                    <span className="text-[14px] shrink-0 mt-0.5">{t.icon}</span>
                    <div>
                      <div className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">{t.label}</div>
                      <div className="text-[11px] text-foreground/80 leading-relaxed italic">{t.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border/40 max-h-[200px] overflow-y-auto">
                {QUICK_OBJECTIONS.map(o => (
                  <div key={o.trigger} className="px-3 py-2">
                    <div className="text-[10px] font-bold text-destructive/70 uppercase tracking-wider mb-0.5">{o.trigger}</div>
                    <div className="text-[11px] text-foreground/80 italic leading-relaxed">"{o.answer}"</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DTMF keypad */}
        {showKeypad && (
          <div className="px-4 pb-3">
            <div className="grid grid-cols-3 gap-1">
              {DTMF_KEYS.flat().map(k => (
                <button
                  key={k}
                  onClick={() => setDtmfInput(prev => prev + k)}
                  className="py-2 rounded-lg bg-muted text-foreground font-bold text-sm hover:bg-muted/80 transition-colors active:scale-95"
                >
                  {k}
                </button>
              ))}
            </div>
            {dtmfInput && (
              <button
                onClick={() => setDtmfInput('')}
                className="mt-1.5 w-full py-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Wis invoer
              </button>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
          {/* Confirm connected (ringing only) */}
          {isConnecting && onConfirmConnected && (
            <button
              onClick={onConfirmConnected}
              className="flex-1 py-2 rounded-xl bg-success text-white text-[11px] font-bold hover:bg-success/90 active:scale-[0.97] transition-all"
            >
              ✓ Verbonden
            </button>
          )}

          {/* Active call controls */}
          {isActive && (
            <>
              <button
                onClick={() => setMuted(m => !m)}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90',
                  muted ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
                title={muted ? 'Dempen uit' : 'Dempen'}
              >
                {muted ? <MicOff size={15} /> : <Mic size={15} />}
              </button>

              <button
                onClick={() => setHeld(h => !h)}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90',
                  held ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
                title={held ? 'Wacht uit' : 'In de wacht'}
              >
                {held ? <Play size={15} /> : <Pause size={15} />}
              </button>

              <button
                onClick={() => { setShowKeypad(k => !k); setShowScript(false); }}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90',
                  showKeypad ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
                title="Toetsenblok"
              >
                <Hash size={15} />
              </button>

              <button
                onClick={() => { setShowScript(s => !s); setShowKeypad(false); }}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90',
                  showScript ? 'bg-info/15 text-info' : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
                title="Script cheatsheet"
              >
                <BookOpen size={15} />
              </button>
            </>
          )}

          {/* Hangup */}
          <button
            onClick={onHangup}
            className="ml-auto w-10 h-10 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 active:scale-90 transition-all shadow-sm"
            title="Ophangen"
          >
            <PhoneOff size={16} />
          </button>
        </div>

        {/* Muted / Held indicators */}
        {(muted || held) && (
          <div className="px-4 pb-2 flex gap-2">
            {muted && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">GEDEMPT</span>}
            {held  && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning">IN DE WACHT</span>}
          </div>
        )}
      </div>
    </div>
  );
}
