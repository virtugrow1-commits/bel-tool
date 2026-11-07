import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FunctionsHttpError, type Session } from '@supabase/supabase-js';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), refreshSession: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  functions: { invoke: mocks.invoke }, auth: { refreshSession: mocks.refreshSession },
} }));
import { invokeAuthenticated, setFunctionSession } from '@/lib/authenticated-functions';
const session = (token: string) => ({ access_token: token, user: { id: 'employee' }, expires_at: Math.floor(Date.now() / 1000) + 3600 }) as Session;
const rejected = (status: number) => ({ data: null, error: new FunctionsHttpError(new Response('{}', { status })) });
describe('authenticated staff requests', () => {
  beforeEach(() => { vi.resetAllMocks(); setFunctionSession(session('original')); });
  it('fails closed without a session', async () => {
    setFunctionSession(null);
    const result = await invokeAuthenticated('ghl-proxy', { body: { action: 'getCalendars' } });
    expect(result.error?.context.status).toBe(401);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('passes the provider token explicitly', async () => {
    mocks.invoke.mockResolvedValue({ data: { calendars: [] }, error: null });
    await invokeAuthenticated('ghl-proxy', { body: { action: 'getCalendars' } });
    expect(mocks.invoke).toHaveBeenCalledWith('ghl-proxy', { body: { action: 'getCalendars' }, headers: { Authorization: 'Bearer original' } });
  });
  it('shares one refresh across concurrent rejected requests', async () => {
    mocks.invoke.mockImplementation((_name, options) => Promise.resolve(options.headers.Authorization === 'Bearer original' ? rejected(401) : { data: { success: true }, error: null }));
    mocks.refreshSession.mockResolvedValue({ data: { session: session('renewed') }, error: null });
    const results = await Promise.all(Array.from({ length: 5 }, () => invokeAuthenticated('ghl-proxy', { body: {} })));
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(results.every(result => result.data?.success)).toBe(true);
    expect(mocks.invoke).toHaveBeenCalledTimes(10);
  });
  it.each([403, 500])('does not replay calls on status %s', async status => {
    mocks.invoke.mockResolvedValue(rejected(status));
    await invokeAuthenticated('voipzeker-call', { body: { action: 'call' } });
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });
  it('retries a 401 only once', async () => {
    mocks.invoke.mockResolvedValue(rejected(401));
    mocks.refreshSession.mockResolvedValue({ data: { session: session('renewed') }, error: null });
    expect((await invokeAuthenticated('ghl-proxy', { body: {} })).error?.context.status).toBe(401);
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
  });
  it('does not send a request when refresh fails', async () => {
    mocks.invoke.mockResolvedValue(rejected(401));
    mocks.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('expired') });
    await invokeAuthenticated('ghl-proxy', { body: {} });
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });
  it('does not restore a session after logout during refresh', async () => {
    mocks.invoke.mockResolvedValue(rejected(401));
    mocks.refreshSession.mockImplementation(async () => { setFunctionSession(null); return { data: { session: session('renewed') }, error: null }; });
    await invokeAuthenticated('ghl-proxy', { body: {} });
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });
});