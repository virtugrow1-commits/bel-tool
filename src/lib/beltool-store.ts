// Personal application caches never serve as identity or cross-tenant data.
let scope: string | null = null;
const personalKeys = new Set(['scores','leadCompanies','callbacks','callAttempts','appointments','managedUsers']);
export function setStoreScope(organizationId?: string) { scope = organizationId || null; }
function storageKey(key: string) { return personalKeys.has(key) ? (scope ? `cq_${scope}_${key}` : null) : 'cq_' + key; }
export const store = {
  get<T>(key: string, defaultVal: T): T {
    try {
      const resolved = storageKey(key);
      if (!resolved) return defaultVal;
      const v = localStorage.getItem(resolved);
      return v ? JSON.parse(v) : defaultVal;
    } catch {
      return defaultVal;
    }
  },
  set(key: string, value: unknown): void {
    try {
      const resolved = storageKey(key);
      if (resolved) localStorage.setItem(resolved, JSON.stringify(value));
    } catch {}
  },
  del(key: string): void {
    try {
      localStorage.removeItem('cq_' + key);
      const resolved = storageKey(key);
      if (resolved) localStorage.removeItem(resolved);
    } catch {}
  },
};
