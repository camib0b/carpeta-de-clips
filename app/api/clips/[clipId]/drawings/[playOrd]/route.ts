import { NextResponse } from 'next/server'

import {
  MAX_DRAWING_JSON_LENGTH,
  buildPlayId,
  parseDrawingDocument,
  parsePlayOrd,
} from '@/lib/clip-drawing-document'
import { parseClipId } from '@/lib/library-filters/clip-params'
import {
  DrawingPlayNotFoundError,
  DrawingStoreUnavailableError,
  DrawingVersionConflictError,
  getDrawings,
  resolveAuthor,
  saveDrawing,
} from '@/lib/clip-drawings'

export const dynamic = 'force-dynamic'

interface DrawingRouteContext {
  params: Promise<{ clipId: string; playOrd: string }>
}

const NO_STORE = { 'Cache-Control': 'no-store' }

function playIdFromParams(clipId: string, playOrd: string): string | null {
  const parsedClipId = parseClipId(clipId)
  const parsedPlayOrd = parsePlayOrd(playOrd)
  if (!parsedClipId || parsedPlayOrd == null) return null
  return buildPlayId(parsedClipId, parsedPlayOrd)
}

function drawingErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof DrawingPlayNotFoundError) {
    return NextResponse.json({ error: 'Play not found' }, { status: 404, headers: NO_STORE })
  }
  if (error instanceof DrawingVersionConflictError) {
    return NextResponse.json(
      { error: 'Drawing version cannot be edited by this client' },
      { status: 409, headers: NO_STORE },
    )
  }
  if (error instanceof DrawingStoreUnavailableError) {
    return NextResponse.json(
      { error: 'Drawings are not available' },
      { status: 503, headers: NO_STORE },
    )
  }
  return null
}

export async function GET(request: Request, context: DrawingRouteContext) {
  const { clipId, playOrd } = await context.params
  const playId = playIdFromParams(clipId, playOrd)
  if (!playId) {
    return NextResponse.json({ error: 'Invalid play' }, { status: 400, headers: NO_STORE })
  }

  try {
    const viewer = await resolveAuthor(request)
    const drawings = await getDrawings(playId, viewer)
    return NextResponse.json({ drawings }, { headers: NO_STORE })
  } catch (error) {
    const response = drawingErrorResponse(error)
    if (response) return response
    throw error
  }
}

export async function PUT(request: Request, context: DrawingRouteContext) {
  const { clipId, playOrd } = await context.params
  const playId = playIdFromParams(clipId, playOrd)
  if (!playId) {
    return NextResponse.json({ error: 'Invalid play' }, { status: 400, headers: NO_STORE })
  }

  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_DRAWING_JSON_LENGTH) {
    return NextResponse.json({ error: 'Drawing is too large' }, { status: 413, headers: NO_STORE })
  }

  const rawBody = await request.text()
  if (rawBody.length > MAX_DRAWING_JSON_LENGTH) {
    return NextResponse.json({ error: 'Drawing is too large' }, { status: 413, headers: NO_STORE })
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid drawing' }, { status: 400, headers: NO_STORE })
  }

  const document = parseDrawingDocument(parsedBody)
  if (!document) {
    return NextResponse.json({ error: 'Invalid drawing' }, { status: 400, headers: NO_STORE })
  }

  try {
    const author = await resolveAuthor(request)
    const drawing = await saveDrawing(playId, document, author)
    return NextResponse.json({ drawing }, { headers: NO_STORE })
  } catch (error) {
    const response = drawingErrorResponse(error)
    if (response) return response
    throw error
  }
}
