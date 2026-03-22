import type { ReactNode } from 'react';

interface AuthGuardProps {
  loading: boolean;
  children: ReactNode;
}

export function AuthGuard({ loading, children }: AuthGuardProps) {
  if (!loading) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0D1B3E 0%, #1A3060 55%, #00C4B4 100%)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
          <span className="text-3xl">📞</span>
        </div>
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-[13px] text-white/50 font-medium">Sessie laden...</span>
      </div>
    </div>
  );
}
