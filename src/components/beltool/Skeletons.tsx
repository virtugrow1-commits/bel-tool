export function ContactSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1 px-2 py-2 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-muted/60 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3 bg-muted/60 rounded-full w-2/3" />
            <div className="h-2.5 bg-muted/40 rounded-full w-1/3" />
          </div>
          <div className="w-14 h-5 bg-muted/40 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function CallContentSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-background animate-pulse">
      <div className="w-16 h-16 rounded-full bg-muted/40" />
      <div className="h-4 bg-muted/40 rounded-full w-48" />
      <div className="h-3 bg-muted/30 rounded-full w-32" />
      <div className="mt-4 w-full max-w-md space-y-3 px-8">
        <div className="h-12 bg-muted/30 rounded-xl" />
        <div className="h-12 bg-muted/30 rounded-xl" />
        <div className="h-12 bg-muted/30 rounded-xl" />
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="flex items-center gap-3 animate-pulse">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="text-center space-y-1">
          <div className="h-7 w-8 bg-muted/40 rounded mx-auto" />
          <div className="h-2 w-12 bg-muted/30 rounded-full mx-auto" />
        </div>
      ))}
    </div>
  );
}
