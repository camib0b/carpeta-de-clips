import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { buildMatchKeyFromClip, matchKeyToStorageSlug } from '@/lib/match-keys'
import { getTeamAbbreviation } from '@/lib/team-abbreviations'
import type { VideoClip } from '@/lib/types'

export interface MatchMetadata {
  date: string
  tournament?: string
  homeTeam: string
  awayTeam: string
  homeGoals?: number
  awayGoals?: number
  shootoutWinner?: string
  /** Slug for public/match-xml/{storageSlug}.xml and /api/match-xml/[slug] */
  storageSlug: string
}

function matchKey(video: VideoClip): string {
  return buildMatchKeyFromClip(video)
}

function videoToMatchMetadata(video: VideoClip): MatchMetadata {
  const storageSlug = matchKeyToStorageSlug(buildMatchKeyFromClip(video))

  return {
    date: video.date,
    tournament: video.category ?? video.collection,
    homeTeam: video.homeTeam,
    awayTeam: video.awayTeam,
    homeGoals: video.homeGoals,
    awayGoals: video.awayGoals,
    shootoutWinner: video.shootoutWinner,
    storageSlug,
  }
}

export function getUniqueMatchesFromVideos(videos: VideoClip[]): MatchMetadata[] {
  const matchesByKey = new Map<string, MatchMetadata>()

  for (const video of videos) {
    const key = matchKey(video)
    if (!matchesByKey.has(key)) {
      matchesByKey.set(key, videoToMatchMetadata(video))
    }
  }

  return [...matchesByKey.values()].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  )
}

export function formatMatchDate(date: string): string {
  return format(new Date(date), "d 'de' MMM, yyyy", { locale: es })
}

export function buildMatchXmlDownloadFilename(match: MatchMetadata): string {
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

export function formatMatchScore(match: MatchMetadata): string | null {
  const hasScore = match.homeGoals !== undefined && match.awayGoals !== undefined
  if (!hasScore) return null

  return formatScoreWithShootout(
    match.homeGoals,
    match.awayGoals,
    match.shootoutWinner,
  )
}
