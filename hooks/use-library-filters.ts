'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  hasActiveFilters,
  parseLibraryFilters,
  serializeLibraryFilters,
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
      const params = serializeLibraryFilters(merged)
      const query = params.toString()
      const href = query ? `${pathname}?${query}` : pathname
      router.replace(href, { scroll: false })
    },
    [filters, pathname, router],
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
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  return {
    selectedConcepts: filters.concepts,
    selectedRivals: filters.rivals,
    setSelectedConcepts,
    setSelectedRivals,
    clearFilters,
    hasActiveFilters: hasActiveFilters(filters),
  }
}
