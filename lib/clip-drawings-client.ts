import {
  MAX_DRAWING_JSON_LENGTH,
  readDrawingResponse,
  type DrawingDocument,
  type DrawingLoadState,
} from '@/lib/clip-drawing-document'

/**
 * Browser calls for telestration. This talks to the drawings route only.
 * Components must not import `lib/clip-drawings.ts` or touch D1.
 */

export class DrawingSaveRejectedError extends Error {
  constructor() {
    super('Drawing save was rejected')
    this.name = 'DrawingSaveRejectedError'
  }
}

function drawingPath(clipId: string, playOrd: number): string {
  return `/api/clips/${encodeURIComponent(clipId)}/drawings/${encodeURIComponent(String(playOrd))}`
}

function clipDrawingsPath(clipId: string): string {
  return `/api/clips/${encodeURIComponent(clipId)}/drawings`
}

export async function fetchClipDrawingPlayOrds(
  clipId: string,
  signal?: AbortSignal,
): Promise<number[] | null> {
  let response: Response
  try {
    response = await fetch(clipDrawingsPath(clipId), {
      method: 'GET',
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    return null
  }

  if (!response.ok) return null

  try {
    const body = (await response.json()) as { playOrds?: unknown }
    if (!Array.isArray(body.playOrds)) return null
    const playOrds: number[] = []
    for (const value of body.playOrds) {
      if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
        playOrds.push(value)
      }
    }
    return playOrds
  } catch (error) {
    if (isAbortError(error)) throw error
    return null
  }
}

export async function fetchPlayDrawing(
  clipId: string,
  playOrd: number,
  signal?: AbortSignal,
): Promise<DrawingLoadState | { state: 'missing' }> {
  let response: Response
  try {
    response = await fetch(drawingPath(clipId, playOrd), {
      method: 'GET',
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    return { state: 'unavailable' }
  }

  if (response.status === 404) return { state: 'missing' }
  if (!response.ok) return { state: 'unavailable' }

  try {
    return readDrawingResponse(await response.json())
  } catch (error) {
    if (isAbortError(error)) throw error
    return { state: 'unavailable' }
  }
}

export async function savePlayDrawing(
  clipId: string,
  playOrd: number,
  document: DrawingDocument,
): Promise<void> {
  const body = JSON.stringify(document)
  if (body.length > MAX_DRAWING_JSON_LENGTH) {
    throw new DrawingSaveRejectedError()
  }

  const response = await fetch(drawingPath(clipId, playOrd), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: body.length < 60_000,
  })

  if (
    response.status === 400 ||
    response.status === 404 ||
    response.status === 409 ||
    response.status === 413
  ) {
    throw new DrawingSaveRejectedError()
  }

  if (!response.ok) {
    throw new Error(`Drawing save failed (${response.status})`)
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
