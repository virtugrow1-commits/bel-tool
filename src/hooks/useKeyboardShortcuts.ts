import { useEffect, useCallback, useRef, useState } from 'react';
import type { CallPhase, CallState, CompanyContact } from '@/types/beltool';

interface ShortcutConfig {
  phase: CallPhase;
  callState: CallState;
  activeContact: CompanyContact | null;
  onStartCall: () => void;
  onHangup: () => void;
  onFocusNotes: () => void;
}

interface ShortcutDef {
  key: string;
  label: string;
  description: string;
  when: string;
}

export const SHORTCUTS: ShortcutDef[] = [
  { key: 'Space', label: '␣', description: 'Start gesprek', when: 'Bij geselecteerd contact' },
  { key: 'Escape', label: 'Esc', description: 'Ophangen', when: 'Tijdens gesprek' },
  { key: 'N', label: 'N', description: 'Focus notities', when: 'Tijdens gesprek' },
  { key: '?', label: '?', description: 'Shortcuts tonen', when: 'Altijd' },
];

export function useKeyboardShortcuts(config: ShortcutConfig) {
  const { phase, callState, activeContact, onStartCall, onHangup, onFocusNotes } = config;
  const [showHelp, setShowHelp] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const callButtonRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // ? = show help
    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setShowHelp(prev => !prev);
      return;
    }

    // Space = start call
    if (e.code === 'Space' && phase === 'precall' && activeContact && callState === 'idle') {
      e.preventDefault();
      if (callButtonRef.current) {
        callButtonRef.current.click();
      } else {
        onStartCall();
      }
    }

    // Escape = hang up
    if (e.code === 'Escape') {
      if (showHelp) {
        setShowHelp(false);
        return;
      }
      if (callState !== 'idle' && callState !== 'ended') {
        e.preventDefault();
        onHangup();
      }
    }

    // N = focus notes
    if (e.code === 'KeyN' && !e.ctrlKey && !e.metaKey && phase !== 'idle') {
      e.preventDefault();
      if (notesRef.current) {
        notesRef.current.focus();
      } else {
        onFocusNotes();
      }
    }
  }, [phase, callState, activeContact, onStartCall, onHangup, onFocusNotes, showHelp]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    showHelp,
    setShowHelp,
    notesRef,
    callButtonRef,
  };
}
