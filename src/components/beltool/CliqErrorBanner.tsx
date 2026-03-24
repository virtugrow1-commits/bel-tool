interface CliqErrorBannerProps {
  error: string | null;
  loading: boolean;
  onRetry: () => void;
}

function friendlyError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('connection') || lower.includes('reset') || lower.includes('sendrequest') || lower.includes('client error')) {
    return 'Verbinding met GoHighLevel verbroken. Dit is een tijdelijk netwerk­probleem — klik op opnieuw proberen.';
  }
  if (lower.includes('pipeline') || lower.includes('geen')) {
    return 'Geen "Bellen" pipeline gevonden in GHL. Controleer of de pipeline bestaat en de API-sleutel klopt.';
  }
  if (lower.includes('api_key') || lower.includes('api key') || lower.includes('unauthorized') || lower.includes('401')) {
    return 'Ongeldige GHL API-sleutel. Controleer de instellingen (⚙️ → CLIQ Integratie).';
  }
  if (lower.includes('location') || lower.includes('403')) {
    return 'Geen toegang tot deze GHL locatie. Controleer de Location ID in de instellingen.';
  }
  if (lower.includes('502') || lower.includes('503') || lower.includes('504')) {
    return 'GoHighLevel is tijdelijk niet bereikbaar. Probeer het over een minuut opnieuw.';
  }
  return msg;
}

export function CliqErrorBanner({ error, loading, onRetry }: CliqErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="mx-3 my-2 p-3 rounded-xl bg-destructive/8 border border-destructive/15 animate-fade-in">
      <div className="flex items-start gap-2">
        <span className="text-base shrink-0 mt-0.5">⚠️</span>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-destructive">GHL verbinding mislukt</div>
          <div className="text-[11px] text-destructive/70 mt-0.5 break-words leading-relaxed">
            {friendlyError(error)}
          </div>
        </div>
      </div>
      <button
        onClick={onRetry}
        disabled={loading}
        className="mt-2 w-full py-2 rounded-lg bg-destructive/10 text-destructive text-[11px] font-semibold hover:bg-destructive/15 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-destructive/15"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-1.5">
            <span className="w-3 h-3 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
            Verbinden...
          </span>
        ) : (
          '🔄 Opnieuw proberen'
        )}
      </button>
    </div>
  );
}
