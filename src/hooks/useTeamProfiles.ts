import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { USERS, type User } from '@/lib/beltool-data';

/**
 * Fetches team profiles from Supabase.
 * Falls back to hardcoded USERS if the profiles table is empty or unavailable.
 */
export function useTeamProfiles(organizationId?: string) {
  const [profiles, setProfiles] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('profiles')
        .select('*, organizations(name)')
        .order('name');

      // Filter by organization if provided
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[TeamProfiles] Fetch failed:', error.message);
        setProfiles([]);
      } else {
        setProfiles((data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role as User['role'],
          avatar: row.avatar,
          deviceId: row.device_id || '',
          organizationId: row.organization_id || undefined,
          organizationName: row.organizations?.name || undefined,
        })));
      }
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return { profiles, loading, refresh: fetchProfiles };
}
