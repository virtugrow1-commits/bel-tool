import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

/* ─── Types ─── */
interface Answers {
  naam: string;
  email: string;
  telefoon: string;
  bedrijf: string;
  uren: string;
  taken: string[];
  takenOverig: string;
  groei: string;
  ai: string;
}

const EMPTY_ANSWERS: Answers = {
  naam: '', email: '', telefoon: '', bedrijf: '',
  uren: '', taken: [], takenOverig: '', groei: '', ai: '',
};

/* ─── Options matching beltool exactly ─── */
const UREN_OPTIES = ['0–2 uur', '3–5 uur', '6–10 uur', '10–15 uur', '15+ uur'];
const TAKEN_OPTIES = [
  'Leads nabellen', 'E-mails overtypen', 'Offertes opmaken',
  'Afspraken inplannen', 'CRM bijwerken', 'Administratie', 'Social media',
];
const GROEI_OPTIES = [
  { value: 'Bijbenen & verwerken', label: 'Bijbenen & verwerken', sub: 'We zijn druk met het huidige werk netjes afhandelen', icon: '🔧' },
  { value: 'Klaar voor groei', label: 'Klaar voor groei', sub: 'Onze processen staan strak, we willen opschalen', icon: '🚀' },
];
const AI_OPTIES = [
  { value: 'Al mee bezig', label: 'Ja, we oriënteren of zijn actief bezig', icon: '⚡' },
  { value: 'Komt niet aan toe', label: 'Nee, door de waan van de dag', icon: '😅' },
];
const BOOKING_URL = 'https://cliqmakers.nl/afspraak';

const isValidContactId = (value?: string) => {
  if (!value) return false;
  const normalized = value.trim();
  return normalized.length > 0 && normalized !== ':id' && !normalized.startsWith(':');
};

/* ─── Components ─── */
function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-all duration-500',
            i < step ? 'bg-primary' : i === step ? 'bg-primary/60' : 'bg-muted'
          )}
        />
      ))}
    </div>
  );
}

function ChoiceButton({ selected, label, sub, icon, onClick }: {
  selected: boolean; label: string; sub?: string; icon?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border-2 p-4 transition-all duration-200 active:scale-[0.98]',
        selected
          ? 'border-primary bg-primary/[0.06] shadow-sm'
          : 'border-border hover:border-primary/30 bg-card'
      )}
    >
      <div className="flex items-center gap-3">
        {icon && <span className="text-xl">{icon}</span>}
        <div className="flex-1">
          <div className={cn('font-semibold text-[15px]', selected ? 'text-primary' : 'text-foreground')}>{label}</div>
          {sub && <div className="text-[13px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
        <div className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
          selected ? 'border-primary bg-primary' : 'border-muted'
        )}>
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  );
}

function MultiChoiceButton({ selected, label, onClick }: {
  selected: boolean; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border-2 px-4 py-3 transition-all duration-200 active:scale-[0.98]',
        selected
          ? 'border-primary bg-primary/[0.06]'
          : 'border-border hover:border-primary/30 bg-card'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
          selected ? 'border-primary bg-primary' : 'border-muted'
        )}>
          {selected && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <span className={cn('text-[14px] font-medium', selected ? 'text-primary' : 'text-foreground')}>{label}</span>
      </div>
    </button>
  );
}

