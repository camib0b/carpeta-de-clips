import type { ClipInstanceInsert } from './clip-instances'
import type { ClipVisibility } from './types'

/**
 * SQL used to import a playlist into D1.
 * Match identity is the storage slug (`date--home--away--rival[--Others]`).
 * Clip identity is `youtube_id`. Conflict does not rewrite title, match,
 * concept, or upload time. Media columns use COALESCE so an import that omits
 * them does not clear an existing `r2_key` or a stored `restricted` visibility.
 */
export const UPSERT_MATCH_SQL = `
INSERT INTO matches (
  id,
  played_on,
  home_team,
  away_team,
  home_goals,
  away_goals,
  shootout_winner,
  place,
  division,
  library_id,
  rival_label,
  youtube_playlist_id,
  r2_xml_object_key
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  played_on = excluded.played_on,
  home_team = excluded.home_team,
  away_team = excluded.away_team,
  home_goals = COALESCE(excluded.home_goals, matches.home_goals),
  away_goals = COALESCE(excluded.away_goals, matches.away_goals),
  shootout_winner = COALESCE(excluded.shootout_winner, matches.shootout_winner),
  place = COALESCE(excluded.place, matches.place),
  division = COALESCE(excluded.division, matches.division),
  library_id = excluded.library_id,
  rival_label = excluded.rival_label,
  youtube_playlist_id = COALESCE(excluded.youtube_playlist_id, matches.youtube_playlist_id),
  r2_xml_object_key = COALESCE(excluded.r2_xml_object_key, matches.r2_xml_object_key)
`

const RAW_VISIBILITY = '__RAW_VISIBILITY__'

/**
 * One statement for insert and conflict. `__RAW_VISIBILITY__` is the unbound
 * visibility (`?` or a SQL literal). The INSERT value is coalesced to 'public'
 * so NOT NULL is satisfied, but the conflict assignment reads the raw token:
 * NULL keeps the stored visibility, including `restricted`.
 * The WHERE skips the update when the import carries no media fields, so a
 * YouTube playlist sync still changes nothing on an existing clip.
 */
const CLIP_UPSERT_SQL_TEMPLATE = `
INSERT INTO clips (
  youtube_id,
  match_id,
  title,
  game_concept,
  uploaded_at,
  r2_key,
  r2_key_low,
  fps,
  duration_s,
  visibility
) VALUES (
  __YOUTUBE_ID__,
  __MATCH_ID__,
  __TITLE__,
  __GAME_CONCEPT__,
  __UPLOADED_AT__,
  __R2_KEY__,
  __R2_KEY_LOW__,
  __FPS__,
  __DURATION_S__,
  COALESCE(${RAW_VISIBILITY}, 'public')
)
ON CONFLICT (youtube_id) DO UPDATE SET
  r2_key = COALESCE(excluded.r2_key, clips.r2_key),
  r2_key_low = COALESCE(excluded.r2_key_low, clips.r2_key_low),
  fps = COALESCE(excluded.fps, clips.fps),
  duration_s = COALESCE(excluded.duration_s, clips.duration_s),
  visibility = CASE
    WHEN ${RAW_VISIBILITY} IS NULL THEN clips.visibility
    ELSE excluded.visibility
  END
WHERE ${RAW_VISIBILITY} IS NOT NULL
   OR excluded.r2_key IS NOT NULL
   OR excluded.r2_key_low IS NOT NULL
   OR excluded.fps IS NOT NULL
   OR excluded.duration_s IS NOT NULL
`

function clipUpsertSql(tokens: {
  youtubeId: string
  matchId: string
  title: string
  gameConcept: string
  uploadedAt: string
  r2Key: string
  r2KeyLow: string
  fps: string
  durationS: string
  rawVisibility: string
}): string {
  return CLIP_UPSERT_SQL_TEMPLATE.replaceAll('__YOUTUBE_ID__', tokens.youtubeId)
    .replaceAll('__MATCH_ID__', tokens.matchId)
    .replaceAll('__TITLE__', tokens.title)
    .replaceAll('__GAME_CONCEPT__', tokens.gameConcept)
    .replaceAll('__UPLOADED_AT__', tokens.uploadedAt)
    .replaceAll('__R2_KEY__', tokens.r2Key)
    .replaceAll('__R2_KEY_LOW__', tokens.r2KeyLow)
    .replaceAll('__FPS__', tokens.fps)
    .replaceAll('__DURATION_S__', tokens.durationS)
    .replaceAll(RAW_VISIBILITY, tokens.rawVisibility)
}

export const INSERT_CLIP_SQL = clipUpsertSql({
  youtubeId: '?',
  matchId: '?',
  title: '?',
  gameConcept: '?',
  uploadedAt: '?',
  r2Key: '?',
  r2KeyLow: '?',
  fps: '?',
  durationS: '?',
  rawVisibility: '?',
})

