import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@/lib/beltool-data';
import { store, setStoreScope } from '@/lib/beltool-store';
import { setFunctionSession } from '@/lib/authenticated-functions';

export const AUTH_LOAD_TIMEOUT_MS = 8_000;
type AuthValue = {
  user: User | null; session: Session | null; loading: boolean; authMode: 'email';
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
};
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const bootstrapExpired = useRef(false);
  const loadStartedAt = useRef(Date.now());
  const profileRequests = useRef(new Map<string, Promise<User | null>>());

  // Session identity is only a query key. Protected profile/role RLS and edge
  // functions continue to validate the JWT; cached objects grant no access.
  const resolveProfile = useCallback((identityId: string) => {
    const pending = profileRequests.current.get(identityId);
    if (pending) return pending;
    const request = (async (): Promise<User | null> => {
      const [{ data: profile, error }, { data: grant, error: roleError }] = await Promise.all([
        supabase.from('profiles').select('*').eq('auth_user_id', identityId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', identityId).maybeSingle(),
      ]);
      if (error || roleError || !profile?.organization_id || !grant) return null;
      return { id: profile.id, name: profile.name, email: profile.email, role: grant.role as User['role'], avatar: profile.avatar || profile.name.slice(0, 2), deviceId: profile.device_id || '', voipzekerExtension: profile.voipzeker_extension || '', organizationId: profile.organization_id };
    })();
    profileRequests.current.set(identityId, request);
    void request.then(() => profileRequests.current.delete(identityId), () => profileRequests.current.delete(identityId));
    return request;
  }, []);

  useEffect(() => {
    store.del('user'); store.del('managedUsers'); store.del('apiKey');
    try { Object.keys(localStorage).filter(k => /^cq_.*(managedUsers|apiKey)$/.test(k)).forEach(k => localStorage.removeItem(k)); } catch { /* storage unavailable */ }
    let alive = true;
    let receivedEvent = false;
    bootstrapExpired.current = false;
    loadStartedAt.current = Date.now();
    const timer = setTimeout(() => {
      if (!alive) return;
      bootstrapExpired.current = true;
      generation.current++;
      setFunctionSession(null);
      setSession(null); setUser(null); setStoreScope(); setLoading(false);
    }, Math.max(0, AUTH_LOAD_TIMEOUT_MS - (Date.now() - loadStartedAt.current)));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!alive || bootstrapExpired.current) return;
      receivedEvent = true;
      clearTimeout(timer);
      setFunctionSession(next);
      setSession(next);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!alive || receivedEvent || bootstrapExpired.current) return;
      clearTimeout(timer);
      setFunctionSession(error ? null : data.session);
      setSession(error ? null : data.session);
    }).catch(() => {
      if (alive && !receivedEvent && !bootstrapExpired.current) { clearTimeout(timer); setFunctionSession(null); setSession(null); }
    });
    return () => { alive = false; clearTimeout(timer); subscription.unsubscribe(); };
  }, []);

  const identityId = session?.user.id;
  useEffect(() => {
    if (session === undefined) return;
    const version = ++generation.current;
    if (!identityId) { setUser(null); setStoreScope(); setLoading(false); return; }
    setUser(null); setLoading(true);
    let active = true;
    const timer = setTimeout(() => {
      active = false;
      bootstrapExpired.current = true;
      setFunctionSession(null);
      setSession(null); setUser(null); setStoreScope(); setLoading(false);
    }, Math.max(0, AUTH_LOAD_TIMEOUT_MS - (Date.now() - loadStartedAt.current)));
    // Separate effect, never an awaited operation in the Auth event callback.
    void resolveProfile(identityId).then(employee => {
      if (!active || generation.current !== version) return;
      clearTimeout(timer); setStoreScope(employee?.organizationId); setUser(employee); setLoading(false);
    }).catch(() => {
      if (!active || generation.current !== version) return;
      clearTimeout(timer); setUser(null); setStoreScope(); setLoading(false);
    });
    return () => { active = false; clearTimeout(timer); };
  }, [identityId, session === undefined, resolveProfile]);

  const login = useCallback(async (email: string, password: string) => {
    bootstrapExpired.current = false;
    loadStartedAt.current = Date.now();
    const slow = new Promise<'slow'>((resolve) => setTimeout(() => resolve('slow'), 10000));
    const result = await Promise.race([supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }), slow]);
    if (result === 'slow') { setLoading(false); return { error: 'De server reageert traag. Probeer het over een moment opnieuw.' }; }
    const { data, error } = result;
    if (error || !data.session) { setLoading(false); return { error: 'E-mailadres of wachtwoord is onjuist.' }; }
    setFunctionSession(data.session);
    setSession(data.session);
    // Profile hydration is handled only by the effect, with the same deadline.
    return {};
  }, []);
  const logout = useCallback(async () => {
    setFunctionSession(null);
    generation.current++; setUser(null); setSession(null); setStoreScope(); setLoading(false); store.del('user');
    await supabase.auth.signOut();
  }, []);
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/reset-password` });
    return error ? { error: 'Resetmail kon niet worden verstuurd. Probeer later opnieuw.' } : {};
  }, []);
  return <AuthContext.Provider value={{ user, session: session || null, loading, authMode: 'email', login, logout, resetPassword }}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth requires AuthProvider');
  return value;
}