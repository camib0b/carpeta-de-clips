/**
 * Versioned telestration document stored in `clip_drawings.strokes_json`.
 *
 * Version 1 is one red marker layer: freehand strokes in normalized coordinates.
 * x and y are fractions of the video picture (0–1), origin at the top-left,
 * after letterboxing. Stroke color, width, and caps are not stored; the player
 * draws every version-1 stroke as the same round red marker.
 *
 * A later feature (another color, or several layers per coach) must bump
 * `version` and leave version 1 rows untouched. Readers that do not know a
 * version must not write that row back.
 *
 * play id is `clip:{clipId}:play:{ord}`. `ord` matches `clip_instances.ord`.
 * A clip with no instances uses ord 0 for the whole file. That ord is not a
 * foreign key: `clip_instances` is keyed by (clip_id, ord), not a single id.
 */

export const DRAWING_DOCUMENT_VERSION = 1

/** Clip with no cataloged plays. Not a `clip_instances.ord` (those start at 1). */
export const WHOLE_CLIP_PLAY_ORD = 0

export const MAX_DRAWING_STROKES = 80
export const MAX_POINTS_PER_STROKE = 2000
export const MAX_DRAWING_JSON_LENGTH = 100_000

export interface DrawingPoint {
  x: number
  y: number
}

export interface DrawingStroke {
  points: DrawingPoint[]
}

export interface DrawingDocument {
  version: typeof DRAWING_DOCUMENT_VERSION
  strokes: DrawingStroke[]
}

export type DrawingLoadState =
  | { state: 'ready'; document: DrawingDocument }
  | { state: 'unsupported' }
  | { state: 'unavailable' }

const PLAY_ID_PATTERN = /^clip:([1-9]\d*):play:(0|[1-9]\d*)$/

export function emptyDrawingDocument(): DrawingDocument {
  return { version: DRAWING_DOCUMENT_VERSION, strokes: [] }
}

export function buildPlayId(clipId: string, playOrd: number): string | null {
  if (!/^[1-9]\d*$/.test(clipId)) return null
  if (!Number.isInteger(playOrd) || playOrd < 0 || !Number.isSafeInteger(playOrd)) {
    return null
  }
  return `clip:${clipId}:play:${playOrd}`
}

export function parsePlayId(
  playId: string,
): { clipId: string; playOrd: number } | null {
  const match = PLAY_ID_PATTERN.exec(playId)
  if (!match) return null
  const playOrd = Number(match[2])
  if (!Number.isSafeInteger(playOrd)) return null
  return { clipId: match[1], playOrd }
}

export function parsePlayOrd(raw: string | null | undefined): number | null {
  if (raw == null || !/^(0|[1-9]\d*)$/.test(raw)) return null
  const playOrd = Number(raw)
  if (!Number.isSafeInteger(playOrd)) return null
  return playOrd
}

function isUnitCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

/**
 * Accept only version 1, and return a document that contains just that version's
 * fields. Unknown versions return null so a caller can refuse to overwrite them.
 */
export function parseDrawingDocument(value: unknown): DrawingDocument | null {
  if (!value || typeof value !== 'object') return null
  const record = value as { version?: unknown; strokes?: unknown }
  if (record.version !== DRAWING_DOCUMENT_VERSION) return null
  if (!Array.isArray(record.strokes)) return null
  if (record.strokes.length > MAX_DRAWING_STROKES) return null

  const strokes: DrawingStroke[] = []
  for (const strokeValue of record.strokes) {
    if (!strokeValue || typeof strokeValue !== 'object') return null
    const pointsValue = (strokeValue as { points?: unknown }).points
    if (!Array.isArray(pointsValue) || pointsValue.length === 0) return null
    if (pointsValue.length > MAX_POINTS_PER_STROKE) return null

    const points: DrawingPoint[] = []
    for (const pointValue of pointsValue) {
      if (!pointValue || typeof pointValue !== 'object') return null
      const point = pointValue as { x?: unknown; y?: unknown }
      if (!isUnitCoordinate(point.x) || !isUnitCoordinate(point.y)) return null
      points.push({ x: point.x, y: point.y })
    }
    strokes.push({ points })
  }

  return { version: DRAWING_DOCUMENT_VERSION, strokes }
}

/**
 * The drawings API returns the rows `getDrawings` already filtered for the viewer.
 * This client paints and edits the first version-1 document. When shared drawings
 * are added, they can follow that row; a document this client cannot edit locks
 * the pen instead of being saved back as version 1.
 */
export function readDrawingResponse(value: unknown): DrawingLoadState {
  if (!value || typeof value !== 'object') return { state: 'unavailable' }
  const drawings = (value as { drawings?: unknown }).drawings
  if (!Array.isArray(drawings)) return { state: 'unavailable' }
  if (drawings.length === 0) {
    return { state: 'ready', document: emptyDrawingDocument() }
  }

  for (const entry of drawings) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as { editable?: unknown; strokes?: unknown }
    if (record.editable === false) continue
    const document = parseDrawingDocument(record.strokes)
    if (document) return { state: 'ready', document }
  }

  return { state: 'unsupported' }
}
