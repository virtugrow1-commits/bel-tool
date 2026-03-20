import { cn } from '@/lib/utils';

interface StepLayoutProps {
  step: number;
  total: number;
  icon: string;
  title: string;
  script: string;
  tip?: string;
  children: React.ReactNode;
}

export function StepLayout({ step, total, icon, title, script, tip, children }: StepLayoutProps) {
  return (
    <div>
      {/* Progress bar */}
      <div className="flex gap-1 mb-5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 h-[3px] rounded-full transition-colors duration-300',
              i < step - 1 ? 'bg-primary' : i === step - 1 ? 'bg-primary/40' : 'bg-foreground/5'
            )}
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[26px]">{icon}</span>
        <div>
          <div className="text-[10px] font-bold text-primary tracking-[1.5px]">
            STAP {step} / {total}
          </div>
          <div className="text-lg font-bold">{title}</div>
        </div>
      </div>

      {/* Script block */}
      <div className="bg-foreground/[0.03] border-l-[3px] border-primary rounded-r-lg p-4 mb-4">
        <div className="text-[10px] font-bold text-primary tracking-[1.5px] mb-1.5">SCRIPT</div>
        <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line italic">
          {script}
        </div>
      </div>

      {/* Tip */}
      {tip && (
        <div className="bg-warning/[0.07] border border-warning/15 rounded-lg px-3.5 py-2 text-[13px] text-warning mb-4">
          {tip}
        </div>
      )}

      {children}
    </div>
  );
}
