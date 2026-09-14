import type { CodeColor } from '@/lib/longomatch-xml'

/**
 * Interprets LongoMatch `<code>` strings for display in the Work Window event log.
 *
 * Team-affiliated codes look like `"<ABBREV> <EVENT><polarity>"`, e.g. `OGA PC+`, `OR ENTRY-`.
 * Quarter (`Q1..Q4`) and time-control (`Inicio`, `TM`) codes are neutral period/marker events
 * with no team affiliation, matching the desktop exporter's pass-through handling.
 */

const QUARTER_CODES = new Set(['Q1', 'Q2', 'Q3', 'Q4'])
const TIME_CONTROL_CODES = new Set(['Inicio', 'TM'])

const NEUTRAL_FALLBACK_COLOR = 'rgb(120, 120, 120)'

export interface ParsedEventCode {
  raw: string
  /** Q1..Q4 quarter marker. */
  isQuarter: boolean
  /** Inicio / TM (timeout) marker. */
  isTimeControl: boolean
  /** Quarter or time-control marker (no team affiliation). */
  isNeutral: boolean
  /** Team abbreviation prefix (e.g. `OGA`), when present. */
  teamAbbrev?: string
  /** Event token without polarity (e.g. `PC`, `ENTRY`, `75YD`). */
  eventLabel?: string
  /** Trailing `+`/`-` polarity, when present. */
  polarity?: '+' | '-'
}

export function parseEventCode(rawCode: string): ParsedEventCode {
  const raw = rawCode.trim()

  if (QUARTER_CODES.has(raw)) {
    return { raw, isQuarter: true, isTimeControl: false, isNeutral: true }
  }
  if (TIME_CONTROL_CODES.has(raw)) {
    return { raw, isQuarter: false, isTimeControl: true, isNeutral: true }
  }

  const spaceIndex = raw.indexOf(' ')
  if (spaceIndex <= 0) {
    // No team prefix: treat the whole code as a neutral/unknown label.
    return { raw, isQuarter: false, isTimeControl: false, isNeutral: true, eventLabel: raw }
  }

  const teamAbbrev = raw.slice(0, spaceIndex)
  let remainder = raw.slice(spaceIndex + 1).trim()

  let polarity: '+' | '-' | undefined
  const lastChar = remainder.slice(-1)
  if (lastChar === '+' || lastChar === '-') {
    polarity = lastChar
    remainder = remainder.slice(0, -1).trim()
  }

  return {
    raw,
    isQuarter: false,
    isTimeControl: false,
    isNeutral: false,
    teamAbbrev,
    eventLabel: remainder.length > 0 ? remainder : raw,
    polarity,
  }
}

/** CSS color for a code, sourced from the XML `<ROWS>` palette with a neutral fallback. */
export function cssColorForCode(
  code: string,
  palette: Record<string, CodeColor>,
): string {
  const color = palette[code]
  if (!color) {
    return NEUTRAL_FALLBACK_COLOR
  }
  return `rgb(${color.r}, ${color.g}, ${color.b})`
}
