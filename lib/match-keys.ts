import type { VideoClip } from '@/lib/types'

const WHITESPACE_RUN = /\s+/g
const UNSAFE_STORAGE_SLUG_CHARACTERS = /[^a-zA-Z0-9._-]/g

/**
 * Stable identifier for a match (one XML file per key).
 * Shape: date|homeTeam|awayTeam|rivalTeam[|libraryName]
 * This is also D1 `matches.id` after slugification (`matchKeyToStorageSlug`).
 */
export function buildMatchKeyFromClip(clip: VideoClip): string {
  const parts = [clip.date, clip.homeTeam, clip.awayTeam, clip.rivalTeam]

  if (clip.libraryName) {
    parts.push(clip.libraryName)
  }

  return parts.join('|')
}

/**
 * Filesystem-safe slug for public/match-xml/{slug}.xml
 */
export function matchKeyToStorageSlug(matchKey: string): string {
  return matchKey
    .split('|')
    .map((segment) =>
      segment
        .trim()
        .replace(WHITESPACE_RUN, '_')
        .replace(UNSAFE_STORAGE_SLUG_CHARACTERS, '')
    )
    .filter(Boolean)
    .join('--')
}

export function storageSlugFromClip(clip: VideoClip): string {
  return matchKeyToStorageSlug(buildMatchKeyFromClip(clip))
}

const STORAGE_SLUG_PATTERN = /^[a-zA-Z0-9._-]+$/

export function isValidMatchXmlStorageSlug(slug: string): boolean {
  return STORAGE_SLUG_PATTERN.test(slug) && slug.length > 0 && slug.length <= 256
}
