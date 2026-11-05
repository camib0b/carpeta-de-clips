import { formatMatchDate } from '@/lib/match-display'

const PLAYED_ON_CAPTION = /^(\d{1,2}-[a-z]+)-\d{4}$/
const FULL_MATCH_TITLE = /partido completo/i

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
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
