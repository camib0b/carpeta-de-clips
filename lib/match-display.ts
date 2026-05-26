import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import type { VideoClip } from '@/lib/types'

export interface MatchMetadata {
  date: string
  tournament?: string
  homeTeam: string
  awayTeam: string
  homeGoals?: number
  awayGoals?: number
  shootoutWinner?: string
}

function matchKey(video: VideoClip): string {
  return `${video.date}|${video.homeTeam}|${video.awayTeam}`
}

function videoToMatchMetadata(video: VideoClip): MatchMetadata {
  return {
    date: video.date,
    tournament: video.category ?? video.collection,
    homeTeam: video.homeTeam,
    awayTeam: video.awayTeam,
    homeGoals: video.homeGoals,
    awayGoals: video.awayGoals,
    shootoutWinner: video.shootoutWinner,
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

export function formatMatchScore(match: MatchMetadata): string | null {
  const hasScore = match.homeGoals !== undefined && match.awayGoals !== undefined
  if (!hasScore) return null

  const score = `${match.homeGoals}–${match.awayGoals}`
  if (!match.shootoutWinner) return score

  const shootoutLabel =
    match.shootoutWinner === match.homeTeam ? 'L SP' : 'V SP'

  return `${score} (${shootoutLabel})`
}
