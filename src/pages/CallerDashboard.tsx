import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScriptCard } from '@/components/ScriptCard';
import { SurveyResponse } from '@/types/survey';
import { createEmptySurvey, saveSurvey, getSurveys } from '@/lib/survey-store';
import { Phone, Send, Copy, Check, ArrowLeft, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CallerDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [callerName, setCallerName] = useState(() => localStorage.getItem('cliq_caller') || '');
  const [survey, setSurvey] = useState<SurveyResponse>(createEmptySurvey());
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem('cliq_caller', callerName);
  }, [callerName]);

  const update = (fields: Partial<SurveyResponse>) => {
    setSurvey(prev => ({ ...prev, ...fields }));
  };

  const handleSave = () => {
    saveSurvey({ ...survey, status: 'gebeld' });
    toast({ title: 'Opgeslagen!', description: `Enquête voor ${survey.contactName || 'contact'} is opgeslagen.` });
    setSurvey(createEmptySurvey());
    setActiveStep(0);
  };

  const handleSendSurveyLink = () => {
    saveSurvey({ ...survey, status: 'enquete-verstuurd' });
    const link = `${window.location.origin}/enquete/${survey.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Link gekopieerd!', description: 'Stuur deze link via e-mail of WhatsApp naar de prospect.' });
  };

  const surveyLink = `${window.location.origin}/enquete/${survey.id}`;

  const getClosingScript = () => {
    const task = survey.repetitiveTasks || '[taak uit vraag 2]';
    const phase = survey.currentPhase === 'klaar-voor-groei'
      ? 'wel wilt opschalen'
      : survey.currentPhase === 'bijbenen'
        ? 'het huidige werk netjes wilt verwerken'
        : '[antwoord uit vraag 3]';

    return `Ontzettend bedankt voor uw openheid. De reden dat we dit onderzoeken, is omdat we bij CliqMakers precies die twee werelden samenbrengen: we bouwen de systemen om nieuwe klanten aan te trekken, én we automatiseren het werk erachter.

Omdat u net aangaf dat u wekelijks best wat tijd verliest aan ${task} en u eigenlijk ${phase}, mag ik u iets vrijblijvends aanbieden als dank voor dit korte gesprekje.

Ik plan graag een adviesgesprek van 15 minuten voor u in met een van onze specialisten. Zij kijken kosteloos met u mee en laten u direct zien hoe u specifiek ${task} slim kunt automatiseren, zodat u ruimte krijgt voor groei. Zullen we daar volgende week even een momentje voor prikken?`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-gradient">CliqMakers</span> Belscript
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Jouw naam"
              value={callerName}
              onChange={e => setCallerName(e.target.value)}
              className="w-36 h-9 text-sm"
            />
            <Button variant="outline" size="sm" onClick={() => navigate('/resultaten')}>
              <List className="h-4 w-4 mr-1" />
              Overzicht
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl py-6 space-y-5">
        {/* Contact info */}
        <div className="animate-fade-up rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Phone className="h-4 w-4 text-accent" />
            Contactgegevens
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Naam contact" value={survey.contactName} onChange={e => update({ contactName: e.target.value })} />
            <Input placeholder="Bedrijfsnaam" value={survey.companyName} onChange={e => update({ companyName: e.target.value })} />
            <Input placeholder="E-mail" type="email" value={survey.contactEmail} onChange={e => update({ contactEmail: e.target.value })} />
            <Input placeholder="Telefoon" type="tel" value={survey.contactPhone} onChange={e => update({ contactPhone: e.target.value })} />
          </div>
        </div>

        {/* Intro script */}
        <div className="animate-fade-up rounded-lg border bg-primary/5 p-5" style={{ animationDelay: '80ms' }}>
          <p className="text-sm leading-relaxed italic text-foreground/80">
            "Goedemiddag <strong>{survey.contactName || '[Naam]'}</strong>, u spreekt met <strong>{callerName || '[Naam beller]'}</strong> van CliqMakers. Ik bel u kort omdat we momenteel een praktijkonderzoek doen naar onnodig tijdverlies en capaciteit binnen het MKB. Mag ik u daar vier hele korte vragen over stellen?"
          </p>
        </div>

        {/* Q1 */}
        <div style={{ animationDelay: '120ms' }} className="animate-fade-up">
          <ScriptCard step={1} title="Het Tijdlek — De kwantificering" active={activeStep === 1}>
            <p className="text-sm text-muted-foreground mb-3 italic">
              "Fijn, dank u wel. Vraag één: Als u een eerlijke inschatting maakt, hoeveel uur bent u of uw team op dit moment wekelijks kwijt aan pure 'digitale randzaken'? Denk aan het najagen van leads, e-mails overtypen, afspraken inplannen of systemen bijwerken."
            </p>
            <Input
              placeholder="Bijv. 8 uur per week"
              value={survey.hoursLostPerWeek}
              onFocus={() => setActiveStep(1)}
              onChange={e => update({ hoursLostPerWeek: e.target.value })}
            />
          </ScriptCard>
        </div>

        {/* Q2 */}
        <div style={{ animationDelay: '160ms' }} className="animate-fade-up">
          <ScriptCard step={2} title="De Activiteiten — De frustratie benoemen" active={activeStep === 2}>
            <p className="text-sm text-muted-foreground mb-2 italic">
              "Dat is nog best een flinke hap tijd. Wat zijn in die uren dan de meest voorkomende, repetitieve handelingen die u voor uw gevoel steeds weer opnieuw moet doen?"
            </p>
            <p className="text-xs text-accent font-medium mb-3">⚡ Laat een stilte vallen — schrijf de pijnpunten letterlijk op!</p>
            <Textarea
              placeholder="Noteer hier de genoemde taken..."
              value={survey.repetitiveTasks}
              onFocus={() => setActiveStep(2)}
              onChange={e => update({ repetitiveTasks: e.target.value })}
              rows={3}
            />
          </ScriptCard>
        </div>

        {/* Q3 */}
        <div style={{ animationDelay: '200ms' }} className="animate-fade-up">
          <ScriptCard step={3} title="De Groeipijn — De koers bepalen" active={activeStep === 3}>
            <p className="text-sm text-muted-foreground mb-3 italic">
              "Heel herkenbaar. Als we dan kijken naar de capaciteit van u en uw team: bent u momenteel vooral bezig met het bijbenen en verwerken van het huidige werk, of heeft u de processen eigenlijk al zo strak staan dat u wel klaar bent voor een flinke groei?"
            </p>
            <div className="flex gap-2">
              <Button
                variant={survey.currentPhase === 'bijbenen' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { update({ currentPhase: 'bijbenen' }); setActiveStep(3); }}
              >
                Bijbenen & verwerken
              </Button>
              <Button
                variant={survey.currentPhase === 'klaar-voor-groei' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { update({ currentPhase: 'klaar-voor-groei' }); setActiveStep(3); }}
              >
                Klaar voor groei
              </Button>
            </div>
          </ScriptCard>
        </div>

        {/* Q4 */}
        <div style={{ animationDelay: '240ms' }} className="animate-fade-up">
          <ScriptCard step={4} title="De AI & Automatisering Check" active={activeStep === 4}>
            <p className="text-sm text-muted-foreground mb-3 italic">
              "Duidelijk. We merken dat veel bedrijven daardoor een beetje vastzitten in die operationele rompslomp. Bent u intern al aan het kijken naar slimme automatisering of AI om die randzaken structureel op te lossen, of komt u daar door de waan van de dag simpelweg niet aan toe?"
            </p>
            <div className="flex gap-2">
              <Button
                variant={survey.aiStatus === 'al-bezig' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { update({ aiStatus: 'al-bezig' }); setActiveStep(4); }}
              >
                Al mee bezig
              </Button>
              <Button
                variant={survey.aiStatus === 'komt-niet-aan-toe' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { update({ aiStatus: 'komt-niet-aan-toe' }); setActiveStep(4); }}
              >
                Komt niet aan toe
              </Button>
            </div>
          </ScriptCard>
        </div>

        {/* Closing script */}
        <div className="animate-fade-up rounded-lg border-2 border-accent/30 bg-accent/5 p-5" style={{ animationDelay: '280ms' }}>
          <h3 className="font-semibold mb-3 text-accent">🎯 De Brug & Het Aanbod</h3>
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
            {getClosingScript()}
          </p>
        </div>

        {/* Notes */}
        <div className="animate-fade-up" style={{ animationDelay: '320ms' }}>
          <Textarea
            placeholder="Extra notities voor jezelf..."
            value={survey.callerNotes}
            onChange={e => update({ callerNotes: e.target.value })}
            rows={2}
            className="bg-card"
          />
        </div>

        {/* Actions */}
        <div className="animate-fade-up flex flex-wrap gap-3 pb-8" style={{ animationDelay: '360ms' }}>
          <Button variant="cta" size="lg" onClick={handleSave}>
            <Check className="h-4 w-4" />
            Opslaan & Volgende
          </Button>
          <Button variant="outline" size="lg" onClick={handleSendSurveyLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Gekopieerd!' : 'Enquêtelink kopiëren'}
          </Button>
        </div>
      </main>
    </div>
  );
}
