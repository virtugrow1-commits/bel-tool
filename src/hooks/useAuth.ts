import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@/lib/beltool-data';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

/**
 * Maps a Supabase session + profile row into our app User type.
 * Falls back to auth metadata if profiles table isn't set up yet.
 */
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      // Table might not exist yet — that's OK, we fall back to metadata
      console.warn('[Auth] Profile fetch failed (table may not exist):', error.message);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  // Initialize: check for existing session
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session) {
        const profile = await fetchProfile(session.user.id);
        if (mounted) {
          setState({ user: sessionToUser(session, profile), session, loading: false });
        }
      } else {
        setState({ user: null, session: null, loading: false });
      }
    };

    init();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session) {
        const profile = await fetchProfile(session.user.id);
        if (mounted) {
          setState({ user: sessionToUser(session, profile), session, loading: false });
        }
      } else {
        setState({ user: null, session: null, loading: false });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    setState(prev => ({ ...prev, loading: true }));

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setState(prev => ({ ...prev, loading: false }));
      // Map common errors to Dutch
      if (error.message.includes('Invalid login')) {
        return { error: 'Ongeldig email of wachtwoord' };
      }
      if (error.message.includes('Email not confirmed')) {
        return { error: 'Email is nog niet bevestigd. Check je inbox.' };
      }
      return { error: error.message };
    }

    if (data.session) {
      const profile = await fetchProfile(data.session.user.id);
      setState({ user: sessionToUser(data.session, profile), session: data.session, loading: false });
    }

    return {};
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, session: null, loading: false });
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Pick<User, 'name' | 'role' | 'avatar' | 'deviceId'>>) => {
    if (!state.user) return;

    // Update profiles table
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
    if (updates.deviceId !== undefined) dbUpdates.device_id = updates.deviceId;

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', state.user.id);

    if (error) {
      console.warn('[Auth] Profile update failed:', error.message);
    }

    // Also update local state immediately
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updates } : null,
    }));
  }, [state.user]);

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    login,
    logout,
    resetPassword,
    updateProfile,
  };
}
