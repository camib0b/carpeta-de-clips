import { cache } from 'react'
import { remapGameConceptToTeamPerspective } from '@/lib/team-perspective'
import { getCatalogDatabase } from '@/lib/d1'
import { mediaUrl } from '@/lib/media-url'
import {
  LATEST_UPLOADED_MATCH_PREVIEW_SQL,
  LATEST_UPLOADED_MATCH_SQL,
  selectLatestUploadedMatchPreviews,
  toLatestUploadedMatch,
  type LatestUploadedMatch,
  type LatestUploadedMatchPreviewRow,
  type LatestUploadedMatchRow,
} from '@/lib/latest-uploaded-match'
import type { ClipInstance, ClipVisibility, Team, VideoClip } from '@/lib/types'

const LIBRARY_COUNTRY = 'CL'

type LibraryRow = {
  id: string
  name: string
  sort_order: number
}

type LibraryCountRow = LibraryRow & {
  clip_count: number
}

type ClipInstanceRow = {
  clip_id: number
  ord: number
  offset_s: number
  duration_s: number
  quarter: string | null
  score_label: string | null
  xml_instance_id: number | null
}

type ClipJoinRow = {
  clip_id: number
  youtube_id: string
  title: string
  game_concept: string
  uploaded_at: string
  played_on: string
  home_team: string
  away_team: string
  home_goals: number | null
  away_goals: number | null
  shootout_winner: string | null
  place: string | null
  division: string | null
  library_id: string
  library_name: string
  rival_label: string
  r2_xml_object_key: string | null
  r2_key: string | null
  r2_key_low: string | null
  thumb_key: string | null
  fps: number | null
  duration_s: number | null
  visibility: string | null
}

export type TeamLibraryWithClipCount = Team & {
  clipCount: number
}

function optionalString(value: string | null | undefined): string | undefined {
  return value == null || value === '' ? undefined : value
}

function optionalNumber(value: number | null | undefined): number | undefined {
  return value == null ? undefined : value
}

function libraryDisplayName(row: LibraryRow): string {
  if (row.id === 'others') {
    return 'Otros'
  }
  return row.name
}

function libraryRowToTeam(row: LibraryRow): Team {
  return {
    id: row.id,
    name: libraryDisplayName(row),
    slug: row.id,
    country: LIBRARY_COUNTRY,
  }
}

function clipInstanceRowToClipInstance(row: ClipInstanceRow): ClipInstance {
  return {
    ord: row.ord,
    offsetS: row.offset_s,
    durationS: row.duration_s,
    quarter: optionalString(row.quarter),
    scoreLabel: optionalString(row.score_label),
    xmlInstanceId: optionalNumber(row.xml_instance_id),
  }
}

async function fetchClipInstancesByClipIds(
  database: D1Database,
  clipIds: number[],
): Promise<Map<number, ClipInstance[]>> {
  const instancesByClipId = new Map<number, ClipInstance[]>()
  if (clipIds.length === 0) {
    return instancesByClipId
  }

  const placeholders = clipIds.map(() => '?').join(', ')
  let rows: ClipInstanceRow[] = []
  try {
    const result = await database
      .prepare(
        `SELECT
           clip_id,
           ord,
           offset_s,
           duration_s,
           quarter,
           score_label,
           xml_instance_id
         FROM clip_instances
         WHERE clip_id IN (${placeholders})
         ORDER BY clip_id ASC, ord ASC`,
      )
      .bind(...clipIds)
      .all<ClipInstanceRow>()
    rows = result.results ?? []
  } catch (error) {
    // Deploy can land before `0003_clip_instances` is applied on remote D1.
    console.error(
      'clip_instances query failed; serving clips without jugadas',
      error,
    )
    return instancesByClipId
  }

  for (const row of rows) {
    const clipInstances = instancesByClipId.get(row.clip_id) ?? []
    clipInstances.push(clipInstanceRowToClipInstance(row))
    instancesByClipId.set(row.clip_id, clipInstances)
  }

  return instancesByClipId
}

function attachClipInstances(
  clips: VideoClip[],
  instancesByClipId: Map<number, ClipInstance[]>,
): VideoClip[] {
  return clips.map((clip) => {
    const instances = instancesByClipId.get(Number(clip.id))
    if (!instances || instances.length === 0) {
      return clip
    }
    return { ...clip, instances }
  })
}

function clipVisibilityFromDatabase(value: string | null): ClipVisibility {
  if (value == null || value === '' || value === 'public') {
    return 'public'
  }
  // Unknown values fail closed so a bad row is not handed a public media URL.
  return 'restricted'
}

function clipJoinRowToVideoClip(row: ClipJoinRow): VideoClip {
  const libraryName = row.library_id === 'others' ? 'Others' : undefined

  return {
    id: String(row.clip_id),
    youtubeId: row.youtube_id,
    title: row.title,
    gameConcept: row.game_concept,
    libraryName,
    division: optionalString(row.division),
    rivalTeam: row.rival_label,
    date: row.played_on,
    place: optionalString(row.place),
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    homeGoals: optionalNumber(row.home_goals),
    awayGoals: optionalNumber(row.away_goals),
    shootoutWinner: optionalString(row.shootout_winner),
    uploadedAt: row.uploaded_at,
    r2XmlObjectKey: optionalString(row.r2_xml_object_key),
    r2Key: optionalString(row.r2_key),
    r2KeyLow: optionalString(row.r2_key_low),
    thumbKey: optionalString(row.thumb_key),
    fps: optionalNumber(row.fps),
    durationS: optionalNumber(row.duration_s),
    visibility: clipVisibilityFromDatabase(row.visibility),
  }
}

