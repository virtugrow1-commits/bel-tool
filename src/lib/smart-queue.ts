/**
 * smart-queue.ts — Call attempt tracking with Supabase persistence.
 *
 * Attempts are stored in Supabase `call_attempts` table so the smart queue
 * sort works correctly across devices/sessions. Falls back to localStorage
 * when Supabase is unavailable.
 *
 * The in-memory cache (`_cache`) ensures O(1) lookups during sorting without
 * a database round-trip on every render.
 */
import type { Company } from '@/types/beltool';
import type { CallbackEntry } from '@/types/beltool';
import { store } from '@/lib/beltool-store';
import { supabase } from '@/integrations/supabase/client';

export interface CallAttempt {
  contactId:  string;
  companyId:  string;
  timestamp:  string;
  result:     string;
}

// ─── In-memory attempt count cache (loaded from Supabase on init) ─────────────
const _cache = new Map<string, number>(); // contactId → attempt count
let   _cacheReady = false;

/** Load attempt counts from Supabase into the in-memory cache. */
export async function loadAttemptCache(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Fall back to localStorage counts
      const local: CallAttempt[] = store.get('callAttempts', []);
      for (const a of local) {
        _cache.set(a.contactId, (_cache.get(a.contactId) || 0) + 1);
      }
      _cacheReady = true;
      return;
    }

    // Count attempts per contact from the last 90 days
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await (supabase as any)
      .from('call_attempts')
      .select('contact_id')
      .gte('attempted_at', since);

    if (error) throw error;

    for (const row of (data || [])) {
      const id = row.contact_id as string;
      _cache.set(id, (_cache.get(id) || 0) + 1);
    }
    _cacheReady = true;
  } catch (err) {
    console.warn('[SmartQueue] Cache load failed, using localStorage:', err);
    const local: CallAttempt[] = store.get('callAttempts', []);
    for (const a of local) {
      _cache.set(a.contactId, (_cache.get(a.contactId) || 0) + 1);
    }
    _cacheReady = true;
  }
}

export function getAttemptCount(contactId: string): number {
  return _cache.get(contactId) || 0;
}

/** Returns a lightweight last-attempt stub for display purposes */
export function getLastAttempt(contactId: string): { timestamp: string } | null {
  const count = _cache.get(contactId) || 0;
  if (count === 0) return null;
  // We don't store the exact timestamp in the cache — return a placeholder
  // The full history is in Supabase call_sessions
  return { timestamp: new Date().toISOString() };
}

export function getAttemptLabel(count: number): { text: string; color: string } {
  if (count === 0) return { text: 'Nieuw',        color: 'hsl(217 91% 60%)' };
  if (count === 1) return { text: '1e poging',    color: 'hsl(174 100% 38%)' };
  if (count === 2) return { text: '2e poging',    color: 'hsl(38 92% 50%)' };
  if (count === 3) return { text: '3e poging',    color: 'hsl(25 95% 53%)' };
  if (count >= 5)  return { text: `${count}x — parkeren`, color: 'hsl(0 84% 60%)' };
  return { text: `${count}e poging`, color: 'hsl(0 72% 51%)' };
}

export function shouldPark(contactId: string): boolean {
  return getAttemptCount(contactId) >= 5;
}

/**
 * Record a call attempt in Supabase (non-blocking) and update the in-memory cache.
 */
export async function recordAttempt(
  contactId: string,
  companyId: string,
  result: string,
  callerId?: string,
): Promise<void> {
  // Optimistic cache update
  _cache.set(contactId, (_cache.get(contactId) || 0) + 1);

  // Supabase insert (fire and forget)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await (supabase as any).from('call_attempts').insert({
        contact_id:   contactId,
        company_id:   companyId,
        result,
        caller_id:    callerId || session.user.id,
        attempted_at: new Date().toISOString(),
      });
      return;
    }
  } catch (err) {
    console.warn('[SmartQueue] Supabase insert failed:', err);
  }

  // localStorage fallback
  const all: CallAttempt[] = store.get('callAttempts', []);
  all.push({ contactId, companyId, timestamp: new Date().toISOString(), result });
  store.set('callAttempts', all.slice(-500));
}

const STAGE_PRIORITY: Record<string, number> = {
  terugbellenGepland: 1,
  bellen:             2,
  enqueteGestart:     3,
  enqueteVerstuurd:   4,
  terugbellen:        5,
  nieuw:              6,
  anderMoment:        7,
  geenGehoor:         8,
  afspraak:           9,
  enqueteTel:         10,
  nietInteressant:    11,
};

/**
 * Sort companies for the calling queue:
 *   1. Due callbacks first
 *   2. Then by pipeline stage priority
 *   3. Then by fewest attempt count (fresh leads first)
 */
export function smartSort(companies: Company[], callbacks: CallbackEntry[]): Company[] {
  const todayStr = new Date().toISOString().split('T')[0];
  const dueContactIds = new Set(
    callbacks
      .filter(cb => cb.status === 'scheduled' && cb.date <= todayStr)
      .map(cb => cb.contactId)
  );

  return [...companies].sort((a, b) => {
    const aHasDue = a.contacts.some(c => dueContactIds.has(c.id));
    const bHasDue = b.contacts.some(c => dueContactIds.has(c.id));
    if (aHasDue && !bHasDue) return -1;
    if (!aHasDue && bHasDue) return 1;

    const aPrio = STAGE_PRIORITY[a.stage] ?? 6;
    const bPrio = STAGE_PRIORITY[b.stage] ?? 6;
    if (aPrio !== bPrio) return aPrio - bPrio;

    const aAttempts = a.contacts.reduce((s, c) => s + getAttemptCount(c.id), 0);
    const bAttempts = b.contacts.reduce((s, c) => s + getAttemptCount(c.id), 0);
    return aAttempts - bAttempts;
  });
}
