/**
 * Read-only access to canonical teams and aliases in D1.
 */

export type CatalogTeam = {
  id: string
  canonicalName: string
  club: string | undefined
  shortCode: string | undefined
  homeKit: string | undefined
  awayKit: string | undefined
  kitNote: string | undefined
}

type TeamRow = {
  id: string
  canonical_name: string
  club: string | null
  short_code: string | null
  home_kit: string | null
  away_kit: string | null
  kit_note: string | null
}

export const RESOLVE_TEAM_BY_ALIAS_SQL = `SELECT t.id, t.canonical_name, t.club, t.short_code, t.home_kit, t.away_kit, t.kit_note
  FROM team_aliases a
  JOIN teams t ON t.id = a.team_id
  WHERE a.alias_normalized = ?
  ORDER BY CASE a.confidence WHEN 'high' THEN 0 ELSE 1 END
  LIMIT 1`

export const LIST_TEAMS_WITH_KITS_SQL = `SELECT id, canonical_name, club, short_code, home_kit, away_kit, kit_note
  FROM teams
  ORDER BY canonical_name COLLATE NOCASE`

/** Lowercase, trimmed alias form used for case-insensitive lookup. */
export function normalizeTeamAlias(alias: string): string {
  return alias.trim().toLowerCase()
}

function rowToCatalogTeam(row: TeamRow): CatalogTeam {
  return {
    id: row.id,
    canonicalName: row.canonical_name,
    club: row.club ?? undefined,
    shortCode: row.short_code ?? undefined,
    homeKit: row.home_kit ?? undefined,
    awayKit: row.away_kit ?? undefined,
    kitNote: row.kit_note ?? undefined,
  }
}

export async function resolveTeamByAlias(
  database: D1Database,
  alias: string,
): Promise<CatalogTeam | null> {
  const row = await database
    .prepare(RESOLVE_TEAM_BY_ALIAS_SQL)
    .bind(normalizeTeamAlias(alias))
    .first<TeamRow>()

  return row ? rowToCatalogTeam(row) : null
}

export async function listTeamsWithKits(database: D1Database): Promise<CatalogTeam[]> {
  const { results } = await database.prepare(LIST_TEAMS_WITH_KITS_SQL).all<TeamRow>()
  return (results ?? []).map(rowToCatalogTeam)
}
