import { SurveyAnswers } from '@/types/beltool';

interface EndViewProps {
  icon: string;
  title: string;
  sub: string;
  items?: string[];
  answers?: SurveyAnswers;
  taskString?: string;
  onNext: () => void;
}

export function EndView({ icon, title, sub, items, answers, taskString, onNext }: EndViewProps) {
  return (
    <div className="animate-fade-in text-center pt-12">
      <div className="text-[52px] mb-3">{icon}</div>
      <div className="text-xl font-bold mb-1.5">{title}</div>
      <div className="text-sm text-muted-foreground max-w-[380px] mx-auto mb-5 leading-relaxed">{sub}</div>

      {items && (
        <div className="inline-flex flex-col gap-1.5 text-left bg-foreground/[0.03] rounded-lg px-5 py-3.5 mb-4">
          {items.map((d, i) => (
            <div key={i} className="text-[13px] text-foreground/55">✅ {d}</div>
          ))}
        </div>
      )}

      {answers && (
        <div className="inline-flex flex-col gap-1 text-left bg-primary/[0.08] border border-primary/20 rounded-lg px-5 py-3.5 mb-4 mt-1">
          <div className="text-[10px] font-bold text-primary tracking-[1px] mb-1">ENQUÊTE SAMENVATTING</div>
          <div className="text-xs text-foreground/55">⏱️ Uren: {answers.hours || '-'}</div>
          <div className="text-xs text-foreground/55">🔄 Taken: {taskString || '-'}</div>
          <div className="text-xs text-foreground/55">📈 Fase: {answers.growth || '-'}</div>
          <div className="text-xs text-foreground/55">🤖 AI: {answers.ai || '-'}</div>
        </div>
      )}

      <div className="mt-2">
        <button
          onClick={onNext}
          className="px-5 py-2.5 rounded-lg text-[13px] font-semibold bg-primary text-primary-foreground transition-all duration-150 hover:bg-primary/90 active:scale-[0.97]"
        >
          Volgend contact bellen
        </button>
      </div>
    </div>
  );
}
