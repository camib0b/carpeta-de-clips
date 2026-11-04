/**
 * Display-only labels for catalog libraries. Stored ids and names stay unchanged.
 * A folder named "Otros - …" shows the tournament name after the dash.
 * The bare `others` library has no tournament name in the catalog, so it
 * keeps a marked placeholder until that name exists.
 */
export const FEHOCH_TOURNAMENT_NAME_PLACEHOLDER =
  'Torneo FEHOCH (nombre pendiente)'

const OTHERS_DASH_PREFIX = /^otros\s*-\s+(.+)$/i
const OTHERS_NAME = /^otros$/i

export function landingFolderUsesFehochMark(team: {
  id: string
  name: string
}): boolean {
  const name = team.name.trim()
  return (
    team.id === 'others' || OTHERS_NAME.test(name) || OTHERS_DASH_PREFIX.test(name)
  )
}

export function landingTeamRowLabel(team: { id: string; name: string }): string {
  const name = team.name.trim()
  const tournamentName = OTHERS_DASH_PREFIX.exec(name)?.[1]?.trim()
  if (tournamentName) {
    return tournamentName
  }
  if (team.id === 'others' || OTHERS_NAME.test(name)) {
    return FEHOCH_TOURNAMENT_NAME_PLACEHOLDER
  }
  return team.name
}
