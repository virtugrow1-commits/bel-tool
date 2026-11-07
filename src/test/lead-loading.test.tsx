import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/lib/beltool-data';
const mocks = vi.hoisted(() => ({ getPipelines: vi.fn(), searchOpportunities: vi.fn() }));
vi.mock('@/lib/beltool-ghl', () => ({ cliq: mocks }));
vi.mock('@/lib/beltool-store', () => ({ store: { get: () => [], set: vi.fn() } }));
import { useLeads } from '@/hooks/useLeads';
const employee = { id: 'employee', organizationId: 'organization' } as User;
afterEach(cleanup);
describe('usable leads before background summaries', () => {
  it('releases the first 25 while counts and survey/callback requests remain pending', async () => {
    let resolveBackground: (value: unknown) => void = () => {};
    const background = new Promise(resolve => { resolveBackground = resolve; });
    mocks.getPipelines.mockResolvedValue({ pipelines: [{ id: 'pipeline', name: 'Bellen', stages: [
      { id: 'new', name: 'Nieuwe Lead' }, { id: 'survey', name: 'Enquête Voltooid' }, { id: 'callback', name: 'Terugbellen Gepland' },
    ] }] });
    mocks.searchOpportunities.mockImplementation((_pipeline, stage, limit) => {
      if (stage === 'new' && limit === 25) return Promise.resolve({ opportunities: [{ contact: { id: 'contact', name: 'Testcontact' } }], meta: {} });
      return background;
    });
    const { result } = renderHook(() => useLeads(employee));
    await waitFor(() => expect(result.current.companies).toHaveLength(1));
    expect(result.current.cliqLoading).toBe(false);
    expect(mocks.searchOpportunities).toHaveBeenCalledWith('pipeline', 'new', 25, undefined, undefined);
    expect(mocks.searchOpportunities).toHaveBeenCalledWith('pipeline', 'survey', 50);
    expect(mocks.searchOpportunities).toHaveBeenCalledWith('pipeline', 'callback', 50);
    await act(async () => { resolveBackground({ opportunities: [], meta: { total: 0 } }); });
    await act(async () => { await result.current.reloadLeads(); });
    expect(result.current.cliqLoading).toBe(false);
  });
});