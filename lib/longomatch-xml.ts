import { XMLParser } from 'fast-xml-parser'

/**
 * Parses LongoMatch-compatible match XML (the `<ALL_INSTANCES>` + `<ROWS>` format produced
 * by the AVA desktop exporter) into typed events plus a per-code color palette.
 *
 * This mirrors the desktop `XmlImporter`/`XmlExporter` contract:
 *   - `<start>`/`<end>` are seconds on the full-match footage timeline (converted to ms here).
 *   - `<ROWS>` carries a 16-bit (0..65535) RGB palette keyed by `<code>`; we convert each
 *     channel back to 8-bit (divide by 257) for CSS.
 */

const QUARTOS_LABEL_GROUP = 'QUARTOS'

export interface MatchEvent {
  /** XML `<ID>` (stable within a file; used as a secondary sort key and React key). */
  id: number
  /** Clip interval start, in milliseconds on the full-match video timeline. */
  startMs: number
  /** Clip interval end, in milliseconds on the full-match video timeline. */
  endMs: number
  /** Raw `<code>`, e.g. `OGA PC+`, `OR ENTRY-`, `Q1`, `Inicio`. */
  code: string
  /** Period label sourced from a `QUARTOS` `<label>` (e.g. `Q1`); undefined when absent. */
  period?: string
}

/** 8-bit RGB channels (0..255) derived from the 16-bit palette in `<ROWS>`. */
export interface CodeColor {
  r: number
  g: number
  b: number
}

export interface ParsedMatchXml {
  events: MatchEvent[]
  palette: Record<string, CodeColor>
}

interface RawLabel {
  group?: unknown
  text?: unknown
}

interface RawInstance {
  ID?: unknown
  start?: unknown
  end?: unknown
  code?: unknown
  label?: RawLabel[]
}

interface RawRow {
  code?: unknown
  R?: unknown
  G?: unknown
  B?: unknown
}

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: true,
  trimValues: true,
  // Force these repeatable elements to always be arrays so single-child files parse uniformly.
  isArray: (name) => name === 'instance' || name === 'label' || name === 'row',
})

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toText(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

function secondsToMs(value: unknown): number | null {
  const seconds = toNumber(value)
  if (seconds === null || seconds < 0) {
    return null
  }
  return Math.round(seconds * 1000)
}

/** Converts a 16-bit channel (0..65535) to 8-bit (0..255), clamped. */
function sixteenBitToEightBit(value: unknown): number {
  const numeric = toNumber(value)
  if (numeric === null) {
    return 0
  }
  const eightBit = Math.round(numeric / 257)
  return Math.min(255, Math.max(0, eightBit))
}

function periodFromLabels(labels: RawLabel[] | undefined): string | undefined {
  if (!labels) {
    return undefined
  }
  for (const label of labels) {
    if (toText(label.group) === QUARTOS_LABEL_GROUP) {
      const text = toText(label.text)
      if (text.length > 0) {
        return text
      }
    }
  }
  return undefined
}

function parseInstances(rawInstances: RawInstance[]): MatchEvent[] {
  const events: MatchEvent[] = []

  for (const raw of rawInstances) {
    const code = toText(raw.code)
    const startMs = secondsToMs(raw.start)
    const endMs = secondsToMs(raw.end)

    // Skip malformed instances rather than failing the whole match (read-only display).
    if (code.length === 0 || startMs === null || endMs === null || endMs < startMs) {
      continue
    }

    const id = toNumber(raw.ID)
    events.push({
      id: id === null ? events.length + 1 : id,
      startMs,
      endMs,
      code,
      period: periodFromLabels(raw.label),
    })
  }

  events.sort((a, b) => {
    if (a.startMs !== b.startMs) {
      return a.startMs - b.startMs
    }
    return a.id - b.id
  })

  return events
}

function parsePalette(rawRows: RawRow[] | undefined): Record<string, CodeColor> {
  const palette: Record<string, CodeColor> = {}
  if (!rawRows) {
    return palette
  }

  for (const row of rawRows) {
    const code = toText(row.code)
    if (code.length === 0) {
      continue
    }
    palette[code] = {
      r: sixteenBitToEightBit(row.R),
      g: sixteenBitToEightBit(row.G),
      b: sixteenBitToEightBit(row.B),
    }
  }

  return palette
}

/**
 * Parses match XML text into events + palette. Returns empty collections (never throws) when
 * the document is missing the expected structure, so callers can render gracefully.
 */
export function parseMatchXml(xmlText: string): ParsedMatchXml {
  if (!xmlText || xmlText.trim().length === 0) {
    return { events: [], palette: {} }
  }

  let parsed: { file?: { ALL_INSTANCES?: { instance?: RawInstance[] }; ROWS?: { row?: RawRow[] } } }
  try {
    parsed = parser.parse(xmlText)
  } catch {
    return { events: [], palette: {} }
  }

  const rawInstances = parsed?.file?.ALL_INSTANCES?.instance ?? []
  const rawRows = parsed?.file?.ROWS?.row

  return {
    events: parseInstances(rawInstances),
    palette: parsePalette(rawRows),
  }
}
