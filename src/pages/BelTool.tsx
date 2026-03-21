import { useState, useCallback } from 'react';
import type { Company, CompanyContact, CallPhase, CallState, SurveyAnswers, Appointment, CallbackEntry, Webhook } from '@/types/beltool';
import { COMPANIES_INIT, defaultSurvey } from '@/lib/beltool-data';
import { USERS, type User } from '@/lib/beltool-data';
import { store } from '@/lib/beltool-store';
import { i18n } from '@/lib/beltool-i18n';
import { initScores, fmtTime, type Scores } from '@/lib/beltool-scoring';
import { ghl } from '@/lib/beltool-ghl';
import { fmtDate } from '@/lib/beltool-data';
import { ADVISORS } from '@/lib/beltool-data';
import { BelToolContext } from '@/contexts/BelToolContext';
import { ContactSidebar } from '@/components/beltool/ContactSidebar';
import { AnswersSidebar } from '@/components/beltool/AnswersSidebar';
import { CallContent } from '@/components/beltool/CallContent';
import { LoginScreen } from '@/components/beltool/LoginScreen';
import { SettingsPanel } from '@/components/beltool/SettingsPanel';
import { Leaderboard } from '@/components/beltool/Leaderboard';
import { AgendaView } from '@/components/beltool/AgendaView';
import { CallbackScheduler } from '@/components/beltool/CallbackScheduler';
import { Modal } from '@/components/beltool/Modal';

