import type { SurveyAnswers } from '@/types/beltool';
import { calcLeadScore, leadLabel, type Scores } from '@/lib/beltool-scoring';
import { useBelTool } from '@/contexts/BelToolContext';

interface EndViewProps {
  icon: string;
  title: string;
  sub: string;
  items?: string[];
  answers?: SurveyAnswers;
  taskString?: string;
  scores?: Scores;
  onNext: () => void;
}

export function EndView({ icon, title, sub, items, answers, taskString, scores, onNext }: EndViewProps) {
  const { t } = useBelTool();
  const conv = scores && scores.gebeld > 0 ? Math.round(((scores.enquetes + scores.afspraken) / scores.gebeld) * 100) : 0;
  const ls = answers ? calcLeadScore(answers) : 0;
  const ll = leadLabel(ls);
  const leadC = ll === 'hot' ? 'hsl(0 84% 60%)' : ll === 'warm' ? 'hsl(38 92% 50%)' : 'hsl(217 91% 60%)';

  return (
    <div className="animate-fade-in text-center pt-8">
      <div className="text-[48px] mb-2.5">{icon}</div>
      <div className="text-xl font-bold mb-1.5">{title}</div>
      {answers && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: leadC + '15', color: leadC }}>{t[ll]} LEAD — {ls}pts</span>}
      <div className="text-sm text-muted-foreground max-w-[380px] mx-auto mt-2 mb-4 leading-relaxed">{sub}</div>
      {items && <div className="inline-flex flex-col gap-1 text-left bg-foreground/[0.03] rounded-xl px-5 py-3 mb-3">{items.map((d, i) => <div key={i} className="text-xs text-muted-foreground">✓ {d}</div>)}</div>}
      {answers && <div className="inline-flex flex-col gap-0.5 text-left bg-primary/[0.06] border border-primary/15 rounded-xl px-5 py-3 mb-3"><div className="text-[10px] font-bold text-primary tracking-wide mb-1">{t.surveySummary}</div><div className="text-xs text-muted-foreground">{t.hoursWeek}: {answers.hours || '-'}</div><div className="text-xs text-muted-foreground">{t.tasks}: {taskString || '-'}</div><div className="text-xs text-muted-foreground">{t.growthPhase}: {answers.growth || '-'}</div><div className="text-xs text-muted-foreground">{t.aiStatus}: {answers.ai || '-'}</div></div>}
      {scores && scores.gebeld > 0 && <div className="inline-grid grid-cols-4 gap-3 bg-foreground/[0.03] rounded-xl px-5 py-3 mb-3 border border-border/40">{[{ l: t.called, v: scores.gebeld, c: 'rgba(255,255,255,0.4)' },{ l: t.surveys, v: scores.enquetes, c: 'hsl(174 100% 38%)' },{ l: t.appointments, v: scores.afspraken, c: 'hsl(152 56% 42%)' },{ l: t.conversion, v: conv + '%', c: conv >= 50 ? 'hsl(152 56% 42%)' : 'hsl(38 92% 50%)' }].map(x => <div key={x.l} className="text-center"><div className="text-lg font-extrabold" style={{ color: x.c }}>{x.v}</div><div className="text-[10px] text-muted-foreground/30">{x.l}</div></div>)}</div>}
      <div className="mt-1.5"><button onClick={onNext} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold active:scale-[0.97] transition-transform">{t.nextContact}</button></div>
    </div>
  );
}
