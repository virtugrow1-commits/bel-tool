/**
 * GHL iFrame BelTool — Standalone calling interface for GoHighLevel embedding.
 *
 * Uses local mock state structured for easy API replacement later.
 */
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone, PhoneOff, Send, Calendar, Clock, CheckCircle2,
  XCircle, AlertCircle, User, Mail, FileText, ArrowRight,
} from 'lucide-react';

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  leadStatus: string;
  callOutcome?: string;
  surveySent: boolean;
  surveyCompleted: boolean;
  callbackRequired: boolean;
  appointmentStatus?: string;
  lastNote?: string;
}

/* ─── Mock API layer ──────────────────────────────────────────────────────── */
const delay = (ms = 400) => new Promise(r => setTimeout(r, ms));

const api = {
  async updateContact(id: string, patch: Partial<Contact>): Promise<Contact | null> {
    await delay();
    // In production: PUT /contacts/:id → GHL API
    console.log('[API] updateContact', id, patch);
    return null; // caller uses local state
  },
  async sendSurvey(contactId: string, email: string): Promise<boolean> {
    await delay(600);
    console.log('[API] sendSurvey', contactId, email);
    return true;
  },
  async bookAppointment(contactId: string): Promise<boolean> {
    await delay(500);
    console.log('[API] bookAppointment', contactId);
    return true;
  },
};

/* ─── Seed data ───────────────────────────────────────────────────────────── */
const SEED: Contact[] = [
  { id: '1', name: 'Jan de Vries', phone: '+31612345678', email: 'jan@bedrijf.nl', leadStatus: 'new', surveySent: false, surveyCompleted: false, callbackRequired: false, lastNote: 'Eerste contact via LinkedIn' },
  { id: '2', name: 'Maria Jansen', phone: '+31687654321', email: 'maria@example.com', leadStatus: 'callback_ready', surveySent: true, surveyCompleted: true, callbackRequired: true, lastNote: 'Enquête ingevuld, wil teruggebeld worden' },
  { id: '3', name: 'Pieter Bakker', phone: '+31698765432', email: 'pieter@firma.nl', leadStatus: 'survey_pending', surveySent: true, surveyCompleted: false, callbackRequired: true, lastNote: 'Druk maar geïnteresseerd' },
  { id: '4', name: 'Sophie van Dijk', phone: '+31676543210', email: '', leadStatus: 'new', surveySent: false, surveyCompleted: false, callbackRequired: false },
];

