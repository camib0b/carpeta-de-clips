const skeletonMarkClassName = 'skeleton-mark bg-muted/40'

/**
 * Shown while the home page server render is still in flight.
 * Marks mirror the hero and the public team rows. They stay close to the
 * page background. The sweep lives on `.skeleton-mark` and is still under
 * prefers-reduced-motion.
 */
export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background" role="status">
      <span className="sr-only text-muted-foreground">Cargando</span>
      <header className="border-b border-border">
        <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
          <div
            aria-hidden="true"
            className={`h-8 w-48 max-w-full rounded md:h-9 ${skeletonMarkClassName}`}
          />
          <div
            aria-hidden="true"
            className={`mt-4 h-5 w-full max-w-md rounded ${skeletonMarkClassName}`}
          />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div
          aria-hidden="true"
          className={`mb-2 h-3 w-36 rounded ${skeletonMarkClassName}`}
        />
        <ul aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="flex items-center gap-4 py-6">
              <div className={`h-8 w-8 shrink-0 rounded-md ${skeletonMarkClassName}`} />
              <div className={`h-5 w-40 max-w-[50vw] rounded ${skeletonMarkClassName}`} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
