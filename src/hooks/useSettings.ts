import { useState, useCallback } from 'react';
import { store } from '@/lib/beltool-store';
import { i18n } from '@/lib/beltool-i18n';
import { defaultSurvey } from '@/lib/beltool-data';
import { USERS, type User } from '@/lib/beltool-data';
import type { Webhook, CliqConfig, SurveyConfig, Appointment } from '@/types/beltool';

export function useSettings() {
  const [lang, setLang] = useState(() => store.get('lang', 'nl'));
  const [managedUsers, setManagedUsers] = useState<User[]>(() => store.get('managedUsers', USERS));
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [appts, setAppts] = useState<Appointment[]>(() => store.get('appointments', []));
  const [webhooks, setWebhooks] = useState<Webhook[]>(() => store.get('webhooks', []));
  const [apiKey, setApiKey] = useState(() => store.get('apiKey', ''));
  const [surveyConfig, setSurveyConfig] = useState<SurveyConfig>(() => store.get('surveyConfig', defaultSurvey()));
  const [cliqConfig, setCliqConfig] = useState<CliqConfig>(() => store.get('cliqConfig', {
    apiKey: '', locationId: '', pipelineId: '', calendarId: '',
    syncContacts: true, syncOpportunities: true, syncAppointments: true, createNotes: true,
  }));

  const t = i18n[lang as keyof typeof i18n] || i18n.nl;

  const updateManagedUsers = useCallback((users: User[]) => {
    setManagedUsers(users);
    store.set('managedUsers', users);
  }, []);

  const updateLang = useCallback((l: string) => {
    setLang(l);
    store.set('lang', l);
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
    setAppts,
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
