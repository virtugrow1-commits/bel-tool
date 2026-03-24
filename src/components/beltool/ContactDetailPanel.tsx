import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { cliq } from '@/lib/beltool-ghl';
import type { CompanyContact, Company } from '@/types/beltool';

interface CallSession {
  id: string;
  started_at: string;
  duration_seconds: number | null;
  result: string | null;
  notes: string | null;
  caller_name: string;
}

interface GhlNote {
  id: string;
  body: string;
  dateAdded?: string;
  createdAt?: string;
}

interface ContactDetailPanelProps {
  contact: CompanyContact;
  company: Company;
  onUpdateContact: (c: CompanyContact) => Promise<void> | void;
  onUpdateCompany: (c: Company) => Promise<void> | void;
  onClose: () => void;
  onDeleteContact?: () => void;
}

const RESULT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  afspraak:           { label: 'Afspraak',      icon: '📅', color: 'hsl(152 56% 42%)' },
  enqueteTel:         { label: 'Enquête ✓',     icon: '✅', color: 'hsl(174 100% 38%)' },
  enqueteVerstuurd:   { label: 'Verstuurd',     icon: '📨', color: 'hsl(265 83% 57%)' },
  geenGehoor:         { label: 'Geen gehoor',   icon: '📵', color: 'hsl(220 9% 46%)' },
  terugbellenGepland: { label: 'Terugbellen',   icon: '🔔', color: 'hsl(38 92% 50%)' },
  nietInteressant:    { label: 'Afgevallen',    icon: '🚫', color: 'hsl(0 84% 60%)' },
  anderMoment:        { label: 'Ander moment',  icon: '⏳', color: 'hsl(280 60% 55%)' },
};

