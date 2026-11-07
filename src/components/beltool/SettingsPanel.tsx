import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from './Modal';
import { useBelTool } from '@/contexts/BelToolContext';
import { USERS, defaultSurvey, type User } from '@/lib/beltool-data';
import { initScores } from '@/lib/beltool-scoring';
import { store } from '@/lib/beltool-store';
import { cliq } from '@/lib/beltool-ghl';
import { cn } from '@/lib/utils';
import { useAdvisors } from '@/hooks/useAdvisors';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useTeamProfiles } from '@/hooks/useTeamProfiles';
import { invokeAuthenticated } from '@/lib/authenticated-functions';
import type { SelectOption } from '@/types/beltool';

const DEFAULT_CUSTOM_FIELDS = [
  { key: 'beltool_uren_per_week', label: 'Bel-Tool: Uren per week', type: 'SINGLE_OPTIONS', options: ['0-2 uur', '3-5 uur', '6-10 uur', '10-15 uur', '15+ uur'] },
  { key: 'beltool_taken', label: 'Bel-Tool: Repetitieve taken', type: 'MULTIPLE_OPTIONS', options: ['Leads nabellen', 'E-mails overtypen', 'Offertes opmaken', 'Afspraken inplannen', 'CRM bijwerken', 'Administratie', 'Social media'] },
  { key: 'beltool_groeifase', label: 'Bel-Tool: Groeifase', type: 'SINGLE_OPTIONS', options: ['Bijbenen', 'Klaar voor groei'] },
  { key: 'beltool_ai_status', label: 'Bel-Tool: AI Status', type: 'SINGLE_OPTIONS', options: ['Al mee bezig', 'Komt niet aan toe'] },
  { key: 'beltool_lead_score', label: 'Bel-Tool: Lead Score', type: 'NUMBER' },
  { key: 'beltool_laatste_belpoging', label: 'Bel-Tool: Laatste belpoging', type: 'DATE' },
];

const DEFAULT_PIPELINE_STAGES = [
  { name: 'Nieuwe Lead', key: 'nieuw', color: '#3B82F6' },
  { name: 'In Gesprek', key: 'bellen', color: '#22C55E' },
  { name: 'Enquête Gestart', key: 'enqueteGestart', color: '#06B6D4' },
  { name: 'Enquête Voltooid', key: 'enqueteTel', color: '#14B8A6' },
  { name: 'Digitaal Verstuurd', key: 'enqueteVerstuurd', color: '#8B5CF6' },
  { name: 'Terugbellen Gepland', key: 'terugbellenGepland', color: '#F59E0B' },
  { name: 'Afspraak Gepland', key: 'afspraak', color: '#10B981' },
  { name: 'Niet Geïnteresseerd', key: 'nietInteressant', color: '#EF4444' },
  { name: 'Geen Gehoor', key: 'geenGehoor', color: '#6B7280' },
];

