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
    <div className="max-w-2xl">
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 h-[4px] rounded-full transition-colors duration-300',
              i < step - 1 ? 'bg-primary' : i === step - 1 ? 'bg-primary/40' : 'bg-border'
            )}
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[28px]">{icon}</span>
        <div>
          <div className="text-[10px] font-bold text-primary uppercase tracking-wider">
            STAP {step} / {total}
          </div>
          <div className="text-lg font-bold text-foreground">{title}</div>
        </div>
      </div>

      {/* Script block */}
      <div className="bg-card border-l-[3px] border-primary rounded-r-xl p-4 mb-4 shadow-sm border border-l-0 border-border">
        <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5">SCRIPT</div>
        <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line italic">
          {script}
        </div>
      </div>

      {/* Tip */}
      {tip && (
        <div className="bg-warning/[0.06] border border-warning/20 rounded-xl px-4 py-2.5 text-[13px] text-warning mb-4">
          {tip}
        </div>
      )}

      {children}
    </div>
  );
}
