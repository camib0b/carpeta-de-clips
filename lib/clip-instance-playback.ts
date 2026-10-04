import type { ClipInstance } from '@/lib/types'

export type PlayStepDirection = 'previous' | 'next'

/** Index of the play whose offset is at or before `currentTimeS`. */
export function findActiveInstanceIndex(
  instances: ClipInstance[],
  currentTimeS: number,
): number {
  let activeIndex = 0
  for (let index = 0; index < instances.length; index += 1) {
    if (instances[index].offsetS <= currentTimeS) {
      activeIndex = index
    } else {
      break
    }
  }
  return activeIndex
}

const SEEK_LEAD_TOLERANCE_S = 0.35

/**
 * True while reported playback is still earlier than this play.
 * A seek to that play has not landed yet, so the selection should stay put.
 */
export function playbackTimeIsBeforePlay(
  instances: ClipInstance[],
  playIndex: number,
  currentTimeS: number,
): boolean {
  const play = instances[playIndex]
  if (!play || !Number.isFinite(currentTimeS)) {
    return false
  }
  return currentTimeS < play.offsetS - SEEK_LEAD_TOLERANCE_S
}

/**
 * Index of the previous or next play inside the open clip.
 * Null at either end: playback does not wrap and does not leave the clip.
 */
export function stepPlayIndex(
  instanceCount: number,
  activeIndex: number,
  direction: PlayStepDirection,
): number | null {
  if (!Number.isInteger(instanceCount) || instanceCount <= 0) {
    return null
  }
  if (
    !Number.isInteger(activeIndex) ||
    activeIndex < 0 ||
    activeIndex >= instanceCount
  ) {
    return null
  }
  if (direction === 'previous') {
    return activeIndex === 0 ? null : activeIndex - 1
  }
  return activeIndex === instanceCount - 1 ? null : activeIndex + 1
}
