import { publicMediaObjectUrl, type MediaUrlClip } from '@/lib/media-url'

/**
 * How many self-hosted posters the home section shows.
 * The query reads a few extra rows so a restricted or unreadable key can be skipped.
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
    clips.r2_key,
    clips.r2_key_low,
    clips.thumb_key,
    clips.visibility
  FROM clips
  WHERE clips.match_id = ?
    AND clips.r2_key IS NOT NULL
    AND TRIM(clips.r2_key) != ''
    AND (clips.visibility IS NULL OR clips.visibility = 'public')
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
  r2_key: string | null
  r2_key_low: string | null
  thumb_key: string | null
  visibility: string | null
}

export type LatestUploadedMatchPreview = {
  clipId: string
  title: string
  /** JPEG poster from `thumb_key`, preferred over the video-frame trick. */
  thumbUrl?: string
  /** Self-hosted MP4 when no thumb is stored (metadata frame at `#t=0.1`). */
  mediaUrl?: string
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
 * Keep the first posters that resolve to a public media URL, at most four.
 * `resolveMediaUrl` is `mediaUrl` at the call site so this module does not read env.
 */
export function selectLatestUploadedMatchPreviews(
  rows: LatestUploadedMatchPreviewRow[],
  resolveMediaUrl: (clip: MediaUrlClip) => string | null,
): LatestUploadedMatchPreview[] {
  const previews: LatestUploadedMatchPreview[] = []

  for (const row of rows) {
    if (previews.length >= LATEST_UPLOADED_MATCH_POSTER_COUNT) {
      break
    }

    const thumbUrl =
      row.visibility === 'restricted'
        ? null
        : publicMediaObjectUrl(row.thumb_key)
    const resolvedMediaUrl = resolveMediaUrl({
      r2Key: row.r2_key,
      r2KeyLow: row.r2_key_low,
      visibility: row.visibility,
    })
    if (thumbUrl == null && resolvedMediaUrl == null) {
      continue
    }

    previews.push({
      clipId: String(row.clip_id),
      title: row.title,
      thumbUrl: thumbUrl ?? undefined,
      mediaUrl: resolvedMediaUrl ?? undefined,
    })
  }

  return previews
}