export default function BelTool() {
  const [user, setUser] = useState<User | null>(() => store.get('user', null));
  const [lang, setLang] = useState(() => store.get('lang', 'nl'));
  const [companies, setCompanies] = useState<Company[]>(COMPANIES_INIT);
  const [activeCompId, setActiveCompId] = useState<string | null>(null);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [expandedComp, setExpandedComp] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [callState, setCallState] = useState<CallState>('idle');
  const [answers, setAnswers] = useState<SurveyAnswers>({ hours: '', tasks: [], tasksOther: '', growth: '', ai: '' });
  const [notes, setNotes] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookAdvisor, setBookAdvisor] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [allScores, setAllScores] = useState<Record<string, Scores>>(() => {
    const s = store.get<Record<string, Scores>>('scores', {});
    USERS.forEach(u => { if (!s[u.id]) s[u.id] = initScores(); });
    return s;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [callbacks, setCallbacks] = useState<CallbackEntry[]>(() => store.get('callbacks', []));
  const [showCallbackQueue, setShowCallbackQueue] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);
  const [appts, setAppts] = useState<Appointment[]>(() => store.get('appointments', []));
  const [webhooks, setWebhooks] = useState<Webhook[]>(() => store.get('webhooks', []));
  const [apiKey, setApiKey] = useState(() => store.get('apiKey', ''));
  const [surveyConfig, setSurveyConfig] = useState(() => store.get('surveyConfig', defaultSurvey()));

  const t = i18n[lang as keyof typeof i18n] || i18n.nl;
  const activeComp = companies.find(c => c.id === activeCompId) || null;
  const activeContact = activeComp?.contacts.find(c => c.id === activeContactId) || null;
  const scores = user ? (allScores[user.id] || initScores()) : initScores();
  const contactName = activeContact ? `${activeContact.firstName} ${activeContact.lastName}` : '';
  const taskString = answers.tasks.concat(answers.tasksOther ? [answers.tasksOther] : []).filter(Boolean).join(', ');
  const phaseStep: Record<string, number> = { intro: 0, q1: 1, q2: 2, q3: 3, q4: 4, bridge: 5 };
  const curStep = phaseStep[phase] ?? -1;
  const convRate = scores.gebeld > 0 ? Math.round(((scores.enquetes + scores.afspraken) / scores.gebeld) * 100) : 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const dueCallbacks = callbacks.filter(cb => cb.date <= todayStr && cb.status === 'scheduled');

  const flash = useCallback((msg: string, type?: string) => {
    setToast({ msg, type: type || 'ok' });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const addScore = useCallback((type: string) => {
    if (!user) return;
    setAllScores(prev => {
      const p = prev[user.id] || initScores();
      const s = { ...p };
      if (type === 'gebeld') s.gebeld = p.gebeld + 1;
      else if (type === 'enquete') { s.enquetes = p.enquetes + 1; s.reeks = p.reeks + 1; }
      else if (type === 'afspraak') { s.afspraken = p.afspraken + 1; s.reeks = p.reeks + 1; }
      else if (type === 'verstuurd') { s.verstuurd = p.verstuurd + 1; s.reeks = p.reeks + 1; }
      else if (type === 'afgevallen') { s.afgevallen = p.afgevallen + 1; s.reeks = 0; }
      else if (type === 'geenGehoor') s.geenGehoor = p.geenGehoor + 1;
      else if (type === 'callback') { s.callbacks = (p.callbacks || 0) + 1; s.reeks = p.reeks + 1; }
      if (s.reeks > p.bestReeks) s.bestReeks = s.reeks;
      s.log = [{ time: fmtTime(), contact: contactName, result: type }, ...(p.log || [])].slice(0, 50);
      const next = { ...prev, [user.id]: s };
      store.set('scores', next);
      return next;
    });
  }, [user, contactName]);

  const updateCompStage = (compId: string, stage: Company['stage']) => setCompanies(p => p.map(c => c.id === compId ? { ...c, stage } : c));

  const selectContact = (comp: Company, contact: CompanyContact) => {
    setActiveCompId(comp.id);
    setActiveContactId(contact.id);
    setPhase('precall');
    setCallState('idle');
    setAnswers({ hours: '', tasks: [], tasksOther: '', growth: '', ai: '' });
    setNotes(''); setBookDate(''); setBookTime(''); setBookAdvisor('');
  };

  const startDialing = () => {
    setCallState('dialing');
    setTimeout(() => {
      setCallState('ringing');
      addScore('gebeld');
      setTimeout(() => {
        setCallState('active');
        setPhase('intro');
        if (activeCompId) { updateCompStage(activeCompId, 'bellen'); ghl.logCall(activeContactId || '', 'started'); }
      }, 1200);
    }, 800);
  };

  const endCall = (ph: CallPhase, stage: Company['stage']) => {
    setPhase(ph);
    setCallState('ended');
    if (activeCompId) { updateCompStage(activeCompId, stage); ghl.updateContactStage(activeContactId || '', stage); }
  };

  const nextContact = () => { setPhase('idle'); setCallState('idle'); setActiveCompId(null); setActiveContactId(null); };
  const handleLogin = (u: User) => { setUser(u); store.set('user', u); };
  const handleLogout = () => { setUser(null); store.del('user'); setPhase('idle'); setActiveCompId(null); };

  const saveCallback = (cb: Omit<CallbackEntry, 'id' | 'userId'>) => {
    const next = [...callbacks, { ...cb, id: Date.now(), userId: user?.id }] as CallbackEntry[];
    setCallbacks(next); store.set('callbacks', next);
    if (activeCompId) updateCompStage(activeCompId, 'terugbellenGepland');
    addScore('callback');
    flash(t.callbackSaved, 'info');
  };

  const completeCallback = (cbId: number) => {
    const next = callbacks.map(cb => cb.id === cbId ? { ...cb, status: 'done' as const } : cb);
    setCallbacks(next); store.set('callbacks', next);
    flash('Callback voltooid!');
    const cb = callbacks.find(c => c.id === cbId);
    if (cb) {
      const comp = companies.find(c => c.contacts.some(ct => ct.id === cb.contactId));
      const ct = comp?.contacts.find(c => c.id === cb.contactId);
      if (comp && ct) selectContact(comp, ct);
    }
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const ctx = { lang, setLang, user, t, allScores, setAllScores, webhooks, setWebhooks, apiKey, setApiKey, surveyConfig, setSurveyConfig };

  return (
    <BelToolContext.Provider value={ctx}>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-6 py-2.5 rounded-xl text-[13px] font-semibold shadow-xl border"
            style={{
              animation: 'slideToast 0.25s ease',
              background: toast.type === 'err' ? 'hsl(0 50% 25%)' : toast.type === 'info' ? 'hsl(222 30% 20%)' : 'hsl(152 40% 18%)',
              borderColor: toast.type === 'err' ? 'hsl(0 72% 51% / 0.2)' : toast.type === 'info' ? 'hsl(217 91% 60% / 0.2)' : 'hsl(152 56% 42% / 0.2)',
              color: '#fff',
            }}
          >{toast.msg}</div>
        )}

        <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />
        <Leaderboard open={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
        <AgendaView open={showAgenda} onClose={() => setShowAgenda(false)} appointments={appts} />
        {showCallback && activeContact && activeComp && (
          <CallbackScheduler open={showCallback} onClose={() => setShowCallback(false)} contact={activeContact} company={activeComp} onSave={saveCallback} />
        )}
        <Modal open={showCallbackQueue} onClose={() => setShowCallbackQueue(false)} title={t.callbackQueue}>
          {callbacks.filter(cb => cb.status === 'scheduled').length === 0 ? (
            <div className="text-center text-muted-foreground/30 py-6">{t.noCallbacks}</div>
          ) : (
            callbacks.filter(cb => cb.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date)).map(cb => {
              const overdue = cb.date < todayStr;
              const isToday = cb.date === todayStr;
              return (
                <div key={cb.id} className="flex items-center gap-3 py-2.5 border-b border-border/30">
                  <div className="flex-1">
                    <div className="font-semibold text-[13px]">{cb.contactName}</div>
                    <div className="text-[11px] text-muted-foreground/40">{cb.companyName} — {fmtDate(cb.date)} {cb.time}</div>
                  </div>
                  {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">OVERDUE</span>}
                  {isToday && !overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning">{t.callbackDue}</span>}
                  <button onClick={() => { setShowCallbackQueue(false); completeCallback(cb.id); }} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold active:scale-95 transition-transform">{t.callbackNow}</button>
                </div>
              );
            })
          )}
        </Modal>

        <ContactSidebar
          companies={companies} activeCompId={activeCompId} activeContactId={activeContactId}
          expandedComp={expandedComp} setExpandedComp={setExpandedComp}
          search={search} onSearchChange={setSearch}
          onSelectContact={selectContact} phase={phase}
          onBusy={() => flash(t.finishFirst, 'err')}
          scores={scores} convRate={convRate} user={user}
          onLogout={handleLogout}
          onShowAgenda={() => setShowAgenda(true)}
          onShowCallbackQueue={() => setShowCallbackQueue(true)}
          onShowLeaderboard={() => setShowLeaderboard(true)}
          onShowSettings={() => setShowSettings(true)}
          dueCallbackCount={dueCallbacks.length}
          appointmentCount={appts.length}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {(phase === 'idle' || phase === 'precall' || curStep >= 0 || ['sent','done','lost','noanswer'].includes(phase)) && activeContact && activeComp ? (
            <>
              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                  <CallContent
                    activeContact={activeContact} activeComp={activeComp}
                    phase={phase} callState={callState} setPhase={setPhase}
                    answers={answers} setAnswers={setAnswers} taskString={taskString}
                    onEndCall={endCall} onNextContact={nextContact}
                    showToast={flash} updateStage={updateCompStage} addScore={addScore}
                    bookDate={bookDate} setBookDate={setBookDate}
                    bookTime={bookTime} setBookTime={setBookTime}
                    bookAdvisor={bookAdvisor} setBookAdvisor={setBookAdvisor}
                    scores={scores} onShowCallback={() => setShowCallback(true)}
                    onStartDialing={startDialing}
                    onHangup={() => { endCall('lost', 'nietInteressant'); addScore('afgevallen'); }}
                    activeCompId={activeCompId}
                  />
                </div>
                {curStep >= 1 && (
                  <AnswersSidebar
                    answers={answers} taskString={taskString} notes={notes} onNotesChange={setNotes}
                    onSendDigital={() => { endCall('sent', 'enqueteVerstuurd'); addScore('verstuurd'); flash(t.surveyDigitalSent, 'info'); }}
                    onNoAnswer={() => { endCall('noanswer', 'geenGehoor'); addScore('geenGehoor'); flash(t.noAnswerNoted); }}
                    onGoToAppointment={() => { if (activeCompId) updateCompStage(activeCompId, 'enqueteTel'); addScore('enquete'); setPhase('bridge'); }}
                    onShowCallback={() => setShowCallback(true)}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
              <div className="text-5xl mb-2">📞</div>
              <div className="text-lg font-bold text-foreground/40">{t.selectContact}</div>
              <div className="text-[13px] text-foreground/20">{t.clickName}</div>
            </div>
          )}
        </div>
      </div>
    </BelToolContext.Provider>
  );
}
