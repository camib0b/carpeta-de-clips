/**
 * Copy for a team library with nothing to show.
 * An empty carpeta is not the same as a filter that matched nothing.
 */
export function clipLibraryEmptyState(hasActiveFilters: boolean): {
  message: string
  offerClearFilters: boolean
} {
  if (hasActiveFilters) {
    return {
      message: 'No hay clips que coincidan con tus filtros.',
      offerClearFilters: true,
    }
  }

  return {
    message: 'Esta carpeta todavía no tiene clips.',
    offerClearFilters: false,
  }
}
