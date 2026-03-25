/**
 * useScoring — Session scores with Supabase persistence for the leaderboard.
 *
 * Local state drives instant UI updates. After each score event we upsert into
 * user_scores so the leaderboard works cross-device and survives browser clears.
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { store } from '@/lib/beltool-store';
import { initScores, fmtTime, type Scores } from '@/lib/beltool-scoring';
import { USERS } from '@/lib/beltool-data';
import type { User } from '@/lib/beltool-data';

const TODAY = new Date().toISOString().split('T')[0];

async function upsertDayScore(userId: string, scores: Scores) {
  try {
    const { error } = await (supabase as any)
      .from('user_scores')
      .upsert({
        user_id:    userId,
        score_date: TODAY,
        gebeld:     scores.gebeld,
        enquetes:   scores.enquetes,
        afspraken:  scores.afspraken,
        verstuurd:  scores.verstuurd,
        afgevallen: scores.afgevallen,
        geen_gehoor: scores.geenGehoor,
        callbacks:  scores.callbacks,
        best_reeks: scores.bestReeks,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,score_date' });

    if (error) throw error;
  } catch (err) {
    // Non-fatal — local state is source of truth during the session
    console.warn('[Scoring] Supabase upsert failed:', err);
  }
}

export function useScoring(user: User | null, organizationId?: string) {
  const [allScores, setAllScores] = useState<Record<string, Scores>>(() => {
    const s = store.get<Record<string, Scores>>('scores', {});
    USERS.forEach(u => { if (!s[u.id]) s[u.id] = initScores(); });
    return s;
  });

  const contactRef = useRef({ name: '', contactId: '', companyId: '' });

  const setContactInfo = useCallback((name: string, contactId: string | null, companyId: string | null) => {
    contactRef.current = { name, contactId: contactId || '', companyId: companyId || '' };
  }, []);

  const scores = user ? (allScores[user.id] || initScores()) : initScores();
  const convRate = scores.gebeld > 0
    ? Math.round(((scores.enquetes + scores.afspraken) / scores.gebeld) * 100)
    : 0;

  const addScore = useCallback((type: string) => {
    if (!user) return;
    const { name, contactId, companyId } = contactRef.current;

    setAllScores(prev => {
      const p    = prev[user.id] || initScores();
      const s    = { ...p };

      switch (type) {
        case 'gebeld':     s.gebeld     = p.gebeld + 1; break;
        case 'enquete':    s.enquetes   = p.enquetes + 1; s.reeks = p.reeks + 1; break;
        case 'afspraak':   s.afspraken  = p.afspraken + 1; s.reeks = p.reeks + 1; break;
        case 'verstuurd':  s.verstuurd  = p.verstuurd + 1; s.reeks = p.reeks + 1; break;
        case 'afgevallen': s.afgevallen = p.afgevallen + 1; s.reeks = 0; break;
        case 'geenGehoor': s.geenGehoor = p.geenGehoor + 1; break;
        case 'callback':   s.callbacks  = (p.callbacks || 0) + 1; s.reeks = p.reeks + 1; break;
        case 'anderMoment':                                break; // no score change
      }

      if (s.reeks > p.bestReeks) s.bestReeks = s.reeks;

      s.log = [
        {
          time:      fmtTime(),
          contact:   name,
          result:    type,
          contactId: contactId || undefined,
          companyId: companyId || undefined,
        },
        ...(p.log || []),
      ].slice(0, 50);

      const next = { ...prev, [user.id]: s };
      store.set('scores', next);

      // Async Supabase sync (fire and forget)
      upsertDayScore(user.id, s);

      return next;
    });
  }, [user]);

  return {
    scores,
    convRate,
    addScore,
    allScores,
    setAllScores,
    setContactInfo,
  };
}
