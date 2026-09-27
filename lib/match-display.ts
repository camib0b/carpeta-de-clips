import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

import { buildMatchKeyFromClip, matchKeyToStorageSlug } from '@/lib/match-keys'
import { getTeamAbbreviation } from '@/lib/team-abbreviations'
import type { VideoClip } from '@/lib/types'

export interface MatchSummary {
  date: string
  division?: string
  homeTeam: string
  awayTeam: string
  homeGoals?: number
  awayGoals?: number
  shootoutWinner?: string
  /** Slug for public/match-xml/{storageSlug}.xml and /api/match-xml/[storageSlug] */
  storageSlug: string
  /** R2 object key in clipped-xml when this match has XML cataloged in D1. */
  xmlObjectKey?: string
}

function toMatchSummary(clip: VideoClip): MatchSummary {
  const storageSlug = matchKeyToStorageSlug(buildMatchKeyFromClip(clip))

  return {
    date: clip.date,
    // Prefer league division; fall back to library name for older clips.
    division: clip.division ?? clip.libraryName,
    homeTeam: clip.homeTeam,
    awayTeam: clip.awayTeam,
    homeGoals: clip.homeGoals,
    awayGoals: clip.awayGoals,
    shootoutWinner: clip.shootoutWinner,
    storageSlug,
    xmlObjectKey: clip.r2XmlObjectKey,
  }
}

export function listUniqueMatchSummaries(clips: VideoClip[]): MatchSummary[] {
  const matchesByKey = new Map<string, MatchSummary>()

  for (const clip of clips) {
    const key = buildMatchKeyFromClip(clip)
    if (!matchesByKey.has(key)) {
      matchesByKey.set(key, toMatchSummary(clip))
    }
  }

  return [...matchesByKey.values()].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  )
}

export function formatMatchDate(date: string): string {
  return format(parseISO(date), "d 'de' MMM, yyyy", { locale: es })
}

export function buildMatchXmlDownloadFilename(match: MatchSummary): string {
  const datePart = match.date
  const teamsPart = `${match.homeTeam} vs ${match.awayTeam}`
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return `${teamsPart} ${datePart}.xml`
}

export function getMatchXmlDownloadHref(
  storageSlug: string,
  downloadFilename: string,
): string {
  const params = new URLSearchParams({ filename: downloadFilename })
  return `/api/match-xml/${storageSlug}?${params.toString()}`
}

export function formatScoreWithShootout(
  homeGoals: number,
  awayGoals: number,
  shootoutWinner?: string,
): string {
  const score = `${homeGoals}–${awayGoals}`
  if (!shootoutWinner) return score

  const winnerAbbrev = getTeamAbbreviation(shootoutWinner)
  return `${score} (${winnerAbbrev} S.O.)`
}

export function formatMatchScore(match: MatchSummary): string | null {
  const homeGoals = match.homeGoals
  const awayGoals = match.awayGoals
  if (homeGoals === undefined || awayGoals === undefined) return null

  return formatScoreWithShootout(homeGoals, awayGoals, match.shootoutWinner)
}

export function resolveMatchXmlDownloadFilename(match: MatchSummary): string {
  return match.xmlObjectKey ?? buildMatchXmlDownloadFilename(match)
}