export function SettingsPanel({ open, onClose, onSyncLeads }: {
  open: boolean;
  onClose: () => void;
  onSyncLeads: () => Promise<void>;
}) {
  const { lang, setLang, user, allScores, setAllScores, webhooks, setWebhooks, t, surveyConfig, setSurveyConfig, cliqConfig, setCliqConfig } = useBelTool();
  const { advisors, loading: advisorsLoading, refresh: refreshAdvisors } = useAdvisors(user?.organizationId);
  const { organizations, createOrg, updateOrg } = useOrganizations();
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgSlug, setNewOrgSlug] = useState('');
  const [newOrgApiKey, setNewOrgApiKey] = useState('');
  const [newOrgLocationId, setNewOrgLocationId] = useState('');
  const [tab, setTab] = useState('cliq');
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [newWh, setNewWh] = useState('');
  const [editQ, setEditQ] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [newOpt, setNewOpt] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User> & { name: string; email: string }>({ name: '', email: '', role: 'caller', voipzekerExtension: '' });
  const { profiles: teamProfiles, createProfile, updateProfile } = useTeamProfiles(user?.organizationId);
  const [vzInvitation, setVzInvitation] = useState('');
  const [vzBusy, setVzBusy] = useState<string | null>(null);
  const [vzMsg, setVzMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [vzExtensions, setVzExtensions] = useState<Array<{ id: string; username: string; name: string; extno: string }>>([]);
  const [savingExt, setSavingExt] = useState<string | null>(null);
  const MAX_TEAM = 5;

  const callVz = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await invokeAuthenticated('voipzeker-call', {
      body: { action, organizationId: user?.organizationId, ...extra },
    });
    if (error) {
      let detail = error.message;
      try {
        const ctx = (error as unknown as { context?: { text?: () => Promise<string> } }).context;
        if (ctx?.text) { const parsed = JSON.parse(await ctx.text()); if (parsed?.error) detail = parsed.error; }
      } catch { /* keep */ }
      throw new Error(detail);
    }
    if (!data?.success) throw new Error(data?.error || 'Onbekende fout van VoIPzeker');
    return data;
  };

  const vzConnect = async () => {
    setVzBusy('connect'); setVzMsg(null);
    try {
      await callVz('provision', { invitationId: vzInvitation.trim() });
      setVzMsg({ ok: true, text: 'VoIPzeker gekoppeld — de koppelcode is verbruikt en het logintoken is opgeslagen.' });
      setVzInvitation('');
    } catch (e) { setVzMsg({ ok: false, text: e instanceof Error ? e.message : 'Koppelen mislukt' }); }
    setVzBusy(null);
  };

  const vzTest = async () => {
    setVzBusy('test'); setVzMsg(null);
    try {
      const d = await callVz('ping');
      setVzMsg({ ok: true, text: `Verbinding OK — ${d.extensionCount ?? '?'} toestellen gevonden.` });
    } catch (e) { setVzMsg({ ok: false, text: e instanceof Error ? e.message : 'Test mislukt' }); }
    setVzBusy(null);
  };

  const vzLoadExtensions = async () => {
    setVzBusy('ext'); setVzMsg(null);
    try {
      const d = await callVz('extensions');
      setVzExtensions(d.extensions || []);
      setVzMsg({ ok: true, text: `${(d.extensions || []).length} toestellen opgehaald.` });
    } catch (e) { setVzMsg({ ok: false, text: e instanceof Error ? e.message : 'Ophalen mislukt' }); }
    setVzBusy(null);
  };

  const saveExtension = async (profileId: string, value: string) => {
    setSavingExt(profileId);
    try { await updateProfile(profileId, { voipzekerExtension: value }); }
    catch (e) { setVzMsg({ ok: false, text: e instanceof Error ? e.message : 'Opslaan mislukt' }); }
    setSavingExt(null);
  };

  const qKeys = ['intro', 'q1', 'q2', 'q3', 'q4', 'bridge'];
  const qLabels: Record<string, string> = { intro: 'Introductie', q1: 'Vraag 1', q2: 'Vraag 2', q3: 'Vraag 3', q4: 'Vraag 4', bridge: 'Aanbod' };

  const openEditor = (k: string) => {
    setEditQ(k);
    setDraft(JSON.parse(JSON.stringify(surveyConfig[k])));
    setNewOpt('');
  };

  const saveDraft = () => {
    if (!editQ || !draft) return;
    const n = { ...surveyConfig, [editQ]: draft };
    setSurveyConfig(n);
    setEditQ(null);
    setDraft(null);
  };

  const updateCliqConfig = (partial: Partial<typeof cliqConfig>) => {
    const next = { ...cliqConfig, ...partial };
    setCliqConfig(next);
  };

  const testConnection = async () => {
    setTestStatus('testing');
    try {
      if (cliqConfig.apiKey || cliqConfig.locationId) {
        await updateOrg(user?.organizationId || '', { ...(cliqConfig.apiKey ? { ghl_api_key: cliqConfig.apiKey } : {}), ...(cliqConfig.locationId ? { ghl_location_id: cliqConfig.locationId } : {}) } as any);
        updateCliqConfig({apiKey:'', locationId:''});
      }
      await cliq.getPipelines();
      setTestStatus('success');
    } catch {
      setTestStatus('error');
    }
    setTimeout(() => setTestStatus(null), 3000);
  };

  const tabs = [
    ...(user?.role === 'admin' ? [{ id: 'cliq', label: '🔗 CLIQ Integratie' }] : []),
    { id: 'telefonie', label: '📞 Telefonie' },
    { id: 'vragen', label: '❓ Enquêtevragen' },
    { id: 'pipeline', label: '📊 Pipeline' },
    { id: 'fields', label: '📝 Custom Fields' },
    { id: 'sync', label: '🔄 Sync' },
    { id: 'lang', label: t.language },
    { id: 'api', label: t.apiKeys },
    { id: 'reset', label: t.resetStats },
    ...(user?.role === 'admin' ? [{ id: 'users', label: t.userManagement }] : []),
    ...(user?.role === 'admin' ? [{ id: 'orgs', label: '🏢 Organisaties' }] : []),
  ];

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-foreground/[0.04] text-foreground text-[13px] outline-none focus:ring-1 focus:ring-primary';

  return (
    <Modal open={open} onClose={onClose} title={t.settings} wide>
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {tabs.map(tb => (
          <Button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              tab === tb.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {tb.label}
          </Button>
        ))}
      </div>

      {/* CLIQ INTEGRATIE TAB */}
      {tab === 'cliq' && user?.role === 'admin' && (
        <div className="space-y-5">
          <div className="bg-primary/[0.06] border border-primary/15 rounded-xl p-4">
            <h3 className="text-sm font-bold text-primary mb-2">🔗 GoHighLevel Integratie</h3>
            <p className="text-muted-foreground text-sm">Koppel je CLIQ account om leads, contacten en afspraken te synchroniseren.</p>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">CLIQ API Key (Private Integration)</label>
              <input
                type="password"
                value={cliqConfig.apiKey}
                onChange={e => updateCliqConfig({ apiKey: e.target.value })}
                placeholder="Nieuwe sleutel (bestaande blijft verborgen)"
                className={cn(inputCls, 'font-mono')}
              />
              <p className="text-xs text-muted-foreground/40 mt-1">Vind deze in CLIQ → Settings → Integrations → Private Integrations</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Location ID</label>
              <input
                value={cliqConfig.locationId}
                onChange={e => updateCliqConfig({ locationId: e.target.value })}
                placeholder="abc123xyz789"
                className={cn(inputCls, 'font-mono')}
              />
              <p className="text-xs text-muted-foreground/40 mt-1">Vind deze in CLIQ → Settings → Business Profile → Location ID</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Pipeline ID (optioneel)</label>
              <input
                value={cliqConfig.pipelineId}
                onChange={e => updateCliqConfig({ pipelineId: e.target.value })}
                placeholder="Wordt automatisch gevonden"
                className={cn(inputCls, 'font-mono')}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Calendar ID (optioneel)</label>
              <input
                value={cliqConfig.calendarId}
                onChange={e => updateCliqConfig({ calendarId: e.target.value })}
                placeholder="Wordt automatisch gevonden"
                className={cn(inputCls, 'font-mono')}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={testConnection} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.97] transition-transform">
              {testStatus === 'testing' ? '⏳ Testen...' : '🔌 Test verbinding'}
            </Button>
            {testStatus === 'success' && <span className="text-sm text-green-400 font-semibold">✅ Verbinding succesvol!</span>}
            {testStatus === 'error' && <span className="text-sm text-destructive font-semibold">❌ Vul API Key en Location ID in</span>}
          </div>

          <div className="border-t border-border/40 pt-4">
            <div className="text-xs font-bold text-muted-foreground/50 mb-3">SYNC OPTIES</div>
            <div className="space-y-2">
              {([
                ['syncContacts', 'Contacten synchroniseren'],
                ['syncOpportunities', 'Opportunities synchroniseren'],
                ['syncAppointments', 'Afspraken synchroniseren'],
                ['createNotes', 'Notities aanmaken in CLIQ'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cliqConfig[key]}
                    onChange={e => updateCliqConfig({ [key]: e.target.checked })}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground/70">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SYNC TAB */}
      {tab === 'sync' && (
        <div className="space-y-5">
          <div className="bg-primary/[0.06] border border-primary/15 rounded-xl p-4">
            <h3 className="text-sm font-bold text-primary mb-2">🔄 Handmatige Synchronisatie</h3>
            <p className="text-muted-foreground text-sm">Synchroniseer leads, contacten en pipeline data vanuit GoHighLevel.</p>
          </div>

          <div className="space-y-3">
            {([
              { key: 'leads', icon: '📋', label: 'Leads synchroniseren', desc: 'Haal de nieuwste leads op uit de Bellen pipeline' },
              { key: 'calendars', icon: '📅', label: 'Kalenders synchroniseren', desc: 'Haal beschikbare kalenders op uit CLIQ' },
            ] as const).map(item => (
              <div key={item.key} className="flex items-center gap-3 p-4 rounded-xl bg-foreground/[0.02] border border-border/40">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground/50">{item.desc}</div>
                </div>
                <Button
                  onClick={async () => {
                    setTestStatus(`syncing-${item.key}`);
                    try {
                      if (item.key === 'leads') {
                        await onSyncLeads();
                      } else if (item.key === 'calendars') {
                        await cliq.getCalendars();
                      }
                      setTestStatus(`synced-${item.key}`);
                    } catch {
                      setTestStatus(`error-${item.key}`);
                    }
                    setTimeout(() => setTestStatus(null), 3000);
                  }}
                  disabled={testStatus?.startsWith('syncing')}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold active:scale-[0.97] transition-transform disabled:opacity-40"
                >
                  {testStatus === `syncing-${item.key}` ? '⏳ Bezig...' : testStatus === `synced-${item.key}` ? '✅ Klaar!' : testStatus === `error-${item.key}` ? '❌ Fout' : '🔄 Sync'}
                </Button>
              </div>
            ))}
          </div>

          <Button
            onClick={async () => {
              setTestStatus('syncing-all');
              try {
                await onSyncLeads();
                setTestStatus('synced-all');
              } catch {
                setTestStatus('error-all');
              }
              setTimeout(() => setTestStatus(null), 3000);
            }}
            disabled={testStatus?.startsWith('syncing')}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold active:scale-[0.97] transition-transform disabled:opacity-40"
          >
            {testStatus === 'syncing-all' ? '⏳ Alles synchroniseren...' : testStatus === 'synced-all' ? '✅ Alles gesynchroniseerd!' : testStatus === 'error-all' ? '❌ Synchronisatie mislukt' : '🔄 Alles synchroniseren'}
          </Button>

          {!organizations.find(o => o.id === user?.organizationId)?.has_ghl_key && (
            <div className="bg-warning/[0.08] border border-warning/15 rounded-xl p-4">
              <p className="text-warning text-sm">⚠️ Stel eerst de CLIQ API koppeling in via het CLIQ Integratie tabblad.</p>
            </div>
          )}
        </div>
      )}

      {/* PIPELINE TAB */}
      {tab === 'pipeline' && (
        <div className="space-y-4">
          <div className="bg-primary/[0.06] border border-primary/15 rounded-xl p-4">
            <h3 className="text-sm font-bold text-primary mb-2">📊 Pipeline Stages</h3>
            <p className="text-muted-foreground text-sm">De Bel-Tool gebruikt deze stages om leads te categoriseren in CLIQ.</p>
          </div>

          <div className="space-y-2">
            {DEFAULT_PIPELINE_STAGES.map(stage => (
              <div key={stage.key} className="flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.02] border border-border/40">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{stage.name}</div>
                  <div className="text-[10px] text-muted-foreground/40 font-mono">{stage.key}</div>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={() => { setTestStatus('creating-pipeline'); setTimeout(() => { setTestStatus('pipeline-created'); setTimeout(() => setTestStatus(null), 3000); }, 2000); }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.97] transition-transform"
          >
            {testStatus === 'creating-pipeline' ? '⏳ Aanmaken...' : testStatus === 'pipeline-created' ? '✅ Pipeline aangemaakt!' : '📊 Pipeline aanmaken in CLIQ'}
          </Button>
        </div>
      )}

      {/* CUSTOM FIELDS TAB */}
      {tab === 'fields' && (
        <div className="space-y-4">
          <div className="bg-primary/[0.06] border border-primary/15 rounded-xl p-4">
            <h3 className="text-sm font-bold text-primary mb-2">📝 Custom Fields</h3>
            <p className="text-muted-foreground text-sm">De Bel-Tool slaat enquêteresultaten op in deze custom fields op het CLIQ contact.</p>
          </div>

          <div className="space-y-2">
            {DEFAULT_CUSTOM_FIELDS.map(field => (
              <div key={field.key} className="p-3 rounded-lg bg-foreground/[0.02] border border-border/40">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium">{field.label}</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{field.type}</span>
                </div>
                <div className="text-[10px] text-muted-foreground/40 font-mono">{field.key}</div>
                {field.options && <div className="flex flex-wrap gap-1 mt-1.5">{field.options.map(o => <span key={o} className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/[0.04] text-muted-foreground/60">{o}</span>)}</div>}
              </div>
            ))}
          </div>

          <Button
            onClick={() => { setTestStatus('creating-fields'); setTimeout(() => { setTestStatus('fields-created'); setTimeout(() => setTestStatus(null), 3000); }, 2000); }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.97] transition-transform"
          >
            {testStatus === 'creating-fields' ? '⏳ Aanmaken...' : testStatus === 'fields-created' ? '✅ Fields aangemaakt!' : '📝 Custom Fields aanmaken in CLIQ'}
          </Button>

          <div className="bg-warning/[0.08] border border-warning/15 rounded-xl p-4">
            <p className="text-warning text-sm">⚠️ Zorg dat je eerst de CLIQ API koppeling hebt ingesteld voordat je custom fields aanmaakt.</p>
          </div>
        </div>
      )}

      {/* LANGUAGE TAB */}
      {tab === 'lang' && (
        <div className="flex gap-2">
          {['nl', 'en'].map(l => (
            <Button
              key={l}
              onClick={() => { setLang(l); }}
              className={cn(
                'px-6 py-2.5 rounded-lg border-2 font-semibold text-sm transition-colors',
                lang === l ? 'border-primary bg-primary/10' : 'border-border'
              )}
            >
              {l === 'nl' ? '🇳🇱 Nederlands' : '🇬🇧 English'}
            </Button>
          ))}
        </div>
      )}

      {/* VRAGEN TAB */}
      {tab === 'vragen' && !editQ && (
        <div>
          <div className="text-xs text-muted-foreground mb-3">Klik op een vraag om te bewerken.</div>
          {qKeys.map(k => {
            const q = surveyConfig[k];
            return (
              <Button
                key={k}
                onClick={() => openEditor(k)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-foreground/[0.02] text-left w-full mb-1.5 hover:border-border transition-colors"
              >
                <span className="text-xl">{q.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px]">{q.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{q.script.slice(0, 70)}...</div>
                </div>
                {q.options && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {(q.options as any[]).length} opties
                  </span>
                )}
                <span className="text-muted-foreground/30">›</span>
              </Button>
            );
          })}
          <Button
            onClick={() => { setSurveyConfig(defaultSurvey()); }}
            className="mt-3 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-[11px] font-semibold active:scale-95 transition-transform"
          >
            Reset naar standaard
          </Button>
        </div>
      )}

      {tab === 'vragen' && editQ && draft && (
        <div>
          <Button onClick={() => { setEditQ(null); setDraft(null); }} className="text-primary text-[13px] font-semibold mb-3 bg-transparent border-none">
            ← Terug
          </Button>
          <div className="text-base font-bold mb-3.5">{draft.icon} {qLabels[editQ]} bewerken</div>

          <div className="flex gap-2.5 mb-3">
            <div className="w-16">
              <div className="text-[11px] text-muted-foreground mb-1">Icoon</div>
              <input value={draft.icon} onChange={e => setDraft({ ...draft, icon: e.target.value })} className={cn(inputCls, 'text-center text-lg p-1')} />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-muted-foreground mb-1">Titel</div>
              <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className={inputCls} />
            </div>
          </div>

          <div className="mb-3">
            <div className="text-[11px] text-muted-foreground mb-1">
              Script <span className="text-muted-foreground/30">— {'{naam} {uren} {taken} {groei} {ai}'}</span>
            </div>
            <textarea value={draft.script} onChange={e => setDraft({ ...draft, script: e.target.value })} rows={4} className={cn(inputCls, 'resize-y leading-relaxed')} />
          </div>

          <div className="mb-3">
            <div className="text-[11px] text-muted-foreground mb-1">Tip (optioneel)</div>
            <input value={draft.tip || ''} onChange={e => setDraft({ ...draft, tip: e.target.value })} className={inputCls} />
          </div>

          {draft.fieldLabel !== undefined && (
            <div className="mb-3">
              <div className="text-[11px] text-muted-foreground mb-1">Label</div>
              <input value={draft.fieldLabel} onChange={e => setDraft({ ...draft, fieldLabel: e.target.value })} className={inputCls} />
            </div>
          )}

          {(draft.type === 'choice' || draft.type === 'multi') && draft.options && (
            <div className="mb-3">
              <div className="text-[11px] text-muted-foreground mb-1.5">{draft.type === 'choice' ? 'Opties' : 'Taken'}</div>
              {(draft.options as string[]).map((o: string, i: number) => (
                <div key={i} className="flex gap-1.5 mb-1">
                  <input value={o} onChange={e => { const x = [...draft.options]; x[i] = e.target.value; setDraft({ ...draft, options: x }); }} className={cn(inputCls, 'flex-1')} />
                  <Button onClick={() => setDraft({ ...draft, options: draft.options.filter((_: any, j: number) => j !== i) })} className="text-destructive bg-transparent border-none">✕</Button>
                </div>
              ))}
              <div className="flex gap-1.5 mt-1">
                <input value={newOpt} onChange={e => setNewOpt(e.target.value)} placeholder="Nieuwe optie" className={cn(inputCls, 'flex-1')} />
                <Button onClick={() => { if (newOpt.trim()) { setDraft({ ...draft, options: [...draft.options, newOpt.trim()] }); setNewOpt(''); } }} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold">+</Button>
              </div>
            </div>
          )}

          {draft.type === 'select' && draft.options && (
            <div className="mb-3">
              <div className="text-[11px] text-muted-foreground mb-1.5">Keuzes</div>
              {(draft.options as SelectOption[]).map((o: SelectOption, i: number) => (
                <div key={i} className="p-2.5 rounded-lg border border-border/40 bg-foreground/[0.02] mb-1">
                  <div className="flex gap-1.5 mb-1">
                    <input value={o.icon || ''} onChange={e => { const x = [...draft.options]; x[i] = { ...x[i], icon: e.target.value }; setDraft({ ...draft, options: x }); }} className={cn(inputCls, 'w-11 text-center text-base p-1')} />
                    <input value={o.value} onChange={e => { const x = [...draft.options]; x[i] = { ...x[i], value: e.target.value }; setDraft({ ...draft, options: x }); }} className={cn(inputCls, 'flex-1')} placeholder="Waarde" />
                    <Button onClick={() => setDraft({ ...draft, options: draft.options.filter((_: any, j: number) => j !== i) })} className="text-destructive bg-transparent border-none">✕</Button>
                  </div>
                  <input value={o.label} onChange={e => { const x = [...draft.options]; x[i] = { ...x[i], label: e.target.value }; setDraft({ ...draft, options: x }); }} className={inputCls} placeholder="Toelichting" />
                </div>
              ))}
              <Button onClick={() => setDraft({ ...draft, options: [...draft.options, { value: '', label: '', icon: '📌' }] })} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold">+ Optie</Button>
            </div>
          )}

          <div className="flex gap-2 mt-3.5 pt-3 border-t border-border/40">
            <Button onClick={() => { setEditQ(null); setDraft(null); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-[13px] font-semibold">Annuleren</Button>
            <Button onClick={saveDraft} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold">Opslaan</Button>
          </div>
        </div>
      )}

      {/* API TAB */}
      {tab === 'api' && (
        <div>
          <div className="text-[11px] text-muted-foreground mb-1.5">Webhooks</div>
          {webhooks.map((wh, i) => (
            <div key={i} className="flex gap-1.5 mb-1 items-center">
              <input value={wh.url} readOnly className={cn(inputCls, 'flex-1')} />
              <Button
                onClick={() => { const n = [...webhooks]; n[i].active = !n[i].active; setWebhooks(n); }}
                className={cn('px-2.5 py-1.5 rounded-md text-[10px] font-bold border-none', wh.active ? 'bg-green-500/10 text-green-400' : 'bg-destructive/10 text-destructive')}
              >
                {wh.active ? 'ON' : 'OFF'}
              </Button>
              <Button onClick={() => { const n = webhooks.filter((_, j) => j !== i); setWebhooks(n); }} className="text-destructive bg-transparent border-none">✕</Button>
            </div>
          ))}
          <div className="flex gap-1.5 mt-1.5">
            <input value={newWh} onChange={e => setNewWh(e.target.value)} placeholder="https://..." className={cn(inputCls, 'flex-1')} />
            <Button onClick={() => { if (newWh.trim()) { const n = [...webhooks, { url: newWh.trim(), active: true }]; setWebhooks(n); setNewWh(''); } }} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold">+</Button>
          </div>
        </div>
      )}

      {/* RESET TAB */}
      {tab === 'reset' && (
        <div>
          {!confirmReset ? (
            <div className="flex flex-col gap-2">
              <Button onClick={() => setConfirmReset('mine')} className="px-4 py-2.5 rounded-lg bg-warning text-warning-foreground font-semibold text-[13px]">{t.resetMyStats}</Button>
              {user?.role === 'admin' && (
                <Button onClick={() => setConfirmReset('all')} className="px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-semibold text-[13px]">{t.resetAll}</Button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-sm mb-4">{t.resetConfirm}</div>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setConfirmReset(null)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-[13px] font-semibold">{t.cancel}</Button>
                <Button
                  onClick={() => {
                    if (confirmReset === 'mine' && user) {
                      const n = { ...allScores, [user.id]: initScores() };
                      setAllScores(n);
                      store.set('scores', n);
                    } else {
                      const n: Record<string, any> = {};
                      USERS.forEach(u => (n[u.id] = initScores()));
                      setAllScores(n);
                      store.set('scores', n);
                    }
                    setConfirmReset(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-[13px] font-semibold"
                >
                  {t.confirm}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TELEFONIE TAB */}
      {tab === 'telefonie' && (
        <div className="space-y-5">
          <div className="bg-primary/[0.06] border border-primary/15 rounded-xl p-4">
            <h3 className="text-sm font-bold text-primary mb-2">📞 VoIPzeker koppeling</h3>
            <p className="text-muted-foreground text-sm">Koppel de organisatie één keer met een koppelcode (invitation ID) uit het VoIPzeker Unite-portaal. Daarna kun je per medewerker een toestel (extensie) instellen.</p>
            <p className="text-muted-foreground text-sm mt-2">Bij bellen gaat eerst jouw eigen toestel over; neem op en daarna wordt het contact gebeld. Automatisch opnemen stel je in op je toestel/softphone.</p>
          </div>

          {user?.role === 'admin' && (
            <div className="border border-border/30 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold text-muted-foreground/50">🔑 KOPPELCODE</div>
              <div className="flex gap-2">
                <input
                  value={vzInvitation}
                  onChange={e => setVzInvitation(e.target.value)}
                  placeholder="6-cijferige koppelcode"
                  className={cn(inputCls, 'font-mono')}
                />
                <Button
                  onClick={vzConnect}
                  disabled={!vzInvitation.trim() || vzBusy !== null}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold whitespace-nowrap disabled:opacity-40"
                >
                  {vzBusy === 'connect' ? 'Koppelen…' : 'Koppelen'}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={vzTest} disabled={vzBusy !== null} className="px-3 py-2 rounded-lg border border-border text-[12px] font-semibold disabled:opacity-40">
                  {vzBusy === 'test' ? 'Testen…' : 'Verbinding testen'}
                </Button>
                <Button onClick={vzLoadExtensions} disabled={vzBusy !== null} className="px-3 py-2 rounded-lg border border-border text-[12px] font-semibold disabled:opacity-40">
                  {vzBusy === 'ext' ? 'Ophalen…' : 'Toestellen ophalen'}
                </Button>
              </div>
              {vzMsg && (
                <div className={cn('text-[12px] rounded-lg p-2 border', vzMsg.ok ? 'text-success border-success/20 bg-success/5' : 'text-destructive border-destructive/20 bg-destructive/5')}>
                  {vzMsg.text}
                </div>
              )}
              {vzExtensions.length > 0 && (
                <div className="text-[11px] text-muted-foreground/60 space-y-0.5 max-h-40 overflow-auto">
                  {vzExtensions.map(e => (
                    <div key={e.id} className="font-mono">{e.extno} · {e.username} <span className="font-sans">{e.name}</span></div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground/50">👤 TOESTEL PER MEDEWERKER ({teamProfiles.length}/{MAX_TEAM})</div>
            {teamProfiles.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.02] border border-border/40">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-info to-primary flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">{u.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px]">{u.name}</div>
                  <div className="text-[11px] text-muted-foreground/40">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-muted-foreground/50 whitespace-nowrap">Extensie</label>
                  <input
                    defaultValue={u.voipzekerExtension || ''}
                    onBlur={e => { if (e.target.value !== (u.voipzekerExtension || '')) saveExtension(u.id, e.target.value.trim()); }}
                    placeholder="bijv. 201"
                    className={cn(inputCls, 'w-28 text-center font-mono')}
                    disabled={user?.role !== 'admin'}
                  />
                  {savingExt === u.id && <span className="text-[10px] text-muted-foreground">…</span>}
                </div>
              </div>
            ))}
            {teamProfiles.length === 0 && (
              <p className="text-[12px] text-muted-foreground">Nog geen medewerkers — voeg ze toe via Gebruikersbeheer.</p>
            )}
          </div>

          <div className="bg-foreground/[0.02] border border-border/30 rounded-xl p-4">
            <div className="text-xs font-bold text-muted-foreground/50 mb-2">💡 UITLEG</div>
            <div className="text-[12px] text-muted-foreground/60 space-y-1">
              <p>• De extensie is de <strong>username</strong> van het toestel in VoIPzeker (zie "Toestellen ophalen").</p>
              <p>• Bij click-to-call gaat eerst dit toestel over, daarna wordt het contact gebeld.</p>
              <p>• Zonder eigen extensie valt de tool terug op het organisatie-toestel.</p>
              <p>• VoIPzeker geeft geen call-ID terug: ophangen doe je op je eigen toestel.</p>
            </div>
          </div>

          <div className="bg-foreground/[0.02] border border-border/30 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-muted-foreground/50 mb-2">⚙️ BELFUNCTIES</div>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-[13px] font-semibold text-foreground">Auto-dial</div>
                <div className="text-[11px] text-muted-foreground">Na elk gesprek automatisch het volgende contact laden (5s countdown)</div>
              </div>
              <input
                type="checkbox"
                checked={store.get('autoDialEnabled', true)}
                onChange={e => { store.set('autoDialEnabled', e.target.checked); }}
                className="w-4 h-4 accent-primary"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-[13px] font-semibold text-foreground">Geluidssignalen</div>
                <div className="text-[11px] text-muted-foreground">Cha-ching bij afspraak, ding bij enquête, streak-sounds</div>
              </div>
              <input
                type="checkbox"
                checked={store.get('soundEffects', true)}
                onChange={e => { store.set('soundEffects', e.target.checked); }}
                className="w-4 h-4 accent-primary"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="text-[13px] font-semibold text-foreground">Wrap-up timer</div>
                <div className="text-[11px] text-muted-foreground">30 seconden aftelling na elk gesprek voor notities</div>
              </div>
              <input
                type="checkbox"
                checked={store.get('wrapUpEnabled', true)}
                onChange={e => { store.set('wrapUpEnabled', e.target.checked); }}
                className="w-4 h-4 accent-primary"
              />
            </label>
          </div>

          <div className="bg-foreground/[0.02] border border-border/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-muted-foreground/50">👥 ADVISEURS</div>
              <Button
                onClick={refreshAdvisors}
                disabled={advisorsLoading}
                className="text-[11px] text-primary font-semibold hover:underline disabled:opacity-50"
              >
                {advisorsLoading ? 'Laden...' : '🔄 Ververs uit CLIQ'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground/60">
              Adviseurs worden automatisch opgehaald uit je CLIQ-account. Deze verschijnen als opties bij het inplannen van afspraken.
            </p>
            <div className="space-y-1.5">
              {advisors.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {a.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-foreground truncate">{a.name}</div>
                    {a.specialty && <div className="text-[10px] text-muted-foreground truncate">{a.specialty}</div>}
                  </div>
                  <div className="text-[9px] text-muted-foreground/40 font-mono">{a.id.substring(0, 8)}...</div>
                </div>
              ))}
              {advisors.length === 0 && (
                <div className="text-center text-muted-foreground/30 text-[12px] py-4">
                  Geen adviseurs gevonden. Klik "Ververs uit CLIQ" of voeg gebruikers toe in GHL.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && user?.role === 'admin' && (
        <div className="space-y-4">
          <div className="bg-primary/[0.06] border border-primary/15 rounded-xl p-4">
            <h3 className="text-sm font-bold text-primary mb-2">👥 Gebruikersbeheer</h3>
            <p className="text-muted-foreground text-sm">Medewerkers staan centraal in de database, zodat iedereen op elk apparaat kan inloggen. Maximaal {MAX_TEAM} medewerkers.</p>
          </div>

          {vzMsg && <p role="status" className={vzMsg.ok ? 'text-success text-sm' : 'text-destructive text-sm'}>{vzMsg.text}</p>}
          {/* Existing users */}
          <div className="space-y-1.5">
            {teamProfiles.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-foreground/[0.02]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-info to-primary flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">{u.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px]">{u.name}</div>
                  <div className="text-[11px] text-muted-foreground/40">{u.email}</div>
                  {u.voipzekerExtension && <div className="text-[10px] text-muted-foreground/30 font-mono">Extensie: {u.voipzekerExtension}</div>}
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: u.role === 'admin' ? 'hsl(0 84% 60% / 0.1)' : u.role === 'manager' ? 'hsl(38 92% 50% / 0.1)' : 'hsl(var(--primary) / 0.1)',
                    color: u.role === 'admin' ? 'hsl(0 84% 60%)' : u.role === 'manager' ? 'hsl(38 92% 50%)' : 'hsl(var(--primary))',
                  }}
                >
                  {u.role}
                </span>
                <Button
                  onClick={() => setEditingUser({ ...u })}
                  className="text-[11px] text-primary font-semibold bg-transparent border-none hover:underline"
                >
                  Bewerk
                </Button>
              </div>
            ))}
            {teamProfiles.length === 0 && <p className="text-[12px] text-muted-foreground">Nog geen medewerkers in de database.</p>}
          </div>

          {/* Edit user inline */}
          {editingUser && (
            <div className="border border-primary/20 rounded-xl p-4 bg-primary/[0.03] space-y-3">
              <div className="text-sm font-bold text-primary">✏️ {editingUser.name} bewerken</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Naam</label>
                  <input value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Email</label>
                  <input value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Rol</label>
                  <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value as User['role'] })} className={inputCls}>
                    <option value="caller">Beller</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">VoIPzeker extensie</label>
                  <input value={editingUser.voipzekerExtension || ''} onChange={e => setEditingUser({ ...editingUser, voipzekerExtension: e.target.value })} placeholder="bijv. 201" className={cn(inputCls, 'font-mono')} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-[12px] font-semibold">Annuleren</Button>
                <Button
                  onClick={async () => {
                    try {
                      await updateProfile(editingUser.id, {
                        name: editingUser.name,
                        email: editingUser.email,
                        role: editingUser.role,
                        avatar: editingUser.name.substring(0, 2).toUpperCase(),
                        voipzekerExtension: editingUser.voipzekerExtension || '',
                      });
                      setEditingUser(null);
                    } catch (e) {
                      setVzMsg({ ok: false, text: e instanceof Error ? e.message : 'Opslaan mislukt' });
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold"
                >
                  Opslaan
                </Button>
              </div>
            </div>
          )}

          {/* Add new user */}
          <div className="border border-border/30 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-muted-foreground/50">➕ NIEUWE MEDEWERKER TOEVOEGEN</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Naam</label>
                <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Jan Jansen" className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Email</label>
                <input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="jan@cliqmakers.nl" className={inputCls} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Rol</label>
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as User['role'] })} className={inputCls}>
                  <option value="caller">Beller</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">VoIPzeker extensie</label>
                <input value={newUser.voipzekerExtension || ''} onChange={e => setNewUser({ ...newUser, voipzekerExtension: e.target.value })} placeholder="bijv. 203" className={cn(inputCls, 'font-mono')} />
              </div>
            </div>
            {teamProfiles.length >= MAX_TEAM && (
              <p className="text-[11px] text-warning">Maximaal {MAX_TEAM} medewerkers bereikt.</p>
            )}
            <Button
              onClick={async () => {
                if (!newUser.name.trim() || !newUser.email.trim()) return;
                try {
                  await createProfile({
                    name: newUser.name.trim(),
                    email: newUser.email.trim(),
                    role: newUser.role || 'caller',
                    voipzekerExtension: newUser.voipzekerExtension || '',
                    organizationId: user?.organizationId,
                  });
                  setNewUser({ name: '', email: '', role: 'caller', voipzekerExtension: '' });
                  setVzMsg({ok:true,text:'Uitnodiging verstuurd.'});
                } catch (e) {
                  setVzMsg({ ok: false, text: e instanceof Error ? e.message : 'Toevoegen mislukt' });
                }
              }}
              disabled={!newUser.name.trim() || !newUser.email.trim() || teamProfiles.length >= MAX_TEAM}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold active:scale-[0.97] transition-transform disabled:opacity-40"
            >
              Medewerker uitnodigen
            </Button>
          </div>
        </div>
      )}

      {/* ORGANIZATIONS TAB */}
      {tab === 'orgs' && user?.role === 'admin' && (
        <div className="space-y-5">
          <div className="bg-primary/[0.06] border border-primary/15 rounded-xl p-4">
            <h3 className="text-sm font-bold text-primary mb-2">🏢 Organisatiebeheer</h3>
            <p className="text-muted-foreground text-sm">Beheer de bedrijven die meedoen aan de competitie. Elk bedrijf heeft een eigen GHL sub-account.</p>
          </div>

          {/* Existing orgs */}
          <div className="space-y-2">
            {organizations.map(org => (
              <details key={org.id} className="p-4 rounded-xl bg-foreground/[0.02] border border-border/40 group">
                <summary className="flex items-center justify-between cursor-pointer">
                  <div className="font-semibold text-sm">{org.name}</div>
                  <span className="text-[10px] font-mono text-muted-foreground/40">{org.slug}</span>
                </summary>
                <div className="mt-3 space-y-2">
                  <div className="text-[11px] text-muted-foreground/50">
                    {org.has_ghl_key ? '🔗 GHL gekoppeld' : '⚠️ Geen GHL API key'}
                    {org.ghl_location_id ? ` · Location: ${org.ghl_location_id.slice(0, 8)}...` : ''}
                  </div>
                  <div className="grid gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Bedrijfsnaam (branding)</label>
                      <input
                        defaultValue={org.brand_name || ''}
                        onBlur={e => updateOrg(org.id, { brand_name: e.target.value || undefined } as any)}
                        placeholder={org.name}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Enquête-link</label>
                      <input
                        defaultValue={org.enquete_link || ''}
                        onBlur={e => updateOrg(org.id, { enquete_link: e.target.value || undefined } as any)}
                        placeholder="https://enquete.bedrijf.nl/enquete/..."
                        className={cn(inputCls, 'font-mono text-[11px]')}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-1 block">Booking-link</label>
                      <input
                        defaultValue={org.booking_link || ''}
                        onBlur={e => updateOrg(org.id, { booking_link: e.target.value || undefined } as any)}
                        placeholder="https://adviesgesprekken.bedrijf.nl/"
                        className={cn(inputCls, 'font-mono text-[11px]')}
                      />
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>

          {/* Add new org */}
          <div className="border-t border-border/40 pt-4">
            <div className="text-xs font-bold text-muted-foreground/50 mb-3">ORGANISATIE TOEVOEGEN</div>
            <div className="grid gap-3">
              <input
                value={newOrgName}
                onChange={e => { setNewOrgName(e.target.value); setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')); }}
                placeholder="Bedrijfsnaam (bijv. Future Media)"
                className={inputCls}
              />
              <input
                value={newOrgSlug}
                onChange={e => setNewOrgSlug(e.target.value)}
                placeholder="Slug (bijv. future-media)"
                className={cn(inputCls, 'font-mono')}
              />
              <input
                type="password"
                value={newOrgApiKey}
                onChange={e => setNewOrgApiKey(e.target.value)}
                placeholder="GHL API Key (optioneel, later in te stellen)"
                className={cn(inputCls, 'font-mono')}
              />
              <input
                value={newOrgLocationId}
                onChange={e => setNewOrgLocationId(e.target.value)}
                placeholder="GHL Location ID (optioneel)"
                className={cn(inputCls, 'font-mono')}
              />
              <Button
                onClick={async () => {
                  if (!newOrgName.trim() || !newOrgSlug.trim()) return;
                  try {
                    await createOrg({
                      name: newOrgName.trim(),
                      slug: newOrgSlug.trim(),
                      ghl_api_key: newOrgApiKey || undefined,
                      ghl_location_id: newOrgLocationId || undefined,
                    });
                    setNewOrgName('');
                    setNewOrgSlug('');
                    setNewOrgApiKey('');
                    setNewOrgLocationId('');
                  } catch (err) {
                    console.error('Error creating org:', err);
                  }
                }}
                disabled={!newOrgName.trim() || !newOrgSlug.trim()}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.97] transition-transform disabled:opacity-40"
              >
                🏢 Organisatie toevoegen
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
