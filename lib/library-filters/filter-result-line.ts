/**
 * Copy and class names for the library filter result line.
 * The noun matches the home page and the previous grid count:
 * only 1 is singular ("1 clip"); 0 and everything else are "clips".
 * In "12 de 48 clips" the noun follows the library total, the set being counted.
 */

export const CONCEPT_FILTER_LABEL = 'Concepto'
export const RIVAL_FILTER_LABEL = 'Rival'
export const CLEAR_FILTERS_LABEL = 'Limpiar'
export const REMOVE_FILTER_PREFIX = 'Quitar filtro'
export const FILTER_RESULT_SEPARATOR = '·'

export type AppliedFilterDimension = 'concept' | 'rival'

export interface AppliedFilterChip {
  key: string
  dimension: AppliedFilterDimension
  dimensionLabel: string
  value: string
  visibleLabel: string
  removeLabel: string
}

export function clipCountNoun(count: number): 'clip' | 'clips' {
  return count === 1 ? 'clip' : 'clips'
}

export function filterResultCountLabel(
  filteredCount: number,
  totalCount: number,
  hasActiveFilters: boolean,
): string {
  if (!hasActiveFilters) {
    return `${totalCount} ${clipCountNoun(totalCount)}`
  }
  return `${filteredCount} de ${totalCount} ${clipCountNoun(totalCount)}`
}

export function appliedFilterChips(
  concepts: readonly string[],
  rivals: readonly string[],
): AppliedFilterChip[] {
  return [
    ...concepts.map((value) => createAppliedFilterChip('concept', CONCEPT_FILTER_LABEL, value)),
    ...rivals.map((value) => createAppliedFilterChip('rival', RIVAL_FILTER_LABEL, value)),
  ]
}

export function withoutSelectedValue(selected: readonly string[], value: string): string[] {
  return selected.filter((item) => item !== value)
}

/**
 * Ghost share control. Desktop stays the compact h-8; mobile uses a real 44px box
 * so the tap target is not an outline that reads as another filter.
 * Enabled: pointer. Disabled: not-allowed, and pointer-events stay on so the
 * disabled cursor is the button's own, not a parent's pointer.
 */
export const shareFiltersButtonClassName =
  'h-11 shrink-0 cursor-pointer px-3 font-normal text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-auto disabled:cursor-not-allowed sm:h-8'

/**
 * Sentence chips. h-8 is the visible control; the mobile ::before adds 6px
 * above and below (32 + 12 = 44) without growing the border box.
 */
export const filterChipButtonClassName =
  "relative h-8 max-w-full min-w-0 shrink cursor-pointer px-2 font-normal text-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-auto disabled:cursor-not-allowed max-sm:before:absolute max-sm:before:inset-x-0 max-sm:before:-inset-y-1.5 max-sm:before:content-['']"

export const clearFiltersButtonClassName =
  "relative h-8 shrink-0 cursor-pointer px-2 font-normal text-foreground underline underline-offset-4 hover:bg-accent hover:text-accent-foreground hover:no-underline disabled:pointer-events-auto disabled:cursor-not-allowed max-sm:before:absolute max-sm:before:inset-x-0 max-sm:before:-inset-y-1.5 max-sm:before:content-['']"

/** min-h-11 keeps the row when filters clear. gap-y-4 clears the 6px mobile hit slop. */
export const filterResultLineClassName =
  'flex min-h-11 w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-4 text-sm'

/** Dot and chip wrap together so a long chip truncates inside the column. */
export const appliedFilterGroupClassName =
  'flex w-fit max-w-full min-w-0 items-center gap-2'

function createAppliedFilterChip(
  dimension: AppliedFilterDimension,
  dimensionLabel: string,
  value: string,
): AppliedFilterChip {
  return {
    key: `${dimension}\u0000${value}`,
    dimension,
    dimensionLabel,
    value,
    visibleLabel: `${dimensionLabel}: ${value}`,
    removeLabel: `${REMOVE_FILTER_PREFIX} ${value}`,
  }
}
