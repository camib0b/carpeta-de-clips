'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  toLibraryHref,
  withLibraryFilters,
} from '@/lib/library-filters/clip-params'
import {
  hasActiveFilters,
  parseLibraryFilters,
  type LibraryFilterState,
} from '@/lib/library-filters/params'

function sameStringList(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }
  return true
}

function sameFilters(left: LibraryFilterState, right: LibraryFilterState): boolean {
  return (
    sameStringList(left.concepts, right.concepts) &&
    sameStringList(left.rivals, right.rivals)
  )
}

export function useLibraryFilters(availableRivals: string[]) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchKey = searchParams.toString()

  const filtersFromUrl = useMemo(
    () => parseLibraryFilters(searchParams, availableRivals),
    [searchParams, searchKey, availableRivals],
  )

  const [filters, setFilters] = useState<LibraryFilterState>(filtersFromUrl)
  const filtersRef = useRef(filters)
  const pendingFiltersRef = useRef<LibraryFilterState | null>(null)
  const pathnameRef = useRef(pathname)
  filtersRef.current = filters

  useEffect(() => {
    const onPopState = () => {
      pendingFiltersRef.current = null
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const pageChanged = pathnameRef.current !== pathname
    pathnameRef.current = pathname
    const pendingFilters = pendingFiltersRef.current
    if (
      !pageChanged &&
      pendingFilters != null &&
      !sameFilters(pendingFilters, filtersFromUrl)
    ) {
      return
    }
    pendingFiltersRef.current = null
    setFilters((current) =>
      sameFilters(current, filtersFromUrl) ? current : filtersFromUrl,
    )
  }, [filtersFromUrl, pathname])

  const commitFilters = useCallback(
    (nextFilters: LibraryFilterState) => {
      filtersRef.current = nextFilters
      pendingFiltersRef.current = nextFilters
      setFilters(nextFilters)
      const params = withLibraryFilters(
        new URLSearchParams(window.location.search),
        nextFilters,
      )
      const href = toLibraryHref(pathname, params)
      window.history.replaceState(window.history.state, '', href)
    },
    [pathname],
  )

  const updateFilters = useCallback(
    (partialFilters: Partial<LibraryFilterState>) => {
      commitFilters({ ...filtersRef.current, ...partialFilters })
    },
    [commitFilters],
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
    commitFilters({ concepts: [], rivals: [] })
  }, [commitFilters])

  return {
    selectedConcepts: filters.concepts,
    selectedRivals: filters.rivals,
    setSelectedConcepts,
    setSelectedRivals,
    clearFilters,
    hasActiveFilters: hasActiveFilters(filters),
  }
}
