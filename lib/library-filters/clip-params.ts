import {
  serializeLibraryFilters,
  type LibraryFilterState,
} from '@/lib/library-filters/params'

export const CLIP_PARAM = 'clip'
export const JUGADA_PARAM = 'jugada'

const LIBRARY_FILTER_PARAM_NAMES = ['concept', 'rival'] as const

type SearchParamsLike = {
  get: (name: string) => string | null
  toString: () => string
}

/**
 * Catalog clip ids are positive integers (`clips.id`). Reject anything else
 * so a malformed share link does not open a clip.
 */
export function parseClipId(raw: string | null): string | undefined {
  if (!raw || !/^[1-9]\d*$/.test(raw)) return undefined
  return raw
}

/**
 * Same rule as the original `?jugada=` deep link: a finite integer greater than 0.
 * `parseInt` keeps legacy values such as `"7"` working.
 */
export function parseJugadaOrd(raw: string | null): number | undefined {
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export function readQueryValue(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] ?? null
  return null
}

export function toLibraryHref(pathname: string, params: URLSearchParams): string {
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

/**
 * Replace concept/rival and leave clip, jugada, and any other params in place.
 */
export function withLibraryFilters(
  current: SearchParamsLike,
  filters: LibraryFilterState,
): URLSearchParams {
  const next = new URLSearchParams(current.toString())
  const serialized = serializeLibraryFilters(filters)

  for (const name of LIBRARY_FILTER_PARAM_NAMES) {
    const value = serialized.get(name)
    if (value) {
      next.set(name, value)
    } else {
      next.delete(name)
    }
  }

  return next
}

/** Drop concept and rival. Clip and jugada stay so the open modal is not dismissed. */
export function withoutLibraryFilters(current: SearchParamsLike): URLSearchParams {
  const next = new URLSearchParams(current.toString())
  for (const name of LIBRARY_FILTER_PARAM_NAMES) {
    next.delete(name)
  }
  return next
}

/**
 * Share target for the open clip. Built from the current filters plus the
 * clip the user is looking at, so it does not wait on `router.replace`.
 */
export function buildClipShareHref(input: {
  pathname: string
  currentSearch: SearchParamsLike
  clipId: string
  jugadaOrd?: number
}): string {
  const params = new URLSearchParams(input.currentSearch.toString())
  params.set(CLIP_PARAM, input.clipId)
  if (input.jugadaOrd != null && input.jugadaOrd > 0) {
    params.set(JUGADA_PARAM, String(input.jugadaOrd))
  } else {
    params.delete(JUGADA_PARAM)
  }
  return toLibraryHref(input.pathname, params)
}

export function buildClipOpenGraphQuery(input: {
  concept: string | null
  rival: string | null
  clipId: string
  jugadaOrd?: number
}): URLSearchParams {
  const params = new URLSearchParams()
  if (input.concept) params.set('concept', input.concept)
  if (input.rival) params.set('rival', input.rival)
  params.set(CLIP_PARAM, input.clipId)
  if (input.jugadaOrd != null && input.jugadaOrd > 0) {
    params.set(JUGADA_PARAM, String(input.jugadaOrd))
  }
  return params
}
