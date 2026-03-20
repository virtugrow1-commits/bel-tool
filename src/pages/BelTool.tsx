import { useState, useCallback } from 'react';
import { Contact, CallPhase, SurveyAnswers, DEMO_CONTACTS } from '@/types/beltool';
import { ContactSidebar } from '@/components/beltool/ContactSidebar';
import { AnswersSidebar } from '@/components/beltool/AnswersSidebar';
import { CallContent } from '@/components/beltool/CallContent';

export default function BelTool() {
  const [contacts, setContacts] = useState<Contact[]>(DEMO_CONTACTS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [answers, setAnswers] = useState<SurveyAnswers>({ hours: '', tasks: [], tasksOther: '', growth: '', ai: '' });
  const [notes, setNotes] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: string; id: number } | null>(null);

  const active = contacts.find(c => c.id === activeId) || null;

  const showToast = useCallback((msg: string, type?: string) => {
    setToast({ msg, type: type || 'ok', id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const updateStage = (id: string, stage: Contact['stage']) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, stage } : c));
  };

  const startCall = (contact: Contact) => {
    setActiveId(contact.id);
    setPhase('intro');
    setAnswers({ hours: '', tasks: [], tasksOther: '', growth: '', ai: '' });
    setNotes('');
    setBookDate('');
    setBookTime('');
    updateStage(contact.id, 'bellen');
  };

  const endCall = (newPhase: CallPhase, stage: Contact['stage']) => {
    setPhase(newPhase);
    if (active) updateStage(active.id, stage);
  };

  const nextContact = () => {
    setPhase('idle');
    setActiveId(null);
  };

  const taskString = answers.tasks.concat(answers.tasksOther ? [answers.tasksOther] : []).filter(Boolean).join(', ');
  const stepIndex: Record<string, number> = { intro: 0, q1: 1, q2: 2, q3: 3, q4: 4, bridge: 5 };
  const currentStepNum = stepIndex[phase] ?? -1;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg text-sm font-semibold shadow-lg"
          style={{
            animation: 'slideToast 0.3s ease',
            background: toast.type === 'err' ? 'hsl(var(--destructive))' : toast.type === 'info' ? 'hsl(var(--info))' : 'hsl(var(--primary))',
            color: toast.type === 'err' ? 'hsl(var(--destructive-foreground))' : '#fff',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Left sidebar */}
      <ContactSidebar
        contacts={contacts}
        activeId={activeId}
        search={search}
        onSearchChange={setSearch}
        onSelect={startCall}
        phase={phase}
        onBusy={() => showToast('Rond eerst het huidige gesprek af', 'err')}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {phase === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <div className="text-[52px]">📞</div>
            <div className="text-xl font-bold">Selecteer een contact om te bellen</div>
            <div className="text-sm text-muted-foreground">Klik op een naam in de lijst links</div>
          </div>
        )}

        {phase !== 'idle' && active && (
          <>
            {/* Contact top bar */}
            <div className="flex items-center gap-4 px-6 py-3.5 border-b border-border bg-card/50">
              <div className="w-10 h-10 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
                {active.firstName[0]}{active.lastName[0]}
              </div>
              <div className="flex-1">
                <div className="font-bold text-base">{active.firstName} {active.lastName}</div>
                <div className="text-xs text-muted-foreground">{active.company}</div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>{active.phone}</div>
                <div>{active.email}</div>
              </div>
              {currentStepNum >= 0 && (
                <div className="flex items-center gap-2 ml-4">
                  <div className="w-2 h-2 rounded-full bg-success" style={{ animation: 'blink 1.5s infinite' }} />
                  <span className="text-xs text-success font-medium">In gesprek</span>
                </div>
              )}
            </div>

            {/* Content + answers sidebar */}
            <div className="flex flex-1 overflow-hidden">
              <CallContent
                active={active}
                phase={phase}
                setPhase={setPhase}
                answers={answers}
                setAnswers={setAnswers}
                taskString={taskString}
                onEndCall={endCall}
                onNextContact={nextContact}
                showToast={showToast}
                updateStage={updateStage}
                bookDate={bookDate}
                setBookDate={setBookDate}
                bookTime={bookTime}
                setBookTime={setBookTime}
              />
              {currentStepNum >= 1 && (
                <AnswersSidebar
                  answers={answers}
                  taskString={taskString}
                  notes={notes}
                  onNotesChange={setNotes}
                  onSendDigital={() => { endCall('sent', 'enqueteVerstuurd'); showToast('Enquête digitaal verstuurd', 'info'); }}
                  onNoAnswer={() => { endCall('noanswer', 'geenGehoor'); showToast('Geen gehoor'); }}
                  onGoToAppointment={() => { updateStage(active.id, 'enqueteTel'); showToast('Enquête opgeslagen!'); setPhase('bridge'); }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
