import { cn } from '@/lib/utils';

interface ScriptCardProps {
  step: number;
  title: string;
  children: React.ReactNode;
  className?: string;
  active?: boolean;
}

export function ScriptCard({ step, title, children, className, active }: ScriptCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-5 shadow-sm transition-all duration-300',
        active && 'ring-2 ring-accent shadow-md',
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          {step}
        </span>
        <h3 className="font-semibold text-base">{title}</h3>
      </div>
      {children}
    </div>
  );
}
