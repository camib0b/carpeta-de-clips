import { isRealYouTubeVideoId, resolveClipThumbnail } from '@/lib/clip-thumbnail'
import { CLIP_PARAM, parseClipId, toLibraryHref } from '@/lib/library-filters/clip-params'
import { serializeLibraryFilters } from '@/lib/library-filters/params'
import { mediaUrl } from '@/lib/media-url'
import { formatMatchDate } from '@/lib/match-display'
import type { LatestUploadedMatchPreview } from '@/lib/latest-uploaded-match'

const PLAYED_ON_CAPTION = /^(\d{1,2}-[a-z]+)-\d{4}$/
const FULL_MATCH_TITLE = /partido completo/i
const WHITESPACE_RUN = /\s+/g

function collapseWhitespace(value: string): string {
  return value.replace(WHITESPACE_RUN, ' ').trim()
}

const HIGHLIGHT_TITLE_RANK: ReadonlyArray<{ pattern: RegExp; rank: number }> = [
  { pattern: /^goles$/i, rank: 0 },
  { pattern: /\bgoles?\b/i, rank: 1 },
  { pattern: /shoot\s*outs?/i, rank: 2 },
  { pattern: /penales/i, rank: 3 },
  { pattern: /flicks/i, rank: 4 },
]

function highlightRank(title: string): number {
  if (FULL_MATCH_TITLE.test(title)) {
    return 100
  }
  for (const entry of HIGHLIGHT_TITLE_RANK) {
    if (entry.pattern.test(title)) {
      return entry.rank
    }
  }
  return 50
}

/**
 * Best showable play for the home preview.
 * Goals outrank other highlights. A full-match upload is last.
 * Equal ranks keep the earlier preview (the catalog lists newest first).
 */
export function selectBestPlayPreview<T extends { title: string }>(
  previews: readonly T[],
): T | null {
  let best: T | null = null
  let bestRank = Number.POSITIVE_INFINITY
  for (const preview of previews) {
    const rank = highlightRank(preview.title)
    if (best == null || rank < bestRank) {
      best = preview
      bestRank = rank
    }
  }
  return best
}

/** Small caption under the home preview, e.g. `jugado el 25-oct`. */
export function formatPlayedOnCaption(playedOn: string): string | null {
  const formatted = formatMatchDate(playedOn)
  const dayAndMonth = PLAYED_ON_CAPTION.exec(formatted)?.[1]
  if (dayAndMonth == null) {
    return null
  }
  return `jugado el ${dayAndMonth}`
}

export type HomePreviewPlayback =
  | { kind: 'hosted'; src: string; poster: string | null }
  | { kind: 'youtube'; youtubeId: string }
  | { kind: 'still' }

function hasR2File(r2Key: string | null | undefined): boolean {
  return r2Key != null && r2Key.trim().length > 0
}

/**
 * What the home card may play.
 * A public R2 file uses the same `mediaUrl` builder as the clip page
 * (`https://media.carpeta.cl/...`). Reduced motion stays on the still.
 * YouTube is only for a clip that has no R2 file. A stored key whose public
 * URL cannot be built stays on the still.
 */
export function homePreviewPlayback(
  preview: Pick<
    LatestUploadedMatchPreview,
    'youtubeId' | 'r2Key' | 'r2KeyLow' | 'thumbKey' | 'visibility'
  >,
  allowsMotion: boolean,
): HomePreviewPlayback {
  if (!allowsMotion) {
    return { kind: 'still' }
  }

  if (hasR2File(preview.r2Key)) {
    const src = mediaUrl({
      r2Key: preview.r2Key,
      r2KeyLow: preview.r2KeyLow,
      visibility: preview.visibility,
    })
    if (src == null) {
      return { kind: 'still' }
    }
    const still = resolveClipThumbnail(preview)
    return { kind: 'hosted', src, poster: still.url }
  }

  const youtubeId = isRealYouTubeVideoId(preview.youtubeId)
    ? preview.youtubeId.trim()
    : null
  if (youtubeId != null) {
    return { kind: 'youtube', youtubeId }
  }
  return { kind: 'still' }
}

/**
 * Carpeta page for this match. Opens the best play when its id is a catalog
 * clip id. Never a YouTube URL.
 */
export function latestMatchCardHref(input: {
  librarySlug: string
  rivalLabel: string
  clipId?: string | null
}): string {
  const params = serializeLibraryFilters({
    concepts: [],
    rivals: [input.rivalLabel],
  })
  const clipId = input.clipId == null ? undefined : parseClipId(input.clipId)
  if (clipId != null) {
    params.set(CLIP_PARAM, clipId)
  }
  return toLibraryHref(`/${input.librarySlug}`, params)
}

/** Visible matchup. Collapses newlines and repeated spaces. Empty sides are omitted. */
export function matchupLabel(homeTeam: string, awayTeam: string): string {
  const home = collapseWhitespace(homeTeam)
  const away = collapseWhitespace(awayTeam)
  if (home.length > 0 && away.length > 0) {
    return `${home} vs ${away}`
  }
  if (home.length > 0) {
    return home
  }
  if (away.length > 0) {
    return away
  }
  return 'Partido'
}
