import type { ClipInstance } from '@/lib/types'

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
