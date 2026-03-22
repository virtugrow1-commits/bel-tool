import { getAttemptCount, getLastAttempt, getAttemptLabel } from '@/lib/smart-queue';

interface AttemptBadgeProps {
  contactId: string;
  compact?: boolean;
}

export function AttemptBadge({ contactId, compact }: AttemptBadgeProps) {
  const count = getAttemptCount(contactId);
  const last = getLastAttempt(contactId);
  const { text, color } = getAttemptLabel(count);

  if (count === 0 && compact) return null;

  if (compact) {
    return (
      <span
        className="text-[8px] font-bold px-1.5 py-0.5 rounded-full border"
        style={{ color, background: color + '12', borderColor: color + '25' }}
        title={last ? `Laatste poging: ${new Date(last.timestamp).toLocaleString('nl-NL')}` : undefined}
      >
        {count}x
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
        style={{ color, background: color + '12', borderColor: color + '25' }}
      >
        {text}
      </span>
      {last && (
        <span className="text-[9px] text-muted-foreground">
          {new Date(last.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}
