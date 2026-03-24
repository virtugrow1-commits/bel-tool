import { useState, useCallback, useEffect, useRef } from 'react';
import type { Company, CompanyContact, CompanyStage } from '@/types/beltool';
import { COMPANIES_INIT } from '@/lib/beltool-data';
import { cliq } from '@/lib/beltool-ghl';
import { store } from '@/lib/beltool-store';
import type { User } from '@/lib/beltool-data';

interface PipelineInfo {
  pipelineId: string;
  stageId: string;
}

interface PageCursor {
  startAfter?: number;
  startAfterId?: string;
}

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
  const [companies, setCompanies] = useState<Company[]>(() => store.get('leadCompanies', COMPANIES_INIT));
  const [cliqLoading, setCliqLoading] = useState(false);
  const [cliqError, setCliqError] = useState<string | null>(null);
  const [pipelineInfo, setPipelineInfo] = useState<PipelineInfo | null>(null);
  const [stageMap, setStageMap] = useState<Record<string, string>>({});
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [pageCursor, setPageCursor] = useState<PageCursor | null>(null);
  const [hasMoreLeads, setHasMoreLeads] = useState(false);
  const [stageFilter, setStageFilter] = useState<CompanyStage | 'all'>('nieuw');
  const [search, setSearch] = useState('');
  const stageMapRef = useRef<Record<string, string>>({});

  useEffect(() => { stageMapRef.current = stageMap; }, [stageMap]);
  useEffect(() => { store.set('leadCompanies', companies); }, [companies]);

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

  const resolveStageId = useCallback((filter: CompanyStage | 'all', stages: Record<string, string>): string | undefined => {
    if (filter === 'all') return undefined;
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
    append = false,
  ) => {
    const oppData = await cliq.searchOpportunities(pipelineId, stageId, 25, startAfter, startAfterId);
    const opportunities = oppData?.opportunities || [];
    const meta = oppData?.meta;

    const sMap = currentStageMap || stageMapRef.current;
    const newCompanies = mapOpportunitiesToCompanies(opportunities, sMap, defaultStage);

    if (append) {
      setCompanies(prev => [...prev, ...newCompanies]);
    } else {
      setCompanies(newCompanies);
    }

    setHasMoreLeads(!!meta?.nextPage && !!meta?.startAfter && !!meta?.startAfterId);

    if (meta?.startAfter && meta?.startAfterId) {
      setPageCursor({ startAfter: meta.startAfter, startAfterId: meta.startAfterId });
    } else {
      setPageCursor(null);
    }
  }, []);

  // Fetch counts for all stages in parallel
  // Map a GHL stage name (lowercased) to our internal stage using fuzzy matching
  const matchStageToInternal = useCallback((ghlStageName: string): CompanyStage | null => {
    // First try exact match via CLIQ_NAME_TO_STAGE
    if (CLIQ_NAME_TO_STAGE[ghlStageName]) return CLIQ_NAME_TO_STAGE[ghlStageName];

    // Fuzzy: check if GHL name contains or is contained by our known names
    for (const [cliqName, internal] of Object.entries(CLIQ_NAME_TO_STAGE)) {
      if (ghlStageName.includes(cliqName) || cliqName.includes(ghlStageName)) return internal;
    }
    return null;
  }, []);

  const loadStageCounts = useCallback(async (pipelineId: string, stages: Record<string, string>) => {
    const counts: Record<string, number> = {};

    // Use ALL stages from the pipeline (stages map = ghlName → stageId)
    const stageEntries = Object.entries(stages);

    const results = await Promise.allSettled(
      stageEntries.map(async ([ghlName, stageId]) => {
        const data = await cliq.searchOpportunities(pipelineId, stageId, 1);
        return { ghlName, total: data?.meta?.total || 0 };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const { ghlName, total } = r.value;
        const internalStage = matchStageToInternal(ghlName);
        if (internalStage) {
          counts[internalStage] = (counts[internalStage] || 0) + total;
        }
      }
    }

    // terugbellen and terugbellenGepland share the same GHL stage
    if (counts['terugbellen'] !== undefined && counts['terugbellenGepland'] === undefined) {
      counts['terugbellenGepland'] = counts['terugbellen'];
    }

    counts['all'] = Object.values(counts).reduce((sum, n) => sum + n, 0);
    console.log('[Leads] Stage counts from GHL:', counts);
    setStageCounts(counts);
  }, [matchStageToInternal]);

  // Load leads from background stages (enqueteTel, terugbellen) that should always
  // be visible for callbacks, regardless of the active filter.
  const loadBackgroundStages = useCallback(async (
    pipelineId: string,
    currentStageMap: Record<string, string>,
    activeStageId?: string,
  ) => {
    const bgStageNames = ['enquête voltooid', 'terugbellen gepland'];
    const bgLoads = bgStageNames
      .map(name => ({ name, id: currentStageMap[name] }))
      .filter(s => s.id && s.id !== activeStageId); // skip if already loaded as main filter

    if (bgLoads.length === 0) return [];

    const results = await Promise.allSettled(
      bgLoads.map(async ({ id }) => {
        const data = await cliq.searchOpportunities(pipelineId, id, 50);
        return data?.opportunities || [];
      })
    );

    const allOpps = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    return mapOpportunitiesToCompanies(allOpps, currentStageMap);
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

        const [, , bgCompanies] = await Promise.all([
          loadOpportunities(info.pipelineId, stId, undefined, undefined, defaultStage, stages),
          loadStageCounts(info.pipelineId, stages),
          loadBackgroundStages(info.pipelineId, stages, stId),
        ]);

        // Merge background-stage leads into companies (avoid duplicates)
        if (bgCompanies.length > 0) {
          setCompanies(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newOnes = bgCompanies.filter(c => !existingIds.has(c.id));
            return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
          });
        }
      } catch (err: any) {
        console.warn('CLIQ pipeline load failed:', err.message);
        setCliqError(err.message);
      } finally {
        setCliqLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Reload when stageFilter changes
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
    setHasMoreLeads(false);

    const stId = resolveStageId(stageFilter, stageMapRef.current);
    const defaultStage: CompanyStage = stageFilter === 'all' ? 'nieuw' : stageFilter;

    (async () => {
      try {
        await loadOpportunities(pipelineInfo.pipelineId, stId, undefined, undefined, defaultStage);
        const bgCompanies = await loadBackgroundStages(pipelineInfo.pipelineId, stageMapRef.current, stId);
        if (bgCompanies.length > 0) {
          setCompanies(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newOnes = bgCompanies.filter(c => !existingIds.has(c.id));
            return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
          });
        }
      } catch (err: any) {
        console.warn('CLIQ stage load failed:', err.message);
        setCliqError(err.message);
      } finally {
        setCliqLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageFilter]);

  const reloadLeads = useCallback(async () => {
    setCliqLoading(true);
    setCliqError(null);
    try {
      const { info, stages } = await loadPipeline();
      const stId = resolveStageId(stageFilter, stages);
      const defaultStage: CompanyStage = stageFilter === 'all' ? 'nieuw' : stageFilter;
      const [, , bgCompanies] = await Promise.all([
        loadOpportunities(info.pipelineId, stId, undefined, undefined, defaultStage, stages),
        loadStageCounts(info.pipelineId, stages),
        loadBackgroundStages(info.pipelineId, stages, stId),
      ]);
      if (bgCompanies.length > 0) {
        setCompanies(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newOnes = bgCompanies.filter(c => !existingIds.has(c.id));
          return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
        });
      }
    } catch (err: any) {
      setCliqError(err.message);
      throw err;
    } finally {
      setCliqLoading(false);
    }
  }, [loadPipeline, loadOpportunities, loadStageCounts, loadBackgroundStages, resolveStageId, stageFilter]);

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
        undefined,
        true, // append to existing list
      );
    } catch (err: any) {
      console.warn('Load more failed:', err.message);
    } finally {
      setCliqLoading(false);
    }
  }, [pipelineInfo, pageCursor, hasMoreLeads, cliqLoading, loadOpportunities, resolveStageId, stageFilter]);

  const updateCompStage = useCallback((compId: string, stage: Company['stage']) => {
    setCompanies(prev => prev.map(company => {
      if (company.id === compId) {
        return { ...company, stage };
      }

      if (stage === 'bellen' && company.stage === 'bellen') {
        return { ...company, stage: 'nieuw' };
      }

      return company;
    }));
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

  const removeCompany = useCallback((compId: string) => {
    setCompanies(cs => cs.filter(c => c.id !== compId));
  }, []);

  return {
    companies,
    cliqLoading,
    cliqError,
    pipelineInfo,
    stageMap,
    stageCounts,
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
    removeCompany,
  };
}
