import { useState } from 'react';
import { Modal } from './Modal';
import { useBelTool } from '@/contexts/BelToolContext';
import { USERS, defaultSurvey } from '@/lib/beltool-data';
import { initScores } from '@/lib/beltool-scoring';
import { store } from '@/lib/beltool-store';
import { cn } from '@/lib/utils';
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

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, setLang, user, allScores, setAllScores, webhooks, setWebhooks, apiKey, setApiKey, t, surveyConfig, setSurveyConfig, ghlConfig, setGhlConfig } = useBelTool();
  const [tab, setTab] = useState('ghl');
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [newWh, setNewWh] = useState('');
  const [editQ, setEditQ] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [newOpt, setNewOpt] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);

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
    store.set('surveyConfig', n);
    setEditQ(null);
    setDraft(null);
  };

  const updateGhlConfig = (partial: Partial<typeof ghlConfig>) => {
    const next = { ...ghlConfig, ...partial };
    setGhlConfig(next);
    store.set('ghlConfig', next);
  };

  const testConnection = () => {
    setTestStatus('testing');
    setTimeout(() => {
      setTestStatus(ghlConfig.apiKey && ghlConfig.locationId ? 'success' : 'error');
      setTimeout(() => setTestStatus(null), 3000);
    }, 1500);
  };

  const tabs = [
    { id: 'ghl', label: '🔗 GHL Integratie' },
    { id: 'vragen', label: '❓ Enquêtevragen' },
    { id: 'pipeline', label: '📊 Pipeline' },
    { id: 'fields', label: '📝 Custom Fields' },
    { id: 'lang', label: t.language },
    { id: 'api', label: t.apiKeys },
    { id: 'reset', label: t.resetStats },
    ...(user?.role === 'admin' ? [{ id: 'users', label: t.userManagement }] : []),
  ];

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-foreground/[0.04] text-foreground text-[13px] outline-none focus:ring-1 focus:ring-primary';

  return (
    <Modal open={open} onClose={onClose} title={t.settings} wide>
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              tab === tb.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* GHL INTEGRATIE TAB */}
      {tab === 'ghl' && (
        <div className="space-y-5">
          <div className="bg-primary/[0.06] border border-primary/15 rounded-xl p-4">
            <h3 className="text-sm font-bold text-primary mb-2">🔗 GoHighLevel Integratie</h3>
            <p className="text-muted-foreground text-sm">Koppel je GHL account om leads, contacten en afspraken te synchroniseren.</p>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">GHL API Key (Private Integration)</label>
              <input
                type="password"
                value={ghlConfig.apiKey}
                onChange={e => updateGhlConfig({ apiKey: e.target.value })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className={cn(inputCls, 'font-mono')}
              />
              <p className="text-xs text-muted-foreground/40 mt-1">Vind deze in GHL → Settings → Integrations → Private Integrations</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Location ID</label>
              <input
                value={ghlConfig.locationId}
                onChange={e => updateGhlConfig({ locationId: e.target.value })}
                placeholder="abc123xyz789"
                className={cn(inputCls, 'font-mono')}
              />
              <p className="text-xs text-muted-foreground/40 mt-1">Vind deze in GHL → Settings → Business Profile → Location ID</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Pipeline ID (optioneel)</label>
              <input
                value={ghlConfig.pipelineId}
                onChange={e => updateGhlConfig({ pipelineId: e.target.value })}
                placeholder="Wordt automatisch gevonden"
                className={cn(inputCls, 'font-mono')}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Calendar ID (optioneel)</label>
              <input
                value={ghlConfig.calendarId}
                onChange={e => updateGhlConfig({ calendarId: e.target.value })}
                placeholder="Wordt automatisch gevonden"
                className={cn(inputCls, 'font-mono')}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={testConnection} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.97] transition-transform">
              {testStatus === 'testing' ? '⏳ Testen...' : '🔌 Test verbinding'}
            </button>
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
                ['createNotes', 'Notities aanmaken in GHL'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ghlConfig[key]}
                    onChange={e => updateGhlConfig({ [key]: e.target.checked })}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm text-foreground/70">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PIPELINE TAB */}
      {tab === 'pipeline' && (
        <div className="space-y-4">
          <div className="bg-primary/[0.06] border border-primary/15 rounded-xl p-4">
            <h3 className="text-sm font-bold text-primary mb-2">📊 Pipeline Stages</h3>
            <p className="text-muted-foreground text-sm">De Bel-Tool gebruikt deze stages om leads te categoriseren in GHL.</p>
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

          <button
            onClick={() => { setTestStatus('creating-pipeline'); setTimeout(() => { setTestStatus('pipeline-created'); setTimeout(() => setTestStatus(null), 3000); }, 2000); }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.97] transition-transform"
          >
            {testStatus === 'creating-pipeline' ? '⏳ Aanmaken...' : testStatus === 'pipeline-created' ? '✅ Pipeline aangemaakt!' : '📊 Pipeline aanmaken in GHL'}
          </button>
        </div>
      )}

      {/* CUSTOM FIELDS TAB */}
      {tab === 'fields' && (
        <div className="space-y-4">
          <div className="bg-primary/[0.06] border border-primary/15 rounded-xl p-4">
            <h3 className="text-sm font-bold text-primary mb-2">📝 Custom Fields</h3>
            <p className="text-muted-foreground text-sm">De Bel-Tool slaat enquêteresultaten op in deze custom fields op het GHL contact.</p>
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

          <button
            onClick={() => { setTestStatus('creating-fields'); setTimeout(() => { setTestStatus('fields-created'); setTimeout(() => setTestStatus(null), 3000); }, 2000); }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.97] transition-transform"
          >
            {testStatus === 'creating-fields' ? '⏳ Aanmaken...' : testStatus === 'fields-created' ? '✅ Fields aangemaakt!' : '📝 Custom Fields aanmaken in GHL'}
          </button>

          <div className="bg-warning/[0.08] border border-warning/15 rounded-xl p-4">
            <p className="text-warning text-sm">⚠️ Zorg dat je eerst de GHL API koppeling hebt ingesteld voordat je custom fields aanmaakt.</p>
          </div>
        </div>
      )}

      {/* LANGUAGE TAB */}
      {tab === 'lang' && (
        <div className="flex gap-2">
          {['nl', 'en'].map(l => (
            <button
              key={l}
              onClick={() => { setLang(l); store.set('lang', l); }}
              className={cn(
                'px-6 py-2.5 rounded-lg border-2 font-semibold text-sm transition-colors',
                lang === l ? 'border-primary bg-primary/10' : 'border-border'
              )}
            >
              {l === 'nl' ? '🇳🇱 Nederlands' : '🇬🇧 English'}
            </button>
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
              <button
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
              </button>
            );
          })}
          <button
            onClick={() => { setSurveyConfig(defaultSurvey()); store.set('surveyConfig', defaultSurvey()); }}
            className="mt-3 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-[11px] font-semibold active:scale-95 transition-transform"
          >
            Reset naar standaard
          </button>
        </div>
      )}

      {tab === 'vragen' && editQ && draft && (
        <div>
          <button onClick={() => { setEditQ(null); setDraft(null); }} className="text-primary text-[13px] font-semibold mb-3 bg-transparent border-none">
            ← Terug
          </button>
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
                  <button onClick={() => setDraft({ ...draft, options: draft.options.filter((_: any, j: number) => j !== i) })} className="text-destructive bg-transparent border-none">✕</button>
                </div>
              ))}
              <div className="flex gap-1.5 mt-1">
                <input value={newOpt} onChange={e => setNewOpt(e.target.value)} placeholder="Nieuwe optie" className={cn(inputCls, 'flex-1')} />
                <button onClick={() => { if (newOpt.trim()) { setDraft({ ...draft, options: [...draft.options, newOpt.trim()] }); setNewOpt(''); } }} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold">+</button>
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
                    <button onClick={() => setDraft({ ...draft, options: draft.options.filter((_: any, j: number) => j !== i) })} className="text-destructive bg-transparent border-none">✕</button>
                  </div>
                  <input value={o.label} onChange={e => { const x = [...draft.options]; x[i] = { ...x[i], label: e.target.value }; setDraft({ ...draft, options: x }); }} className={inputCls} placeholder="Toelichting" />
                </div>
              ))}
              <button onClick={() => setDraft({ ...draft, options: [...draft.options, { value: '', label: '', icon: '📌' }] })} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold">+ Optie</button>
            </div>
          )}

          <div className="flex gap-2 mt-3.5 pt-3 border-t border-border/40">
            <button onClick={() => { setEditQ(null); setDraft(null); }} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-[13px] font-semibold">Annuleren</button>
            <button onClick={saveDraft} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold">Opslaan</button>
          </div>
        </div>
      )}

      {/* API TAB */}
      {tab === 'api' && (
        <div>
          <div className="text-[11px] text-muted-foreground mb-1">API Key</div>
          <input value={apiKey} onChange={e => { setApiKey(e.target.value); store.set('apiKey', e.target.value); }} placeholder="ghl-api-key-..." className={cn(inputCls, 'mb-3.5')} />
          <div className="text-[11px] text-muted-foreground mb-1.5">Webhooks</div>
          {webhooks.map((wh, i) => (
            <div key={i} className="flex gap-1.5 mb-1 items-center">
              <input value={wh.url} readOnly className={cn(inputCls, 'flex-1')} />
              <button
                onClick={() => { const n = [...webhooks]; n[i].active = !n[i].active; setWebhooks(n); store.set('webhooks', n); }}
                className={cn('px-2.5 py-1.5 rounded-md text-[10px] font-bold border-none', wh.active ? 'bg-green-500/10 text-green-400' : 'bg-destructive/10 text-destructive')}
              >
                {wh.active ? 'ON' : 'OFF'}
              </button>
              <button onClick={() => { const n = webhooks.filter((_, j) => j !== i); setWebhooks(n); store.set('webhooks', n); }} className="text-destructive bg-transparent border-none">✕</button>
            </div>
          ))}
          <div className="flex gap-1.5 mt-1.5">
            <input value={newWh} onChange={e => setNewWh(e.target.value)} placeholder="https://..." className={cn(inputCls, 'flex-1')} />
            <button onClick={() => { if (newWh.trim()) { const n = [...webhooks, { url: newWh.trim(), active: true }]; setWebhooks(n); store.set('webhooks', n); setNewWh(''); } }} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold">+</button>
          </div>
        </div>
      )}

      {/* RESET TAB */}
      {tab === 'reset' && (
        <div>
          {!confirmReset ? (
            <div className="flex flex-col gap-2">
              <button onClick={() => setConfirmReset('mine')} className="px-4 py-2.5 rounded-lg bg-warning text-warning-foreground font-semibold text-[13px]">{t.resetMyStats}</button>
              {user?.role === 'admin' && (
                <button onClick={() => setConfirmReset('all')} className="px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-semibold text-[13px]">{t.resetAll}</button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-sm mb-4">{t.resetConfirm}</div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setConfirmReset(null)} className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-[13px] font-semibold">{t.cancel}</button>
                <button
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
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <div>
          {USERS.map(u => (
            <div key={u.id} className="flex items-center gap-3 py-2.5 border-b border-border/30">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-info to-primary flex items-center justify-center text-[11px] font-bold text-white">{u.avatar}</div>
              <div className="flex-1">
                <div className="font-semibold text-[13px]">{u.name}</div>
                <div className="text-[11px] text-muted-foreground">{u.email}</div>
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
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
