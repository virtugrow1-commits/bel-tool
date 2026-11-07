import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), listener: null as null | ((event: string, session: any) => void), unsubscribe: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: mocks.getSession, onAuthStateChange: vi.fn((callback) => { mocks.listener = callback; return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }; }), signInWithPassword: vi.fn(), signOut: vi.fn(), resetPasswordForEmail: vi.fn() },
  from: mocks.from,
} }));
vi.mock('@/lib/beltool-store', () => ({ store: { del: vi.fn() }, setStoreScope: vi.fn() }));
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';
function Consumer() { const auth = useAuthContext(); return <span>{auth.loading ? 'loading' : auth.user ? 'employee' : 'login'}</span>; }
describe('central session bootstrap', () => {
  beforeEach(() => { vi.useFakeTimers(); mocks.getSession.mockReset(); mocks.from.mockReset(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  it('falls back after exactly eight seconds when session bootstrap hangs', async () => {
    mocks.getSession.mockReturnValue(new Promise(() => {}));
    render(<AuthProvider><Consumer /></AuthProvider>);
    await act(async () => { vi.advanceTimersByTime(7999); });
    expect(screen.getByText('loading')).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(screen.getByText('login')).toBeTruthy();
  });
  it('bootstraps only once for several context consumers', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await act(async () => { render(<AuthProvider><Consumer /><Consumer /><Consumer /></AuthProvider>); });
    expect(mocks.getSession).toHaveBeenCalledTimes(1);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('does not perform queries synchronously inside the auth callback', async () => {
    mocks.getSession.mockReturnValue(new Promise(() => {}));
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: () => new Promise(() => {}) }) }) });
    render(<AuthProvider><Consumer /></AuthProvider>);
    await act(async () => {
      mocks.listener?.('SIGNED_IN', { user: { id: 'employee-id' } });
      expect(mocks.from).not.toHaveBeenCalled();
    });
    expect(mocks.from).toHaveBeenCalledTimes(2);
    await act(async () => { vi.advanceTimersByTime(8000); });
    expect(screen.getByText('login')).toBeTruthy();
  });
});