import { Modal } from './Modal';
import { useBelTool } from '@/contexts/BelToolContext';
import type { Appointment } from '@/types/beltool';

interface AgendaViewProps {
  open: boolean;
  onClose: () => void;
  appointments: Appointment[];
}

export function AgendaView({ open, onClose, appointments }: AgendaViewProps) {
  const { t } = useBelTool();
  const sorted = [...appointments].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  return (
    <Modal open={open} onClose={onClose} title={`📅 ${t.agenda}`} wide>
      {sorted.length === 0 ? (
        <div className="text-center text-muted-foreground/40 py-8">{t.noAppointments}</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {sorted.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-foreground/[0.03] border border-border/60">
              <div className="w-11 text-center flex-shrink-0">
                <div className="text-lg font-extrabold text-primary leading-none">{new Date(a.date).getDate()}</div>
                <div className="text-[10px] text-muted-foreground uppercase">
                  {new Date(a.date).toLocaleDateString('nl-NL', { month: 'short' })}
                </div>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13px]">{a.contactName}</div>
                <div className="text-[11px] text-muted-foreground">{a.companyName}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[13px] font-semibold text-primary">{a.time}</div>
                <div className="text-[11px] text-muted-foreground">{a.advisorName}</div>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: a.status === 'completed' ? 'hsl(152 56% 42% / 0.1)' : 'hsl(217 91% 60% / 0.1)',
                  color: a.status === 'completed' ? 'hsl(152 56% 42%)' : 'hsl(217 91% 60%)',
                }}
              >
                {a.status === 'completed' ? t.completed : t.planned}
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
