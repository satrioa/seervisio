export default function ServicesLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-3">
        <div className="h-10 flex-1 animate-pulse rounded-lg bg-muted" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Table/List skeleton */}
      <div className="flex-1 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
