const skeletonMarkClassName = 'bg-foreground/60'

/**
 * Shown while the home page server render is still in flight.
 * Marks use foreground at 60% so they stay at or above 3:1 on bg-background
 * in light and dark. They do not pulse: animate-pulse fades to 50% opacity
 * and would drop the light-mode mark under 3:1.
 */
export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background" role="status">
      <span className="sr-only text-muted-foreground">Cargando</span>
      <header>
        <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
          <div
            aria-hidden="true"
            className={`h-8 w-56 max-w-full rounded md:h-9 ${skeletonMarkClassName}`}
          />
          <div
            aria-hidden="true"
            className={`mt-4 h-5 w-full max-w-md rounded ${skeletonMarkClassName}`}
          />
          <div
            aria-hidden="true"
            className={`mt-2 h-5 w-2/3 max-w-sm rounded ${skeletonMarkClassName}`}
          />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div
          aria-hidden="true"
          className={`mb-2 h-3 w-36 rounded ${skeletonMarkClassName}`}
        />
        <ul aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className="flex items-center justify-between gap-3 py-6">
              <div className="flex min-w-0 items-center gap-4">
                <div className={`h-8 w-8 shrink-0 rounded-md ${skeletonMarkClassName}`} />
                <div className={`h-5 w-40 max-w-[50vw] rounded ${skeletonMarkClassName}`} />
              </div>
              <div className={`h-4 w-16 shrink-0 rounded ${skeletonMarkClassName}`} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
