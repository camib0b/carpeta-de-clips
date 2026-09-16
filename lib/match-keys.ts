import type { VideoClip } from '@/lib/types'

/**
 * Stable identifier for a match (one XML file per key).
 * Shape: date|homeTeam|awayTeam|rivalTeam[|libraryName]
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
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '')
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
