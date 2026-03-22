import { useState, useCallback, useEffect, useRef } from 'react';
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

// Maps internal CompanyStage to CLIQ pipeline stage name (lowercase)
const STAGE_TO_CLIQ_NAME: Record<string, string> = {
  nieuw: 'nieuwe lead',
  bellen: 'in gesprek',
  enqueteGestart: 'enquête gestart',
  enqueteTel: 'enquête voltooid',
  enqueteVerstuurd: 'digitaal verstuurd',
  terugbellen: 'terugbellen gepland',
  terugbellenGepland: 'terugbellen gepland',
  afspraak: 'afspraak gepland',
  anderMoment: 'op een ander moment',
  nietInteressant: 'niet geïnteresseerd',
  geenGehoor: 'geen gehoor',
};

// Reverse: CLIQ stage name → internal CompanyStage
const CLIQ_NAME_TO_STAGE: Record<string, CompanyStage> = {
  'nieuwe lead': 'nieuw',
  'in gesprek': 'bellen',
  'enquête gestart': 'enqueteGestart',
  'enquête voltooid': 'enqueteTel',
  'digitaal verstuurd': 'enqueteVerstuurd',
  'terugbellen gepland': 'terugbellen',
  'afspraak gepland': 'afspraak',
  'op een ander moment': 'anderMoment',
  'niet geïnteresseerd': 'nietInteressant',
  'geen gehoor': 'geenGehoor',
};

function mapOpportunitiesToCompanies(opportunities: Array<{
  id?: string;
  contact?: { id: string; name?: string; companyName?: string; phone?: string; email?: string; tags?: string[] };
  contactId?: string;
  pipelineStageId?: string;
}>, stageMap: Record<string, string>, defaultStage: CompanyStage = 'nieuw'): Company[] {
  // Build reverse stageMap: stageId → cliq stage name
  const stageIdToName: Record<string, string> = {};
  for (const [name, id] of Object.entries(stageMap)) {
    stageIdToName[id] = name;
  }

  const companyMap = new Map<string, Company>();
  for (const opp of opportunities) {
    const c = opp.contact;
    if (!c) continue;
    const compName = c.companyName || c.name || 'Onbekend';
    const compKey = compName.toLowerCase().replace(/\s+/g, '-');

    const nameParts = (c.name || compName).split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Determine internal stage from the opportunity's pipeline stage
    let stage: CompanyStage = defaultStage;
    if (opp.pipelineStageId && stageIdToName[opp.pipelineStageId]) {
      const cliqName = stageIdToName[opp.pipelineStageId];
      stage = CLIQ_NAME_TO_STAGE[cliqName] || defaultStage;
    }

    if (!companyMap.has(compKey)) {
      companyMap.set(compKey, {
        id: `cliq-${compKey}`,
        name: compName,
        stage,
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
  const stageMapRef = useRef<Record<string, string>>({});

  // Keep ref in sync for use in callbacks
  useEffect(() => { stageMapRef.current = stageMap; }, [stageMap]);

  // Shared pipeline loading logic
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
    stageMapRef.current = stages;

    const info = { pipelineId: bellenPipeline.id, stageId: nieuweLeadsStage?.id || '' };
    setPipelineInfo(info);
    return { info, stages };
  }, []);

  // Resolve internal stage filter to CLIQ stage ID
  const resolveStageId = useCallback((filter: CompanyStage | 'all', stages: Record<string, string>): string | undefined => {
    if (filter === 'all') return undefined; // no stage filter = all stages
    const cliqName = STAGE_TO_CLIQ_NAME[filter];
    if (!cliqName) return undefined;
    return stages[cliqName];
  }, []);

  const loadOpportunities = useCallback(async (
    pipelineId: string,
    stageId?: string,
    startAfter?: number,
    startAfterId?: string,
    defaultStage: CompanyStage = 'nieuw',
    currentStageMap?: Record<string, string>,
  ) => {
    const oppData = await cliq.searchOpportunities(pipelineId, stageId, 25, startAfter, startAfterId);
    const opportunities = oppData?.opportunities || [];
    const meta = oppData?.meta;

    const sMap = currentStageMap || stageMapRef.current;
    setCompanies(mapOpportunitiesToCompanies(opportunities, sMap, defaultStage));
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
        const { info, stages } = await loadPipeline();
        const stId = resolveStageId(stageFilter, stages);
        const defaultStage: CompanyStage = stageFilter === 'all' ? 'nieuw' : stageFilter;
        await loadOpportunities(info.pipelineId, stId, undefined, undefined, defaultStage, stages);
      } catch (err: any) {
        console.warn('CLIQ pipeline load failed:', err.message);
        setCliqError(err.message);
      } finally {
        setCliqLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Reload when stageFilter changes (after initial load)
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      return;
    }
    if (!pipelineInfo) return;

    setCliqLoading(true);
    setCliqError(null);
    setPageCursor(null);

    const stId = resolveStageId(stageFilter, stageMapRef.current);
    const defaultStage: CompanyStage = stageFilter === 'all' ? 'nieuw' : stageFilter;

    loadOpportunities(pipelineInfo.pipelineId, stId, undefined, undefined, defaultStage)
      .catch((err: any) => {
        console.warn('CLIQ stage load failed:', err.message);
        setCliqError(err.message);
      })
      .finally(() => setCliqLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageFilter]);

  const reloadLeads = useCallback(async () => {
    setCliqLoading(true);
    setCliqError(null);
    try {
      const { info, stages } = await loadPipeline();
      const stId = resolveStageId(stageFilter, stages);
      const defaultStage: CompanyStage = stageFilter === 'all' ? 'nieuw' : stageFilter;
      await loadOpportunities(info.pipelineId, stId, undefined, undefined, defaultStage, stages);
    } catch (err: any) {
      setCliqError(err.message);
      throw err;
    } finally {
      setCliqLoading(false);
    }
  }, [loadPipeline, loadOpportunities, resolveStageId, stageFilter]);

  const loadMoreLeads = useCallback(async () => {
    if (!pipelineInfo || !pageCursor || !hasMoreLeads || cliqLoading) return;
    setCliqLoading(true);
    try {
      const stId = resolveStageId(stageFilter, stageMapRef.current);
      const defaultStage: CompanyStage = stageFilter === 'all' ? 'nieuw' : stageFilter;
      await loadOpportunities(
        pipelineInfo.pipelineId,
        stId,
        pageCursor.startAfter,
        pageCursor.startAfterId,
        defaultStage,
      );
    } catch (err: any) {
      console.warn('Load more failed:', err.message);
    } finally {
      setCliqLoading(false);
    }
  }, [pipelineInfo, pageCursor, hasMoreLeads, cliqLoading, loadOpportunities, resolveStageId, stageFilter]);

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
