import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface Answers {
  naam:        string;
  email:       string;
  telefoon:    string;
  bedrijf:     string;
  uren:        string;
  taken:       string[];
  takenOverig: string;
  groei:       string;
  ai:          string;
}

const EMPTY_ANSWERS: Answers = {
  naam: '', email: '', telefoon: '', bedrijf: '',
  uren: '', taken: [], takenOverig: '', groei: '', ai: '',
};

/* ─── Survey options ─────────────────────────────────────────────────────────── */
const UREN_OPTIES = ['0–2 uur', '3–5 uur', '6–10 uur', '10–15 uur', '15+ uur'];

const TAKEN_OPTIES = [
  'Leads nabellen', 'E-mails overtypen', 'Offertes opmaken',
  'Afspraken inplannen', 'CRM bijwerken', 'Administratie', 'Social media',
];

const GROEI_OPTIES = [
  { value: 'Bijbenen & verwerken', sub: 'We zijn druk met het huidige werk netjes afhandelen', icon: '🔧' },
  { value: 'Klaar voor groei',     sub: 'Onze processen staan strak, we willen opschalen',    icon: '🚀' },
];

const AI_OPTIES = [
  { value: 'Al mee bezig',      label: 'Ja, we oriënteren of zijn actief bezig', icon: '⚡' },
  { value: 'Komt niet aan toe', label: 'Nee, door de waan van de dag',           icon: '😅' },
];

const BOOKING_URL = 'https://adviesgesprekken.cliqmakers.nl';

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const isValidContactId = (v?: string) =>
  !!v && v.trim().length > 0 && v.trim() !== ':id' && !v.trim().startsWith(':');

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/* ─── Small components ───────────────────────────────────────────────────────── */
function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-all duration-500',
            i < step ? 'bg-primary' : i === step ? 'bg-primary/60' : 'bg-muted',
          )}
        />
      ))}
    </div>
  );
}

function ChoiceButton({
  selected, label, sub, icon, onClick,
}: { selected: boolean; label: string; sub?: string; icon?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border-2 p-4 transition-all duration-150 active:scale-[0.98]',
        selected ? 'border-primary bg-primary/[0.06] shadow-sm' : 'border-border hover:border-primary/30 bg-card',
      )}
    >
      <div className="flex items-center gap-3">
        {icon && <span className="text-xl">{icon}</span>}
        <div className="flex-1">
          <div className={cn('font-semibold text-[15px]', selected ? 'text-primary' : 'text-foreground')}>{label}</div>
          {sub && <div className="text-[13px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
        <div className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
          selected ? 'border-primary bg-primary' : 'border-muted',
        )}>
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  );
}

