import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Contact, CallPhase, SurveyAnswers, HOUR_OPTIONS, TASK_OPTIONS, TIMES } from '@/types/beltool';
import { StepLayout } from './StepLayout';
import { EndView } from './EndView';

function getNextWorkdays(count: number): Date[] {
  const dates: Date[] = [];
  const d = new Date();
  while (dates.length < count) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) dates.push(new Date(d));
  }
  return dates;
}

interface CallContentProps {
  active: Contact;
  phase: CallPhase;
  setPhase: (p: CallPhase) => void;
  answers: SurveyAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<SurveyAnswers>>;
  taskString: string;
  onEndCall: (phase: CallPhase, stage: Contact['stage']) => void;
  onNextContact: () => void;
  showToast: (msg: string, type?: string) => void;
  updateStage: (id: string, stage: Contact['stage']) => void;
  bookDate: string;
  setBookDate: (v: string) => void;
  bookTime: string;
  setBookTime: (v: string) => void;
}

function ActionBtn({ children, variant = 'primary', wide, onClick }: { children: React.ReactNode; variant?: 'primary' | 'ghost' | 'warning' | 'danger'; wide?: boolean; onClick: () => void }) {
  const base = 'px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 active:scale-[0.97]';
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    ghost: 'bg-transparent border border-foreground/10 text-foreground/55 hover:bg-foreground/5',
    warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };
  return (
    <button onClick={onClick} className={cn(base, variants[variant], wide && 'w-full')}>
      {children}
    </button>
  );
}

function OptionBtn({ children, selected, onClick }: { children: React.ReactNode; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg text-[13px] font-semibold border-2 transition-all duration-150',
        selected
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-foreground/[0.08] text-foreground/60 hover:border-foreground/20'
      )}
    >
      {children}
    </button>
  );
}

function BigOption({ selected, icon, title, subtitle, onClick }: { selected: boolean; icon: string; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3.5 rounded-lg text-left w-full text-sm border-2 transition-all duration-150',
        selected ? 'border-primary bg-primary/10' : 'border-foreground/[0.06] hover:border-foreground/15'
      )}
    >
      <span className="text-[22px]">{icon}</span>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      </div>
      {selected && <span className="text-primary font-bold">✓</span>}
    </button>
  );
}

