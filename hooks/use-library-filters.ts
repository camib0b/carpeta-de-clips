'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  toLibraryHref,
  withLibraryFilters,
  withoutLibraryFilters,
} from '@/lib/library-filters/clip-params'
import {
  hasActiveFilters,
  parseLibraryFilters,
  type LibraryFilterState,
} from '@/lib/library-filters/params'

export function useLibraryFilters(availableRivals: string[]) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = useMemo(
    () => parseLibraryFilters(searchParams, availableRivals),
    [searchParams, availableRivals],
  )

  const updateFilters = useCallback(
    (partialFilters: Partial<LibraryFilterState>) => {
      const merged: LibraryFilterState = { ...filters, ...partialFilters }
      const params = withLibraryFilters(searchParams, merged)
      router.replace(toLibraryHref(pathname, params), { scroll: false })
    },
    [filters, pathname, router, searchParams],
  )

  const setSelectedConcepts = useCallback(
    (concepts: string[]) => updateFilters({ concepts }),
    [updateFilters],
  )

  const setSelectedRivals = useCallback(
    (nextRivals: string[]) => updateFilters({ rivals: nextRivals }),
    [updateFilters],
  )

  const clearFilters = useCallback(() => {
    const params = withoutLibraryFilters(searchParams)
    router.replace(toLibraryHref(pathname, params), { scroll: false })
  }, [pathname, router, searchParams])

  return {
    selectedConcepts: filters.concepts,
    selectedRivals: filters.rivals,
    setSelectedConcepts,
    setSelectedRivals,
    clearFilters,
    hasActiveFilters: hasActiveFilters(filters),
  }
}
