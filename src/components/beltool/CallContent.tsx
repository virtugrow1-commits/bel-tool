import { cn } from '@/lib/utils';
import type { CompanyContact, Company, CallPhase, CallState, SurveyAnswers, SelectOption, SurveyConfig } from '@/types/beltool';
import { CallButton } from './CallButton';
import { CallDisplay } from './CallDisplay';
import { ObjectionPanel } from './ObjectionPanel';
import { VoicemailScript } from './VoicemailScript';
import { WrapUpTimer } from './WrapUpTimer';
import { useState, useEffect } from 'react';
import { StepLayout } from './StepLayout';
import { EndView } from './EndView';
import { renderScript, getWorkdays, fmtDate, TIMES } from '@/lib/beltool-data';
import type { Advisor } from '@/lib/beltool-data';
import { calcLeadScore, leadLabel, type Scores } from '@/lib/beltool-scoring';
import { useBelTool } from '@/contexts/BelToolContext';
import { cliq } from '@/lib/beltool-ghl';
import { store } from '@/lib/beltool-store';

function CalendarPicker({ bookDate, setBookDate, bookTime, setBookTime, calendarId }: { bookDate: string; setBookDate: (v: string) => void; bookTime: string; setBookTime: (v: string) => void; calendarId: string }) {
  const [freeSlots, setFreeSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Fetch free slots when date + calendar change
  useEffect(() => {
    if (!bookDate || !calendarId) {
      setFreeSlots([]);
      setBookTime('');
      return;
    }
    setLoadingSlots(true);
    setBookTime('');
    cliq.getFreeSlots(calendarId, bookDate)
      .then((data: any) => {
        // GHL returns { [date]: { slots: ["2026-03-23T09:00:00+02:00", ...] } } or similar
        const dateSlots = data?.[bookDate]?.slots || data?.slots || [];
        // Also check for nested format: data.<date>.slots
        const allSlots: string[] = [];
        if (Array.isArray(dateSlots)) {
          dateSlots.forEach((s: string) => {
            const time = s.includes('T') ? s.split('T')[1]?.substring(0, 5) : s;
            if (time) allSlots.push(time);
          });
        } else if (typeof data === 'object') {
          // Try to extract from any date key
          Object.values(data).forEach((v: any) => {
            const slots = v?.slots || (Array.isArray(v) ? v : []);
            slots.forEach((s: string) => {
              if (typeof s === 'string') {
                const time = s.includes('T') ? s.split('T')[1]?.substring(0, 5) : s;
                if (time) allSlots.push(time);
              }
            });
          });
        }
        setFreeSlots(allSlots.sort());
      })
      .catch(() => {
        // Fallback to static times if free slots API fails
        setFreeSlots(TIMES);
      })
      .finally(() => setLoadingSlots(false));
  }, [bookDate, calendarId]);

  return (
    <>
      <div className="flex-1">
        <div className="text-[11px] font-semibold text-muted-foreground mb-1">Datum</div>
        <select value={bookDate} onChange={e => setBookDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground text-[13px] outline-none focus:border-primary">
          <option value="">Kies datum...</option>
          {getWorkdays(10).map(d => {
            const v = d.toISOString().split('T')[0];
            return <option key={v} value={v}>{fmtDate(v)}</option>;
          })}
        </select>
      </div>
      <div className="flex-1">
        <div className="text-[11px] font-semibold text-muted-foreground mb-1">Tijd</div>
        <select value={bookTime} onChange={e => setBookTime(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground text-[13px] outline-none focus:border-primary" disabled={!bookDate || !calendarId}>
          {!bookDate || !calendarId ? (
            <option value="">Kies eerst datum & kalender</option>
          ) : loadingSlots ? (
            <option value="">Slots laden...</option>
          ) : freeSlots.length === 0 ? (
            <option value="">Geen beschikbare tijden</option>
          ) : (
            <>
              <option value="">Kies tijd...</option>
              {freeSlots.map(tm => <option key={tm} value={tm}>{tm}</option>)}
            </>
          )}
        </select>
      </div>
    </>
  );
}

function CliqCalendarSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [calendars, setCalendars] = useState<{ id: string; name: string; isActive?: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cliq.getCalendars()
      .then((data: any) => {
        const cals = (data?.calendars || []).filter((c: any) => c.isActive !== false);
        setCalendars(cals);
        // Auto-select first calendar
        if (cals.length === 1 && !value) onChange(cals[0].id);
      })
      .catch(() => setCalendars([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mb-3">
      <div className="text-[11px] font-semibold text-muted-foreground mb-1">CLIQ Kalender</div>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground text-[13px] outline-none focus:border-primary">
        {loading ? (
          <option value="">Laden...</option>
        ) : calendars.length === 0 ? (
          <option value="">Geen actieve kalenders gevonden</option>
        ) : (
          <>
            <option value="">Selecteer kalender...</option>
            {calendars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
      <div className="text-[11px] font-semibold text-muted-foreground mb-1">Locatie</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value as LocationType)}
        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground text-[13px] outline-none focus:border-primary"
      >
        <option value="">Selecteer locatie...</option>
        <option value="google_meet">Google Meet</option>
        <option value="bedrijf">Bedrijfslocatie</option>
        <option value="op_locatie">Op locatie</option>
      </select>
      {value === 'bedrijf' && companyAddress && (
        <div className="mt-1.5 px-3 py-2 rounded-lg bg-muted/50 border border-border text-[12px] text-muted-foreground">
          📍 {companyAddress}
        </div>
      )}
      {value === 'op_locatie' && (
        <input
          type="text"
          value={customAddress}
          onChange={e => onCustomChange(e.target.value)}
          placeholder="Vul adres in (bijv. Van der Valk Eindhoven)"
          className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground text-[13px] outline-none placeholder:text-muted-foreground/60 focus:border-primary"
        />
      )}
    </div>
  );
}

interface DailyTargets {
  calls: number;
  appointments: number;
  surveys: number;
}

const QUICK_NOTES = [
  { label: 'VM ingesproken', icon: '📩' },
  { label: 'Terugbellen na vakantie', icon: '🏖️' },
  { label: 'Interesse maar druk', icon: '⏳' },
  { label: 'Doorverbonden secretaresse', icon: '👩‍💼' },
  { label: 'Voicemail vol', icon: '📵' },
  { label: 'Verkeerd nummer', icon: '❌' },
];

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
  notes: string;
  onNotesChange: (v: string) => void;
  dailyTargets: DailyTargets;
  onShowWhatsApp?: (context: string) => void;
  advisors: Advisor[];
}

function ActionBtn({ children, variant = 'primary', wide, onClick }: { children: React.ReactNode; variant?: 'primary' | 'ghost' | 'warning' | 'danger' | 'muted'; wide?: boolean; onClick: () => void }) {
  const base = 'px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 active:scale-[0.97]';
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
    ghost: 'bg-transparent border border-border text-foreground/70 hover:bg-muted/50',
    warning: 'bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20',
    danger: 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20',
    muted: 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border',
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
        'flex items-center gap-3 p-3.5 rounded-xl text-left w-full text-sm border-2 transition-all duration-150',
        selected ? 'border-primary bg-primary/[0.06] shadow-sm' : 'border-border hover:border-primary/30'
      )}
    >
      <span className="text-[22px]">{icon}</span>
      <div className="flex-1">
        <div className="font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      </div>
      {selected && <span className="text-primary font-bold text-lg">✓</span>}
    </button>
  );
}

export function CallContent({
  activeContact, activeComp, phase, callState, setPhase, answers, setAnswers, taskString,
  onEndCall, onNextContact, showToast, updateStage, addScore,
  bookDate, setBookDate, bookTime, setBookTime, bookAdvisor, setBookAdvisor,
  scores, onShowCallback, onStartDialing, onHangup, onConfirmConnected, activeCompId, onShowDetail,
  notes, onNotesChange, dailyTargets, onShowWhatsApp, advisors,
}: CallContentProps) {
  const { t, surveyConfig, user } = useBelTool();
  const [locationType, setLocationType] = useState<LocationType>('');
  const [customAddress, setCustomAddress] = useState('');
  const [selectedCalId, setSelectedCalId] = useState('');
  const [showVoicemail, setShowVoicemail] = useState(false);
  const [showWrapUp, setShowWrapUp] = useState(false);
  const stepIndex: Record<string, number> = { intro: 0, q1: 1, q2: 2, q3: 3, q4: 4, bridge: 5 };
  const currentStepNum = stepIndex[phase] ?? -1;
  const contactName = `${activeContact.firstName} ${activeContact.lastName}`;

  // Idle screen — show scores in the center
  if (phase === 'idle') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 bg-background">
        <div className="text-5xl">📞</div>
        <div className="text-lg font-bold text-foreground/50 mt-4">{t.selectContact}</div>
        <div className="text-[13px] text-muted-foreground mt-1.5">{t.clickName}</div>

        {/* Session score overview — always visible */}
        <div className="animate-fade-in mt-6 bg-card rounded-2xl p-6 border border-border shadow-sm w-full max-w-lg">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 text-center">{t.sessionOverview || 'Sessie overzicht'}</div>
          <div className="grid grid-cols-5 gap-4">
            {[
              { l: t.called, v: scores.gebeld, c: 'hsl(var(--navy))' },
              { l: t.surveys, v: scores.enquetes, c: 'hsl(var(--primary))' },
              { l: t.appointments, v: scores.afspraken, c: 'hsl(var(--success))' },
              { l: t.conversion, v: scores.gebeld > 0 ? Math.round(((scores.enquetes + scores.afspraken) / scores.gebeld) * 100) + '%' : '0%', c: 'hsl(var(--warning))' },
              { l: t.bestStreak, v: scores.bestReeks, c: 'hsl(var(--warning))' },
            ].map(x => (
              <div key={x.l} className="text-center">
                <div className="text-[28px] font-extrabold leading-none" style={{ color: x.c }}>{x.v}</div>
                <div className="text-[11px] text-muted-foreground mt-1.5">{x.l}</div>
              </div>
            ))}
          </div>
          {scores.reeks >= 2 && (
            <div className="mt-4 text-center">
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-warning/10 text-warning border border-warning/20">🔥 {scores.reeks}x streak!</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top bar: contact + stats + quick notes */}
      <div className="border-b border-border bg-card">
        {/* Row 1: Contact info + call controls */}
        <div className="flex items-center gap-3 px-5 py-2.5">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-bold text-[12px] flex-shrink-0 text-white">
            {activeContact.firstName[0]}{activeContact.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14px] text-foreground">
              {contactName} {activeContact.role && <span className="font-normal text-muted-foreground text-[12px]">• {activeContact.role}</span>}
            </div>
            <div className="text-[12px] text-muted-foreground">
              {activeComp.name}
            </div>
          </div>
          <div className="text-right mr-2 hidden sm:block">
            <div className="text-[12px] text-foreground/70 font-mono tabular-nums">{activeContact.phone}</div>
            <div className="text-[11px] text-muted-foreground">{activeContact.email}</div>
          </div>
          {onShowDetail && (
            <button onClick={onShowDetail} className="w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors text-[13px] border border-border">ℹ️</button>
          )}
          {callState === 'idle' && (
            <CallButton
              phoneNumber={activeContact.phone}
              leadId={activeContact.id}
              leadName={`${activeContact.firstName} ${activeContact.lastName}`}
              deviceId={user?.deviceId}
              onCallStarted={(callId) => { onStartDialing(callId); }}
            />
          )}
          {callState !== 'idle' && callState !== 'ended' && (
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border',
              callState === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'
            )}>
              <div className={cn('w-2 h-2 rounded-full animate-pulse', callState === 'active' ? 'bg-success' : 'bg-warning')} />
              {callState === 'dialing' ? 'Verbinden...' : callState === 'ringing' ? 'Gaat over...' : 'In gesprek'}
            </div>
          )}
        </div>

        {/* Row 2: Stats + daily targets + quick notes */}
        <div className="flex items-center gap-3 px-5 py-2 border-t border-border/50 bg-muted/20">
          {/* Inline scores */}
          <div className="flex items-center gap-3">
            {[
              { label: t.called, value: scores.gebeld, target: dailyTargets.calls, color: 'hsl(var(--navy))' },
              { label: t.surveys, value: scores.enquetes, target: dailyTargets.surveys, color: 'hsl(var(--primary))' },
              { label: t.appointments, value: scores.afspraken, target: dailyTargets.appointments, color: 'hsl(var(--success))' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="text-[16px] font-extrabold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                <span className="text-[10px] text-muted-foreground">/{s.target}</span>
                <span className="text-[9px] text-muted-foreground font-medium">{s.label}</span>
              </div>
            ))}
            {scores.reeks >= 2 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">🔥{scores.reeks}x</span>}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-border" />

          {/* Quick notes */}
          {phase !== 'precall' && (
            <div className="flex items-center gap-1 flex-1 overflow-x-auto">
              <span className="text-[9px] text-muted-foreground font-bold shrink-0">📝</span>
              {QUICK_NOTES.map(n => (
                <button
                  key={n.label}
                  onClick={() => onNotesChange(notes ? notes + '\n' + n.label : n.label)}
                  className="px-2 py-0.5 rounded-md border border-border bg-card text-[9px] font-medium text-foreground/60 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors active:scale-[0.95] whitespace-nowrap shrink-0"
                >
                  {n.icon} {n.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 animate-fade-in bg-background" key={phase}>
        {phase === 'intro' && (
          <StepLayout step={1} total={6} icon={surveyConfig.intro.icon} title={surveyConfig.intro.title}
            script={renderScript(surveyConfig.intro.script, activeContact, answers, user?.name)} tip={surveyConfig.intro.tip}>
            <div className="flex flex-wrap gap-1.5 mt-3.5">
              <ActionBtn onClick={() => { setPhase('q1'); updateStage(activeCompId, 'enqueteGestart'); }}>{t.agree}</ActionBtn>
              <ActionBtn variant="warning" onClick={() => { onNotesChange(notes ? notes + '\n📨 Enquête digitaal verstuurd' : '📨 Enquête digitaal verstuurd'); onEndCall('sent', 'enqueteVerstuurd'); addScore('verstuurd'); showToast(t.surveyDigitalSent, 'info'); }}>{t.noTime}</ActionBtn>
              <ActionBtn variant="warning" onClick={onShowCallback}>{t.callback}</ActionBtn>
              <ActionBtn variant="muted" onClick={() => { setShowVoicemail(true); }}>{t.noAnswerAction}</ActionBtn>
              <ActionBtn variant="danger" onClick={() => { onNotesChange(notes ? notes + '\n🚫 Niet geïnteresseerd' : '🚫 Niet geïnteresseerd'); onEndCall('lost', 'nietInteressant'); addScore('afgevallen'); }}>{t.notInterested}</ActionBtn>
              {user?.role === 'admin' && (
                <ActionBtn variant="ghost" onClick={() => { onEndCall('idle' as any, 'nieuw'); showToast('Lead gereset', 'info'); }}>✕ Annuleren</ActionBtn>
              )}
            </div>

            {/* Voicemail script overlay */}
            {showVoicemail && (
              <div className="mt-4">
                <VoicemailScript
                  contactName={activeContact.firstName}
                  companyName={activeComp.name}
                  callerName={user?.name || 'Beller'}
                  onDone={() => { setShowVoicemail(false); onNotesChange(notes ? notes + '\n📩 VM ingesproken' : '📩 VM ingesproken'); onEndCall('noanswer', 'geenGehoor'); addScore('geenGehoor'); showToast('VM ingesproken + geen gehoor genoteerd'); }}
                  onSkip={() => { setShowVoicemail(false); onNotesChange(notes ? notes + '\n📵 Geen gehoor' : '📵 Geen gehoor'); onEndCall('noanswer', 'geenGehoor'); addScore('geenGehoor'); showToast(t.noAnswerNoted); }}
                />
              </div>
            )}

            {/* Objection handling panel */}
            {!showVoicemail && (
              <div className="mt-4">
                <ObjectionPanel
                  contactName={activeContact.firstName}
                  onUseRebuttal={(text) => {
                    const short = text.length > 80 ? text.substring(0, 80) + '...' : text;
                    onNotesChange(notes ? notes + '\n📋 Weerlegging: ' + short : '📋 Weerlegging: ' + short);
                  }}
                />
              </div>
            )}
          </StepLayout>
        )}

        {phase === 'q1' && (
          <StepLayout step={2} total={6} icon={surveyConfig.q1.icon} title={surveyConfig.q1.title}
            script={renderScript(surveyConfig.q1.script, activeContact, answers, user?.name)} tip={surveyConfig.q1.tip || undefined}>
            <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2">{surveyConfig.q1.fieldLabel}</div>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {((surveyConfig.q1.options || []) as string[]).map(h => (
                <button key={h} onClick={() => setAnswers(a => ({ ...a, hours: h }))}
                  className={cn('px-3.5 py-1.5 rounded-lg text-[13px] font-semibold border-2 transition-all',
                    answers.hours === h ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground/60 hover:border-primary/30'
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
            script={renderScript(surveyConfig.q2.script, activeContact, answers, user?.name)} tip={surveyConfig.q2.tip || undefined}>
            <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2">{surveyConfig.q2.fieldLabel}</div>
            <div className="space-y-1.5 mb-2.5">
              {((surveyConfig.q2.options || []) as string[]).map(tk => {
                const sel = answers.tasks.includes(tk);
                return (
                  <button key={tk} onClick={() => setAnswers(a => ({ ...a, tasks: sel ? a.tasks.filter(x => x !== tk) : [...a.tasks, tk] }))}
                    className={cn('flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-[13px] w-full border-2 transition-all',
                      sel ? 'border-primary bg-primary/[0.06] text-foreground' : 'border-border text-foreground/70 hover:border-primary/30'
                    )}>
                    <span className={cn('w-[18px] h-[18px] rounded border-2 flex items-center justify-center text-[11px] shrink-0',
                      sel ? 'bg-primary border-primary text-white' : 'border-border'
                    )}>{sel ? '✓' : ''}</span>
                    {tk}
                  </button>
                );
              })}
            </div>
            {surveyConfig.q2.allowOther !== false && (
              <textarea placeholder={t.otherTasks} value={answers.tasksOther}
                onChange={e => setAnswers(a => ({ ...a, tasksOther: e.target.value }))} rows={2}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground text-[13px] outline-none resize-y leading-relaxed mb-5 placeholder:text-muted-foreground/60 focus:border-primary" />
            )}
            <div className="flex gap-2">
              <ActionBtn variant="ghost" onClick={() => setPhase('q1')}>{t.back}</ActionBtn>
              <ActionBtn onClick={() => { if (!answers.tasks.length && !answers.tasksOther.trim()) { showToast(t.selectOneTask, 'err'); return; } setPhase('q3'); }}>{t.next}</ActionBtn>
            </div>
          </StepLayout>
        )}

        {phase === 'q3' && (
          <StepLayout step={4} total={6} icon={surveyConfig.q3.icon} title={surveyConfig.q3.title}
            script={renderScript(surveyConfig.q3.script, activeContact, answers, user?.name)} tip={surveyConfig.q3.tip || undefined}>
            <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2">{surveyConfig.q3.fieldLabel}</div>
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
            script={renderScript(surveyConfig.q4.script, activeContact, answers, user?.name)} tip={surveyConfig.q4.tip || undefined}>
            <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2">{surveyConfig.q4.fieldLabel}</div>
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
              script={renderScript(surveyConfig.bridge.script, activeContact, answers, user?.name)} tip={surveyConfig.bridge.tip || undefined}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg mb-3.5 border" style={{ background: leadC + '10', border: '1px solid ' + leadC + '25' }}>
                <span className="text-base">{ll === 'hot' ? '🔥' : ll === 'warm' ? '☀️' : '❄️'}</span>
                <span className="font-bold text-[13px]" style={{ color: leadC }}>{t[ll]} LEAD — {ls}pts</span>
              </div>

              <div className="bg-primary/[0.04] border border-primary/15 rounded-xl p-4 mb-3.5 shadow-sm">
                <div className="text-xs font-bold text-primary uppercase tracking-wider mb-3">{t.bookAppointment}</div>
                <CliqCalendarSelect value={selectedCalId} onChange={setSelectedCalId} />
                <div className="flex gap-2.5 mb-2.5">
                  <CalendarPicker bookDate={bookDate} setBookDate={setBookDate} bookTime={bookTime} setBookTime={setBookTime} calendarId={selectedCalId} />
                </div>
                <div className="mb-3">
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1">{t.advisor}</div>
                  <select value={bookAdvisor} onChange={e => setBookAdvisor(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-foreground text-[13px] outline-none focus:border-primary">
                    <option value="">{t.selectAdvisor}</option>
                    {advisors.map(a => <option key={a.id} value={a.id}>{a.name} — {a.specialty}</option>)}
                  </select>
                </div>
                <LocationSelect
                  value={locationType}
                  onChange={setLocationType}
                  customAddress={customAddress}
                  onCustomChange={setCustomAddress}
                  companyAddress={activeComp.address || ''}
                />
                <ActionBtn wide onClick={() => {
                  if (!bookDate || !bookTime) { showToast(t.pickDateTime, 'err'); return; }
                  if (!bookAdvisor) { showToast(t.selectAdvisor, 'err'); return; }
                  if (!locationType) { showToast('Selecteer een locatie', 'err'); return; }
                  if (locationType === 'op_locatie' && !customAddress.trim()) { showToast('Vul een adres in', 'err'); return; }
                  if (!selectedCalId) { showToast('Selecteer een kalender', 'err'); return; }
                  const calId = selectedCalId;
                  const locationStr = locationType === 'google_meet' ? 'Google Meet'
                    : locationType === 'bedrijf' ? `Bedrijfslocatie: ${activeComp.address || 'Adres onbekend'}`
                    : `Op locatie: ${customAddress.trim()}`;
                  cliq.bookAppointment(activeContact.id, bookDate, bookTime, bookAdvisor, calId, locationStr).catch(err => {
                    console.error('Appointment error:', err);
                    showToast('Fout bij inplannen: ' + err.message, 'err');
                  });
                  cliq.createTask(activeContact.id, `Adviesgesprek ${activeContact.firstName} ${activeContact.lastName}`, {
                    body: `Afspraak op ${fmtDate(bookDate)} om ${bookTime}\n📍 ${locationStr}`,
                    dueDate: `${bookDate}T${bookTime}:00`,
                  }).catch(console.error);
                  onEndCall('done', 'afspraak');
                  addScore('afspraak');
                  const adv = advisors.find(a => a.id === bookAdvisor);
                  showToast(`${t.appointmentPlanned} — ${fmtDate(bookDate)} ${bookTime}${adv ? ` (${adv.name})` : ''}`);
                }}>{t.bookConfirm}</ActionBtn>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <ActionBtn variant="ghost" onClick={() => setPhase('q4')}>{t.back}</ActionBtn>
                <ActionBtn variant="warning" onClick={() => { onNotesChange(notes ? notes + '\n📨 Booking link digitaal verstuurd' : '📨 Booking link digitaal verstuurd'); onEndCall('sent', 'enqueteVerstuurd'); addScore('verstuurd'); showToast(t.bookingSent, 'info'); }}>{t.sendBookingDigital}</ActionBtn>
                <ActionBtn variant="muted" onClick={() => { onNotesChange(notes ? notes + '\n⏳ Niet op dit moment' : '⏳ Niet op dit moment'); onEndCall('noanswer', 'anderMoment' as any); showToast('Ander moment genoteerd'); }}>⏳ Niet op dit moment</ActionBtn>
                <ActionBtn variant="danger" onClick={() => { onNotesChange(notes ? notes + '\n🚫 Niet geïnteresseerd' : '🚫 Niet geïnteresseerd'); onEndCall('lost', 'nietInteressant'); addScore('afgevallen'); }}>{t.notInterested}</ActionBtn>
              </div>
            </StepLayout>
          );
        })()}

        {phase === 'sent' && <EndView icon="📨" title={t.surveySent} sub={`${activeContact.firstName} ${t.surveyAutoSent}`} items={[t.emailSent, t.whatsappSent, t.stageUpdated]} scores={scores} onNext={onNextContact} hideNextButton={store.get('wrapUpEnabled', true)} />}
        {phase === 'done' && <EndView icon="🎉" title={t.appointmentBooked} sub={`${t.appointmentWith} ${activeContact.firstName}.`}
          items={[`${t.chooseDate}: ${bookDate ? fmtDate(bookDate) : '-'}`, `${t.chooseTime}: ${bookTime || '-'}`, `${t.advisor}: ${advisors.find(a => a.id === bookAdvisor)?.name || '-'}`, t.confirmAutoSent, t.reminder24]}
          answers={answers} taskString={taskString} scores={scores} onNext={onNextContact} hideNextButton={store.get('wrapUpEnabled', true)} />}
        {phase === 'lost' && <EndView icon="🚫" title={t.notInterestedEnd} sub={`${activeContact.firstName} ${t.markedDropped}`} scores={scores} onNext={onNextContact} hideNextButton={store.get('wrapUpEnabled', true)} />}
        {phase === 'noanswer' && <EndView icon="📵" title={t.noAnswerEnd} sub={`${activeContact.firstName} ${t.markedCallback}`} scores={scores} onNext={onNextContact} hideNextButton={store.get('wrapUpEnabled', true)} />}

        {/* Quick WhatsApp/SMS send button on end phases */}
        {['sent', 'done', 'lost', 'noanswer'].includes(phase) && onShowWhatsApp && (
          <div className="flex justify-center gap-2 mt-3">
            <button
              onClick={() => onShowWhatsApp(
                phase === 'sent' ? 'enquete'
                : phase === 'done' ? 'afspraak'
                : phase === 'noanswer' ? 'geen-gehoor'
                : 'interesse'
              )}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 text-[12px] font-semibold hover:bg-[#25D366]/20 active:scale-[0.97] transition-all"
            >
              💬 Stuur WhatsApp
            </button>
            <button
              onClick={() => onShowWhatsApp(
                phase === 'sent' ? 'enquete'
                : phase === 'done' ? 'afspraak'
                : phase === 'noanswer' ? 'geen-gehoor'
                : 'interesse'
              )}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-info/10 text-info border border-info/20 text-[12px] font-semibold hover:bg-info/20 active:scale-[0.97] transition-all"
            >
              📧 Stuur email
            </button>
          </div>
        )}

        {/* Wrap-up timer: shows on end phases to encourage note-taking */}
        {['sent', 'done', 'lost', 'noanswer'].includes(phase) && store.get('wrapUpEnabled', true) && (
          <div className="mt-4">
            <WrapUpTimer
              active={true}
              contactName={contactName}
              onComplete={onNextContact}
            />
          </div>
        )}
      </div>

      {/* Floating call display */}
      <CallDisplay
        callState={callState}
        contact={activeContact}
        company={activeComp}
        onHangup={onHangup}
        onConfirmConnected={onConfirmConnected}
      />
    </>
  );
}