export function CallContent({ active, phase, setPhase, answers, setAnswers, taskString, onEndCall, onNextContact, showToast, updateStage, bookDate, setBookDate, bookTime, setBookTime }: CallContentProps) {
  const stepIndex: Record<string, number> = { intro: 0, q1: 1, q2: 2, q3: 3, q4: 4, bridge: 5 };
  const currentStepNum = stepIndex[phase] ?? -1;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* INTRO */}
      {phase === 'intro' && (
        <StepLayout step={1} total={6} icon="👋" title="Introductie"
          script={`"Goedemiddag ${active.firstName}, u spreekt met [Naam beller] van CliqMakers. Ik bel u kort omdat we momenteel een praktijkonderzoek doen naar onnodig tijdverlies en capaciteit binnen het MKB. Mag ik u daar vier hele korte vragen over stellen?"`}
          tip="Wacht op akkoord voordat je begint met de vragen"
        >
          <div className="flex flex-wrap gap-2">
            <ActionBtn onClick={() => setPhase('q1')}>Akkoord - Start enquête</ActionBtn>
            <ActionBtn variant="warning" onClick={() => { onEndCall('sent', 'enqueteVerstuurd'); showToast('Enquête automatisch verstuurd via Email + WhatsApp', 'info'); }}>Geen tijd - Stuur enquête</ActionBtn>
            <ActionBtn variant="ghost" onClick={() => { onEndCall('noanswer', 'geenGehoor'); showToast('Geen gehoor genoteerd'); }}>Geen gehoor</ActionBtn>
            <ActionBtn variant="danger" onClick={() => { onEndCall('lost', 'nietInteressant'); showToast('Niet geïnteresseerd'); }}>Niet geïnteresseerd</ActionBtn>
          </div>
        </StepLayout>
      )}

      {/* Q1 */}
      {phase === 'q1' && (
        <StepLayout step={2} total={6} icon="⏱️" title="Vraag 1 - Het Tijdlek"
          script={`"Fijn, dank u wel. Vraag één: Als u een eerlijke inschatting maakt, hoeveel uur bent u of uw team op dit moment wekelijks kwijt aan pure 'digitale randzaken'? Denk aan het najagen van leads, e-mails overtypen, afspraken inplannen of systemen bijwerken."`}
        >
          <div className="text-[11px] font-bold text-primary tracking-wide mb-2">Hoeveel uur per week?</div>
          <div className="flex flex-wrap gap-2 mb-5">
            {HOUR_OPTIONS.map(h => (
              <OptionBtn key={h} selected={answers.hours === h} onClick={() => setAnswers(a => ({ ...a, hours: h }))}>{h}</OptionBtn>
            ))}
          </div>
          <div className="flex gap-2">
            <ActionBtn variant="ghost" onClick={() => setPhase('intro')}>Terug</ActionBtn>
            <ActionBtn onClick={() => { if (!answers.hours) { showToast('Selecteer het aantal uren', 'err'); return; } setPhase('q2'); }}>Volgende</ActionBtn>
          </div>
        </StepLayout>
      )}

      {/* Q2 */}
      {phase === 'q2' && (
        <StepLayout step={3} total={6} icon="🔄" title="Vraag 2 - Repetitieve Taken"
          script={`"Dat is nog best een flinke hap tijd. Wat zijn in die uren dan de meest voorkomende, repetitieve handelingen die u voor uw gevoel steeds weer opnieuw moet doen?"`}
          tip="⚡ Laat een stilte vallen — schrijf de pijnpunten letterlijk op!"
        >
          <div className="text-[11px] font-bold text-primary tracking-wide mb-2">Selecteer genoemde taken (meerdere mogelijk)</div>
          <div className="space-y-2 mb-4">
            {TASK_OPTIONS.map(t => {
              const sel = answers.tasks.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => setAnswers(a => ({ ...a, tasks: sel ? a.tasks.filter(x => x !== t) : [...a.tasks, t] }))}
                  className={cn(
                    'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-[13px] w-full border-[1.5px] transition-all duration-150',
                    sel ? 'border-primary bg-primary/10 text-foreground' : 'border-foreground/[0.08] text-foreground/65 hover:border-foreground/20'
                  )}
                >
                  <span className={cn('w-5 h-5 rounded border-2 flex items-center justify-center text-[11px] shrink-0', sel ? 'bg-primary border-primary text-primary-foreground' : 'border-foreground/20')}>
                    {sel ? '✓' : ''}
                  </span>
                  {t}
                </button>
              );
            })}
          </div>
          <textarea
            placeholder="Overige taken (vrij invullen)..."
            value={answers.tasksOther}
            onChange={e => setAnswers(a => ({ ...a, tasksOther: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg border border-foreground/[0.08] bg-foreground/[0.03] text-foreground text-[13px] outline-none resize-y leading-relaxed mb-5 placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <ActionBtn variant="ghost" onClick={() => setPhase('q1')}>Terug</ActionBtn>
            <ActionBtn onClick={() => { if (!answers.tasks.length && !answers.tasksOther.trim()) { showToast('Selecteer of typ minimaal één taak', 'err'); return; } setPhase('q3'); }}>Volgende</ActionBtn>
          </div>
        </StepLayout>
      )}

      {/* Q3 */}
      {phase === 'q3' && (
        <StepLayout step={4} total={6} icon="📈" title="Vraag 3 - Groeifase"
          script={`"Heel herkenbaar. Bent u momenteel vooral bezig met het bijbenen van het huidige werk, of heeft u de processen al zo strak staan dat u klaar bent voor een flinke groei in nieuwe klanten?"`}
        >
          <div className="text-[11px] font-bold text-primary tracking-wide mb-2">Wat geeft de prospect aan?</div>
          <div className="space-y-2 mb-5">
            {[
              { val: 'Bijbenen', label: 'Vooral bijbenen - huidig werk netjes afhandelen', icon: '🏃' },
              { val: 'Klaar voor groei', label: 'Klaar voor groei - processen staan redelijk strak', icon: '🚀' },
            ].map(o => (
              <BigOption key={o.val} selected={answers.growth === o.val} icon={o.icon} title={o.val} subtitle={o.label} onClick={() => setAnswers(a => ({ ...a, growth: o.val }))} />
            ))}
          </div>
          <div className="flex gap-2">
            <ActionBtn variant="ghost" onClick={() => setPhase('q2')}>Terug</ActionBtn>
            <ActionBtn onClick={() => { if (!answers.growth) { showToast('Maak een keuze', 'err'); return; } setPhase('q4'); }}>Volgende</ActionBtn>
          </div>
        </StepLayout>
      )}

      {/* Q4 */}
      {phase === 'q4' && (
        <StepLayout step={5} total={6} icon="🤖" title="Vraag 4 - AI & Automatisering"
          script={`"Duidelijk. Bent u intern al aan het kijken naar slimme automatisering of AI om die randzaken structureel op te lossen, of komt u daar door de waan van de dag simpelweg niet aan toe?"`}
        >
          <div className="text-[11px] font-bold text-primary tracking-wide mb-2">Wat is de status?</div>
          <div className="space-y-2 mb-5">
            {[
              { val: 'Al mee bezig', label: 'Ze zijn er al mee bezig of oriënteren zich', icon: '⚡' },
              { val: 'Komt niet aan toe', label: 'Waan van de dag - komt er niet aan toe', icon: '😅' },
            ].map(o => (
              <BigOption key={o.val} selected={answers.ai === o.val} icon={o.icon} title={o.val} subtitle={o.label} onClick={() => setAnswers(a => ({ ...a, ai: o.val }))} />
            ))}
          </div>
          <div className="flex gap-2">
            <ActionBtn variant="ghost" onClick={() => setPhase('q3')}>Terug</ActionBtn>
            <ActionBtn onClick={() => {
              if (!answers.ai) { showToast('Maak een keuze', 'err'); return; }
              updateStage(active.id, 'enqueteTel');
              showToast('Enquête opgeslagen!');
              setPhase('bridge');
            }}>Enquête afronden - Naar aanbod</ActionBtn>
          </div>
        </StepLayout>
      )}

      {/* BRIDGE */}
      {phase === 'bridge' && (
        <StepLayout step={6} total={6} icon="🤝" title="Het Aanbod & Afspraak"
          script={`"Ontzettend bedankt voor uw openheid, ${active.firstName}. Omdat u net aangaf dat u wekelijks best wat tijd verliest aan ${taskString || 'die taken'} en u eigenlijk ${answers.growth === 'Klaar voor groei' ? 'wel wilt opschalen' : 'druk bent met het huidige werk netjes afhandelen'}, mag ik u iets vrijblijvends aanbieden?\n\nIk plan graag een adviesgesprek van 15 minuten voor u in. Onze specialist kijkt kosteloos met u mee en laat u direct zien hoe u specifiek ${taskString || 'die taken'} slim kunt automatiseren. Zullen we daar volgende week even een momentje voor prikken?"`}
          tip="Plan de afspraak nu direct in!"
        >
          {/* Appointment booking */}
          <div className="bg-primary/[0.08] border border-primary/20 rounded-xl p-5 mb-4">
            <div className="text-xs font-bold text-primary tracking-wide mb-3.5">AFSPRAAK INPLANNEN</div>
            <div className="flex gap-3 mb-3.5">
              <div className="flex-1">
                <div className="text-[11px] text-muted-foreground mb-1">Datum</div>
                <select
                  value={bookDate}
                  onChange={e => setBookDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-foreground/10 bg-foreground/[0.05] text-foreground text-[13px] outline-none"
                >
                  <option value="">Kies datum...</option>
                  {getNextWorkdays(10).map(d => {
                    const v = d.toISOString().split('T')[0];
                    const l = d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long' });
                    return <option key={v} value={v} className="text-foreground bg-card">{l}</option>;
                  })}
                </select>
              </div>
              <div className="flex-1">
                <div className="text-[11px] text-muted-foreground mb-1">Tijd</div>
                <select
                  value={bookTime}
                  onChange={e => setBookTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-foreground/10 bg-foreground/[0.05] text-foreground text-[13px] outline-none"
                >
                  <option value="">Kies tijd...</option>
                  {TIMES.map(t => <option key={t} value={t} className="text-foreground bg-card">{t}</option>)}
                </select>
              </div>
            </div>
            <ActionBtn wide onClick={() => {
              if (!bookDate || !bookTime) { showToast('Kies een datum en tijd', 'err'); return; }
              onEndCall('done', 'afspraak');
              showToast(`Afspraak gepland op ${new Date(bookDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })} om ${bookTime}`);
            }}>Afspraak bevestigen</ActionBtn>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionBtn variant="ghost" onClick={() => setPhase('q4')}>Terug naar vragen</ActionBtn>
            <ActionBtn variant="warning" onClick={() => { onEndCall('sent', 'enqueteVerstuurd'); showToast('Booking link verstuurd via Email + WhatsApp', 'info'); }}>Stuur booking link digitaal</ActionBtn>
            <ActionBtn variant="danger" onClick={() => onEndCall('lost', 'nietInteressant')}>Niet geïnteresseerd</ActionBtn>
          </div>
        </StepLayout>
      )}

      {/* END STATES */}
      {phase === 'sent' && (
        <EndView
          icon="📨" title="Enquête / Booking link verstuurd!"
          sub={`${active.firstName} ontvangt automatisch een email en WhatsApp.`}
          items={['Email met link verstuurd', 'WhatsApp met link verstuurd', 'Stadium bijgewerkt in GHL']}
          onNext={onNextContact}
        />
      )}
      {phase === 'done' && (
        <EndView
          icon="🎉" title="Afspraak gepland!"
          sub={`Adviesgesprek met ${active.firstName} staat ingepland.`}
          items={[
            `Datum: ${bookDate ? new Date(bookDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }) : '-'}`,
            `Tijd: ${bookTime || '-'}`,
            'Bevestiging wordt automatisch verstuurd',
            'Herinnering 24u + 1u voor gesprek',
          ]}
          answers={answers}
          taskString={taskString}
          onNext={onNextContact}
        />
      )}
      {phase === 'lost' && (
        <EndView icon="🚫" title="Niet geïnteresseerd" sub={`${active.firstName} is als afgevallen gemarkeerd.`} onNext={onNextContact} />
      )}
      {phase === 'noanswer' && (
        <EndView icon="📵" title="Geen gehoor" sub={`${active.firstName} staat op terugbellen.`} onNext={onNextContact} />
      )}
    </div>
  );
}
