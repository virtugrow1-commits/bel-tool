import { useState, useCallback, useRef } from 'react';
import { store } from '@/lib/beltool-store';
import { initScores, fmtTime, type Scores } from '@/lib/beltool-scoring';
import { USERS } from '@/lib/beltool-data';
import type { User } from '@/lib/beltool-data';

export function useScoring(user: User | null) {
  const [allScores, setAllScores] = useState<Record<string, Scores>>(() => {
    const s = store.get<Record<string, Scores>>('scores', {});
    USERS.forEach(u => { if (!s[u.id]) s[u.id] = initScores(); });
    return s;
  });

  // Use refs for values that change frequently but shouldn't trigger re-renders of addScore
  const contactRef = useRef({ name: '', contactId: '', companyId: '' });

  const setContactInfo = useCallback((name: string, contactId: string | null, companyId: string | null) => {
    contactRef.current = {
      name,
      contactId: contactId || '',
      companyId: companyId || '',
    };
  }, []);

  const scores = user ? (allScores[user.id] || initScores()) : initScores();

  const addScore = useCallback((type: string) => {
    if (!user) return;
    const { name, contactId, companyId } = contactRef.current;

    setAllScores(prev => {
      const p = prev[user.id] || initScores();
      const s = { ...p };

      switch (type) {
        case 'gebeld':
          s.gebeld = p.gebeld + 1;
          break;
        case 'enquete':
          s.enquetes = p.enquetes + 1;
          s.reeks = p.reeks + 1;
          break;
        case 'afspraak':
          s.afspraken = p.afspraken + 1;
          s.reeks = p.reeks + 1;
          break;
        case 'verstuurd':
          s.verstuurd = p.verstuurd + 1;
          s.reeks = p.reeks + 1;
          break;
        case 'afgevallen':
          s.afgevallen = p.afgevallen + 1;
          s.reeks = 0;
          break;
        case 'geenGehoor':
          s.geenGehoor = p.geenGehoor + 1;
          break;
        case 'callback':
          s.callbacks = (p.callbacks || 0) + 1;
          s.reeks = p.reeks + 1;
          break;
      }

      if (s.reeks > p.bestReeks) s.bestReeks = s.reeks;

      s.log = [
        {
          time: fmtTime(),
          contact: name,
          result: type,
          contactId: contactId || undefined,
          companyId: companyId || undefined,
        },
        ...(p.log || []),
      ].slice(0, 50);

      const next = { ...prev, [user.id]: s };
      store.set('scores', next);
      return next;
    });
  }, [user]);

  const resetScores = useCallback((userId?: string) => {
    setAllScores(prev => {
      const next = { ...prev };
      if (userId) {
        next[userId] = initScores();
      } else {
        // Reset all
        Object.keys(next).forEach(k => { next[k] = initScores(); });
      }
      store.set('scores', next);
      return next;
    });
  }, []);

  const convRate = scores.gebeld > 0
    ? Math.round(((scores.enquetes + scores.afspraken) / scores.gebeld) * 100)
    : 0;

  return {
    allScores,
    setAllScores,
    scores,
    convRate,
    addScore,
    resetScores,
    setContactInfo,
  };
}
