import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@/lib/beltool-data';
import { store } from '@/lib/beltool-store';

interface AuthState {
  user: User | null;
  loading: boolean;
}

/**
 * Fetches GHL users via the ghl-proxy edge function.
 * Optionally pass organizationId to use org-specific GHL keys.
 */
async function fetchGhlUsers(organizationId?: string): Promise<any[]> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `https://${projectId}.supabase.co/functions/v1/ghl-proxy`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ action: 'getUsers', ...(organizationId ? { organizationId } : {}) }),
  });

  if (!res.ok) throw new Error(`GHL users fetch failed: ${res.status}`);
  const data = await res.json();
  // GHL returns { users: [...] } or just an array
  return data?.users || data || [];
}

/**
 * Upserts a GHL user into the profiles table so the rest of the app can use it.
 */
async function syncProfileToDb(ghlUser: any): Promise<User> {
  const name = [ghlUser.firstName, ghlUser.lastName].filter(Boolean).join(' ') || ghlUser.name || ghlUser.email;
  const email = ghlUser.email || '';
  const avatar = name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() || 'U';
  const role = (ghlUser.role || 'caller').toLowerCase().includes('admin') ? 'admin' as const : 'caller' as const;

  const profile: User = {
    id: ghlUser.id,
    name,
    email,
    role,
    avatar,
    deviceId: ghlUser.phone || '',
  };

  // Upsert into profiles table
  try {
    await (supabase as any).from('profiles').upsert({
      id: ghlUser.id,
      name,
      email,
      role: profile.role,
      avatar,
      device_id: profile.deviceId,
    }, { onConflict: 'id' });
  } catch (e) {
    console.warn('[Auth] Profile sync failed:', e);
  }

  return profile;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: store.get('user', null),
    loading: false,
  });

  const login = useCallback(async (email: string, _password: string): Promise<{ error?: string }> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      // Fetch all GHL users for the default org
      const ghlUsers = await fetchGhlUsers();

      // Find matching user by email (case-insensitive)
      const match = ghlUsers.find((u: any) => {
        const ghlEmail = (u.email || '').toLowerCase();
        return ghlEmail === email.toLowerCase().trim();
      });

      if (!match) {
        setState(prev => ({ ...prev, loading: false }));
        return { error: 'Je account is niet gevonden in GHL. Neem contact op met de beheerder.' };
      }

      // Sync to profiles and set as current user
      const user = await syncProfileToDb(match);
      store.set('user', user);
      setState({ user, loading: false });
      return {};
    } catch (err) {
      console.error('[Auth] Login error:', err);
      setState(prev => ({ ...prev, loading: false }));
      return { error: 'Kon geen verbinding maken met GHL. Probeer het later opnieuw.' };
    }
  }, []);

  const logout = useCallback(async () => {
    store.del('user');
    setState({ user: null, loading: false });
  }, []);

  const resetPassword = useCallback(async (_email: string): Promise<{ error?: string }> => {
    return { error: 'Wachtwoord-reset is niet beschikbaar. Je account wordt beheerd via GHL.' };
  }, []);

  return {
    user: state.user,
    session: null,
    loading: state.loading,
    authMode: 'ghl' as const,
    login,
    logout,
    resetPassword,
  };
}