function fmtDuration(secs: number | null): string {
  if (!secs || secs <= 0) return '—';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export function ContactDetailPanel({ contact, company, onUpdateContact, onUpdateCompany, onClose, onDeleteContact }: ContactDetailPanelProps) {
  const [editContact,      setEditContact]      = useState<CompanyContact>({ ...contact });
  const [editCompany,      setEditCompany]      = useState<Company>({ ...company });
  const [tab,              setTab]              = useState<'contact' | 'company' | 'history' | 'ghl'>('contact');
  const [confirmDelete,    setConfirmDelete]    = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [sessions,         setSessions]         = useState<CallSession[]>([]);
  const [sessionsLoading,  setSessionsLoading]  = useState(false);
  const [ghlNotes,         setGhlNotes]         = useState<GhlNote[]>([]);
  const [ghlLoading,       setGhlLoading]       = useState(false);
  const [newNote,          setNewNote]          = useState('');
  const [savingNote,       setSavingNote]       = useState(false);

  // Load call history from Supabase
  useEffect(() => {
    if (tab !== 'history' || !contact.id) return;
    setSessionsLoading(true);
    (supabase as any)
      .from('call_sessions')
      .select('id, started_at, duration_seconds, result, notes, caller_name')
      .eq('contact_id', contact.id)
      .order('started_at', { ascending: false })
      .limit(30)
      .then(({ data }: { data: CallSession[] | null }) => { setSessions(data || []); setSessionsLoading(false); })
      .catch(() => setSessionsLoading(false));
  }, [tab, contact.id]);

  // Load GHL notes
  useEffect(() => {
    if (tab !== 'ghl' || !contact.id || contact.id.startsWith('local-')) return;
    setGhlLoading(true);
    cliq.getNotes(contact.id)
      .then((data: any) => {
        const notes = data?.notes || data?.body || [];
        setGhlNotes(Array.isArray(notes) ? notes : []);
        setGhlLoading(false);
      })
      .catch(() => setGhlLoading(false));
  }, [tab, contact.id]);

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([onUpdateContact(editContact), onUpdateCompany(editCompany)]);
      onClose();
    } finally { setSaving(false); }
  };

  const saveGhlNote = async () => {
    if (!newNote.trim() || !contact.id) return;
    setSavingNote(true);
    try {
      await cliq.createNote(contact.id, newNote.trim());
      setGhlNotes(prev => [{ id: Date.now().toString(), body: newNote.trim(), dateAdded: new Date().toISOString() }, ...prev]);
      setNewNote('');
    } finally { setSavingNote(false); }
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20';
  const tabBtn = (t: string, active: boolean) => cn(
    'flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors border',
    active ? 'bg-primary text-white border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'
  );

  return (
    <div className="w-80 border-l border-border flex flex-col overflow-hidden bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">{contact.firstName} {contact.lastName}</h3>
            <div className="text-[11px] text-muted-foreground">{company.name}</div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-base border border-border">×</button>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setTab('contact')}  className={tabBtn('contact',  tab === 'contact')}>Contact</button>
          <button onClick={() => setTab('company')}  className={tabBtn('company',  tab === 'company')}>Bedrijf</button>
          <button onClick={() => setTab('history')}  className={tabBtn('history',  tab === 'history')}>Historie</button>
          <button onClick={() => setTab('ghl')}      className={tabBtn('ghl',      tab === 'ghl')}>GHL</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">

        {/* CONTACT TAB */}
        {tab === 'contact' && (
          <div className="space-y-3">
            {(['firstName','lastName','role','phone','email','linkedin'] as const).map(key => {
              const labels: Record<string, string> = { firstName:'Voornaam', lastName:'Achternaam', role:'Functie', phone:'Telefoon', email:'Email', linkedin:'LinkedIn' };
              return (
                <div key={key}>
                  <label className="text-[10px] text-muted-foreground uppercase font-semibold">{labels[key]}</label>
                  <input value={(editContact as any)[key] || ''} onChange={e => setEditContact(p => ({ ...p, [key]: e.target.value }))} className={inputCls} />
                </div>
              );
            })}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-semibold">Notities</label>
              <textarea value={editContact.notes || ''} onChange={e => setEditContact(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Persoonlijke notities..." className={cn(inputCls,'resize-none')} />
            </div>
          </div>
        )}

        {/* BEDRIJF TAB */}
        {tab === 'company' && (
          <div className="space-y-3">
            {(['name','industry','website','address'] as const).map(key => {
              const labels: Record<string, string> = { name:'Bedrijfsnaam', industry:'Branche', website:'Website', address:'Adres' };
              return (
                <div key={key}>
                  <label className="text-[10px] text-muted-foreground uppercase font-semibold">{labels[key]}</label>
                  <input value={(editCompany as any)[key] || ''} onChange={e => setEditCompany(p => ({ ...p, [key]: e.target.value }))} className={inputCls} />
                </div>
              );
            })}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-semibold">Bedrijfsnotities</label>
              <textarea value={editCompany.notes || ''} onChange={e => setEditCompany(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Algemene notities..." className={cn(inputCls,'resize-none')} />
            </div>
          </div>
        )}

        {/* BELHISTORIE TAB */}
        {tab === 'history' && (
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Belhistorie</div>
            {sessionsLoading ? (
              <div className="text-center text-muted-foreground/40 text-xs py-8">Laden...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center text-muted-foreground/40 text-xs py-8">Nog geen belhistorie</div>
            ) : (
              <div className="space-y-2">
                {sessions.map(s => {
                  const res = RESULT_LABELS[s.result || ''] || { label: s.result || '—', icon: '📞', color: 'hsl(var(--muted-foreground))' };
                  return (
                    <div key={s.id} className="p-3 rounded-xl border border-border bg-muted/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: res.color, borderColor: res.color + '30', background: res.color + '10' }}>
                          {res.icon} {res.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{fmtDateTime(s.started_at)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>⏱️ {fmtDuration(s.duration_seconds)}</span>
                        {s.caller_name && <span>👤 {s.caller_name}</span>}
                      </div>
                      {s.notes && (
                        <div className="text-[11px] text-foreground/70 leading-relaxed border-t border-border/40 pt-1.5">{s.notes}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* GHL NOTES TAB */}
        {tab === 'ghl' && (
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Notities in GHL</div>
            <div className="mb-4">
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={3} placeholder="Nieuwe notitie in GHL..." className={cn(inputCls,'resize-none mb-2')} />
              <button onClick={saveGhlNote} disabled={savingNote || !newNote.trim()} className="w-full py-2 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-40 active:scale-[0.97] transition-all">
                {savingNote ? 'Opslaan...' : '+ Notitie in GHL'}
              </button>
            </div>
            {ghlLoading ? (
              <div className="text-center text-muted-foreground/40 text-xs py-6">Laden uit GHL...</div>
            ) : ghlNotes.length === 0 ? (
              <div className="text-center text-muted-foreground/40 text-xs py-6">Geen GHL notities gevonden</div>
            ) : (
              <div className="space-y-2">
                {ghlNotes.map(n => (
                  <div key={n.id} className="p-3 rounded-xl border border-border bg-muted/20">
                    <div className="text-[10px] text-muted-foreground mb-1">{fmtDateTime(n.dateAdded || n.createdAt || '')}</div>
                    <div className="text-[12px] text-foreground/80 leading-relaxed whitespace-pre-line">{n.body}</div>
                  </div>
                ))}
              </div>
            )}
            {contact.id?.startsWith('local-') && (
              <div className="mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20">
                <p className="text-[11px] text-warning">⚠️ Lokaal contact — nog niet in GHL.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        {(tab === 'contact' || tab === 'company') && (
          <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold active:scale-[0.97] transition-transform shadow-sm disabled:opacity-60">
            {saving ? 'Opslaan...' : '💾 Opslaan & sync naar GHL'}
          </button>
        )}
        {contact.linkedin && (
          <a href={contact.linkedin.startsWith('http') ? contact.linkedin : `https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#0077b5]/10 text-[#0077b5] text-xs font-semibold border border-[#0077b5]/20 hover:bg-[#0077b5]/20 active:scale-[0.97] transition-all">
            🔗 LinkedIn bekijken
          </a>
        )}
        {onDeleteContact && (
          confirmDelete ? (
            <div className="flex gap-2">
              <button onClick={() => { onDeleteContact(); onClose(); }} className="flex-1 py-2 rounded-lg bg-destructive text-white text-xs font-semibold active:scale-[0.97]">Ja, verwijderen</button>
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-semibold border border-border active:scale-[0.97]">Annuleren</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="w-full py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20 hover:bg-destructive/20 active:scale-[0.97]">
              🗑️ Verwijderen uit lijst
            </button>
          )
        )}
      </div>
    </div>
  );
}
