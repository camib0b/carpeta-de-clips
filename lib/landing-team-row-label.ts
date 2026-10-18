/** Display-only labels for catalog libraries; DB/slug names stay unchanged. */
export function landingTeamRowLabel(team: { id: string; name: string }): string {
  if (team.id === 'others') {
    return 'Otros - Torneo Primera A'
  }
  return team.name
}
