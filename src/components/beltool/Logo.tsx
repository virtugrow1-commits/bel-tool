export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(210 100% 50%)" />
          <stop offset="100%" stopColor="hsl(174 100% 38%)" />
        </linearGradient>
      </defs>
      <path d="M50 8 A42 42 0 1 1 50 92 A42 42 0 1 1 50 8" stroke="url(#lg)" strokeWidth="5" strokeDasharray="4 3" fill="none" strokeLinecap="round" />
      <path d="M42 30 L78 50 L42 70 L50 50 Z" fill="url(#lg)" opacity=".9" />
      <path d="M30 75 L38 65 L34 62 Z" fill="hsl(174 100% 38%)" opacity=".6" />
    </svg>
  );
}
