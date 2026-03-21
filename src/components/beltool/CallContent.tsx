import { cn } from '@/lib/utils';
import type { CompanyContact, Company, CallPhase, CallState, SurveyAnswers, SelectOption, SurveyConfig } from '@/types/beltool';
import { CallButton } from './CallButton';
import { CallDisplay } from './CallDisplay';
import { useState, useEffect } from 'react';
import { StepLayout } from './StepLayout';
import { EndView } from './EndView';
import { renderScript, getWorkdays, fmtDate, TIMES } from '@/lib/beltool-data';
import { ADVISORS } from '@/lib/beltool-data';
import { calcLeadScore, leadLabel, type Scores } from '@/lib/beltool-scoring';
import { useBelTool } from '@/contexts/BelToolContext';
import { ghl } from '@/lib/beltool-ghl';

function CalendarPicker({ bookDate, setBookDate, bookTime, setBookTime }: { bookDate: string; setBookDate: (v: string) => void; bookTime: string; setBookTime: (v: string) => void }) {
  return (
    <>
      <div className="flex-1">
        <div className="text-[11px] text-muted-foreground mb-1">Datum</div>
        <select value={bookDate} onChange={e => setBookDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-foreground/[0.05] text-foreground text-[13px] outline-none">
          <option value="">Kies datum...</option>
          {getWorkdays(10).map(d => {
            const v = d.toISOString().split('T')[0];
            return <option key={v} value={v} className="text-foreground bg-card">{fmtDate(v)}</option>;
          })}
        </select>
      </div>
      <div className="flex-1">
        <div className="text-[11px] text-muted-foreground mb-1">Tijd</div>
        <select value={bookTime} onChange={e => setBookTime(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-foreground/[0.05] text-foreground text-[13px] outline-none">
          <option value="">Kies tijd...</option>
          {TIMES.map(tm => <option key={tm} value={tm} className="text-foreground bg-card">{tm}</option>)}
        </select>
      </div>
    </>
  );
}

function GhlCalendarSelect() {
  const [calendars, setCalendars] = useState<{ id: string; name: string; isActive?: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ghl.getCalendars()
      .then((data: any) => {
        const cals = (data?.calendars || []).filter((c: any) => c.isActive !== false);
        setCalendars(cals);
      })
      .catch(() => setCalendars([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mb-3">
      <div className="text-[11px] text-muted-foreground mb-1">GHL Kalender</div>
      <select id="ghl-calendar-select" className="w-full px-3 py-2.5 rounded-lg border border-border bg-foreground/[0.05] text-foreground text-[13px] outline-none">
        {loading ? (
          <option value="">Laden...</option>
        ) : calendars.length === 0 ? (
          <option value="">Geen actieve kalenders gevonden</option>
        ) : (
          <>
            <option value="">Selecteer kalender...</option>
            {calendars.map(c => <option key={c.id} value={c.id} className="text-foreground bg-card">{c.name}</option>)}
          </>
        )}
      </select>
    </div>
  );
}

type LocationType = 'google_meet' | 'bedrijf' | 'op_locatie' | '';

function LocationSelect({ value, onChange, customAddress, onCustomChange, companyAddress }: {
  value: LocationType;
  onChange: (v: LocationType) => void;
  customAddress: string;
  onCustomChange: (v: string) => void;
  companyAddress: string;
}) {
  return (
    <div className="mb-3">
      <div className="text-[11px] text-muted-foreground mb-1">Locatie</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value as LocationType)}
        className="w-full px-3 py-2.5 rounded-lg border border-border bg-foreground/[0.05] text-foreground text-[13px] outline-none"
      >
        <option value="">Selecteer locatie...</option>
        <option value="google_meet" className="text-foreground bg-card">Google Meet</option>
        <option value="bedrijf" className="text-foreground bg-card">Bedrijfslocatie</option>
        <option value="op_locatie" className="text-foreground bg-card">Op locatie</option>
      </select>
      {value === 'bedrijf' && companyAddress && (
        <div className="mt-1.5 px-3 py-2 rounded-lg bg-foreground/[0.03] border border-border text-[12px] text-muted-foreground">
          📍 {companyAddress}
        </div>
      )}
      {value === 'op_locatie' && (
        <input
          type="text"
          value={customAddress}
          onChange={e => onCustomChange(e.target.value)}
          placeholder="Vul adres in (bijv. Van der Valk Eindhoven)"
          className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-border bg-foreground/[0.03] text-foreground text-[13px] outline-none placeholder:text-muted-foreground/60"
        />
      )}
    </div>
  );
}

interface CallContentProps {
  activeContact: CompanyContact;
  activeComp: Company;
  phase: CallPhase;
  callState: CallState;
  setPhase: (p: CallPhase) => void;
  answers: SurveyAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<SurveyAnswers>>;
  taskString: string;
  onEndCall: (phase: CallPhase, stage: Company['stage']) => void;
  onNextContact: () => void;
  showToast: (msg: string, type?: string) => void;
  updateStage: (compId: string, stage: Company['stage']) => void;
  addScore: (type: string) => void;
  bookDate: string;
  setBookDate: (v: string) => void;
  bookTime: string;
  setBookTime: (v: string) => void;
  bookAdvisor: string;
  setBookAdvisor: (v: string) => void;
  scores: Scores;
  onShowCallback: () => void;
  onStartDialing: (callId?: string) => void;
  onHangup: () => void;
  onConfirmConnected: () => void;
  activeCompId: string;
  onShowDetail?: () => void;
}

function ActionBtn({ children, variant = 'primary', wide, onClick }: { children: React.ReactNode; variant?: 'primary' | 'ghost' | 'warning' | 'danger' | 'muted'; wide?: boolean; onClick: () => void }) {
  const base = 'px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 active:scale-[0.97]';
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    ghost: 'bg-transparent border border-foreground/10 text-foreground/55 hover:bg-foreground/5',
    warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    muted: 'bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30',
  };
  return (
    <button onClick={onClick} className={cn(base, variants[variant], wide && 'w-full')}>
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

export function CallContent({
  activeContact, activeComp, phase, callState, setPhase, answers, setAnswers, taskString,
  onEndCall, onNextContact, showToast, updateStage, addScore,
  bookDate, setBookDate, bookTime, setBookTime, bookAdvisor, setBookAdvisor,
  scores, onShowCallback, onStartDialing, onHangup, onConfirmConnected, activeCompId, onShowDetail,
}: CallContentProps) {
  const { t, surveyConfig } = useBelTool();
  const [locationType, setLocationType] = useState<LocationType>('');
  const [customAddress, setCustomAddress] = useState('');
  const stepIndex: Record<string, number> = { intro: 0, q1: 1, q2: 2, q3: 3, q4: 4, bridge: 5 };
  const currentStepNum = stepIndex[phase] ?? -1;
  const contactName = `${activeContact.firstName} ${activeContact.lastName}`;

  // Idle screen
  if (phase === 'idle') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
        <div className="text-5xl">📞</div>
        <div className="text-lg font-bold text-foreground/40 mt-4">{t.selectContact}</div>
        <div className="text-[13px] text-foreground/20 mt-1.5">{t.clickName}</div>
        {scores.gebeld > 0 && (
          <div className="animate-fade-in mt-5 bg-foreground/[0.02] rounded-xl p-4 border border-border/40">
            <div className="text-[10px] font-bold text-muted-foreground/30 mb-2.5 text-center tracking-[1.5px]">{t.sessionOverview}</div>
            <div className="flex gap-5 justify-center">
              {[
                { l: t.called, v: scores.gebeld, c: 'rgba(255,255,255,0.4)' },
                { l: t.surveys, v: scores.enquetes, c: 'hsl(174 100% 38%)' },
                { l: t.appointments, v: scores.afspraken, c: 'hsl(152 56% 42%)' },
                { l: t.conversion, v: scores.gebeld > 0 ? Math.round(((scores.enquetes + scores.afspraken) / scores.gebeld) * 100) + '%' : '0%', c: 'hsl(38 92% 50%)' },
                { l: t.bestStreak, v: scores.bestReeks, c: 'hsl(38 92% 50%)' },
              ].map(x => (
                <div key={x.l} className="text-center">
                  <div className="text-[22px] font-extrabold" style={{ color: x.c }}>{x.v}</div>
                  <div className="text-[11px] text-muted-foreground/30 mt-0.5">{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Precall screen removed — we go directly to intro

  // Active call content
  return (
    <>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-2.5 bg-foreground/[0.02] border-b border-border/40">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-info to-primary flex items-center justify-center font-bold text-[13px] flex-shrink-0">
          {activeContact.firstName[0]}{activeContact.lastName[0]}
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm">
            {contactName} <span className="font-normal text-muted-foreground text-xs">({activeContact.role})</span>
          </div>
          <div className="text-xs text-muted-foreground/40">{activeComp.name}</div>
        </div>
        <div className="text-right mr-2">
          <div className="text-xs text-foreground/50">{activeContact.phone}</div>
          <div className="text-[10px] text-muted-foreground/30">{activeContact.email}</div>
        </div>
        {onShowDetail && (
          <button onClick={onShowDetail} className="p-2 rounded-lg bg-foreground/[0.04] text-muted-foreground hover:text-foreground transition-colors">ℹ️</button>
        )}
        {callState === 'idle' && (
          <CallButton
            phoneNumber={activeContact.phone}
            leadId={activeContact.id}
            leadName={`${activeContact.firstName} ${activeContact.lastName}`}
            onCallStarted={() => {
              onStartDialing();
            }}
          />
        )}
        {callState !== 'idle' && callState !== 'ended' && (
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold',
            callState === 'active' ? 'bg-success/10 text-success border border-success/20' : 'bg-warning/10 text-warning border border-warning/20'
          )}>
            <div className={cn('w-2 h-2 rounded-full animate-pulse', callState === 'active' ? 'bg-success' : 'bg-warning')} />
            {callState === 'dialing' ? 'Verbinden...' : callState === 'ringing' ? 'Gaat over...' : 'In gesprek'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 animate-fade-in" key={phase}>
        {phase === 'intro' && (
          <StepLayout step={1} total={6} icon={surveyConfig.intro.icon} title={surveyConfig.intro.title}
            script={renderScript(surveyConfig.intro.script, activeContact, answers)} tip={surveyConfig.intro.tip}>
            <div className="flex flex-wrap gap-1.5 mt-3.5">
              <ActionBtn onClick={() => { setPhase('q1'); updateStage(activeCompId, 'enqueteGestart'); }}>{t.agree}</ActionBtn>
              <ActionBtn variant="warning" onClick={() => { onEndCall('sent', 'enqueteVerstuurd'); addScore('verstuurd'); showToast(t.surveyDigitalSent, 'info'); }}>{t.noTime}</ActionBtn>
              <ActionBtn variant="warning" onClick={onShowCallback}>{t.callback}</ActionBtn>
              <ActionBtn variant="muted" onClick={() => { onEndCall('noanswer', 'geenGehoor'); addScore('geenGehoor'); showToast(t.noAnswerNoted); }}>{t.noAnswerAction}</ActionBtn>
              <ActionBtn variant="danger" onClick={() => { onEndCall('lost', 'nietInteressant'); addScore('afgevallen'); }}>{t.notInterested}</ActionBtn>
            </div>
          </StepLayout>
        )}

        {phase === 'q1' && (
          <StepLayout step={2} total={6} icon={surveyConfig.q1.icon} title={surveyConfig.q1.title}
            script={renderScript(surveyConfig.q1.script, activeContact, answers)} tip={surveyConfig.q1.tip || undefined}>
            <div className="text-[11px] font-bold text-primary tracking-wide mb-2">{surveyConfig.q1.fieldLabel}</div>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {((surveyConfig.q1.options || []) as string[]).map(h => (
                <button key={h} onClick={() => setAnswers(a => ({ ...a, hours: h }))}
                  className={cn('px-3.5 py-1.5 rounded-lg text-[13px] font-semibold border-2 transition-all',
                    answers.hours === h ? 'border-primary bg-primary/15 text-primary' : 'border-foreground/[0.06] text-foreground/50'
                  )}>{h}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <ActionBtn variant="ghost" onClick={() => setPhase('intro')}>{t.back}</ActionBtn>
              <ActionBtn onClick={() => { if (!answers.hours) { showToast(t.selectHours, 'err'); return; } setPhase('q2'); }}>{t.next}</ActionBtn>
            </div>
          </StepLayout>
        )}

        {phase === 'q2' && (
          <StepLayout step={3} total={6} icon={surveyConfig.q2.icon} title={surveyConfig.q2.title}
            script={renderScript(surveyConfig.q2.script, activeContact, answers)} tip={surveyConfig.q2.tip || undefined}>
            <div className="text-[11px] font-bold text-primary tracking-wide mb-2">{surveyConfig.q2.fieldLabel}</div>
            <div className="space-y-1.5 mb-2.5">
              {((surveyConfig.q2.options || []) as string[]).map(tk => {
                const sel = answers.tasks.includes(tk);
                return (
                  <button key={tk} onClick={() => setAnswers(a => ({ ...a, tasks: sel ? a.tasks.filter(x => x !== tk) : [...a.tasks, tk] }))}
                    className={cn('flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-[13px] w-full border-[1.5px] transition-all',
                      sel ? 'border-primary bg-primary/10 text-foreground' : 'border-foreground/[0.08] text-foreground/65 hover:border-foreground/20'
                    )}>
                    <span className={cn('w-[18px] h-[18px] rounded border-2 flex items-center justify-center text-[11px] shrink-0',
                      sel ? 'bg-primary border-primary text-primary-foreground' : 'border-foreground/20'
                    )}>{sel ? '✓' : ''}</span>
                    {tk}
                  </button>
                );
              })}
            </div>
            {surveyConfig.q2.allowOther !== false && (
              <textarea placeholder={t.otherTasks} value={answers.tasksOther}
                onChange={e => setAnswers(a => ({ ...a, tasksOther: e.target.value }))} rows={2}
                className="w-full px-3 py-2.5 rounded-lg border border-foreground/[0.08] bg-foreground/[0.03] text-foreground text-[13px] outline-none resize-y leading-relaxed mb-5 placeholder:text-muted-foreground focus:ring-1 focus:ring-primary" />
            )}
            <div className="flex gap-2">
              <ActionBtn variant="ghost" onClick={() => setPhase('q1')}>{t.back}</ActionBtn>
              <ActionBtn onClick={() => { if (!answers.tasks.length && !answers.tasksOther.trim()) { showToast(t.selectOneTask, 'err'); return; } setPhase('q3'); }}>{t.next}</ActionBtn>
            </div>
          </StepLayout>
        )}

        {phase === 'q3' && (
          <StepLayout step={4} total={6} icon={surveyConfig.q3.icon} title={surveyConfig.q3.title}
            script={renderScript(surveyConfig.q3.script, activeContact, answers)} tip={surveyConfig.q3.tip || undefined}>
            <div className="text-[11px] font-bold text-primary tracking-wide mb-2">{surveyConfig.q3.fieldLabel}</div>
            <div className="space-y-2 mb-5">
              {((surveyConfig.q3.options || []) as SelectOption[]).map(o => (
                <BigOption key={o.value} selected={answers.growth === o.value} icon={o.icon} title={o.value} subtitle={o.label} onClick={() => setAnswers(a => ({ ...a, growth: o.value }))} />
              ))}
            </div>
            <div className="flex gap-2">
              <ActionBtn variant="ghost" onClick={() => setPhase('q2')}>{t.back}</ActionBtn>
              <ActionBtn onClick={() => { if (!answers.growth) { showToast(t.makeChoice, 'err'); return; } setPhase('q4'); }}>{t.next}</ActionBtn>
            </div>
          </StepLayout>
        )}

        {phase === 'q4' && (
          <StepLayout step={5} total={6} icon={surveyConfig.q4.icon} title={surveyConfig.q4.title}
            script={renderScript(surveyConfig.q4.script, activeContact, answers)} tip={surveyConfig.q4.tip || undefined}>
            <div className="text-[11px] font-bold text-primary tracking-wide mb-2">{surveyConfig.q4.fieldLabel}</div>
            <div className="space-y-2 mb-5">
              {((surveyConfig.q4.options || []) as SelectOption[]).map(o => (
                <BigOption key={o.value} selected={answers.ai === o.value} icon={o.icon} title={o.value} subtitle={o.label} onClick={() => setAnswers(a => ({ ...a, ai: o.value }))} />
              ))}
            </div>
            <div className="flex gap-2">
              <ActionBtn variant="ghost" onClick={() => setPhase('q3')}>{t.back}</ActionBtn>
              <ActionBtn onClick={() => {
                if (!answers.ai) { showToast(t.makeChoice, 'err'); return; }
                updateStage(activeCompId, 'enqueteTel');
                addScore('enquete');
                showToast(t.surveyCompleted);
                setPhase('bridge');
              }}>{t.finishSurvey}</ActionBtn>
            </div>
          </StepLayout>
        )}

        {phase === 'bridge' && (() => {
          const ls = calcLeadScore(answers);
          const ll = leadLabel(ls);
          const leadC = ll === 'hot' ? 'hsl(0 84% 60%)' : ll === 'warm' ? 'hsl(38 92% 50%)' : 'hsl(217 91% 60%)';
          return (
            <StepLayout step={6} total={6} icon={surveyConfig.bridge.icon} title={surveyConfig.bridge.title}
              script={renderScript(surveyConfig.bridge.script, activeContact, answers)} tip={surveyConfig.bridge.tip || undefined}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg mb-3.5" style={{ background: leadC + '12', border: '1px solid ' + leadC + '25' }}>
                <span className="text-base">{ll === 'hot' ? '🔥' : ll === 'warm' ? '☀️' : '❄️'}</span>
                <span className="font-bold text-[13px]" style={{ color: leadC }}>{t[ll]} LEAD — {ls}pts</span>
              </div>

              <div className="bg-primary/[0.05] border border-primary/15 rounded-xl p-4 mb-3.5">
                <div className="text-xs font-bold text-primary tracking-wide mb-3">{t.bookAppointment}</div>
                <div className="flex gap-2.5 mb-2.5">
                  <CalendarPicker bookDate={bookDate} setBookDate={setBookDate} bookTime={bookTime} setBookTime={setBookTime} />
                </div>
                <div className="mb-3">
                  <div className="text-[11px] text-muted-foreground mb-1">{t.advisor}</div>
                  <select value={bookAdvisor} onChange={e => setBookAdvisor(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-foreground/[0.05] text-foreground text-[13px] outline-none">
                    <option value="">{t.selectAdvisor}</option>
                    {ADVISORS.map(a => <option key={a.id} value={a.id} className="text-foreground bg-card">{a.name} — {a.specialty}</option>)}
                  </select>
                </div>
                <LocationSelect
                  value={locationType}
                  onChange={setLocationType}
                  customAddress={customAddress}
                  onCustomChange={setCustomAddress}
                  companyAddress={activeComp.address || ''}
                />
                <GhlCalendarSelect />
                <ActionBtn wide onClick={() => {
                  if (!bookDate || !bookTime) { showToast(t.pickDateTime, 'err'); return; }
                  if (!bookAdvisor) { showToast(t.selectAdvisor, 'err'); return; }
                  if (!locationType) { showToast('Selecteer een locatie', 'err'); return; }
                  if (locationType === 'op_locatie' && !customAddress.trim()) { showToast('Vul een adres in', 'err'); return; }
                  const calId = (document.getElementById('ghl-calendar-select') as HTMLSelectElement)?.value;
                  if (!calId) { showToast('Selecteer een kalender', 'err'); return; }
                  // Determine location string
                  const locationStr = locationType === 'google_meet' ? 'Google Meet'
                    : locationType === 'bedrijf' ? `Bedrijfslocatie: ${activeComp.address || 'Adres onbekend'}`
                    : `Op locatie: ${customAddress.trim()}`;
                  // Book in GHL
                  ghl.bookAppointment(activeContact.id, bookDate, bookTime, bookAdvisor, calId, locationStr).catch(err => {
                    console.error('Appointment error:', err);
                    showToast('Fout bij inplannen: ' + err.message, 'err');
                  });
                  // Create task in GHL
                  ghl.createTask(activeContact.id, `Adviesgesprek ${activeContact.firstName} ${activeContact.lastName}`, {
                    body: `Afspraak op ${fmtDate(bookDate)} om ${bookTime}\n📍 ${locationStr}`,
                    dueDate: `${bookDate}T${bookTime}:00`,
                  }).catch(console.error);
                  // Update pipeline
                  ghl.upsertOpportunity(activeContact.id, '', '', `${activeComp.name} - Adviesgesprek`).catch(console.error);
                  onEndCall('done', 'afspraak');
                  addScore('afspraak');
                  const adv = ADVISORS.find(a => a.id === bookAdvisor);
                  showToast(`${t.appointmentPlanned} — ${fmtDate(bookDate)} ${bookTime}${adv ? ` (${adv.name})` : ''}`);
                }}>{t.bookConfirm}</ActionBtn>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <ActionBtn variant="ghost" onClick={() => setPhase('q4')}>{t.back}</ActionBtn>
                <ActionBtn variant="warning" onClick={() => { onEndCall('sent', 'enqueteVerstuurd'); addScore('verstuurd'); showToast(t.bookingSent, 'info'); }}>{t.sendBookingDigital}</ActionBtn>
                <ActionBtn variant="danger" onClick={() => { onEndCall('lost', 'nietInteressant'); addScore('afgevallen'); }}>{t.notInterested}</ActionBtn>
              </div>
            </StepLayout>
          );
        })()}

        {phase === 'sent' && <EndView icon="📨" title={t.surveySent} sub={`${activeContact.firstName} ${t.surveyAutoSent}`} items={[t.emailSent, t.whatsappSent, t.stageUpdated]} scores={scores} onNext={onNextContact} />}
        {phase === 'done' && <EndView icon="🎉" title={t.appointmentBooked} sub={`${t.appointmentWith} ${activeContact.firstName}.`}
          items={[`${t.chooseDate}: ${bookDate ? fmtDate(bookDate) : '-'}`, `${t.chooseTime}: ${bookTime || '-'}`, `${t.advisor}: ${ADVISORS.find(a => a.id === bookAdvisor)?.name || '-'}`, t.confirmAutoSent, t.reminder24]}
          answers={answers} taskString={taskString} scores={scores} onNext={onNextContact} />}
        {phase === 'lost' && <EndView icon="🚫" title={t.notInterestedEnd} sub={`${activeContact.firstName} ${t.markedDropped}`} scores={scores} onNext={onNextContact} />}
        {phase === 'noanswer' && <EndView icon="📵" title={t.noAnswerEnd} sub={`${activeContact.firstName} ${t.markedCallback}`} scores={scores} onNext={onNextContact} />}
      </div>

      {/* Floating call display */}
      <CallDisplay
        callState={callState}
        contact={activeContact}
        company={activeComp}
        onHangup={() => { onEndCall('lost', 'nietInteressant'); addScore('afgevallen'); }}
      />
    </>
  );
}
