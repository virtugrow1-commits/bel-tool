import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, isBefore, startOfDay, parse } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';

/* ─── Types ─── */
interface GHLCalendar {
  id: string;
  name: string;
  description?: string;
}

interface TimeSlot {
  slots: string[];
}

interface ContactForm {
  naam: string;
  email: string;
  telefoon: string;
  bedrijf: string;
  opmerking: string;
}

const EMPTY_CONTACT: ContactForm = { naam: '', email: '', telefoon: '', bedrijf: '', opmerking: '' };

/* ─── Helper: call GHL proxy ─── */
async function callGHL(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('ghl-proxy', {
    body: { action, ...params },
  });
  if (error) throw new Error(`GHL ${action} failed: ${error.message}`);
  return data;
}

/* ─── Amsterdam offset ─── */
function getAmsterdamOffset(date: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Amsterdam',
    timeZoneName: 'shortOffset',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(`${date}T12:00:00Z`));
  const offsetValue = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+1';
  const match = offsetValue.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return '+01:00';
  const [, sign, hours, minutes = '00'] = match;
  return `${sign}${hours.padStart(2, '0')}:${minutes}`;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hh, mm] = time.split(':').map(Number);
  const totalMin = hh * 60 + mm + minutesToAdd;
  return `${String(Math.floor(totalMin / 60) % 24).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
}

/* ─── Steps ─── */
type Step = 'contact' | 'calendar' | 'date' | 'time' | 'confirm' | 'done';

export default function Afspraak() {
  const [step, setStep] = useState<Step>('contact');
  const [contact, setContact] = useState<ContactForm>(EMPTY_CONTACT);
  const [calendars, setCalendars] = useState<GHLCalendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Fetch calendars on mount
  useEffect(() => {
    callGHL('getCalendars').then((data) => {
      const cals = data?.calendars || [];
      setCalendars(cals);
      if (cals.length === 1) setSelectedCalendar(cals[0].id);
    }).catch(() => setError('Kon kalenders niet laden'));
  }, []);

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedCalendar || !selectedDate) return;
    setLoading(true);
    setSlots([]);
    setSelectedTime('');
    callGHL('getFreeSlots', { calendarId: selectedCalendar, startDate: selectedDate, endDate: selectedDate })
      .then((data) => {
        const dayKey = Object.keys(data || {})?.[0];
        const daySlots: TimeSlot[] = dayKey ? data[dayKey] : [];
        const allSlots = daySlots.flatMap((s: TimeSlot) => s.slots || []);
        // Convert to HH:mm and filter past times
        const now = new Date();
        const isToday = selectedDate === format(now, 'yyyy-MM-dd');
        const formatted = allSlots
          .map((s: string) => {
            const d = new Date(s);
            return format(d, 'HH:mm');
          })
          .filter((t: string) => {
            if (!isToday) return true;
            const [hh, mm] = t.split(':').map(Number);
            return hh > now.getHours() || (hh === now.getHours() && mm > now.getMinutes());
          })
          .sort();
        setSlots([...new Set(formatted)]);
      })
      .catch(() => setError('Kon beschikbare tijden niet ophalen'))
      .finally(() => setLoading(false));
  }, [selectedCalendar, selectedDate]);

  // Calendar grid for date selection
  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7; // Monday start
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [calendarMonth]);

  const today = startOfDay(new Date());
  const maxDate = addDays(today, 60);

  const contactValid = contact.naam.trim() && contact.email.trim() && contact.telefoon.trim();

  async function handleBook() {
    setLoading(true);
    setError('');
    try {
      // Create or find contact in GHL
      const contactResult = await callGHL('createContact', {
        name: contact.naam,
        email: contact.email,
        phone: contact.telefoon,
        companyName: contact.bedrijf,
        tags: ['website-afspraak'],
        source: 'Website Afspraak',
      });
      const contactId = contactResult?.contact?.id || contactResult?.id;
      if (!contactId) throw new Error('Kon contact niet aanmaken');

      // Book appointment
      const offset = getAmsterdamOffset(selectedDate);
      const startTime = `${selectedDate}T${selectedTime}:00${offset}`;
      const endTime = `${selectedDate}T${addMinutesToTime(selectedTime, 30)}:00${offset}`;

      await callGHL('createAppointment', {
        calendarId: selectedCalendar,
        contactId,
        startTime,
        endTime,
        title: `Adviesgesprek — ${contact.bedrijf || contact.naam}`,
        notes: contact.opmerking || undefined,
      });

      // Add note
      await callGHL('createNote', {
        contactId,
        body: `📅 Afspraak ingepland via website\n🗓️ ${format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'd MMMM yyyy', { locale: nl })} om ${selectedTime}\n💬 ${contact.opmerking || '-'}`,
      });

      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Er ging iets mis bij het boeken');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <CalendarIcon className="w-4 h-4" />
            Gratis adviesgesprek
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Plan uw adviesgesprek
          </h1>
          <p className="text-muted-foreground mt-2">
            Kies een moment dat u het beste uitkomt
          </p>
        </div>

        {/* Progress */}
        {step !== 'done' && (
          <div className="flex gap-1 mb-6">
            {(['contact', 'calendar', 'date', 'time', 'confirm'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i <= ['contact', 'calendar', 'date', 'time', 'confirm'].indexOf(step)
                    ? 'bg-primary'
                    : 'bg-border'
                )}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          {/* Step: Contact info */}
          {step === 'contact' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Uw gegevens
              </h2>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Naam *</label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  value={contact.naam}
                  onChange={(e) => setContact({ ...contact, naam: e.target.value })}
                  placeholder="Uw volledige naam"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">E-mailadres *</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  placeholder="uw@email.nl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Telefoonnummer *</label>
                <input
                  type="tel"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  value={contact.telefoon}
                  onChange={(e) => setContact({ ...contact, telefoon: e.target.value })}
                  placeholder="+31 6 12345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Bedrijfsnaam</label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  value={contact.bedrijf}
                  onChange={(e) => setContact({ ...contact, bedrijf: e.target.value })}
                  placeholder="Uw bedrijf"
                />
              </div>
              <button
                disabled={!contactValid}
                onClick={() => {
                  setError('');
                  setStep(calendars.length <= 1 ? 'date' : 'calendar');
                }}
                className="w-full mt-2 bg-primary text-primary-foreground rounded-lg py-2.5 font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Volgende <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step: Calendar selection (only if multiple) */}
          {step === 'calendar' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Kies een agenda
              </h2>
              <div className="space-y-2">
                {calendars.map((cal) => (
                  <button
                    key={cal.id}
                    onClick={() => { setSelectedCalendar(cal.id); setStep('date'); }}
                    className={cn(
                      'w-full text-left rounded-lg border p-3 transition-colors',
                      selectedCalendar === cal.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="font-medium text-foreground">{cal.name}</div>
                    {cal.description && <div className="text-sm text-muted-foreground">{cal.description}</div>}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('contact')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Terug
              </button>
            </div>
          )}

          {/* Step: Date selection */}
          {step === 'date' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Kies een datum
              </h2>

              {/* Month navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCalendarMonth((p) => {
                    const d = new Date(p.year, p.month - 1, 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })}
                  className="p-1 rounded hover:bg-accent/10 text-muted-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="font-medium text-foreground capitalize">
                  {format(new Date(calendarMonth.year, calendarMonth.month, 1), 'MMMM yyyy', { locale: nl })}
                </span>
                <button
                  onClick={() => setCalendarMonth((p) => {
                    const d = new Date(p.year, p.month + 1, 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })}
                  className="p-1 rounded hover:bg-accent/10 text-muted-foreground"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`pad-${i}`} />;
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isPast = isBefore(day, today);
                  const isTooFar = isBefore(maxDate, day);
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isDisabled = isPast || isTooFar || isWeekend;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <button
                      key={dateStr}
                      disabled={isDisabled}
                      onClick={() => { setSelectedDate(dateStr); setError(''); setStep('time'); }}
                      className={cn(
                        'aspect-square rounded-lg text-sm font-medium transition-colors flex items-center justify-center',
                        isDisabled && 'text-muted-foreground/30 cursor-not-allowed',
                        !isDisabled && !isSelected && 'hover:bg-primary/10 text-foreground',
                        isSelected && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>

              <button onClick={() => setStep(calendars.length <= 1 ? 'contact' : 'calendar')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Terug
              </button>
            </div>
          )}

          {/* Step: Time selection */}
          {step === 'time' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Kies een tijdstip
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'EEEE d MMMM yyyy', { locale: nl })}
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Geen beschikbare tijden op deze dag.</p>
                  <button onClick={() => setStep('date')} className="mt-2 text-primary hover:underline text-sm">
                    Kies een andere datum
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((time) => (
                    <button
                      key={time}
                      onClick={() => { setSelectedTime(time); setStep('confirm'); }}
                      className={cn(
                        'rounded-lg border py-2.5 text-sm font-medium transition-colors',
                        selectedTime === time
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary hover:bg-primary/5 text-foreground'
                      )}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}

              <button onClick={() => setStep('date')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Terug
              </button>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Bevestig uw afspraak
              </h2>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Naam</span>
                  <span className="font-medium text-foreground">{contact.naam}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">E-mail</span>
                  <span className="font-medium text-foreground">{contact.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telefoon</span>
                  <span className="font-medium text-foreground">{contact.telefoon}</span>
                </div>
                {contact.bedrijf && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bedrijf</span>
                    <span className="font-medium text-foreground">{contact.bedrijf}</span>
                  </div>
                )}
                <hr className="border-border" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Datum</span>
                  <span className="font-medium text-foreground">
                    {format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'EEEE d MMMM yyyy', { locale: nl })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tijd</span>
                  <span className="font-medium text-foreground">{selectedTime}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Opmerking (optioneel)</label>
                <textarea
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-ring focus:outline-none resize-none"
                  rows={3}
                  value={contact.opmerking}
                  onChange={(e) => setContact({ ...contact, opmerking: e.target.value })}
                  placeholder="Bijv. onderwerpen die u wilt bespreken"
                />
              </div>

              <button
                disabled={loading}
                onClick={handleBook}
                className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? 'Bezig met boeken...' : 'Afspraak bevestigen'}
              </button>

              <button onClick={() => setStep('time')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Terug
              </button>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Afspraak bevestigd!</h2>
              <p className="text-muted-foreground">
                Uw adviesgesprek is ingepland op{' '}
                <strong>{format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'd MMMM yyyy', { locale: nl })}</strong>{' '}
                om <strong>{selectedTime}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                U ontvangt een bevestiging per e-mail.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} CliqMakers — Alle rechten voorbehouden
        </p>
      </div>
    </div>
  );
}
