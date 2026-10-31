/**
 * Minimal loading skeleton for VideoGrid while search params hydrate.
 */
export function VideoGridSkeleton() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="h-9 w-full max-w-[200px] rounded-md bg-muted sm:w-[200px]" />
        <div className="h-9 w-full max-w-[180px] rounded-md bg-muted sm:w-[180px]" />
      </div>
      <div className="h-5 w-16 rounded bg-muted" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-md border border-border bg-card">
            <div className="aspect-video bg-muted" />
            <div className="space-y-2 border-t border-border bg-card px-3 py-2.5">
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="h-3 w-2/5 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
