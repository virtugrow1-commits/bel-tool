import { useState, useCallback, useEffect } from 'react';
import type { Company, CompanyContact, CompanyStage } from '@/types/beltool';
import { COMPANIES_INIT } from '@/lib/beltool-data';
import { cliq } from '@/lib/beltool-ghl';
import type { User } from '@/lib/beltool-data';

interface PipelineInfo {
  pipelineId: string;
  stageId: string;
}

interface PageCursor {
  startAfter?: number;
  startAfterId?: string;
}

function mapOpportunitiesToCompanies(opportunities: Array<{
  id?: string;
  contact?: { id: string; name?: string; companyName?: string; phone?: string; email?: string; tags?: string[] };
  contactId?: string;
}>): Company[] {
  const companyMap = new Map<string, Company>();
  for (const opp of opportunities) {
    const c = opp.contact;
    if (!c) continue;
    const compName = c.companyName || c.name || 'Onbekend';
    const compKey = compName.toLowerCase().replace(/\s+/g, '-');

    const nameParts = (c.name || compName).split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    if (!companyMap.has(compKey)) {
      companyMap.set(compKey, {
        id: `cliq-${compKey}`,
        name: compName,
        stage: 'nieuw',
        contacts: [],
      });
    }
    companyMap.get(compKey)!.contacts.push({
      id: c.id || opp.contactId || '',
      firstName,
      lastName,
      role: '',
      phone: c.phone || '',
      email: c.email || '',
      opportunityId: opp.id || '',
    });
  }
  return Array.from(companyMap.values());
}

export function useLeads(user: User | null) {
  const [companies, setCompanies] = useState<Company[]>(COMPANIES_INIT);
  const [cliqLoading, setCliqLoading] = useState(false);
  const [cliqError, setCliqError] = useState<string | null>(null);
  const [pipelineInfo, setPipelineInfo] = useState<PipelineInfo | null>(null);
  const [stageMap, setStageMap] = useState<Record<string, string>>({});
  const [pageCursor, setPageCursor] = useState<PageCursor | null>(null);
  const [hasMoreLeads, setHasMoreLeads] = useState(false);
  const [stageFilter, setStageFilter] = useState<CompanyStage | 'all'>('nieuw');
  const [search, setSearch] = useState('');

  // Shared pipeline loading logic (eliminates duplicate code)
  const loadPipeline = useCallback(async () => {
    const pipelineData = await cliq.getPipelines();
    const pipelines = pipelineData?.pipelines || [];
    const bellenPipeline = pipelines.find((p: { name: string }) =>
      p.name.toLowerCase().includes('bellen')
    );

    if (!bellenPipeline) {
      throw new Error('Geen "Bellen" pipeline gevonden');
    }

    const nieuweLeadsStage = bellenPipeline.stages?.find((s: { name: string }) =>
      s.name.toLowerCase().includes('nieuwe')
    );

    const stages: Record<string, string> = {};
    for (const s of bellenPipeline.stages || []) {
      stages[s.name.toLowerCase()] = s.id;
    }
    setStageMap(stages);

    const info = { pipelineId: bellenPipeline.id, stageId: nieuweLeadsStage?.id || '' };
    setPipelineInfo(info);
    return info;
  }, []);

  const loadOpportunities = useCallback(async (pipelineId: string, stageId?: string, startAfter?: number, startAfterId?: string) => {
    const oppData = await cliq.searchOpportunities(pipelineId, stageId, 25, startAfter, startAfterId);
    const opportunities = oppData?.opportunities || [];
    const meta = oppData?.meta;

    setCompanies(mapOpportunitiesToCompanies(opportunities));
    setHasMoreLeads(!!meta?.nextPage);

    if (meta?.startAfter && meta?.startAfterId) {
      setPageCursor({ startAfter: meta.startAfter, startAfterId: meta.startAfterId });
    } else {
      setPageCursor(null);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!user) return;
    setCliqLoading(true);
    setCliqError(null);

    (async () => {
      try {
        const info = await loadPipeline();
        await loadOpportunities(info.pipelineId, info.stageId);
      } catch (err: any) {
        console.warn('CLIQ pipeline load failed:', err.message);
        setCliqError(err.message);
      } finally {
        setCliqLoading(false);
      }
    })();
  }, [user, loadPipeline, loadOpportunities]);

  const reloadLeads = useCallback(async () => {
    setCliqLoading(true);
    setCliqError(null);
    try {
      const info = await loadPipeline();
      await loadOpportunities(info.pipelineId, info.stageId);
    } catch (err: any) {
      setCliqError(err.message);
      throw err;
    } finally {
      setCliqLoading(false);
    }
  }, [loadPipeline, loadOpportunities]);

  const loadMoreLeads = useCallback(async () => {
    if (!pipelineInfo || !pageCursor || !hasMoreLeads || cliqLoading) return;
    setCliqLoading(true);
    try {
      await loadOpportunities(
        pipelineInfo.pipelineId,
        pipelineInfo.stageId,
        pageCursor.startAfter,
        pageCursor.startAfterId
      );
    } catch (err: any) {
      console.warn('Load more failed:', err.message);
    } finally {
      setCliqLoading(false);
    }
  }, [pipelineInfo, pageCursor, hasMoreLeads, cliqLoading, loadOpportunities]);

  const updateCompStage = useCallback((compId: string, stage: Company['stage']) => {
    setCompanies(p => p.map(c => c.id === compId ? { ...c, stage } : c));
  }, []);

  const updateContact = useCallback((compId: string, updatedContact: CompanyContact) => {
    setCompanies(cs => cs.map(c =>
      c.id === compId
        ? { ...c, contacts: c.contacts.map(ct => ct.id === updatedContact.id ? updatedContact : ct) }
        : c
    ));
  }, []);

  const updateCompany = useCallback((updatedComp: Company) => {
    setCompanies(cs => cs.map(c => c.id === updatedComp.id ? { ...c, ...updatedComp } : c));
  }, []);

  return {
    companies,
    cliqLoading,
    cliqError,
    pipelineInfo,
    stageMap,
    hasMoreLeads,
    stageFilter,
    setStageFilter,
    search,
    setSearch,
    reloadLeads,
    loadMoreLeads,
    updateCompStage,
    updateContact,
    updateCompany,
  };
}
