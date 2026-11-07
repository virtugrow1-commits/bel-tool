import { FunctionsHttpError, type Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Updated only by the central AuthProvider. This is transport state, not authority.
let currentSession: Session | null = null;
let refreshing: Promise<Session | null> | null = null;

export function setFunctionSession(session: Session | null) {
  currentSession = session;
}

async function refreshSession() {
  if (!refreshing) {
    const identity = currentSession?.user.id;
    refreshing = (async () => {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session || currentSession?.user.id !== identity) return null;
      currentSession = data.session;
      return data.session;
    })().catch(() => null).finally(() => { refreshing = null; });
  }
  return refreshing;
}

function sessionError() {
  return { data: null, error: new FunctionsHttpError(new Response(
    JSON.stringify({ error: 'Je sessie is verlopen. Log opnieuw in.' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  )) };
}

export async function invokeAuthenticated(name: string, options: { body: Record<string, unknown> }) {
  let session = currentSession;
  if (!session) return sessionError();
  if ((session.expires_at ?? 0) * 1000 <= Date.now() + 30_000) {
    session = await refreshSession();
    if (!session) return sessionError();
  }
  const token = session.access_token;
  const result = await supabase.functions.invoke(name, {
    ...options, headers: { Authorization: `Bearer ${token}` },
  });
  // A 401 is rejected before any protected action runs. Never replay a timeout,
  // provider error, or forbidden (403) response, especially when dialing.
  if (!(result.error instanceof FunctionsHttpError) || result.error.context.status !== 401) return result;
  if (!currentSession || currentSession.user.id !== session.user.id) return sessionError();
  const renewed = currentSession.access_token !== token ? currentSession : await refreshSession();
  if (!renewed) return sessionError();
  return supabase.functions.invoke(name, {
    ...options, headers: { Authorization: `Bearer ${renewed.access_token}` },
  });
}