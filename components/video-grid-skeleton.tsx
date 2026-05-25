/**
 * Minimal loading skeleton for VideoGrid while search params hydrate.
 */
export function VideoGridSkeleton() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="h-9 w-[200px] animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-[180px] animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-5 w-16 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <div className="aspect-video animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
