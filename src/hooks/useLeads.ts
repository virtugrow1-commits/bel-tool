import { useState, useCallback, useEffect, useRef } from 'react';
import type { Company, CompanyContact, CompanyStage } from '@/types/beltool';
import { COMPANIES_INIT } from '@/lib/beltool-data';
import { cliq } from '@/lib/beltool-ghl';
import type { User } from '@/lib/beltool-data';

interface PipelineInfo {
  pipelineId: string;
  stageId: string;
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
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [stageFilter, setStageFilter] = useState<CompanyStage | 'all'>('nieuw');
  const [search, setSearch] = useState('');
  const stageMapRef = useRef<Record<string, string>>({});
  const loadAbortRef = useRef(0); // Incremented to cancel stale loads

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
    if (filter === 'all') return undefined;
    const cliqName = STAGE_TO_CLIQ_NAME[filter];
    if (!cliqName) return undefined;
    return stages[cliqName];
  }, []);

  // Load ALL pages for a given stage (auto-pagination)
  const loadAllOpportunities = useCallback(async (
    pipelineId: string,
    stageId?: string,
    defaultStage: CompanyStage = 'nieuw',
    currentStageMap?: Record<string, string>,
    loadId?: number,
  ) => {
    const sMap = currentStageMap || stageMapRef.current;
    let allOpportunities: any[] = [];
    let startAfter: number | undefined;
    let startAfterId: string | undefined;
    let hasMore = true;

    while (hasMore) {
      // Check if this load has been superseded
      if (loadId !== undefined && loadId !== loadAbortRef.current) return;

      const oppData = await cliq.searchOpportunities(pipelineId, stageId, 25, startAfter, startAfterId);
      const opportunities = oppData?.opportunities || [];
      const meta = oppData?.meta;

      allOpportunities = allOpportunities.concat(opportunities);

      // Update companies progressively so user sees results immediately
      if (loadId !== undefined && loadId !== loadAbortRef.current) return;
      setCompanies(mapOpportunitiesToCompanies(allOpportunities, sMap, defaultStage));

      hasMore = !!meta?.nextPage && !!meta?.startAfter && !!meta?.startAfterId;
      if (hasMore) {
        startAfter = meta.startAfter;
        startAfterId = meta.startAfterId;
      }
    }

    return allOpportunities.length;
  }, []);

  // Fetch counts for all stages (lightweight — just first page with limit=1 to get meta.total)
  const loadStageCounts = useCallback(async (pipelineId: string, stages: Record<string, string>) => {
    const stageKeys = Object.keys(STAGE_TO_CLIQ_NAME).filter(k => k !== 'bellen' && k !== 'terugbellen');
    const uniqueCliqNames = [...new Set(stageKeys.map(k => STAGE_TO_CLIQ_NAME[k]))];

    const counts: Record<string, number> = {};
    
    // Fetch counts in parallel (max ~10 requests)
    const results = await Promise.allSettled(
      uniqueCliqNames.map(async (cliqName) => {
        const stageId = stages[cliqName];
        if (!stageId) return { cliqName, total: 0 };
        const data = await cliq.searchOpportunities(pipelineId, stageId, 1);
        return { cliqName, total: data?.meta?.total || 0 };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const internalStage = CLIQ_NAME_TO_STAGE[r.value.cliqName];
        if (internalStage) {
          counts[internalStage] = r.value.total;
        }
      }
    }

    // Also set terugbellenGepland = same as terugbellen
    if (counts['terugbellen'] !== undefined) {
      counts['terugbellenGepland'] = counts['terugbellen'];
    }

    // 'all' = sum of all
    counts['all'] = Object.values(counts).reduce((sum, n) => sum + n, 0);

    setStageCounts(counts);
  }, []);

  // Initial load
  useEffect(() => {
    if (!user) return;
    setCliqLoading(true);
    setCliqError(null);

    const loadId = ++loadAbortRef.current;

    (async () => {
      try {
        const { info, stages } = await loadPipeline();
        const stId = resolveStageId(stageFilter, stages);
        const defaultStage: CompanyStage = stageFilter === 'all' ? 'nieuw' : stageFilter;
        
        // Load all pages + counts in parallel
        await Promise.all([
          loadAllOpportunities(info.pipelineId, stId, defaultStage, stages, loadId),
          loadStageCounts(info.pipelineId, stages),
        ]);
      } catch (err: any) {
        console.warn('CLIQ pipeline load failed:', err.message);
        setCliqError(err.message);
      } finally {
        if (loadId === loadAbortRef.current) setCliqLoading(false);
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

    const loadId = ++loadAbortRef.current;
    const stId = resolveStageId(stageFilter, stageMapRef.current);
    const defaultStage: CompanyStage = stageFilter === 'all' ? 'nieuw' : stageFilter;

    loadAllOpportunities(pipelineInfo.pipelineId, stId, defaultStage, undefined, loadId)
      .catch((err: any) => {
        console.warn('CLIQ stage load failed:', err.message);
        setCliqError(err.message);
      })
      .finally(() => {
        if (loadId === loadAbortRef.current) setCliqLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageFilter]);

  const reloadLeads = useCallback(async () => {
    setCliqLoading(true);
    setCliqError(null);
    const loadId = ++loadAbortRef.current;
    try {
      const { info, stages } = await loadPipeline();
      const stId = resolveStageId(stageFilter, stages);
      const defaultStage: CompanyStage = stageFilter === 'all' ? 'nieuw' : stageFilter;
      await Promise.all([
        loadAllOpportunities(info.pipelineId, stId, defaultStage, stages, loadId),
        loadStageCounts(info.pipelineId, stages),
      ]);
    } catch (err: any) {
      setCliqError(err.message);
      throw err;
    } finally {
      if (loadId === loadAbortRef.current) setCliqLoading(false);
    }
  }, [loadPipeline, loadAllOpportunities, loadStageCounts, resolveStageId, stageFilter]);

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
    stageCounts,
    stageFilter,
    setStageFilter,
    search,
    setSearch,
    reloadLeads,
    updateCompStage,
    updateContact,
    updateCompany,
  };
}
