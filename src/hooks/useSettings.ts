import { useState, useCallback, useEffect, useRef } from 'react';
import { store } from '@/lib/beltool-store';
import { i18n } from '@/lib/beltool-i18n';
import { defaultSurvey } from '@/lib/beltool-data';
import { supabase } from '@/integrations/supabase/client';
import { invokeAuthenticated } from '@/lib/authenticated-functions';
import { useAuthContext } from '@/contexts/AuthContext';
import type { Webhook, CliqConfig, SurveyConfig, Appointment } from '@/types/beltool';

/** Organization-wide settings live in the database; only personal prefs stay local. */
type Shared = { surveyConfig?: SurveyConfig; cliqConfig?: Partial<CliqConfig>; webhooks?: Webhook[] };
const LEGACY_KEYS = ['surveyConfig', 'cliqConfig', 'webhooks', 'managedUsers', 'apiKey', 'ghlAdvisors', 'user'];
const DEFAULT_CLIQ: CliqConfig = { apiKey: '', locationId: '', pipelineId: '', calendarId: '', syncContacts: true, syncOpportunities: true, syncAppointments: true, createNotes: true };

const migrateSurvey = (cfg: SurveyConfig): SurveyConfig => {
  const raw = JSON.stringify(cfg);
  return raw.includes('[jouw naam]') ? JSON.parse(raw.replace(/\[jouw naam\]/g, '{beller}')) : cfg;
};

export function useSettings() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'admin';
  const [lang, setLang] = useState(() => store.get('lang', 'nl'));
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [appts, setAppts] = useState<Appointment[]>(() => store.get('appointments', []));
  const [webhooks, setWebhooksRaw] = useState<Webhook[]>([]);
  const [surveyConfig, setSurveyConfigRaw] = useState<SurveyConfig>(defaultSurvey());
  const [cliqConfig, setCliqConfigRaw] = useState<CliqConfig>(DEFAULT_CLIQ);
  const sharedRef = useRef<Shared>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((patch: Shared) => {
    sharedRef.current = { ...sharedRef.current, ...patch };
    if (!isAdmin) return; // server also enforces admin-only
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const { cliqConfig: c, ...rest } = sharedRef.current;
      const shared = { ...rest, ...(c ? { cliqConfig: { ...c, apiKey: '', locationId: '' } } : {}) };
      invokeAuthenticated('organization-settings', { body: { updates: { shared_settings: shared } } })
        .then(({ error }) => { if (error) console.warn('[Settings] Organisatie-instellingen opslaan mislukt'); });
    }, 600);
  }, [isAdmin]);

  // Load org settings once per organization; migrate legacy browser values (admin only) then clear them.
  useEffect(() => {
    if (!user?.organizationId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('org_shared_settings' as never);
      if (cancelled || error) return;
      let shared = (data || {}) as Shared;
      const legacy: Shared = {
        surveyConfig: store.get<SurveyConfig | null>('surveyConfig', null) || undefined,
        cliqConfig: store.get<Partial<CliqConfig> | null>('cliqConfig', null) || undefined,
        webhooks: store.get<Webhook[] | null>('webhooks', null) || undefined,
      };
      const missing = (Object.keys(legacy) as (keyof Shared)[]).filter(k => legacy[k] && !shared[k]);
      if (isAdmin && missing.length) {
        shared = { ...shared, ...Object.fromEntries(missing.map(k => [k, legacy[k]])) };
        sharedRef.current = shared;
        persist({});
      }
      sharedRef.current = shared;
      if (shared.surveyConfig) setSurveyConfigRaw(migrateSurvey(shared.surveyConfig));
      if (shared.cliqConfig) setCliqConfigRaw({ ...DEFAULT_CLIQ, ...shared.cliqConfig, apiKey: '', locationId: '' });
      if (shared.webhooks) setWebhooksRaw(shared.webhooks);
      LEGACY_KEYS.forEach(k => store.del(k));
    })();
    return () => { cancelled = true; };
  }, [user?.organizationId, isAdmin, persist]);

  const setWebhooks = useCallback((v: Webhook[] | ((prev: Webhook[]) => Webhook[])) => {
    setWebhooksRaw(prev => { const next = typeof v === 'function' ? v(prev) : v; persist({ webhooks: next }); return next; });
  }, [persist]);

  const setSurveyConfig = useCallback((v: SurveyConfig | ((prev: SurveyConfig) => SurveyConfig)) => {
    setSurveyConfigRaw(prev => { const next = typeof v === 'function' ? v(prev) : v; persist({ surveyConfig: next }); return next; });
  }, [persist]);

  const setCliqConfig = useCallback((v: CliqConfig | ((prev: CliqConfig) => CliqConfig)) => {
    setCliqConfigRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      const { apiKey: _a, locationId: _l, ...safe } = next;
      persist({ cliqConfig: safe });
      return next;
    });
  }, [persist]);

  const t = i18n[lang as keyof typeof i18n] || i18n.nl;

  const updateLang = useCallback((l: string) => { setLang(l); store.set('lang', l); }, []);

  const updateAppointments = useCallback((appointments: Appointment[] | ((prev: Appointment[]) => Appointment[])) => {
    setAppts(prev => {
      const next = typeof appointments === 'function' ? appointments(prev) : appointments;
      store.set('appointments', next);
      return next;
    });
  }, []);

  return {
    lang, setLang: updateLang, t,
    showSettings, setShowSettings, showLeaderboard, setShowLeaderboard,
    showAgenda, setShowAgenda, showCallback, setShowCallback,
    appts, setAppts: updateAppointments,
    webhooks, setWebhooks, surveyConfig, setSurveyConfig, cliqConfig, setCliqConfig,
  };
}
