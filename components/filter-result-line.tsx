'use client'

import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  appliedFilterChips,
  appliedFilterGroupClassName,
  CLEAR_FILTERS_LABEL,
  clearFiltersButtonClassName,
  FILTER_RESULT_SEPARATOR,
  filterChipButtonClassName,
  filterResultCountLabel,
  filterResultLineClassName,
  withoutSelectedValue,
  type AppliedFilterChip,
} from '@/lib/library-filters/filter-result-line'
import { hasActiveFilters } from '@/lib/library-filters/params'
import { cn } from '@/lib/utils'

interface FilterResultLineProps {
  filteredCount: number
  totalCount: number
  selectedConcepts: string[]
  selectedRivals: string[]
  onConceptsChange: (concepts: string[]) => void
  onRivalsChange: (rivals: string[]) => void
  onClearFilters: () => void
}

/**
 * Confirmation under the library filters.
 * The count is the clips still listed (filters, then hidden matches) out of
 * the whole carpeta, so the number matches the cards.
 */
export function FilterResultLine({
  filteredCount,
  totalCount,
  selectedConcepts,
  selectedRivals,
  onConceptsChange,
  onRivalsChange,
  onClearFilters,
}: FilterResultLineProps) {
  const filtersActive = hasActiveFilters({
    concepts: [...selectedConcepts],
    rivals: [...selectedRivals],
  })
  const countLabel = filterResultCountLabel(filteredCount, totalCount, filtersActive)
  const chips = appliedFilterChips(selectedConcepts, selectedRivals)

  function removeChip(chip: AppliedFilterChip) {
    if (chip.dimension === 'concept') {
      onConceptsChange(withoutSelectedValue(selectedConcepts, chip.value))
      return
    }
    onRivalsChange(withoutSelectedValue(selectedRivals, chip.value))
  }

  return (
    <div className={filterResultLineClassName}>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          'max-w-full tabular-nums',
          filtersActive ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {countLabel}
        {filtersActive ? (
          <span className="sr-only">{`. ${chips.map((chip) => chip.visibleLabel).join('. ')}.`}</span>
        ) : null}
      </p>
      {chips.map((chip) => (
        <span key={chip.key} className={appliedFilterGroupClassName}>
          <span aria-hidden="true" className="shrink-0 text-muted-foreground">
            {FILTER_RESULT_SEPARATOR}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title={chip.visibleLabel}
            aria-label={chip.removeLabel}
            onClick={() => removeChip(chip)}
            className={filterChipButtonClassName}
          >
            <span className="min-w-0 truncate">
              {chip.dimensionLabel}: <span dir="auto">{chip.value}</span>
            </span>
            <XIcon className="size-3.5 shrink-0" aria-hidden />
          </Button>
        </span>
      ))}
      {filtersActive ? (
        <span className="inline-flex shrink-0 items-center gap-2">
          <span aria-hidden="true" className="shrink-0 text-muted-foreground">
            {FILTER_RESULT_SEPARATOR}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className={clearFiltersButtonClassName}
          >
            {CLEAR_FILTERS_LABEL}
          </Button>
        </span>
      ) : null}
    </div>
  )
}
