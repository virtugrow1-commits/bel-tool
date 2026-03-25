import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Organization } from '@/lib/beltool-data';

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('*')
        .order('name');

      if (error) {
        console.warn('[Organizations] Fetch failed:', error.message);
      } else if (data) {
        setOrganizations(data.map((row: any) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          ghl_api_key: row.ghl_api_key,
          ghl_location_id: row.ghl_location_id,
          logo_url: row.logo_url,
        })));
      }
    } catch {
      console.warn('[Organizations] Fetch error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const createOrg = useCallback(async (org: { name: string; slug: string; ghl_api_key?: string; ghl_location_id?: string }) => {
    const { data, error } = await (supabase as any)
      .from('organizations')
      .insert(org)
      .select()
      .single();
    if (error) throw error;
    await fetchOrgs();
    return data;
  }, [fetchOrgs]);

  const updateOrg = useCallback(async (id: string, updates: Partial<Organization>) => {
    const { error } = await (supabase as any)
      .from('organizations')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    await fetchOrgs();
  }, [fetchOrgs]);

  return { organizations, loading, refresh: fetchOrgs, createOrg, updateOrg };
}
