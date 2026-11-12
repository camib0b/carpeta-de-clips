import { landingFolderUsesFehochMark } from './landing-team-row-label'

/**
 * Club crests keyed by library slug. Tournament folders are not listed here:
 * they share the FEHOCH mark through `landingFolderUsesFehochMark`.
 */
const TEAM_ICON_PATHS: Record<string, string> = {
  'uc-sub-16-a': '/teams/uc-sub-16-a.png',
  'uc-primera-b': '/teams/uc-primera-b.png',
}

export const FEHOCH_ICON_PATH = '/teams/fehoch.webp'

export const PLACEHOLDER_ICON_PATH = '/teams/team-placeholder.svg'

/**
 * Identity every surface must pass. Slug alone is not enough: a FEHOCH
 * tournament folder is recognized by its stored name, or by the `others` id.
 */
export type TeamIconSource = {
  id: string
  name: string
  slug?: string
}

/**
 * The only insignia lookup. A known club crest wins. Otherwise a library that
 * uses the FEHOCH tournament label gets that mark. The generic shield is last,
 * so it cannot replace a tournament folder that has no crest slug.
 */
export function getTeamIconPath(team: TeamIconSource): string {
  const slug = team.slug ?? team.id
  const crest = TEAM_ICON_PATHS[slug]
  if (crest) {
    return crest
  }
  if (landingFolderUsesFehochMark(team)) {
    return FEHOCH_ICON_PATH
  }
  return PLACEHOLDER_ICON_PATH
}
