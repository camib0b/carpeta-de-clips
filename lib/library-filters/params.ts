import { conceptToSlug, rivalToSlug, slugToConcept, slugToRival } from './slug'

export const DEFAULT_CONCEPT = 'Todos los Conceptos'
export const DEFAULT_RIVAL = 'Todos los Rivales'

export interface LibraryFilterState {
  concepts: string[]
  rivals: string[]
}

const FILTER_DEFS = {
  concepts: {
    param: 'concept',
    toSlug: conceptToSlug,
    fromSlug: (slug: string, _rivals: string[]) => slugToConcept(slug),
  },
  rivals: {
    param: 'rival',
    toSlug: (rival: string) => rivalToSlug(rival),
    fromSlug: (slug: string, rivals: string[]) => slugToRival(slug, rivals),
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
  fromSlug: (slug: string, rivals: string[]) => string | null,
  rivals: string[],
): string[] {
  if (!raw) return []

  const seen = new Set<string>()
  const values: string[] = []

  for (const part of raw.split(',')) {
    const slug = part.trim()
    if (!slug) continue

    const value = fromSlug(slug, rivals)
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
  rivals: string[],
): LibraryFilterState {
  const state = getDefaultLibraryFilters()

  for (const key of Object.keys(FILTER_DEFS) as Array<keyof typeof FILTER_DEFS>) {
    const def = FILTER_DEFS[key]
    state[key] = parseSlugList(searchParams.get(def.param), def.fromSlug, rivals)
  }

  return state
}

export function serializeLibraryFilters(state: LibraryFilterState): URLSearchParams {
  const params = new URLSearchParams()

  for (const key of Object.keys(FILTER_DEFS) as Array<keyof typeof FILTER_DEFS>) {
    const def = FILTER_DEFS[key]
    const serialized = serializeSlugList(state[key], def.toSlug)
    if (serialized) {
      params.set(def.param, serialized)
    }
  }

  return params
}

export function hasActiveFilters(state: LibraryFilterState): boolean {
  return state.concepts.length > 0 || state.rivals.length > 0
}

type ReadonlyURLSearchParams = Pick<URLSearchParams, 'get'>