export type CatalogMatchUpsert = {
  id: string
  playedOn: string
  homeTeam: string
  awayTeam: string
  homeGoals: number | null
  awayGoals: number | null
  shootoutWinner: string | null
  place: string | null
  division: string | null
  libraryId: string
  rivalLabel: string
  youtubePlaylistId: string | null
  r2XmlObjectKey: string | null
}

export type CatalogClipInsert = {
  youtubeId: string
  matchId: string
  title: string
  gameConcept: string
  uploadedAt: string
  /**
   * Compiled AVA mp4 basename (e.g. `UC B vs OR - 16-yd OR.mp4`) used to match
   * `*.clips.json` sidecars during import.
   */
  sourceVideo?: string | null
  instances?: ClipInstanceInsert[]
  /** 1080p object key. Null or omitted does not clear a stored key on conflict. */
  r2Key?: string | null
  /** Optional 720p object key. Null or omitted does not clear a stored key. */
  r2KeyLow?: string | null
  fps?: number | null
  /** Full-file duration in seconds. Distinct from `instances[].durationS`. */
  durationS?: number | null
  /**
   * Null or omitted keeps the stored visibility (new rows still default to
   * `public`). `restricted` is accepted and stored, but not served yet.
   */
  visibility?: ClipVisibility | null
}

export function bindUpsertMatch(match: CatalogMatchUpsert): unknown[] {
  return [
    match.id,
    match.playedOn,
    match.homeTeam,
    match.awayTeam,
    match.homeGoals,
    match.awayGoals,
    match.shootoutWinner,
    match.place,
    match.division,
    match.libraryId,
    match.rivalLabel,
    match.youtubePlaylistId,
    match.r2XmlObjectKey,
  ]
}

function nullableMediaText(value: string | null | undefined): string | null {
  if (value == null) {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function nullableReal(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null
  }
  return value
}

function nullableVisibility(
  value: ClipVisibility | null | undefined,
): ClipVisibility | null {
  if (value == null) {
    return null
  }
  return value
}

function sqlQuoted(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function sqlTextLiteral(value: string | null | undefined): string {
  const normalized = nullableMediaText(value)
  return normalized == null ? 'NULL' : sqlQuoted(normalized)
}

function sqlRequiredTextLiteral(value: string): string {
  return sqlQuoted(value)
}

function sqlRealLiteral(value: number | null | undefined): string {
  const normalized = nullableReal(value)
  return normalized == null ? 'NULL' : String(normalized)
}

/**
 * Clip upsert used by `scripts/upsert-playlist.ts`.
 * Same conflict rules as `INSERT_CLIP_SQL`.
 */
export function renderClipUpsertSql(
  matchId: string,
  clip: Omit<CatalogClipInsert, 'matchId'>,
): string {
  const visibilitySql =
    clip.visibility == null ? 'NULL' : sqlQuoted(clip.visibility)
  return clipUpsertSql({
    youtubeId: sqlRequiredTextLiteral(clip.youtubeId),
    matchId: sqlRequiredTextLiteral(matchId),
    title: sqlRequiredTextLiteral(clip.title),
    gameConcept: sqlRequiredTextLiteral(clip.gameConcept),
    uploadedAt: sqlRequiredTextLiteral(clip.uploadedAt),
    r2Key: sqlTextLiteral(clip.r2Key),
    r2KeyLow: sqlTextLiteral(clip.r2KeyLow),
    fps: sqlRealLiteral(clip.fps),
    durationS: sqlRealLiteral(clip.durationS),
    rawVisibility: visibilitySql,
  })
}

export function bindInsertClip(
  clip: CatalogClipInsert,
): Array<string | number | null> {
  const visibility = nullableVisibility(clip.visibility)
  return [
    clip.youtubeId,
    clip.matchId,
    clip.title,
    clip.gameConcept,
    clip.uploadedAt,
    nullableMediaText(clip.r2Key),
    nullableMediaText(clip.r2KeyLow),
    nullableReal(clip.fps),
    nullableReal(clip.durationS),
    visibility,
    visibility,
    visibility,
  ]
}

export async function upsertMatchAndClips(
  database: D1Database,
  match: CatalogMatchUpsert,
  clips: CatalogClipInsert[],
): Promise<{ insertedClipCount: number }> {
  const statements = [
    database.prepare(UPSERT_MATCH_SQL).bind(...bindUpsertMatch(match)),
    ...clips.map((clip) =>
      database.prepare(INSERT_CLIP_SQL).bind(...bindInsertClip(clip)),
    ),
  ]

  const results = await database.batch(statements)
  const insertedClipCount = results
    .slice(1)
    .reduce((total, result) => total + (result.meta.changes ?? 0), 0)

  return { insertedClipCount }
}
