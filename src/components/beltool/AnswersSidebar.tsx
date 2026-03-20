import { cn } from '@/lib/utils';
import { SurveyAnswers, CallPhase } from '@/types/beltool';

interface AnswersSidebarProps {
  answers: SurveyAnswers;
  taskString: string;
  notes: string;
  onNotesChange: (val: string) => void;
  onSendDigital: () => void;
  onNoAnswer: () => void;
  onGoToAppointment: () => void;
}

function SmField({ label, val }: { label: string; val: string }) {
  return (
    <div className="mb-3">
      <div className="text-[10px] text-foreground/30 font-semibold mb-0.5">{label}</div>
      <div
        className={cn(
          'text-xs px-2.5 py-1.5 rounded-md leading-relaxed min-h-[28px] flex items-center border',
          val
            ? 'text-foreground/80 bg-primary/[0.08] border-primary/25'
            : 'text-foreground/15 italic bg-foreground/[0.02] border-foreground/[0.04]'
        )}
      >
        {val || '-'}
      </div>
    </div>
  );
}

export function AnswersSidebar({ answers, taskString, notes, onNotesChange, onSendDigital, onNoAnswer, onGoToAppointment }: AnswersSidebarProps) {
  return (
    <div className="w-[240px] border-l border-border p-4 overflow-y-auto shrink-0 bg-black/15">
      <div className="text-[10px] font-bold text-foreground/25 tracking-[1.5px] mb-3.5">ANTWOORDEN</div>
      <SmField label="⏱️ Uren/week" val={answers.hours} />
      <SmField label="🔄 Taken" val={taskString} />
      <SmField label="📈 Groeifase" val={answers.growth} />
      <SmField label="🤖 AI status" val={answers.ai} />

      <div className="border-t border-foreground/[0.06] mt-4 pt-3.5">
        <div className="text-[10px] font-bold text-foreground/25 tracking-[1.5px] mb-2">NOTITIES</div>
        <textarea
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder="Vrije notities..."
          rows={3}
          className="w-full px-2.5 py-2 rounded-lg text-xs border border-foreground/[0.06] bg-foreground/[0.03] text-foreground outline-none resize-y leading-relaxed placeholder:text-muted-foreground"
        />
      </div>

      <div className="border-t border-foreground/[0.06] mt-4 pt-3.5">
        <div className="text-[10px] font-bold text-foreground/25 tracking-[1.5px] mb-2">SNELLE ACTIES</div>
        <button onClick={onSendDigital} className="block w-full text-left px-2.5 py-1.5 rounded-md mb-1.5 border border-warning/20 bg-warning/[0.08] text-warning/80 text-[11px] font-semibold hover:bg-warning/15 transition-colors">
          📨 Enquête digitaal sturen
        </button>
        <button onClick={onNoAnswer} className="block w-full text-left px-2.5 py-1.5 rounded-md mb-1.5 border border-muted-foreground/20 bg-muted-foreground/[0.08] text-muted-foreground/80 text-[11px] font-semibold hover:bg-muted-foreground/15 transition-colors">
          📵 Geen gehoor
        </button>
        <button onClick={onGoToAppointment} className="block w-full text-left px-2.5 py-1.5 rounded-md border border-primary/20 bg-primary/[0.08] text-primary/80 text-[11px] font-semibold hover:bg-primary/15 transition-colors">
          📅 Direct naar afspraak
        </button>
      </div>
    </div>
  );
}
