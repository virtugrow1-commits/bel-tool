import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { SurveyResponse } from '@/types/survey';
import { getSurveys, deleteSurvey } from '@/lib/survey-store';
import { ArrowLeft, Trash2, Copy, ExternalLink, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SurveyResults() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<SurveyResponse[]>([]);

  useEffect(() => {
    setSurveys(getSurveys().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const handleDelete = (id: string) => {
    deleteSurvey(id);
    setSurveys(prev => prev.filter(s => s.id !== id));
    toast({ title: 'Verwijderd' });
  };

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/enquete/${id}`);
    toast({ title: 'Link gekopieerd!' });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-gradient">CliqMakers</span> Resultaten
            </h1>
          </div>
          <Button variant="cta" size="sm" onClick={() => navigate('/')}>
            <Phone className="h-4 w-4 mr-1" />
            Nieuw gesprek
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl py-6">
        {surveys.length === 0 ? (
          <div className="animate-fade-up text-center py-16">
            <p className="text-muted-foreground mb-4">Nog geen enquêtes afgenomen.</p>
            <Button variant="cta" onClick={() => navigate('/')}>Start je eerste gesprek</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {surveys.map((s, i) => (
              <div
                key={s.id}
                className="animate-fade-up rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{s.contactName || 'Onbekend'}</h3>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{s.companyName}</p>
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      {s.hoursLostPerWeek && (
                        <div><span className="text-muted-foreground">Tijdverlies:</span> {s.hoursLostPerWeek}</div>
                      )}
                      {s.currentPhase && (
                        <div><span className="text-muted-foreground">Fase:</span> {s.currentPhase === 'bijbenen' ? 'Bijbenen' : 'Klaar voor groei'}</div>
                      )}
                      {s.aiStatus && (
                        <div><span className="text-muted-foreground">AI:</span> {s.aiStatus === 'al-bezig' ? 'Al mee bezig' : 'Komt niet aan toe'}</div>
                      )}
                    </div>
                    {s.repetitiveTasks && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        <span className="font-medium text-foreground">Taken:</span> {s.repetitiveTasks}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => copyLink(s.id)} title="Kopieer enquêtelink">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => window.open(`/enquete/${s.id}`, '_blank')} title="Open enquête">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} title="Verwijder">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(s.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