/* ─── Status helpers ──────────────────────────────────────────────────────── */
const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  new:                { label: 'Nieuw',              variant: 'secondary' },
  survey_pending:     { label: 'Enquête pending',    variant: 'outline' },
  callback_ready:     { label: 'Callback klaar',     variant: 'default' },
  appointment_booked: { label: 'Afspraak gepland',   variant: 'default' },
  not_interested:     { label: 'Geen interesse',     variant: 'destructive' },
  no_answer:          { label: 'Geen gehoor',        variant: 'secondary' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

/* ─── Flow steps ──────────────────────────────────────────────────────────── */
const FLOW_STEPS = [
  { key: 'call',     label: 'Gebeld',           icon: Phone },
  { key: 'survey',   label: 'Enquête verstuurd', icon: Send },
  { key: 'filled',   label: 'Enquête ingevuld',  icon: CheckCircle2 },
  { key: 'callback', label: 'Teruggebeld',       icon: Phone },
  { key: 'booked',   label: 'Afspraak',          icon: Calendar },
];

function getFlowIndex(c: Contact): number {
  if (c.appointmentStatus === 'booked') return 4;
  if (c.surveyCompleted && c.callbackRequired) return 3;
  if (c.surveyCompleted) return 2;
  if (c.surveySent) return 1;
  if (c.callOutcome) return 0;
  return -1;
}

/* ─── Toast ───────────────────────────────────────────────────────────────── */
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in">
      <div className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-primary-foreground shadow-lg">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function GhlIframe() {
  const [contacts, setContacts] = useState<Contact[]>(SEED);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = contacts.find(c => c.id === selectedId) || null;
  const callbackQueue = contacts.filter(c => c.callbackRequired && c.leadStatus === 'callback_ready');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const patch = useCallback((id: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    api.updateContact(id, updates);
  }, []);

  /* ── Actions ──────────────────────────────────────────────────────────── */
  const handleNoAnswer = () => {
    if (!selected) return;
    patch(selected.id, { callOutcome: 'no_answer', leadStatus: 'no_answer', lastNote: `Geen gehoor – ${new Date().toLocaleString('nl-NL')}` });
    showToast('Geen gehoor geregistreerd');
  };

  const handleNotInterested = () => {
    if (!selected) return;
    patch(selected.id, { callOutcome: 'not_interested', leadStatus: 'not_interested', callbackRequired: false, lastNote: `Niet geïnteresseerd – ${new Date().toLocaleString('nl-NL')}` });
    showToast('Contact gemarkeerd als niet geïnteresseerd');
  };

  const handleBusyInterested = () => {
    if (!selected) return;
    patch(selected.id, {
      callOutcome: 'busy_interested',
      leadStatus: 'survey_pending',
      callbackRequired: true,
      lastNote: `Druk maar geïnteresseerd – ${new Date().toLocaleString('nl-NL')}`,
    });
    showToast('Gemarkeerd als druk maar geïnteresseerd');
  };

  const handleSendSurvey = async () => {
    if (!selected) return;
    if (!selected.email) {
      showToast('⚠️ Geen e-mailadres bekend – enquête kan niet verstuurd worden');
      return;
    }
    setBusy(true);
    await api.sendSurvey(selected.id, selected.email);
    patch(selected.id, { surveySent: true, lastNote: `Enquête verstuurd naar ${selected.email} – ${new Date().toLocaleString('nl-NL')}` });
    setBusy(false);
    showToast('Enquête verstuurd!');
  };

  const handleSurveyCompleted = () => {
    if (!selected) return;
    patch(selected.id, { surveyCompleted: true, leadStatus: 'callback_ready', lastNote: `Enquête ingevuld – ${new Date().toLocaleString('nl-NL')}` });
    showToast('Enquête als ingevuld gemarkeerd');
  };

  const handleAppointment = async () => {
    if (!selected) return;
    setBusy(true);
    await api.bookAppointment(selected.id);
    patch(selected.id, { appointmentStatus: 'booked', callbackRequired: false, leadStatus: 'appointment_booked', lastNote: `Afspraak gepland – ${new Date().toLocaleString('nl-NL')}` });
    setBusy(false);
    showToast('Afspraak ingepland!');
  };

  const flowIdx = selected ? getFlowIndex(selected) : -1;

  /* ═══ Render ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">

        {/* ── Left column ──────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Contact selector */}
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Contacten</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {contacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                    c.id === selectedId
                      ? 'bg-primary/10 ring-2 ring-primary/40'
                      : 'hover:bg-muted/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.leadStatus} />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Contact detail + actions */}
          {selected && (
            <>
              {/* Flow progress */}
              <Card className="rounded-2xl shadow-md">
                <CardContent className="py-5">
                  <div className="flex items-center justify-between">
                    {FLOW_STEPS.map((step, i) => {
                      const done = i <= flowIdx;
                      const Icon = step.icon;
                      return (
                        <div key={step.key} className="flex flex-1 items-center">
                          <div className={`flex flex-col items-center gap-1 ${done ? 'text-primary' : 'text-muted-foreground/40'}`}>
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${done ? 'border-primary bg-primary/10' : 'border-muted'}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-[10px] font-medium">{step.label}</span>
                          </div>
                          {i < FLOW_STEPS.length - 1 && (
                            <div className={`mx-1 h-0.5 flex-1 rounded ${i < flowIdx ? 'bg-primary' : 'bg-muted'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Contact panel */}
              <Card className="rounded-2xl shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Contact Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Row icon={<User className="h-4 w-4" />} label="Naam" value={selected.name} />
                  <Row icon={<Phone className="h-4 w-4" />} label="Telefoon" value={selected.phone} />
                  <Row
                    icon={<Mail className="h-4 w-4" />}
                    label="E-mail"
                    value={selected.email || '—'}
                    warn={!selected.email}
                  />
                  <Row icon={<FileText className="h-4 w-4" />} label="Status" value={<StatusBadge status={selected.leadStatus} />} />
                  {selected.lastNote && (
                    <Row icon={<AlertCircle className="h-4 w-4" />} label="Laatste notitie" value={selected.lastNote} />
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card className="rounded-2xl shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Acties</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <ActionBtn
                    icon={<PhoneOff className="h-4 w-4" />}
                    label="Geen gehoor"
                    onClick={handleNoAnswer}
                    disabled={busy || selected.leadStatus === 'appointment_booked'}
                    variant="secondary"
                  />
                  <ActionBtn
                    icon={<XCircle className="h-4 w-4" />}
                    label="Niet geïnteresseerd"
                    onClick={handleNotInterested}
                    disabled={busy || selected.leadStatus === 'not_interested'}
                    variant="destructive"
                  />
                  <ActionBtn
                    icon={<Clock className="h-4 w-4" />}
                    label="Druk maar geïnteresseerd"
                    onClick={handleBusyInterested}
                    disabled={busy || selected.callOutcome === 'busy_interested'}
                    variant="outline"
                  />
                  <ActionBtn
                    icon={<Send className="h-4 w-4" />}
                    label="Enquête versturen"
                    onClick={handleSendSurvey}
                    disabled={busy || selected.surveySent || !selected.email}
                    variant="outline"
                  />
                  <ActionBtn
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Enquête ingevuld"
                    onClick={handleSurveyCompleted}
                    disabled={busy || selected.surveyCompleted || !selected.surveySent}
                    variant="outline"
                  />
                  <ActionBtn
                    icon={<Calendar className="h-4 w-4" />}
                    label="Afspraak gemaakt"
                    onClick={handleAppointment}
                    disabled={busy || selected.appointmentStatus === 'booked'}
                    variant="default"
                  />
                </CardContent>
              </Card>

              {/* Status tracking */}
              <Card className="rounded-2xl shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Status Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatusIndicator label="Enquête verstuurd" active={selected.surveySent} />
                    <StatusIndicator label="Enquête ingevuld" active={selected.surveyCompleted} />
                    <StatusIndicator label="Callback nodig" active={selected.callbackRequired} />
                    <StatusIndicator label="Uitkomst" value={selected.callOutcome?.replace('_', ' ') || '—'} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!selected && (
            <Card className="rounded-2xl shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <User className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">Selecteer een contact om te beginnen</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right column: Callback Queue ─────────────────────────────── */}
        <div className="space-y-6">
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Callback Queue</CardTitle>
                <Badge variant="secondary">{callbackQueue.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {callbackQueue.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Geen callbacks in de wachtrij</p>
              ) : (
                <div className="space-y-2">
                  {callbackQueue.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/60 ${
                        c.id === selectedId ? 'bg-primary/10 ring-2 ring-primary/40' : ''
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.lastNote || c.phone}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick stats */}
          <Card className="rounded-2xl shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Overzicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Totaal" value={contacts.length} />
                <Stat label="Callbacks" value={callbackQueue.length} />
                <Stat label="Enquêtes verstuurd" value={contacts.filter(c => c.surveySent).length} />
                <Stat label="Afspraken" value={contacts.filter(c => c.appointmentStatus === 'booked').length} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

/* ─── Small UI helpers ────────────────────────────────────────────────────── */
function Row({ icon, label, value, warn }: { icon: React.ReactNode; label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${warn ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, disabled, variant }: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled: boolean;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}) {
  return (
    <Button variant={variant} onClick={onClick} disabled={disabled} className="h-auto flex-col gap-1.5 rounded-xl py-3 text-xs">
      {icon}
      {label}
    </Button>
  );
}

function StatusIndicator({ label, active, value }: { label: string; active?: boolean; value?: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {value !== undefined ? (
        <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
      ) : (
        <p className={`mt-1 text-sm font-semibold ${active ? 'text-primary' : 'text-muted-foreground'}`}>
          {active ? '✓ Ja' : '✗ Nee'}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
