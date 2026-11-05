/**
 * Display-only labels for catalog libraries. Stored ids and names stay unchanged.
 * The two Otros folders are separate FEHOCH tournaments.
 */
const FEHOCH_TOURNAMENT_LABELS: ReadonlyArray<{ source: string; label: string }> = [
  { source: 'otros - torneo sub-16 a', label: 'Torneo Nacional Sub-16' },
  { source: 'otros - torneo primera a', label: 'Torneo Nacional Primera A' },
]

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

export function landingFolderUsesFehochMark(team: {
  id: string
  name: string
}): boolean {
  return fehochTournamentLabel(team.name) != null
}

export function landingTeamRowLabel(team: { id: string; name: string }): string {
  return fehochTournamentLabel(team.name) ?? team.name
}
