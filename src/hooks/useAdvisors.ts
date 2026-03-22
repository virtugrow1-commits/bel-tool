import { useState, useEffect } from 'react';
import { cliq } from '@/lib/beltool-ghl';
import { ADVISORS, type Advisor } from '@/lib/beltool-data';
import { store } from '@/lib/beltool-store';

/**
 * Loads advisors from GHL users, falls back to hardcoded ADVISORS.
 * Caches the result in localStorage to avoid repeated API calls.
 */
export function useAdvisors() {
  const [advisors, setAdvisors] = useState<Advisor[]>(() => {
    const cached = store.get<Advisor[] | null>('ghlAdvisors', null);
    return cached && cached.length > 0 ? cached : ADVISORS;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const data = await cliq.getUsers();
        const users = data?.users || data?.Users || [];

        if (users.length > 0 && mounted) {
          const mapped: Advisor[] = users
            .filter((u: { name?: string; firstName?: string; role?: string; permissions?: { locationIds?: string[] } }) =>
              // Include users that have a name
              (u.name || u.firstName)
            )
            .map((u: { id: string; name?: string; firstName?: string; lastName?: string; email?: string; role?: string }) => ({
              id: u.id,
              name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
              specialty: u.role || u.email || '',
            }));

          if (mapped.length > 0) {
            setAdvisors(mapped);
            store.set('ghlAdvisors', mapped);
          }
        }
      } catch {
        // GHL not available — keep using cached or hardcoded advisors
      }
      if (mounted) setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await cliq.getUsers();
      const users = data?.users || data?.Users || [];

      const mapped: Advisor[] = users
        .filter((u: { name?: string; firstName?: string }) => u.name || u.firstName)
        .map((u: { id: string; name?: string; firstName?: string; lastName?: string; email?: string; role?: string }) => ({
          id: u.id,
          name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          specialty: u.role || u.email || '',
        }));

      if (mapped.length > 0) {
        setAdvisors(mapped);
        store.set('ghlAdvisors', mapped);
      }
    } catch {
      // Keep existing
    }
    setLoading(false);
  };

  return { advisors, loading, refresh };
}
