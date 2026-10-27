const skeletonMarkClassName = 'rounded bg-foreground/60'

/**
 * Shown while a team library server render is still in flight.
 * Marks use foreground at 60% so they stay at or above 3:1 on bg-background
 * in light and dark. They do not pulse: animate-pulse fades to 50% opacity
 * and would drop the light-mode mark under 3:1.
 */
export default function TeamLibraryLoading() {
  return (
    <div className="min-h-screen bg-background" role="status">
      <span className="sr-only text-muted-foreground">Cargando</span>
      <header>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div aria-hidden="true" className={`mb-8 h-5 w-40 ${skeletonMarkClassName}`} />
          <div aria-hidden="true" className="flex min-w-0 items-center gap-4">
            <div className={`h-14 w-14 shrink-0 rounded-md bg-foreground/60`} />
            <div className={`h-7 w-48 max-w-full ${skeletonMarkClassName}`} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div aria-hidden="true" className="space-y-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <div className={`h-9 w-full max-w-[200px] sm:w-[200px] ${skeletonMarkClassName}`} />
            <div className={`h-9 w-full max-w-[180px] sm:w-[180px] ${skeletonMarkClassName}`} />
          </div>
          <div className={`h-5 w-16 ${skeletonMarkClassName}`} />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-md">
                <div className="aspect-video bg-foreground/60" />
                <div className="space-y-2 px-3 py-2.5">
                  <div className={`h-4 w-2/3 ${skeletonMarkClassName}`} />
                  <div className={`h-3 w-1/2 ${skeletonMarkClassName}`} />
                  <div className={`h-3 w-2/5 ${skeletonMarkClassName}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
