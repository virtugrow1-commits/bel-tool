import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SurveyResponse } from '@/types/survey';
import { getSurveyById, saveSurvey, createEmptySurvey } from '@/lib/survey-store';
import { CheckCircle2, Clock, ArrowRight, ArrowLeft } from 'lucide-react';

export default function ProspectSurvey() {
  const { id } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<SurveyResponse | null>(null);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const existing = getSurveyById(id);
      if (existing) {
        setSurvey(existing);
        if (existing.status === 'ingevuld' || existing.status === 'afspraak-gepland' || existing.status === 'afgerond') {
          setSubmitted(true);
        }
      } else {
        // New survey from direct link
        setSurvey(createEmptySurvey({ id }));
      }
    }
    setLoading(false);
  }, [id]);

  if (loading) return null;

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="animate-fade-up text-center max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Bedankt voor uw tijd!</h1>
          <p className="text-muted-foreground">
            We hebben uw antwoorden ontvangen. Een van onze specialisten neemt binnenkort contact met u op voor een vrijblijvend adviesgesprek.
          </p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-muted-foreground">Enquête niet gevonden.</p>
      </div>
    );
  }

  const update = (fields: Partial<SurveyResponse>) => {
    setSurvey(prev => prev ? { ...prev, ...fields } : prev);
  };

  const handleSubmit = () => {
    if (survey) {
      saveSurvey({ ...survey, status: 'ingevuld' });
      setSubmitted(true);
    }
  };

  const totalSteps = 5; // contact + 4 questions

  const steps = [
    // Step 0: Contact
    <div key="contact" className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Even voorstellen</h2>
        <p className="text-sm text-muted-foreground">Zodat we u de juiste informatie kunnen sturen.</p>
      </div>
      <Input placeholder="Uw naam" value={survey.contactName} onChange={e => update({ contactName: e.target.value })} />
      <Input placeholder="Bedrijfsnaam" value={survey.companyName} onChange={e => update({ companyName: e.target.value })} />
      <Input placeholder="E-mailadres" type="email" value={survey.contactEmail} onChange={e => update({ contactEmail: e.target.value })} />
      <Input placeholder="Telefoonnummer" type="tel" value={survey.contactPhone} onChange={e => update({ contactPhone: e.target.value })} />
    </div>,

    // Step 1: Tijdlek
    <div key="q1" className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-accent">
          <Clock className="h-5 w-5" />
          <span className="text-sm font-medium">Vraag 1 van 4</span>
        </div>
        <h2 className="text-xl font-bold">Hoeveel tijd gaat verloren?</h2>
        <p className="text-sm text-muted-foreground">
          Hoeveel uur bent u of uw team wekelijks kwijt aan 'digitale randzaken'? Denk aan het najagen van leads, e-mails overtypen, afspraken inplannen of systemen bijwerken.
        </p>
      </div>
      <Input
        placeholder="Bijv. 8 uur per week"
        value={survey.hoursLostPerWeek}
        onChange={e => update({ hoursLostPerWeek: e.target.value })}
      />
    </div>,

    // Step 2: Activiteiten
    <div key="q2" className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-accent">
          <Clock className="h-5 w-5" />
          <span className="text-sm font-medium">Vraag 2 van 4</span>
        </div>
        <h2 className="text-xl font-bold">Welke taken kosten u de meeste tijd?</h2>
        <p className="text-sm text-muted-foreground">
          Wat zijn de meest voorkomende, repetitieve handelingen die u voor uw gevoel steeds weer opnieuw moet doen?
        </p>
      </div>
      <Textarea
        placeholder="Beschrijf de taken die u het meest tijd kosten..."
        value={survey.repetitiveTasks}
        onChange={e => update({ repetitiveTasks: e.target.value })}
        rows={4}
      />
    </div>,

    // Step 3: Groeipijn
    <div key="q3" className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-accent">
          <Clock className="h-5 w-5" />
          <span className="text-sm font-medium">Vraag 3 van 4</span>
        </div>
        <h2 className="text-xl font-bold">Waar staat uw bedrijf nu?</h2>
        <p className="text-sm text-muted-foreground">
          Bent u momenteel vooral bezig met het bijbenen van het huidige werk, of staat alles al zo strak dat u klaar bent voor groei?
        </p>
      </div>
      <div className="grid gap-3">
        <button
          className={`rounded-lg border-2 p-4 text-left transition-all duration-200 ${
            survey.currentPhase === 'bijbenen'
              ? 'border-accent bg-accent/5 shadow-sm'
              : 'border-border hover:border-accent/40'
          }`}
          onClick={() => update({ currentPhase: 'bijbenen' })}
        >
          <span className="font-medium">Bijbenen & verwerken</span>
          <p className="text-sm text-muted-foreground mt-0.5">We zijn druk met het huidige werk netjes afhandelen</p>
        </button>
        <button
          className={`rounded-lg border-2 p-4 text-left transition-all duration-200 ${
            survey.currentPhase === 'klaar-voor-groei'
              ? 'border-accent bg-accent/5 shadow-sm'
              : 'border-border hover:border-accent/40'
          }`}
          onClick={() => update({ currentPhase: 'klaar-voor-groei' })}
        >
          <span className="font-medium">Klaar voor groei</span>
          <p className="text-sm text-muted-foreground mt-0.5">Onze processen staan strak, we willen opschalen</p>
        </button>
      </div>
    </div>,

    // Step 4: AI Check
    <div key="q4" className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-accent">
          <Clock className="h-5 w-5" />
          <span className="text-sm font-medium">Vraag 4 van 4</span>
        </div>
        <h2 className="text-xl font-bold">AI & Automatisering</h2>
        <p className="text-sm text-muted-foreground">
          Bent u intern al aan het kijken naar slimme automatisering of AI om randzaken op te lossen, of komt u daar door de waan van de dag niet aan toe?
        </p>
      </div>
      <div className="grid gap-3">
        <button
          className={`rounded-lg border-2 p-4 text-left transition-all duration-200 ${
            survey.aiStatus === 'al-bezig'
              ? 'border-accent bg-accent/5 shadow-sm'
              : 'border-border hover:border-accent/40'
          }`}
          onClick={() => update({ aiStatus: 'al-bezig' })}
        >
          <span className="font-medium">Ja, we zijn er al mee bezig</span>
          <p className="text-sm text-muted-foreground mt-0.5">We kijken actief naar mogelijkheden</p>
        </button>
        <button
          className={`rounded-lg border-2 p-4 text-left transition-all duration-200 ${
            survey.aiStatus === 'komt-niet-aan-toe'
              ? 'border-accent bg-accent/5 shadow-sm'
              : 'border-border hover:border-accent/40'
          }`}
          onClick={() => update({ aiStatus: 'komt-niet-aan-toe' })}
        >
          <span className="font-medium">Nee, we komen er niet aan toe</span>
          <p className="text-sm text-muted-foreground mt-0.5">Door de waan van de dag lukt het niet</p>
        </button>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo area */}
        <div className="text-center mb-8 animate-fade-up">
          <h1 className="text-2xl font-bold">
            <span className="text-gradient">CliqMakers</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Capaciteit & Groei Onderzoek</p>
        </div>

        {/* Progress */}
        <div className="mb-6 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  i <= step ? 'bg-accent' : 'bg-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="animate-fade-up rounded-xl border bg-card p-6 shadow-sm" style={{ animationDelay: '120ms' }}>
          {steps[step]}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Vorige
            </Button>
            {step < totalSteps - 1 ? (
              <Button
                variant="cta"
                size="sm"
                onClick={() => setStep(s => s + 1)}
              >
                Volgende
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button variant="cta" size="sm" onClick={handleSubmit}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Versturen
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          Uw gegevens worden vertrouwelijk behandeld en niet gedeeld met derden.
        </p>
      </div>
    </div>
  );
}
