const TEAM_ICON_PATHS: Record<string, string> = {
  'uc-sub-16-a': '/teams/uc-sub-16-a.png',
  'uc-primera-a': '/teams/uc-primera-a.png',
  'uc-primera-b': '/teams/uc-primera-b.png',
}

const PLACEHOLDER_ICON = '/teams/team-placeholder.svg'

export function getTeamIconPath(slug: string): string {
  return TEAM_ICON_PATHS[slug] ?? PLACEHOLDER_ICON
}
