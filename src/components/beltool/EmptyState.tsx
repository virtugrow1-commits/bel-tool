interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-[14px] font-bold text-foreground/40">{title}</div>
      {subtitle && (
        <div className="text-[12px] text-foreground/25 mt-1 max-w-[240px]">{subtitle}</div>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 active:scale-[0.97] transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
