import { cn } from '@/lib/utils';
import { SurveyResponse } from '@/types/survey';

const statusConfig: Record<SurveyResponse['status'], { label: string; className: string }> = {
  'nieuw': { label: 'Nieuw', className: 'bg-secondary text-secondary-foreground' },
  'gebeld': { label: 'Gebeld', className: 'bg-info/15 text-info' },
  'enquete-verstuurd': { label: 'Enquête verstuurd', className: 'bg-warning/15 text-warning' },
  'ingevuld': { label: 'Ingevuld', className: 'bg-accent/15 text-accent' },
  'afspraak-gepland': { label: 'Afspraak gepland', className: 'bg-success/15 text-success' },
  'afgerond': { label: 'Afgerond', className: 'bg-muted text-muted-foreground' },
};

export function StatusBadge({ status }: { status: SurveyResponse['status'] }) {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
