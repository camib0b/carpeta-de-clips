/** Canonical display abbreviations for full team names used in match metadata. */
const TEAM_ABBREVIATIONS: Record<string, string> = {
  'UC Primera B': 'UCB',
  'UC Primera A': 'UCA',
  'UC Sub-16 A': 'UC16',
  Manquehue: 'MQA',
  'Old Reds': 'OR',
  'Old Girls': 'OGI',
  'Old Gabs': 'OGA',
  COGS: 'COGS',
  PWCC: 'PWCC',
}

export function getTeamAbbreviation(teamName: string): string {
  return TEAM_ABBREVIATIONS[teamName] ?? teamName
}
