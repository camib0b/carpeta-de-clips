/**
 * Pick the sharpest playback quality YouTube reports for a clip.
 * Levels arrive unordered, and "auto" / "default" are not concrete sizes.
 */

const KNOWN_PLAYBACK_QUALITY_RANK = new Map<string, number>([
  ['highres', 0],
  ['hd2160', 1],
  ['hd1440', 2],
  ['hd1080', 3],
  ['hd720', 4],
  ['large', 5],
  ['medium', 6],
  ['small', 7],
  ['tiny', 8],
])

function playbackQualityRank(level: string): number | null {
  const knownRank = KNOWN_PLAYBACK_QUALITY_RANK.get(level)
  if (knownRank != null) {
    return knownRank
  }

  const pixelMatch = /^hd(\d+)$/.exec(level)
  if (!pixelMatch) {
    return null
  }

  const pixels = Number(pixelMatch[1])
  if (!Number.isFinite(pixels)) {
    return null
  }

  return 1 - pixels / 1000
}

export function highestAvailablePlaybackQuality(
  qualityLevels: readonly string[],
): string | null {
  let highestLevel: string | null = null
  let highestRank = Number.POSITIVE_INFINITY

  for (const level of qualityLevels) {
    const rank = playbackQualityRank(level)
    if (rank == null || rank >= highestRank) {
      continue
    }
    highestLevel = level
    highestRank = rank
  }

  return highestLevel
}
