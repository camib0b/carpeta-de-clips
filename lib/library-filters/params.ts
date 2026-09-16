import { conceptToSlug, rivalToSlug, slugToConcept, slugToRival } from './slug'

export { ALL_CONCEPTS_FILTER_LABEL, ALL_RIVALS_FILTER_LABEL } from '@/lib/types'

export interface LibraryFilterState {
  concepts: string[]
  rivals: string[]
}

const LIBRARY_FILTER_DEFINITIONS = {
  concepts: {
    param: 'concept',
    toSlug: conceptToSlug,
    fromSlug: (slug: string, _availableRivals: string[]) => slugToConcept(slug),
  },
  rivals: {
    param: 'rival',
    toSlug: (rival: string) => rivalToSlug(rival),
    fromSlug: (slug: string, availableRivals: string[]) =>
      slugToRival(slug, availableRivals),
  },
} as const

export function getDefaultLibraryFilters(): LibraryFilterState {
  return {
    concepts: [],
    rivals: [],
  }
}

function parseSlugList(
  raw: string | null,
  fromSlug: (slug: string, availableRivals: string[]) => string | null,
  availableRivals: string[],
): string[] {
  if (!raw) return []

  const seen = new Set<string>()
  const values: string[] = []

  for (const part of raw.split(',')) {
    const slug = part.trim()
    if (!slug) continue

    const value = fromSlug(slug, availableRivals)
    if (!value || seen.has(value)) continue

    seen.add(value)
    values.push(value)
  }

  return values
}

function serializeSlugList(
  values: string[],
  toSlug: (value: string) => string | null,
): string | null {
  const slugs: string[] = []

  for (const value of values) {
    const slug = toSlug(value)
    if (slug) {
      slugs.push(slug)
    }
  }

  if (slugs.length === 0) return null
  return slugs.join(',')
}

export function parseLibraryFilters(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
  availableRivals: string[],
): LibraryFilterState {
  const state = getDefaultLibraryFilters()

  for (const key of Object.keys(LIBRARY_FILTER_DEFINITIONS) as Array<
    keyof typeof LIBRARY_FILTER_DEFINITIONS
  >) {
    const filterDefinition = LIBRARY_FILTER_DEFINITIONS[key]
    state[key] = parseSlugList(
      searchParams.get(filterDefinition.param),
      filterDefinition.fromSlug,
      availableRivals,
    )
  }

  return state
}

export function serializeLibraryFilters(state: LibraryFilterState): URLSearchParams {
  const params = new URLSearchParams()

  for (const key of Object.keys(LIBRARY_FILTER_DEFINITIONS) as Array<
    keyof typeof LIBRARY_FILTER_DEFINITIONS
  >) {
    const filterDefinition = LIBRARY_FILTER_DEFINITIONS[key]
    const serialized = serializeSlugList(state[key], filterDefinition.toSlug)
    if (serialized) {
      params.set(filterDefinition.param, serialized)
    }
  }

  return params
}

export function hasActiveFilters(state: LibraryFilterState): boolean {
  return state.concepts.length > 0 || state.rivals.length > 0
}

type ReadonlyURLSearchParams = Pick<URLSearchParams, 'get'>
