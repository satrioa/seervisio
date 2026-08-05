export default function CustomersLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Search skeleton */}
      <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />

      {/* Table skeleton */}
      <div className="flex-1 rounded-xl border">
        <div className="border-b p-4">
          <div className="flex gap-4">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
