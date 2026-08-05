export default function DashboardLoading() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-32 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-64 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="rounded-xl border p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* Recent activity skeleton */}
      <div className="rounded-xl border p-6">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
