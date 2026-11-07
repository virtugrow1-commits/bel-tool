import { useState, useEffect } from 'react';
import { cliq } from '@/lib/beltool-ghl';
import { ADVISORS, type Advisor } from '@/lib/beltool-data';

/**
 * Loads advisors from GHL users, falls back to hardcoded ADVISORS.
 * Caches the result in localStorage to avoid repeated API calls.
 */
export function useAdvisors(organizationId?: string) {
  // Advisors come from the organization's CLIQ users (shared for everyone in the org).
  const [advisors, setAdvisors] = useState<Advisor[]>(ADVISORS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        if (!organizationId) return;
        const data = await cliq.getUsers(organizationId);
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
          }
        }
      } catch {
        // GHL not available — keep using cached or hardcoded advisors
      }
      if (mounted) setLoading(false);
    };

    load();
    return () => { mounted = false; };
  }, [organizationId]);

  const refresh = async () => {
    setLoading(true);
    try {
      if (!organizationId) return;
      const data = await cliq.getUsers(organizationId);
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
      }
    } catch {
      // Keep existing
    }
    setLoading(false);
  };

  return { advisors, loading, refresh };
}
