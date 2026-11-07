import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { USERS, type User } from '@/lib/beltool-data';
import { useAuth } from '@/hooks/useAuth';
import { invokeAuthenticated } from '@/lib/authenticated-functions';

/**
 * Fetches team profiles from Supabase.
 * Falls back to hardcoded USERS if the profiles table is empty or unavailable.
 */
export function useTeamProfiles(organizationId?: string) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    if (!user) { setProfiles([]); setLoading(false); return; }
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('profiles')
        .select('*')
        .order('name');

      // Filter by organization if provided
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      const { data: roles } = await supabase.from('user_roles').select('profile_id,role');

      if (error) {
        console.warn('[TeamProfiles] Fetch failed:', error.message);
        setProfiles([]);
      } else {
        setProfiles((data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          role: (roles?.find(r => r.profile_id === row.id)?.role || 'caller') as User['role'],
          avatar: row.avatar,
          deviceId: row.device_id || '',
          voipzekerExtension: row.voipzeker_extension || '',
          organizationId: row.organization_id || undefined,
          organizationName: row.organizations?.name || undefined,
        })));
      }
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, user]);

  useEffect(() => {
    void fetchProfiles();
  }, [fetchProfiles]);

  const createProfile = useCallback(async (input: {
    name: string; email: string; role: User['role']; avatar?: string;
    voipzekerExtension?: string; organizationId?: string;
  }) => {
    const { data, error } = await invokeAuthenticated('team-admin', { body: { action:'invite', ...input, organizationId: input.organizationId || organizationId } });
    if (error || data?.error) throw new Error(data?.error || 'Uitnodiging versturen mislukt');
    await fetchProfiles();
  }, [fetchProfiles, organizationId]);

  const updateProfile = useCallback(async (id: string, input: Partial<{
    name: string; email: string; role: User['role']; avatar: string; voipzekerExtension: string;
  }>) => {
    const { data, error } = await invokeAuthenticated('team-admin', { body: { action:'update', profileId:id, ...input } });
    if (error || data?.error) throw new Error(data?.error || 'Medewerker opslaan mislukt');
    await fetchProfiles();
  }, [fetchProfiles]);

  return { profiles, loading, refresh: fetchProfiles, createProfile, updateProfile };
}
