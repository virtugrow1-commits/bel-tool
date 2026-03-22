import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { USERS, type User } from '@/lib/beltool-data';

/**
 * Fetches team profiles from Supabase.
 * Falls back to hardcoded USERS if the profiles table is empty or unavailable.
 */
export function useTeamProfiles() {
  const [profiles, setProfiles] = useState<User[]>(USERS);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (error) {
        console.warn('[TeamProfiles] Fetch failed, using fallback:', error.message);
        setProfiles(USERS);
      } else if (data && data.length > 0) {
        setProfiles(data.map(row => ({
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role as User['role'],
          avatar: row.avatar,
          deviceId: row.device_id || '',
        })));
      } else {
        // Empty profiles table — use fallback
        setProfiles(USERS);
      }
    } catch {
      setProfiles(USERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return { profiles, loading, refresh: fetchProfiles };
}
