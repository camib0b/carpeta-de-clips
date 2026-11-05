/**
 * Display-only labels for catalog libraries. Stored ids and names stay unchanged.
 * The named Otros folders are FEHOCH tournaments. The library stored as plain
 * "Otros" (`id` / slug `others`) is Torneo Nacional Primera A.
 */
const PRIMERA_A_LABEL = 'Torneo Nacional Primera A'
const PLAIN_OTHERS_NAME = 'otros'
const OTHERS_LIBRARY_ID = 'others'

const FEHOCH_TOURNAMENT_LABELS: ReadonlyArray<{ source: string; label: string }> = [
  { source: 'otros - torneo sub-16 a', label: 'Torneo Nacional Sub-16' },
  { source: 'otros - torneo primera a', label: PRIMERA_A_LABEL },
]

type LandingFolder = {
  id: string
  name: string
  slug?: string
}

function tournamentKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

function fehochTournamentLabel(name: string): string | null {
  const key = tournamentKey(name)
  for (const entry of FEHOCH_TOURNAMENT_LABELS) {
    if (entry.source === key) {
      return entry.label
    }
  }
  return null
}

/** The `others` library whose stored name is exactly "Otros", not a longer title. */
function isPlainOthersLibrary(team: LandingFolder): boolean {
  if (tournamentKey(team.name) !== PLAIN_OTHERS_NAME) {
    return false
  }
  return team.id === OTHERS_LIBRARY_ID || team.slug === OTHERS_LIBRARY_ID
}

function landingFolderDisplayLabel(team: LandingFolder): string | null {
  return fehochTournamentLabel(team.name) ?? (isPlainOthersLibrary(team) ? PRIMERA_A_LABEL : null)
}

export function landingFolderUsesFehochMark(team: LandingFolder): boolean {
  return landingFolderDisplayLabel(team) != null
}

export function landingTeamRowLabel(team: LandingFolder): string {
  return landingFolderDisplayLabel(team) ?? team.name
}
