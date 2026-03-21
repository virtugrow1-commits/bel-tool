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
      <div className="text-[10px] text-muted-foreground/40 font-semibold mb-0.5">{label}</div>
      <div className={`text-xs px-2.5 py-1.5 rounded-md leading-relaxed min-h-[28px] flex items-center border ${value ? 'text-foreground/80 bg-primary/[0.06] border-primary/20' : 'text-muted-foreground/20 italic bg-foreground/[0.02] border-border/30'}`}>{value || '-'}</div>
    </div>
  );
}

export function AnswersSidebar({ answers, taskString, notes, onNotesChange, onSendDigital, onNoAnswer, onGoToAppointment, onShowCallback }: AnswersSidebarProps) {
  const { t } = useBelTool();
  const ls = calcLeadScore(answers);
  const ll = leadLabel(ls);
  const leadC = ll === 'hot' ? 'hsl(0 84% 60%)' : ll === 'warm' ? 'hsl(38 92% 50%)' : 'hsl(217 91% 60%)';

  return (
    <div className="w-[220px] border-l border-border/30 p-3.5 overflow-y-auto flex-shrink-0 bg-black/10">
      <div className="text-[9px] font-bold text-muted-foreground/25 tracking-[1.5px] mb-3">{t.answers}</div>
      <SumField label={`⏱️ ${t.hoursWeek}`} value={answers.hours} />
      <SumField label={`🔄 ${t.tasks}`} value={taskString} />
      <SumField label={`📈 ${t.growthPhase}`} value={answers.growth} />
      <SumField label={`🤖 ${t.aiStatus}`} value={answers.ai} />
      {(answers.hours || answers.tasks.length > 0) && <div className="mt-1.5 p-1.5 rounded-md text-center" style={{ background: leadC + '10', border: '1px solid ' + leadC + '20' }}><div className="text-[10px] font-bold" style={{ color: leadC }}>{ll === 'hot' ? '🔥' : ll === 'warm' ? '☀️' : '❄️'} {t[ll]} — {ls}pts</div></div>}
      <div className="border-t border-border/30 mt-3 pt-2.5">
        <div className="text-[9px] font-bold text-muted-foreground/25 tracking-[1.5px] mb-1.5">{t.notes}</div>
        <textarea value={notes} onChange={e => onNotesChange(e.target.value)} placeholder={t.notesPlaceholder} rows={3} className="w-full px-2 py-1.5 rounded-lg text-[11px] border border-border/30 bg-foreground/[0.02] text-foreground outline-none resize-y leading-relaxed" />
      </div>
      <div className="border-t border-border/30 mt-3 pt-2.5">
        <div className="text-[9px] font-bold text-muted-foreground/25 tracking-[1.5px] mb-1.5">{t.quickActions}</div>
        {[
          { color: 'hsl(38 92% 50%)', label: `📨 ${t.sendDigital}`, fn: onSendDigital },
          { color: 'hsl(38 92% 50%)', label: `🔔 ${t.callback}`, fn: onShowCallback },
          { color: 'hsl(220 9% 46%)', label: `📵 ${t.noAnswerBtn}`, fn: onNoAnswer },
          { color: 'hsl(174 100% 38%)', label: `📅 ${t.directBooking}`, fn: onGoToAppointment },
        ].map((a, i) => <button key={i} onClick={a.fn} className="block w-full text-left px-2 py-1.5 rounded-md mb-0.5 text-[10px] font-semibold" style={{ border: `1px solid ${a.color}15`, background: `${a.color}06`, color: `${a.color}BB` }}>{a.label}</button>)}
      </div>
    </div>
  );
}
