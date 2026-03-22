import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

interface DarkModeToggleProps {
  theme: Theme;
  onChange: (t: Theme) => void;
  compact?: boolean;
}

const THEME_OPTIONS: { value: Theme; icon: string; label: string }[] = [
  { value: 'light', icon: '☀️', label: 'Licht' },
  { value: 'dark', icon: '🌙', label: 'Donker' },
  { value: 'system', icon: '💻', label: 'Systeem' },
];

export function DarkModeToggle({ theme, onChange, compact }: DarkModeToggleProps) {
  if (compact) {
    // Cycle through: light → dark → system → light
    const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };
    const current = THEME_OPTIONS.find(o => o.value === theme) || THEME_OPTIONS[2];
    return (
      <button
        onClick={() => onChange(next[theme])}
        title={`Thema: ${current.label}`}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] text-muted-foreground hover:bg-muted transition-colors"
      >
        {current.icon}
      </button>
    );
  }

  return (
    <div className="flex gap-1 p-0.5 rounded-lg bg-muted/50 border border-border">
      {THEME_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all',
            theme === opt.value
              ? 'bg-card text-foreground shadow-sm border border-border'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span className="text-[11px]">{opt.icon}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
