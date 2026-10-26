import { isRealYouTubeVideoId } from '@/lib/clip-thumbnail'
import { publicMediaObjectUrl } from '@/lib/media-url'
import type { ClipVisibility } from '@/lib/types'

/**
 * How many posters the home section shows.
 * The query reads a few extra rows so restricted or empty posters can be skipped.
 */
export const LATEST_UPLOADED_MATCH_POSTER_COUNT = 4

const LATEST_UPLOADED_MATCH_POSTER_CANDIDATE_COUNT = 8

/**
 * Newest catalog upload, not the match that was played most recently.
 * `matches` has no created_at. `clips.uploaded_at` is the upload timestamp
 * (kept on conflict, independent of `matches.played_on`).
 * The match upload time is the latest clip upload in that match.
 */
export const LATEST_UPLOADED_MATCH_SQL = `
  SELECT
    matches.id AS match_id,
    matches.played_on,
    matches.home_team,
    matches.away_team,
    matches.home_goals,
    matches.away_goals,
    matches.shootout_winner,
    matches.division,
    matches.library_id,
    libraries.name AS library_name,
    matches.rival_label,
    MAX(clips.uploaded_at) AS uploaded_at
  FROM matches
  INNER JOIN clips ON clips.match_id = matches.id
  INNER JOIN libraries ON libraries.id = matches.library_id
  GROUP BY matches.id
  ORDER BY uploaded_at DESC, matches.played_on DESC, matches.id DESC
  LIMIT 1
`

export const LATEST_UPLOADED_MATCH_PREVIEW_SQL = `
  SELECT
    clips.id AS clip_id,
    clips.title,
    clips.youtube_id,
    clips.thumb_key,
    clips.visibility
  FROM clips
  WHERE clips.match_id = ?
  ORDER BY clips.uploaded_at DESC, clips.id DESC
  LIMIT ${LATEST_UPLOADED_MATCH_POSTER_CANDIDATE_COUNT}
`

export type LatestUploadedMatchRow = {
  match_id: string
  played_on: string
  home_team: string
  away_team: string
  home_goals: number | null
  away_goals: number | null
  shootout_winner: string | null
  division: string | null
  library_id: string
  library_name: string
  rival_label: string
  uploaded_at: string
}

export type LatestUploadedMatchPreviewRow = {
  clip_id: number
  title: string
  youtube_id: string
  thumb_key: string | null
  visibility: string | null
}

export type LatestUploadedMatchPreview = {
  clipId: string
  title: string
  youtubeId: string
  thumbKey?: string
  visibility?: ClipVisibility
}

export type LatestUploadedMatch = {
  matchId: string
  librarySlug: string
  libraryName: string
  rivalLabel: string
  playedOn: string
  uploadedAt: string
  homeTeam: string
  awayTeam: string
  homeGoals?: number
  awayGoals?: number
  shootoutWinner?: string
  division?: string
  previews: LatestUploadedMatchPreview[]
}

function emptyToUndefined(value: string | null): string | undefined {
  if (value == null || value === '') {
    return undefined
  }
  return value
}

function clipVisibilityFromDatabase(
  value: string | null,
): ClipVisibility | undefined {
  if (value == null || value === '' || value === 'public') {
    return undefined
  }
  if (value === 'restricted') {
    return 'restricted'
  }
  return 'restricted'
}

export function toLatestUploadedMatch(
  row: LatestUploadedMatchRow,
  libraryName: string,
  previews: LatestUploadedMatchPreview[],
): LatestUploadedMatch {
  return {
    matchId: row.match_id,
    librarySlug: row.library_id,
    libraryName,
    rivalLabel: row.rival_label,
    playedOn: row.played_on,
    uploadedAt: row.uploaded_at,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    homeGoals: row.home_goals ?? undefined,
    awayGoals: row.away_goals ?? undefined,
    shootoutWinner: emptyToUndefined(row.shootout_winner),
    division: emptyToUndefined(row.division),
    previews,
  }
}

/**
 * Keep the first posters that have a thumb or a real YouTube still, at most four.
 */
export function selectLatestUploadedMatchPreviews(
  rows: LatestUploadedMatchPreviewRow[],
): LatestUploadedMatchPreview[] {
  const previews: LatestUploadedMatchPreview[] = []

  for (const row of rows) {
    if (previews.length >= LATEST_UPLOADED_MATCH_POSTER_COUNT) {
      break
    }

    const visibility = clipVisibilityFromDatabase(row.visibility)
    if (visibility === 'restricted') {
      continue
    }

    const thumbKey =
      row.thumb_key == null ||
      row.thumb_key.trim() === '' ||
      publicMediaObjectUrl(row.thumb_key) == null
        ? undefined
        : row.thumb_key
    const hasYoutube = isRealYouTubeVideoId(row.youtube_id)

    if (thumbKey == null && !hasYoutube) {
      continue
    }

    previews.push({
      clipId: String(row.clip_id),
      title: row.title,
      youtubeId: row.youtube_id,
      thumbKey,
      visibility,
    })
  }

  return previews
}
