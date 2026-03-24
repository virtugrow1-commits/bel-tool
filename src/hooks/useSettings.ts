import { useState, useCallback } from 'react';
import { store } from '@/lib/beltool-store';
import { i18n } from '@/lib/beltool-i18n';
import { defaultSurvey } from '@/lib/beltool-data';
import { USERS, type User } from '@/lib/beltool-data';
import type { Webhook, CliqConfig, SurveyConfig, Appointment } from '@/types/beltool';

export function useSettings() {
  // Migrate old script templates: replace [jouw naam] with {beller}
  const migrateSurveyConfig = (cfg: SurveyConfig): SurveyConfig => {
    const raw = JSON.stringify(cfg);
    if (raw.includes('[jouw naam]')) {
      const migrated = JSON.parse(raw.replace(/\[jouw naam\]/g, '{beller}')) as SurveyConfig;
      store.set('surveyConfig', migrated);
      return migrated;
    }
    return cfg;
  };

  const [lang, setLang] = useState(() => store.get('lang', 'nl'));
  const [managedUsers, setManagedUsers] = useState<User[]>(() => store.get('managedUsers', USERS));
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [appts, setAppts] = useState<Appointment[]>(() => store.get('appointments', []));
  const [webhooks, setWebhooksRaw] = useState<Webhook[]>(() => store.get('webhooks', []));
  const [apiKey, setApiKeyRaw] = useState(() => store.get('apiKey', ''));
  const [surveyConfig, setSurveyConfigRaw] = useState<SurveyConfig>(() => migrateSurveyConfig(store.get('surveyConfig', defaultSurvey())));
  const [cliqConfig, setCliqConfigRaw] = useState<CliqConfig>(() => store.get('cliqConfig', {
    apiKey: '', locationId: '', pipelineId: '', calendarId: '',
    syncContacts: true, syncOpportunities: true, syncAppointments: true, createNotes: true,
  }));

  const setWebhooks = useCallback((v: Webhook[] | ((prev: Webhook[]) => Webhook[])) => {
    setWebhooksRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      store.set('webhooks', next);
      return next;
    });
  }, []);

  const setApiKey = useCallback((v: string) => {
    setApiKeyRaw(v);
    store.set('apiKey', v);
  }, []);

  const setSurveyConfig = useCallback((v: SurveyConfig | ((prev: SurveyConfig) => SurveyConfig)) => {
    setSurveyConfigRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      store.set('surveyConfig', next);
      return next;
    });
  }, []);

  const setCliqConfig = useCallback((v: CliqConfig | ((prev: CliqConfig) => CliqConfig)) => {
    setCliqConfigRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v;
      store.set('cliqConfig', next);
      return next;
    });
  }, []);

  const t = i18n[lang as keyof typeof i18n] || i18n.nl;

  const updateManagedUsers = useCallback((users: User[]) => {
    setManagedUsers(users);
    store.set('managedUsers', users);
  }, []);

  const updateLang = useCallback((l: string) => {
    setLang(l);
    store.set('lang', l);
  }, []);

  const updateAppointments = useCallback((appointments: Appointment[] | ((prev: Appointment[]) => Appointment[])) => {
    setAppts(prev => {
      const next = typeof appointments === 'function' ? appointments(prev) : appointments;
      store.set('appointments', next);
      return next;
    });
  }, []);

  return {
    lang,
    setLang: updateLang,
    t,
    managedUsers,
    updateManagedUsers,
    showSettings,
    setShowSettings,
    showLeaderboard,
    setShowLeaderboard,
    showAgenda,
    setShowAgenda,
    showCallback,
    setShowCallback,
    appts,
    setAppts: updateAppointments,
    webhooks,
    setWebhooks,
    apiKey,
    setApiKey,
    surveyConfig,
    setSurveyConfig,
    cliqConfig,
    setCliqConfig,
  };
}
