/**
 * Time formatting helpers for the Work Window timeline and event log.
 * All inputs are milliseconds on the full-match video timeline.
 */

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/**
 * Formats a millisecond position as `m:ss` (under an hour) or `h:mm:ss` (an hour or more).
 * Negative or non-finite inputs are clamped to 0.
 */
export function formatTimecode(positionMs: number): string {
  const safeMs = Number.isFinite(positionMs) && positionMs > 0 ? positionMs : 0
  const totalSeconds = Math.floor(safeMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`
  }

  return `${minutes}:${pad(seconds)}`
}

/**
 * Formats a `position / duration` pair, e.g. `1:23 / 45:00`.
 */
export function formatPositionOverDuration(
  positionMs: number,
  durationMs: number,
): string {
  return `${formatTimecode(positionMs)} / ${formatTimecode(durationMs)}`
}

/**
 * Parses a user-entered timecode (`ss`, `m:ss`, or `h:mm:ss`) into milliseconds.
 * Returns null when the input cannot be parsed.
 */
export function parseTimecodeToMs(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return null
  }

  const segments = trimmed.split(':')
  if (segments.length > 3) {
    return null
  }

  let totalSeconds = 0
  for (const segment of segments) {
    if (!/^\d+(\.\d+)?$/.test(segment.trim())) {
      return null
    }
    totalSeconds = totalSeconds * 60 + Number(segment)
  }

  return Math.round(totalSeconds * 1000)
}
