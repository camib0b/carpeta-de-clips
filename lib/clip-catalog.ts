/**
 * Team-library catalog API.
 *
 * Clip rows live in D1 (`carpeta-de-clips`, binding `DB`). This module re-exports
 * the request-time readers used by home and team pages.
 */
export {
  getMatchXmlObjectKey,
  getTeamBySlug,
  getTeamLibraryClips,
  hasMatchXmlR2ObjectOverride,
  listRivalsFromClips,
  listTeamLibraries,
  listTeamLibrariesWithClipCounts,
  listTeamLibraryRivals,
} from './catalog'

export type { TeamLibraryWithClipCount } from './catalog'