function CheckButton({
  selected, label, onClick,
}: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border-2 px-4 py-3 transition-all duration-150 active:scale-[0.98]',
        selected ? 'border-primary bg-primary/[0.06]' : 'border-border hover:border-primary/30 bg-card',
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
          selected ? 'border-primary bg-primary' : 'border-muted',
        )}>
          {selected && (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className={cn('text-[14px] font-medium', selected ? 'text-primary' : 'text-foreground')}>{label}</span>
      </div>
    </button>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
export default function ProspectSurvey() {
  const { id } = useParams<{ id: string }>();
  const contactId = isValidContactId(id) ? id!.trim() : null;

  const [answers,       setAnswers]       = useState<Answers>(EMPTY_ANSWERS);
  const [step,          setStep]          = useState(0);
  const [status,        setStatus]        = useState<'loading' | 'active' | 'submitting' | 'done' | 'error'>('loading');
  const [contactLoaded, setContactLoaded] = useState(false);

  // ── Load contact from GHL on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!contactId) {
      setStatus('active');
      return;
    }

    supabase.functions
      .invoke('ghl-proxy', { body: { action: 'getContact', contactId } })
      .then(({ data, error }) => {
        if (!error && data?.contact) {
          const c = data.contact;

          // GHL returns firstName + lastName separately. Build full name.
          const fullName = (
            c.name ||
            [c.firstName, c.lastName].filter(Boolean).join(' ').trim() ||
            c.contactName ||
            ''
          );

          setAnswers(prev => ({
            ...prev,
            naam:     fullName,
            email:    c.email    || '',
            telefoon: c.phone    || '',
            bedrijf:  c.companyName || c.company || '',
          }));

          if (fullName) {
            setContactLoaded(true);
            // Skip stap 0 automatisch als naam én email al bekend zijn vanuit GHL
            if (fullName && c.email) {
              setStep(1);
            }
          }
        }
      })
      .catch(() => {
        // GHL unreachable — let user fill in manually
      })
      .finally(() => {
        setStatus('active');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Updaters ────────────────────────────────────────────────────────────────
  const update = useCallback(<K extends keyof Answers>(key: K, value: Answers[K]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleTask = useCallback((task: string) => {
    setAnswers(prev => ({
      ...prev,
      taken: prev.taken.includes(task)
        ? prev.taken.filter(t => t !== task)
        : [...prev.taken, task],
    }));
  }, []);

  // ── Validation per step ─────────────────────────────────────────────────────
  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 0: return !!(answers.naam.trim() && answers.email.trim() && isValidEmail(answers.email));
      case 1: return !!answers.uren;
      case 2: return answers.taken.length > 0 || !!answers.takenOverig.trim();
      case 3: return !!answers.groei;
      case 4: return !!answers.ai;
      default: return true;
    }
  }, [step, answers]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submit = async () => {
    setStatus('submitting');

    try {
      const allTaken = answers.taken
        .concat(answers.takenOverig ? [answers.takenOverig] : [])
        .join(', ');

      let ghlContactId = contactId;

      // 1. Verify contact exists in GHL
      if (ghlContactId) {
        try {
          const { data, error } = await supabase.functions.invoke('ghl-proxy', {
            body: { action: 'getContact', contactId: ghlContactId },
          });
          if (error || !data?.contact) {
            console.warn('[Enquête] Contact niet gevonden in GHL, aanmaken als nieuw contact');
            ghlContactId = null;
          }
        } catch {
          ghlContactId = null;
        }
      }

      // 2. Create contact if needed
      if (!ghlContactId) {
        try {
          const { data } = await supabase.functions.invoke('ghl-proxy', {
            body: {
              action:      'createContact',
              name:        answers.naam,
              email:       answers.email,
              phone:       answers.telefoon,
              companyName: answers.bedrijf,
              tags:        ['enquete-digitaal-ingevuld', 'beltool-lead'],
              source:      'Bel-Tool Enquête (digitaal)',
            },
          });
          if (data?.contact?.id) ghlContactId = data.contact.id;
        } catch (err) {
          console.error('[Enquête] createContact mislukt:', err);
        }
      }

      // 3. Save to GHL (alle calls parallel, niet-blocking)
      if (ghlContactId) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);

        const noteBody = [
          `📋 Digitale Enquête Ingevuld`,
          `👤 ${answers.naam} — ${answers.bedrijf}`,
          `📧 ${answers.email}  📞 ${answers.telefoon}`,
          `⏱️ Uren/week: ${answers.uren}`,
          `🔄 Taken: ${allTaken || '-'}`,
          `📈 Groeifase: ${answers.groei}`,
          `🤖 AI status: ${answers.ai}`,
          `🕐 ${new Date().toLocaleString('nl-NL')}`,
        ].join('\n');

        // Fire all GHL updates in parallel
        await Promise.allSettled([
          // Note
          supabase.functions.invoke('ghl-proxy', {
            body: { action: 'createNote', contactId: ghlContactId, body: noteBody },
          }),
          // Task
          supabase.functions.invoke('ghl-proxy', {
            body: {
              action:     'createTask',
              contactId:  ghlContactId,
              title:      `📞 Terugbellen: ${answers.naam} (${answers.bedrijf}) — enquête ingevuld`,
              body:       `Enquête digitaal ingevuld.\n\n⏱️ ${answers.uren}/week aan: ${allTaken}\n📈 ${answers.groei}\n🤖 ${answers.ai}\n\n📧 ${answers.email}\n📞 ${answers.telefoon}`,
              dueDate:    tomorrow.toISOString(),
            },
          }),
          // Custom fields
          supabase.functions.invoke('ghl-proxy', {
            body: {
              action:       'saveCustomFields',
              contactId:    ghlContactId,
              customFields: [
                { id: 'beltool_uren_per_week', field_value: answers.uren },
                { id: 'beltool_taken',         field_value: allTaken },
                { id: 'beltool_groeifase',     field_value: answers.groei },
                { id: 'beltool_ai_status',     field_value: answers.ai },
              ].filter(f => f.field_value),
            },
          }),
          // Update contact info
          supabase.functions.invoke('ghl-proxy', {
            body: {
              action:      'updateContact',
              contactId:   ghlContactId,
              name:        answers.naam,
              companyName: answers.bedrijf,
              ...(isValidEmail(answers.email) ? { email: answers.email } : {}),
            },
          }),
          // Tag
          supabase.functions.invoke('ghl-proxy', {
            body: { action: 'addTag', contactId: ghlContactId, tags: ['enquete-digitaal-ingevuld'] },
          }),
          // Move opportunity to Enquête Voltooid
          (async () => {
            const { data: pd } = await supabase.functions.invoke('ghl-proxy', {
              body: { action: 'getPipelines' },
            });
            const pipeline = (pd?.pipelines || []).find((p: { name: string }) =>
              p.name.toLowerCase().includes('bellen'),
            );
            const stage = pipeline?.stages?.find((s: { name: string }) =>
              s.name.toLowerCase().includes('enquête voltooid') ||
              s.name.toLowerCase().includes('enquete voltooid'),
            );
            if (pipeline && stage) {
              await supabase.functions.invoke('ghl-proxy', {
                body: {
                  action:     'upsertOpportunity',
                  contactId:  ghlContactId,
                  pipelineId: pipeline.id,
                  stageId:    stage.id,
                  name:       `${answers.naam} — ${answers.bedrijf || 'Lead'}`,
                },
              });
            }
          })(),
        ]);
      }

      // 4. Local backup
      const { saveSurvey, createEmptySurvey } = await import('@/lib/survey-store');
      saveSurvey(createEmptySurvey({
        id:                 ghlContactId || contactId || crypto.randomUUID(),
        contactName:        answers.naam,
        contactEmail:       answers.email,
        contactPhone:       answers.telefoon,
        companyName:        answers.bedrijf,
        hoursLostPerWeek:   answers.uren,
        repetitiveTasks:    answers.taken.join(', '),
        currentPhase:       answers.groei === 'Klaar voor groei' ? 'klaar-voor-groei' : 'bijbenen',
        aiStatus:           answers.ai === 'Al mee bezig' ? 'al-bezig' : 'komt-niet-aan-toe',
        status:             'ingevuld',
      }));

      setStatus('done');
    } catch (err) {
      console.error('[Enquête] submit mislukt:', err);
      setStatus('error');
    }
  };

  // ── Step definitions ────────────────────────────────────────────────────────
  // Stap 0 is altijd aanwezig maar wordt overgeslagen als GHL data compleet is.
  // We tonen TOTAL_STEPS - (contactLoaded ? 1 : 0) in de progressbar
  // zodat de balk klopt.
  const TOTAL_STEPS  = 5;
  const displayTotal = contactLoaded ? TOTAL_STEPS - 1 : TOTAL_STEPS;
  const displayStep  = contactLoaded ? Math.max(0, step - 1) : step;

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50';

  const steps = [
    /* Step 0: Contactgegevens */
    <div key="s0" className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Even voorstellen</h2>
        <p className="text-[14px] text-muted-foreground mt-1">Zodat we u de juiste informatie kunnen sturen.</p>
      </div>
      {([
        { key: 'naam'     as const, label: 'Uw naam',          placeholder: 'Jan de Vries',           type: 'text'  },
        { key: 'bedrijf'  as const, label: 'Bedrijfsnaam',      placeholder: 'De Vries Installaties',  type: 'text'  },
        { key: 'email'    as const, label: 'E-mailadres',        placeholder: 'jan@devries.nl',         type: 'email' },
        { key: 'telefoon' as const, label: 'Telefoonnummer',     placeholder: '06 12345678',            type: 'tel'   },
      ]).map(f => {
        const isAutofilled = contactLoaded && !!answers[f.key];
        return (
          <div key={f.key}>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-[12px] font-semibold text-foreground/70">{f.label}</label>
              {isAutofilled && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  ✓ ingevuld
                </span>
              )}
            </div>
            <input
              type={f.type}
              value={answers[f.key]}
              onChange={e => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              className={inputCls}
            />
            {f.key === 'email' && answers.email && !isValidEmail(answers.email) && (
              <p className="text-[11px] text-destructive mt-1">Vul een geldig e-mailadres in</p>
            )}
          </div>
        );
      })}
    </div>,

    /* Step 1: Uren */
    <div key="s1" className="space-y-4">
      <div>
        <div className="text-[12px] font-bold text-primary mb-1">VRAAG 1 VAN 4</div>
        <h2 className="text-xl font-bold text-foreground">Hoeveel tijd gaat er verloren?</h2>
        <p className="text-[14px] text-muted-foreground mt-1">
          Hoeveel uur bent u of uw team wekelijks kwijt aan 'digitale randzaken'?
          Denk aan het najagen van leads, e-mails overtypen, afspraken inplannen.
        </p>
      </div>
      <div className="space-y-2">
        {UREN_OPTIES.map(o => (
          <ChoiceButton key={o} selected={answers.uren === o} label={o} icon="⏱️" onClick={() => update('uren', o)} />
        ))}
      </div>
    </div>,

    /* Step 2: Taken */
    <div key="s2" className="space-y-4">
      <div>
        <div className="text-[12px] font-bold text-primary mb-1">VRAAG 2 VAN 4</div>
        <h2 className="text-xl font-bold text-foreground">Welke taken kosten de meeste tijd?</h2>
        <p className="text-[14px] text-muted-foreground mt-1">Selecteer alles wat u herkent — meerdere is prima.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TAKEN_OPTIES.map(t => (
          <CheckButton key={t} selected={answers.taken.includes(t)} label={t} onClick={() => toggleTask(t)} />
        ))}
      </div>
      <div>
        <label className="text-[12px] font-semibold text-foreground/70 mb-1 block">Anders, namelijk:</label>
        <input
          value={answers.takenOverig}
          onChange={e => update('takenOverig', e.target.value)}
          placeholder="Bijv. facturen verwerken..."
          className={inputCls}
        />
      </div>
    </div>,

    /* Step 3: Groeifase */
    <div key="s3" className="space-y-4">
      <div>
        <div className="text-[12px] font-bold text-primary mb-1">VRAAG 3 VAN 4</div>
        <h2 className="text-xl font-bold text-foreground">Waar staat uw bedrijf nu?</h2>
        <p className="text-[14px] text-muted-foreground mt-1">
          Bent u bezig met het bijbenen van huidig werk, of staat alles al strak en bent u klaar voor groei?
        </p>
      </div>
      <div className="space-y-3">
        {GROEI_OPTIES.map(o => (
          <ChoiceButton key={o.value} selected={answers.groei === o.value} label={o.value} sub={o.sub} icon={o.icon} onClick={() => update('groei', o.value)} />
        ))}
      </div>
    </div>,

    /* Step 4: AI */
    <div key="s4" className="space-y-4">
      <div>
        <div className="text-[12px] font-bold text-primary mb-1">VRAAG 4 VAN 4</div>
        <h2 className="text-xl font-bold text-foreground">AI & Automatisering</h2>
        <p className="text-[14px] text-muted-foreground mt-1">
          Bent u intern al aan het kijken naar slimme automatisering, of komt u daar door de waan van de dag niet aan toe?
        </p>
      </div>
      <div className="space-y-3">
        {AI_OPTIES.map(o => (
          <ChoiceButton key={o.value} selected={answers.ai === o.value} label={o.label} icon={o.icon} onClick={() => update('ai', o.value)} />
        ))}
      </div>
    </div>,
  ];

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fffe 0%, #e8f5f3 100%)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Gegevens laden...</span>
        </div>
      </div>
    );
  }

  // ── Thank you screen ────────────────────────────────────────────────────────
  if (status === 'done') {
    const voornaam = answers.naam.split(' ')[0] || 'u';
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f8fffe 0%, #e8f5f3 100%)' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="hsl(152 56% 42%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Bedankt, {voornaam}!</h1>
            <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
              Uw antwoorden zijn ontvangen. Hartelijk dank voor uw deelname aan ons praktijkonderzoek.
            </p>
          </div>

          <div className="bg-primary/[0.04] border-2 border-primary/20 rounded-2xl p-6 mb-5 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 bg-primary text-white text-[11px] font-bold py-1.5 uppercase tracking-wider">
              Exclusief voor deelnemers
            </div>
            <div className="pt-6">
              <div className="text-3xl mb-3">🎁</div>
              <h2 className="text-lg font-bold text-foreground mb-2">U komt in aanmerking voor een gratis adviesgesprek</h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Als dank voor uw deelname bieden wij u een <strong className="text-foreground">vrijblijvend adviesgesprek van 15 minuten</strong> aan.
                We bespreken op basis van uw antwoorden hoe <strong className="text-foreground">{answers.bedrijf || 'uw bedrijf'}</strong> tijd kan terugwinnen.
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-sm">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Uw antwoorden</div>
            <div className="space-y-1.5 text-[13px]">
              <div className="flex justify-between"><span className="text-muted-foreground">Tijdverlies</span><span className="font-semibold">{answers.uren}/week</span></div>
              {answers.taken.length > 0 && (
                <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Taken</span><span className="font-semibold text-right">{answers.taken.join(', ')}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Groeifase</span><span className="font-semibold">{answers.groei}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">AI status</span><span className="font-semibold">{answers.ai}</span></div>
            </div>
          </div>

          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full px-8 py-4 rounded-xl bg-primary text-white text-[16px] font-bold hover:bg-primary/90 active:scale-[0.97] transition-all shadow-lg shadow-primary/25"
          >
            Plan nu uw gratis adviesgesprek
          </a>
          <div className="flex items-center justify-center gap-4 mt-3 text-[12px] text-muted-foreground">
            <span>15 minuten</span>
            <span>·</span>
            <span>100% vrijblijvend</span>
            <span>·</span>
            <span>U kiest het moment</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Error screen ────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f8fffe 0%, #e8f5f3 100%)' }}>
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2">Er ging iets mis</h1>
          <p className="text-muted-foreground mb-4">We konden uw antwoorden niet opslaan. Probeer het opnieuw.</p>
          <button onClick={() => setStatus('active')} className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold active:scale-[0.97]">
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  // ── Survey form ─────────────────────────────────────────────────────────────
  const isLastStep = step === TOTAL_STEPS - 1;
  const isFirstVisibleStep = contactLoaded ? step <= 1 : step === 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f8fffe 0%, #e8f5f3 100%)' }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/cliqmakers-logo.png" alt="CliqMakers" className="h-24 mx-auto mb-4" />
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 text-primary font-semibold text-lg">
            Deelname Praktijkonderzoek
          </div>
          {step === 0 && (
            <p className="text-[14px] text-muted-foreground mt-4 leading-relaxed max-w-md mx-auto">
              Wij doen onderzoek naar hoe ZZP'ers en MKB-bedrijven omgaan met tijdverlies aan digitale activiteiten.
              Het invullen duurt slechts 2 minuten.
            </p>
          )}
        </div>

        {/* Progress */}
        <ProgressBar step={displayStep} total={displayTotal} />

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {steps[step]}

          {/* Navigation */}
          <div className="flex flex-col gap-3 mt-8 pt-4 border-t border-border">
            {isLastStep && canProceed() && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/[0.05] border border-primary/15">
                <span className="text-xl shrink-0">🎁</span>
                <p className="text-[12px] text-foreground/70 leading-relaxed">
                  Na het versturen komt u in aanmerking voor een <strong className="text-foreground">gratis adviesgesprek</strong> — als dank voor uw deelname.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(s => Math.max(contactLoaded ? 1 : 0, s - 1))}
                disabled={isFirstVisibleStep}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-all',
                  isFirstVisibleStep
                    ? 'text-muted-foreground/30 cursor-not-allowed'
                    : 'text-foreground/70 hover:bg-muted active:scale-[0.97]',
                )}
              >
                ← Vorige
              </button>

              {!isLastStep ? (
                <button
                  onClick={() => canProceed() && setStep(s => s + 1)}
                  disabled={!canProceed()}
                  className={cn(
                    'px-6 py-2.5 rounded-xl text-[14px] font-bold transition-all',
                    canProceed()
                      ? 'bg-primary text-white hover:bg-primary/90 active:scale-[0.97] shadow-sm'
                      : 'bg-muted text-muted-foreground cursor-not-allowed',
                  )}
                >
                  Volgende →
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={!canProceed() || status === 'submitting'}
                  className={cn(
                    'px-6 py-2.5 rounded-xl text-[14px] font-bold transition-all',
                    canProceed()
                      ? 'bg-primary text-white hover:bg-primary/90 active:scale-[0.97] shadow-sm'
                      : 'bg-muted text-muted-foreground cursor-not-allowed',
                  )}
                >
                  {status === 'submitting' ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Versturen...
                    </span>
                  ) : (
                    'Versturen & adviesgesprek ontvangen'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Uw gegevens worden vertrouwelijk behandeld en niet gedeeld met derden.
        </p>
      </div>
    </div>
  );
}
