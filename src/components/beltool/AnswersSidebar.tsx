import type { SurveyAnswers } from '@/types/beltool';
import { calcLeadScore, leadLabel } from '@/lib/beltool-scoring';
import { useBelTool } from '@/contexts/BelToolContext';

interface AnswersSidebarProps {
  answers: SurveyAnswers;
  taskString: string;
  notes: string;
  onNotesChange: (v: string) => void;
  onSendDigital: () => void;
  onNoAnswer: () => void;
  onGoToAppointment: () => void;
  onShowCallback: () => void;
}

function SumField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <div className="text-[10px] text-muted-foreground font-semibold mb-0.5">{label}</div>
      <div className={`text-xs px-2.5 py-1.5 rounded-lg leading-relaxed min-h-[28px] flex items-center border ${value ? 'text-foreground bg-primary/[0.04] border-primary/15' : 'text-muted-foreground italic bg-muted/30 border-border'}`}>{value || '-'}</div>
    </div>
  );
}

export function AnswersSidebar({ answers, taskString, notes, onNotesChange, onSendDigital, onNoAnswer, onGoToAppointment, onShowCallback }: AnswersSidebarProps) {
  const { t } = useBelTool();
  const ls = calcLeadScore(answers);
  const ll = leadLabel(ls);
  const leadC = ll === 'hot' ? 'hsl(0 84% 60%)' : ll === 'warm' ? 'hsl(38 92% 50%)' : 'hsl(217 91% 60%)';

  return (
    <div className="w-[220px] border-l border-border p-3.5 overflow-y-auto flex-shrink-0 bg-card">
      <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-3">{t.answers}</div>
      <SumField label={`⏱️ ${t.hoursWeek}`} value={answers.hours} />
      <SumField label={`🔄 ${t.tasks}`} value={taskString} />
      <SumField label={`📈 ${t.growthPhase}`} value={answers.growth} />
      <SumField label={`🤖 ${t.aiStatus}`} value={answers.ai} />
      {(answers.hours || answers.tasks.length > 0) && (
        <div className="mt-1.5 p-2 rounded-lg text-center border" style={{ background: leadC + '08', borderColor: leadC + '20' }}>
          <div className="text-[10px] font-bold" style={{ color: leadC }}>{ll === 'hot' ? '🔥' : ll === 'warm' ? '☀️' : '❄️'} {t[ll]} — {ls}pts</div>
        </div>
      )}
      <div className="border-t border-border mt-3 pt-2.5">
        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{t.notes}</div>
        <textarea value={notes} onChange={e => onNotesChange(e.target.value)} placeholder={t.notesPlaceholder} rows={3} className="w-full px-2.5 py-2 rounded-lg text-[11px] border border-border bg-card text-foreground outline-none resize-y leading-relaxed focus:border-primary" />
      </div>
      <div className="border-t border-border mt-3 pt-2.5">
        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{t.quickActions}</div>
        {[
          { color: 'hsl(38 92% 50%)', label: `📨 ${t.sendDigital}`, fn: onSendDigital },
          { color: 'hsl(38 92% 50%)', label: `🔔 ${t.callback}`, fn: onShowCallback },
          { color: 'hsl(207 16% 43%)', label: `📵 ${t.noAnswerBtn}`, fn: onNoAnswer },
          { color: 'hsl(174 100% 38%)', label: `📅 ${t.directBooking}`, fn: onGoToAppointment },
        ].map((a, i) => (
          <button key={i} onClick={a.fn} className="block w-full text-left px-2.5 py-2 rounded-lg mb-1 text-[11px] font-semibold border transition-colors hover:shadow-sm" style={{ borderColor: a.color + '20', background: a.color + '06', color: a.color }}>{a.label}</button>
        ))}
      </div>
    </div>
  );
}
