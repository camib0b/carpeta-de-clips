import { conceptToSlug, rivalToSlug, slugToConcept, slugToRival } from './slug'

export const DEFAULT_CONCEPT = 'Todos los Conceptos'
export const DEFAULT_RIVAL = 'Todos los Rivales'

export interface LibraryFilterState {
  concept: string
  rival: string
}

const FILTER_DEFS = {
  concept: {
    param: 'concept',
    defaultValue: DEFAULT_CONCEPT,
    toSlug: conceptToSlug,
    fromSlug: (slug: string, _rivals: string[]) => slugToConcept(slug),
  },
  rival: {
    param: 'rival',
    defaultValue: DEFAULT_RIVAL,
    toSlug: (rival: string) => rivalToSlug(rival),
    fromSlug: (slug: string, rivals: string[]) => slugToRival(slug, rivals),
  },
} as const

export function getDefaultLibraryFilters(): LibraryFilterState {
  return {
    concept: DEFAULT_CONCEPT,
    rival: DEFAULT_RIVAL,
  }
}

export function parseLibraryFilters(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
  rivals: string[],
): LibraryFilterState {
  const state = getDefaultLibraryFilters()

  for (const key of Object.keys(FILTER_DEFS) as Array<keyof typeof FILTER_DEFS>) {
    const def = FILTER_DEFS[key]
    const slug = searchParams.get(def.param)
    if (!slug) continue

    const value = def.fromSlug(slug, rivals)
    if (value) {
      state[key] = value
    }
  }

  return state
}

export function serializeLibraryFilters(state: LibraryFilterState): URLSearchParams {
  const params = new URLSearchParams()

  for (const key of Object.keys(FILTER_DEFS) as Array<keyof typeof FILTER_DEFS>) {
    const def = FILTER_DEFS[key]
    const value = state[key]

    if (value === def.defaultValue) continue

    const slug = def.toSlug(value)
    if (slug) {
      params.set(def.param, slug)
    }
  }

  return params
}

export function hasActiveFilters(state: LibraryFilterState): boolean {
  return state.concept !== DEFAULT_CONCEPT || state.rival !== DEFAULT_RIVAL
}

type ReadonlyURLSearchParams = Pick<URLSearchParams, 'get'>
