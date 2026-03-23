import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { USERS, type User } from '@/lib/beltool-data';
import { store } from '@/lib/beltool-store';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authMode: 'supabase' | 'local';
}

function sessionToUser(session: Session, profile?: Record<string, unknown> | null): User {
  const meta = session.user.user_metadata || {};
  return {
    id: session.user.id,
    name: (profile?.name as string) || (meta.name as string) || session.user.email?.split('@')[0] || 'User',
    email: session.user.email || '',
    role: ((profile?.role as string) || (meta.role as string) || 'caller') as User['role'],
    avatar: (profile?.avatar as string) || (meta.avatar as string) || (session.user.email?.substring(0, 2).toUpperCase() || 'U'),
    deviceId: (profile?.device_id as string) || (meta.deviceId as string) || '',
  };
}

async function fetchProfile(userId: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: store.get('user', null),
    session: null,
    loading: true,
    authMode: 'local', // Start with local, upgrade to supabase if available
  });

  // Try Supabase Auth first, fall back to local
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session) {
          const profile = await fetchProfile(session.user.id);
          if (mounted) {
            setState({ user: sessionToUser(session, profile), session, loading: false, authMode: 'supabase' });
            return;
          }
        }
      } catch {
        // Supabase not configured or unreachable — use local mode
      }

      // Fall back to locally stored user
      if (mounted) {
        const localUser = store.get<User | null>('user', null);
        setState({ user: localUser, session: null, loading: false, authMode: 'local' });
      }
    };

    init();

    // Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session) {
        const profile = await fetchProfile(session.user.id);
        if (mounted) {
          setState({ user: sessionToUser(session, profile), session, loading: false, authMode: 'supabase' });
        }
      } else if (state.authMode === 'supabase') {
        setState({ user: null, session: null, loading: false, authMode: 'supabase' });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    setState(prev => ({ ...prev, loading: true }));

    // Try Supabase Auth first
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (!error && data.session) {
        const profile = await fetchProfile(data.session.user.id);
        setState({ user: sessionToUser(data.session, profile), session: data.session, loading: false, authMode: 'supabase' });
        return {};
      }
    } catch {
      // Supabase unavailable — try local fallback
    }

    // Local fallback: check against managed users + DB profiles
    let allUsers: User[] = store.get('managedUsers', USERS);
    
    // Also try to fetch from profiles table for device_id etc.
    try {
      const { data: dbProfiles } = await (supabase as any)
        .from('profiles')
        .select('*')
        .order('name');
      if (dbProfiles && dbProfiles.length > 0) {
        allUsers = dbProfiles.map((row: any) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role as User['role'],
          avatar: row.avatar || row.name?.substring(0, 2).toUpperCase() || 'U',
          deviceId: row.device_id || '',
        }));
      }
    } catch {}

    const found = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (found) {
      store.set('user', found);
      setState({ user: found, session: null, loading: false, authMode: 'local' });
      return {};
    }

    setState(prev => ({ ...prev, loading: false }));
    return { error: 'Ongeldig email of wachtwoord. Probeer het opnieuw.' };
  }, []);

  const logout = useCallback(async () => {
    if (state.authMode === 'supabase') {
      await supabase.auth.signOut();
    }
    store.del('user');
    setState({ user: null, session: null, loading: false, authMode: state.authMode });
  }, [state.authMode]);

  const resetPassword = useCallback(async (email: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) return { error: error.message };
      return {};
    } catch {
      return { error: 'Wachtwoord-reset is niet beschikbaar. Neem contact op met de beheerder.' };
    }
  }, []);

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    authMode: state.authMode,
    login,
    logout,
    resetPassword,
  };
}
