// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SkeletonBlock({ className = '' }: { className?: string; key?: any }) {
  return <div className={`bg-gray-100 rounded-xl animate-pulse ${className}`} />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SkeletonRow({ cols = 6 }: { cols?: number; key?: any }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-100">
      <SkeletonBlock className="w-8 h-4" />
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonBlock key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SkeletonTable({ rows = 8, cols = 6 }: { rows?: number; cols?: number; key?: any }) {
  return (
    <div className="divide-y divide-gray-100">
      <div className="flex items-center gap-4 p-4 bg-gray-50/50">
        <SkeletonBlock className="w-8 h-3" />
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-3">
      <SkeletonBlock className="w-12 h-12 rounded-xl" />
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="h-8 w-16" />
      <SkeletonBlock className="h-3 w-32" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-4">
      <SkeletonBlock className="h-5 w-48" />
      <SkeletonBlock className="h-3 w-64" />
      <SkeletonBlock className="h-64 w-full" />
    </div>
  );
}
