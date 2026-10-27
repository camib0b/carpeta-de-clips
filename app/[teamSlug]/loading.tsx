const skeletonMarkClassName = 'skeleton-mark bg-muted/40'

/**
 * Shown while a team library server render is still in flight.
 * Marks mirror the header, filter row, and card grid. They stay close to
 * the page background. The sweep lives on `.skeleton-mark` and is still
 * under prefers-reduced-motion.
 */
export default function TeamLibraryLoading() {
  return (
    <div className="min-h-screen bg-background" role="status">
      <span className="sr-only text-muted-foreground">Cargando</span>
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div aria-hidden="true" className={`mb-8 h-4 w-36 rounded ${skeletonMarkClassName}`} />
          <div aria-hidden="true" className="flex min-w-0 items-center gap-4">
            <div className={`h-14 w-14 shrink-0 rounded-md ${skeletonMarkClassName}`} />
            <div className={`h-7 w-48 max-w-full rounded ${skeletonMarkClassName}`} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div aria-hidden="true" className="space-y-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className={`h-9 w-full max-w-[200px] rounded-md sm:w-[200px] ${skeletonMarkClassName}`} />
            <div className={`h-9 w-full max-w-[180px] rounded-md sm:w-[180px] ${skeletonMarkClassName}`} />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-md">
                <div className={`aspect-video rounded-md ${skeletonMarkClassName}`} />
                <div className="px-3 py-2.5">
                  <div className={`h-4 w-2/3 rounded ${skeletonMarkClassName}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
