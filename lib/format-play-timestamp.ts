/** Format seconds as m:ss for jugada timestamps (floor to whole seconds). */
export function formatPlayTimestamp(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