const CLIP_JOIN_SELECT = `
  SELECT
    clips.id AS clip_id,
    clips.youtube_id,
    clips.title,
    clips.game_concept,
    clips.uploaded_at,
    matches.played_on,
    matches.home_team,
    matches.away_team,
    matches.home_goals,
    matches.away_goals,
    matches.shootout_winner,
    matches.place,
    matches.division,
    matches.library_id,
    libraries.name AS library_name,
    matches.rival_label,
    matches.r2_xml_object_key,
    clips.r2_key,
    clips.r2_key_low,
    clips.thumb_key,
    clips.fps,
    clips.duration_s,
    clips.visibility
  FROM clips
  INNER JOIN matches ON matches.id = clips.match_id
  INNER JOIN libraries ON libraries.id = matches.library_id
`

export async function listTeamLibraries(): Promise<Team[]> {
  const database = await getCatalogDatabase()
  const result = await database
    .prepare(
      `SELECT id, name, sort_order
       FROM libraries
       ORDER BY sort_order ASC, name ASC`,
    )
    .all<LibraryRow>()

  return (result.results ?? []).map(libraryRowToTeam)
}

export async function listTeamLibrariesWithClipCounts(): Promise<
  TeamLibraryWithClipCount[]
> {
  const database = await getCatalogDatabase()
  const result = await database
    .prepare(
      `SELECT
         libraries.id,
         libraries.name,
         libraries.sort_order,
         COUNT(clips.id) AS clip_count
       FROM libraries
       LEFT JOIN matches ON matches.library_id = libraries.id
       LEFT JOIN clips ON clips.match_id = matches.id
       GROUP BY libraries.id
       ORDER BY libraries.sort_order ASC, libraries.name ASC`,
    )
    .all<LibraryCountRow>()

  return (result.results ?? []).map((row) => ({
    ...libraryRowToTeam(row),
    clipCount: Number(row.clip_count ?? 0),
  }))
}

export async function getTeamBySlug(slug: string): Promise<Team | undefined> {
  const database = await getCatalogDatabase()
  const row = await database
    .prepare(
      `SELECT id, name, sort_order
       FROM libraries
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(slug)
    .first<LibraryRow>()

  return row ? libraryRowToTeam(row) : undefined
}

export const getTeamLibraryClips = cache(async function getTeamLibraryClips(
  teamSlug: string,
): Promise<VideoClip[]> {
  const team = await getTeamBySlug(teamSlug)
  if (!team) {
    return []
  }

  const database = await getCatalogDatabase()
  const result = await database
    .prepare(
      `${CLIP_JOIN_SELECT}
       WHERE matches.library_id = ?
       ORDER BY clips.uploaded_at DESC`,
    )
    .bind(teamSlug)
    .all<ClipJoinRow>()

  const clips = (result.results ?? []).map(clipJoinRowToVideoClip)
  const clipIds = clips.map((clip) => Number(clip.id))
  const instancesByClipId = await fetchClipInstancesByClipIds(database, clipIds)
  const clipsWithInstances = attachClipInstances(clips, instancesByClipId)

  return clipsWithInstances.map((clip) =>
    remapGameConceptToTeamPerspective(clip, team.name),
  )
})

export function listRivalsFromClips(clips: VideoClip[]): string[] {
  return [...new Set(clips.map((clip) => clip.rivalTeam))]
}

export async function listTeamLibraryRivals(teamSlug: string): Promise<string[]> {
  return listRivalsFromClips(await getTeamLibraryClips(teamSlug))
}

export async function getMatchXmlObjectKey(
  storageSlug: string,
): Promise<string | null> {
  const database = await getCatalogDatabase()
  const row = await database
    .prepare(
      `SELECT r2_xml_object_key
       FROM matches
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(storageSlug)
    .first<{ r2_xml_object_key: string | null }>()

  return optionalString(row?.r2_xml_object_key) ?? null
}

export async function hasMatchXmlR2ObjectOverride(
  storageSlug: string,
): Promise<boolean> {
  const objectKey = await getMatchXmlObjectKey(storageSlug)
  return objectKey != null
}

/**
 * Match with the newest `clips.uploaded_at`. That is the upload time.
 * It is not the match with the latest `played_on`.
 * Posters are omitted when the self-hosted columns are unavailable or no public file exists.
 */
export async function getLatestUploadedMatch(): Promise<LatestUploadedMatch | null> {
  const database = await getCatalogDatabase()
  const row = await database
    .prepare(LATEST_UPLOADED_MATCH_SQL)
    .first<LatestUploadedMatchRow>()

  if (!row) {
    return null
  }

  let previewRows: LatestUploadedMatchPreviewRow[] = []
  try {
    const result = await database
      .prepare(LATEST_UPLOADED_MATCH_PREVIEW_SQL)
      .bind(row.match_id)
      .all<LatestUploadedMatchPreviewRow>()
    previewRows = result.results ?? []
  } catch (error) {
    console.error(
      'latest uploaded match poster query failed; showing the match without posters',
      error,
    )
  }

  const previews = selectLatestUploadedMatchPreviews(previewRows)

  return toLatestUploadedMatch(
    row,
    libraryDisplayName({
      id: row.library_id,
      name: row.library_name,
      sort_order: 0,
    }),
    previews,
  )
}
