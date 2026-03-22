import type { Company } from '@/types/beltool';
import type { CallbackEntry } from '@/types/beltool';
import { store } from '@/lib/beltool-store';

export interface CallAttempt {
  contactId: string;
  companyId: string;
  timestamp: string;
  result: string;
}

const STORE_KEY = 'callAttempts';
const MAX_ATTEMPTS = 5;

export function getAttempts(contactId: string): CallAttempt[] {
  const all: CallAttempt[] = store.get(STORE_KEY, []);
  return all.filter(a => a.contactId === contactId);
}

export function getAttemptCount(contactId: string): number {
  return getAttempts(contactId).length;
}

export function getLastAttempt(contactId: string): CallAttempt | null {
  const attempts = getAttempts(contactId);
  return attempts.length > 0 ? attempts[attempts.length - 1] : null;
}

export function recordAttempt(contactId: string, companyId: string, result: string) {
  const all: CallAttempt[] = store.get(STORE_KEY, []);
  all.push({
    contactId,
    companyId,
    timestamp: new Date().toISOString(),
    result,
  });
  // Keep last 500 attempts max
  store.set(STORE_KEY, all.slice(-500));
}

export function shouldPark(contactId: string): boolean {
  return getAttemptCount(contactId) >= MAX_ATTEMPTS;
}

export function getAttemptLabel(count: number): { text: string; color: string } {
  if (count === 0) return { text: 'Nieuw', color: 'hsl(217 91% 60%)' };
  if (count === 1) return { text: '1e poging', color: 'hsl(174 100% 38%)' };
  if (count === 2) return { text: '2e poging', color: 'hsl(38 92% 50%)' };
  if (count === 3) return { text: '3e poging', color: 'hsl(25 95% 53%)' };
  if (count >= MAX_ATTEMPTS) return { text: `${count}x — parkeren`, color: 'hsl(0 84% 60%)' };
  return { text: `${count}e poging`, color: 'hsl(0 72% 51%)' };
}

/**
 * Smart queue: sort companies by priority.
 * Order: due callbacks > warm leads (enquête gestart/verstuurd) > new leads > parked
 */
export function smartSort(
  companies: Company[],
  callbacks: CallbackEntry[],
): Company[] {
  const todayStr = new Date().toISOString().split('T')[0];
  const dueCallbackContactIds = new Set(
    callbacks
      .filter(cb => cb.status === 'scheduled' && cb.date <= todayStr)
      .map(cb => cb.contactId)
  );

  const STAGE_PRIORITY: Record<string, number> = {
    terugbellenGepland: 1,
    bellen: 2,
    enqueteGestart: 3,
    enqueteVerstuurd: 4,
    terugbellen: 5,
    nieuw: 6,
    anderMoment: 7,
    geenGehoor: 8,
    afspraak: 9,
    enqueteTel: 10,
    nietInteressant: 11,
  };

  return [...companies].sort((a, b) => {
    // Due callbacks always first
    const aHasDue = a.contacts.some(c => dueCallbackContactIds.has(c.id));
    const bHasDue = b.contacts.some(c => dueCallbackContactIds.has(c.id));
    if (aHasDue && !bHasDue) return -1;
    if (!aHasDue && bHasDue) return 1;

    // Then by stage priority
    const aPrio = STAGE_PRIORITY[a.stage] ?? 6;
    const bPrio = STAGE_PRIORITY[b.stage] ?? 6;
    if (aPrio !== bPrio) return aPrio - bPrio;

    // Then by fewest attempts (fresh leads first)
    const aAttempts = a.contacts.reduce((sum, c) => sum + getAttemptCount(c.id), 0);
    const bAttempts = b.contacts.reduce((sum, c) => sum + getAttemptCount(c.id), 0);
    return aAttempts - bAttempts;
  });
}
