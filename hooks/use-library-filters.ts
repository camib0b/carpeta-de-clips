'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  getDefaultLibraryFilters,
  hasActiveFilters,
  parseLibraryFilters,
  serializeLibraryFilters,
  type LibraryFilterState,
} from '@/lib/library-filters/params'

export function useLibraryFilters(rivals: string[]) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filters = useMemo(
    () => parseLibraryFilters(searchParams, rivals),
    [searchParams, rivals],
  )

  const updateFilters = useCallback(
    (next: Partial<LibraryFilterState>) => {
      const merged: LibraryFilterState = { ...filters, ...next }
      const params = serializeLibraryFilters(merged)
      const query = params.toString()
      const href = query ? `${pathname}?${query}` : pathname
      router.replace(href, { scroll: false })
    },
    [filters, pathname, router],
  )

  const setConcept = useCallback(
    (concept: string) => updateFilters({ concept }),
    [updateFilters],
  )

  const setRival = useCallback(
    (rival: string) => updateFilters({ rival }),
    [updateFilters],
  )

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  return {
    concept: filters.concept,
    rival: filters.rival,
    setConcept,
    setRival,
    clearFilters,
    hasActiveFilters: hasActiveFilters(filters),
    defaultFilters: getDefaultLibraryFilters(),
  }
}
