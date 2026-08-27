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
  }, [organizationId]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const createProfile = useCallback(async (input: {
    name: string; email: string; role: User['role']; avatar?: string;
    voipzekerExtension?: string; organizationId?: string;
  }) => {
    const { error } = await (supabase as any).from('profiles').insert({
      name: input.name,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      avatar: input.avatar || input.name.slice(0, 2).toUpperCase(),
      voipzeker_extension: input.voipzekerExtension || null,
      organization_id: input.organizationId || organizationId || null,
    });
    if (error) throw new Error(error.message);
    await fetchProfiles();
  }, [fetchProfiles, organizationId]);

  const updateProfile = useCallback(async (id: string, input: Partial<{
    name: string; email: string; role: User['role']; avatar: string; voipzekerExtension: string;
  }>) => {
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.email !== undefined) payload.email = input.email.trim().toLowerCase();
    if (input.role !== undefined) payload.role = input.role;
    if (input.avatar !== undefined) payload.avatar = input.avatar;
    if (input.voipzekerExtension !== undefined) payload.voipzeker_extension = input.voipzekerExtension || null;
    const { error } = await (supabase as any).from('profiles').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
    await fetchProfiles();
  }, [fetchProfiles]);

  return { profiles, loading, refresh: fetchProfiles, createProfile, updateProfile };
}