/* ─── Main Page ─── */
export default function ProspectSurvey() {
  const { id } = useParams<{ id: string }>();
  const contactId = isValidContactId(id) ? id!.trim() : null;
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<'loading' | 'active' | 'submitting' | 'done' | 'error'>('loading');
  const [contactLoaded, setContactLoaded] = useState(false);

  // Try to load contact info from CLIQ via Supabase
  useEffect(() => {
    const loadContact = async () => {
      if (!contactId) {
        setStatus('active');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('ghl-proxy', {
          body: { action: 'getContact', contactId },
        });
        if (!error && data?.contact) {
          const c = data.contact;
          setAnswers(prev => ({
            ...prev,
            naam: c.contactName || c.name || '',
            email: c.email || '',
            telefoon: c.phone || '',
            bedrijf: c.companyName || '',
          }));
          setContactLoaded(true);
        }
      } catch {
        // No CLIQ data — that's fine, prospect fills it in
      }
      setStatus('active');
    };
    loadContact();
  }, [contactId]);

  const update = <K extends keyof Answers>(key: K, value: Answers[K]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const toggleTask = (task: string) => {
    setAnswers(prev => ({
      ...prev,
      taken: prev.taken.includes(task) ? prev.taken.filter(t => t !== task) : [...prev.taken, task],
    }));
  };

  const submit = async () => {
    setStatus('submitting');
    try {
      // Save to CLIQ if we have a contact ID
      if (contactId) {
        const allTaken = answers.taken.concat(answers.takenOverig ? [answers.takenOverig] : []).join(', ');
        const customFields = [
          { id: 'beltool_uren_per_week', field_value: answers.uren },
          { id: 'beltool_taken', field_value: allTaken },
          { id: 'beltool_groeifase', field_value: answers.groei },
          { id: 'beltool_ai_status', field_value: answers.ai },
        ].filter(f => f.field_value);

        // Save custom fields
        if (customFields.length > 0) {
          await supabase.functions.invoke('ghl-proxy', {
            body: { action: 'saveCustomFields', contactId, customFields },
          }).catch(() => {});
        }

        // Create note with full summary
        const noteBody = `📋 Digitale Enquête Ingevuld:\n⏱️ Uren/week: ${answers.uren}\n🔄 Taken: ${allTaken}\n📈 Groeifase: ${answers.groei}\n🤖 AI status: ${answers.ai}\n\n👤 ${answers.naam} — ${answers.bedrijf}\n📧 ${answers.email}\n📞 ${answers.telefoon}`;
        await supabase.functions.invoke('ghl-proxy', {
          body: { action: 'createNote', contactId, body: noteBody },
        }).catch(() => {});

        // Update contact info if changed
        await supabase.functions.invoke('ghl-proxy', {
          body: {
            action: 'updateContact', contactId,
            email: answers.email, phone: answers.telefoon,
            name: answers.naam, companyName: answers.bedrijf,
          },
        }).catch(() => {});

        // Add tag for workflow trigger
        await supabase.functions.invoke('ghl-proxy', {
          body: { action: 'addTag', contactId, tags: ['enquete-digitaal-ingevuld'] },
        }).catch(() => {});
      }

      // Also save locally
      const { saveSurvey, createEmptySurvey } = await import('@/lib/survey-store');
      saveSurvey(createEmptySurvey({
        id: contactId || crypto.randomUUID(),
        contactName: answers.naam,
        contactEmail: answers.email,
        contactPhone: answers.telefoon,
        companyName: answers.bedrijf,
        hoursLostPerWeek: answers.uren,
        repetitiveTasks: answers.taken.join(', '),
        currentPhase: answers.groei === 'Klaar voor groei' ? 'klaar-voor-groei' : 'bijbenen',
        aiStatus: answers.ai === 'Al mee bezig' ? 'al-bezig' : 'komt-niet-aan-toe',
        status: 'ingevuld',
      }));

      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  // Validation per step
  const canProceed = (): boolean => {
    switch (step) {
      case 0: return !!(answers.naam.trim() && answers.email.trim());
      case 1: return !!answers.uren;
      case 2: return answers.taken.length > 0 || !!answers.takenOverig.trim();
      case 3: return !!answers.groei;
      case 4: return !!answers.ai;
      default: return true;
    }
  };

  const TOTAL_STEPS = 5;

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8fffe 0%, #e8f5f3 100%)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Laden...</span>
        </div>
      </div>
    );
  }

  /* ─── Thank you screen ─── */
  if (status === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f8fffe 0%, #e8f5f3 100%)' }}>
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="hsl(152 56% 42%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Bedankt, {answers.naam.split(' ')[0]}!</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            We hebben uw antwoorden ontvangen. Op basis hiervan bereiden we een persoonlijk adviesgesprek voor u voor.
          </p>

          <div className="bg-card border border-border rounded-2xl p-6 mb-6 text-left shadow-sm">
            <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-3">Uw samenvatting</div>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-muted-foreground">Uren/week verloren</span><span className="font-semibold">{answers.uren}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taken</span><span className="font-semibold text-right max-w-[60%]">{answers.taken.join(', ')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Groeifase</span><span className="font-semibold">{answers.groei}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">AI status</span><span className="font-semibold">{answers.ai}</span></div>
            </div>
          </div>

          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-white text-[15px] font-bold hover:bg-primary/90 active:scale-[0.97] transition-all shadow-lg shadow-primary/20"
          >
            Plan direct uw gratis adviesgesprek
          </a>
          <p className="text-[12px] text-muted-foreground mt-3">15 minuten — vrijblijvend — op een moment dat u uitkomt</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f8fffe 0%, #e8f5f3 100%)' }}>
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2">Er ging iets mis</h1>
          <p className="text-muted-foreground mb-4">We konden uw antwoorden niet opslaan. Probeer het opnieuw.</p>
          <button onClick={() => setStatus('active')} className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold">
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  /* ─── Step content ─── */
  const steps = [
    /* Step 0: Contact info */
    <div key="s0" className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Even voorstellen</h2>
        <p className="text-[14px] text-muted-foreground mt-1">Zodat we u de juiste informatie kunnen sturen.</p>
      </div>
      {([
        { key: 'naam' as const, label: 'Uw naam', placeholder: 'Jan de Vries', type: 'text' },
        { key: 'bedrijf' as const, label: 'Bedrijfsnaam', placeholder: 'De Vries Installaties B.V.', type: 'text' },
        { key: 'email' as const, label: 'E-mailadres', placeholder: 'jan@devries.nl', type: 'email' },
        { key: 'telefoon' as const, label: 'Telefoonnummer', placeholder: '06 12345678', type: 'tel' },
      ]).map(f => (
        <div key={f.key}>
          <label className="text-[12px] font-semibold text-foreground/70 mb-1 block">{f.label}</label>
          <input
            type={f.type}
            value={answers[f.key]}
            onChange={e => update(f.key, e.target.value)}
            placeholder={f.placeholder}
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            readOnly={contactLoaded && (f.key === 'naam' || f.key === 'bedrijf')}
          />
        </div>
      ))}
    </div>,

    /* Step 1: Uren per week */
    <div key="s1" className="space-y-4">
      <div>
        <div className="text-[12px] font-bold text-primary mb-1">VRAAG 1 VAN 4</div>
        <h2 className="text-xl font-bold text-foreground">Hoeveel tijd gaat er verloren?</h2>
        <p className="text-[14px] text-muted-foreground mt-1">
          Hoeveel uur bent u of uw team wekelijks kwijt aan 'digitale randzaken'? Denk aan het najagen van leads, e-mails overtypen, afspraken inplannen.
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
        <p className="text-[14px] text-muted-foreground mt-1">
          Selecteer alle taken die u herkent. U mag er meerdere aanvinken.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TAKEN_OPTIES.map(t => (
          <MultiChoiceButton key={t} selected={answers.taken.includes(t)} label={t} onClick={() => toggleTask(t)} />
        ))}
      </div>
      <div>
        <label className="text-[12px] font-semibold text-foreground/70 mb-1 block">Anders, namelijk:</label>
        <input
          value={answers.takenOverig}
          onChange={e => update('takenOverig', e.target.value)}
          placeholder="Bijv. facturen verwerken..."
          className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-[14px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
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
          <ChoiceButton key={o.value} selected={answers.groei === o.value} label={o.label} sub={o.sub} icon={o.icon} onClick={() => update('groei', o.value)} />
        ))}
      </div>
    </div>,

    /* Step 4: AI status */
    <div key="s4" className="space-y-4">
      <div>
        <div className="text-[12px] font-bold text-primary mb-1">VRAAG 4 VAN 4</div>
        <h2 className="text-xl font-bold text-foreground">AI & Automatisering</h2>
        <p className="text-[14px] text-muted-foreground mt-1">
          Bent u intern al aan het kijken naar slimme automatisering of AI, of komt u daar door de waan van de dag niet aan toe?
        </p>
      </div>
      <div className="space-y-3">
        {AI_OPTIES.map(o => (
          <ChoiceButton key={o.value} selected={answers.ai === o.value} label={o.label} icon={o.icon} onClick={() => update('ai', o.value)} />
        ))}
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f8fffe 0%, #e8f5f3 100%)' }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[13px] font-semibold mb-3">
            Capaciteit & Groei Onderzoek
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Cliq<span className="text-primary">Makers</span>
          </h1>
        </div>

        {/* Progress */}
        <ProgressBar step={step} total={TOTAL_STEPS} />

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {steps[step]}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-4 border-t border-border">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className={cn(
                'px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-all',
                step === 0
                  ? 'text-muted-foreground/30 cursor-not-allowed'
                  : 'text-foreground/70 hover:bg-muted active:scale-[0.97]'
              )}
            >
              ← Vorige
            </button>

            {step < TOTAL_STEPS - 1 ? (
              <button
                onClick={() => canProceed() && setStep(s => s + 1)}
                disabled={!canProceed()}
                className={cn(
                  'px-6 py-2.5 rounded-xl text-[14px] font-bold transition-all',
                  canProceed()
                    ? 'bg-primary text-white hover:bg-primary/90 active:scale-[0.97] shadow-sm'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
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
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {status === 'submitting' ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Versturen...
                  </span>
                ) : (
                  'Versturen'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Uw gegevens worden vertrouwelijk behandeld en niet gedeeld met derden.
        </p>
      </div>
    </div>
  );
}
