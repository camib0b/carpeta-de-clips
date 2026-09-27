import type { ClipInstanceInsert } from './clip-instances'

/**
 * SQL used to import a playlist into D1.
 * Match identity is the storage slug (`date--home--away--rival[--Others]`).
 * Clip identity is `youtube_id` (duplicates are ignored).
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

export const INSERT_CLIP_SQL = `
INSERT INTO clips (youtube_id, match_id, title, game_concept, uploaded_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT (youtube_id) DO NOTHING
`

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

export function bindInsertClip(clip: CatalogClipInsert): unknown[] {
  return [
    clip.youtubeId,
    clip.matchId,
    clip.title,
    clip.gameConcept,
    clip.uploadedAt,
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
