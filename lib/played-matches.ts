import { getCatalogDatabase } from '@/lib/d1'
import type { PlayedMatchRecord } from '@/lib/played-match-calendar'

/**
 * One grouped read for the landing calendar.
 * `matches.id` is the primary key, so the other match and library columns
 * are determined by that group. Upload date is the earliest clip.
 */
export const PLAYED_MATCHES_GROUPED_QUERY = `
SELECT m.id, m.played_on, m.library_id, l.name, m.rival_label,
       m.home_goals, m.away_goals,
       COUNT(c.id) AS clip_count, MIN(c.uploaded_at) AS first_uploaded
FROM matches m JOIN libraries l ON l.id = m.library_id
LEFT JOIN clips c ON c.match_id = m.id
GROUP BY m.id ORDER BY m.played_on DESC
`

type PlayedMatchQueryRow = {
  id: string
  played_on: string
  library_id: string
  name: string
  rival_label: string
  home_goals: number | null
  away_goals: number | null
  clip_count: number | null
  first_uploaded: string | null
}

export async function listPlayedMatches(): Promise<PlayedMatchRecord[]> {
  const database = await getCatalogDatabase()
  const result = await database
    .prepare(PLAYED_MATCHES_GROUPED_QUERY)
    .all<PlayedMatchQueryRow>()

  return (result.results ?? []).map(playedMatchQueryRowToRecord)
}

function playedMatchQueryRowToRecord(row: PlayedMatchQueryRow): PlayedMatchRecord {
  return {
    id: row.id,
    playedOn: row.played_on,
    libraryId: row.library_id,
    libraryName: row.library_id === 'others' ? 'Otros' : row.name,
    rivalLabel: row.rival_label,
    homeGoals: finiteGoal(row.home_goals),
    awayGoals: finiteGoal(row.away_goals),
    clipCount: Number(row.clip_count ?? 0),
    firstUploaded: row.first_uploaded,
  }
}

function finiteGoal(value: number | null): number | null {
  if (value == null) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}
