import { NextResponse } from 'next/server'

import { parseClipId } from '@/lib/library-filters/clip-params'
import {
  DrawingPlayNotFoundError,
  DrawingStoreUnavailableError,
  listPlayOrdsWithDrawings,
  resolveAuthor,
} from '@/lib/clip-drawings'

export const dynamic = 'force-dynamic'

interface ClipDrawingsListRouteContext {
  params: Promise<{ clipId: string }>
}

const NO_STORE = { 'Cache-Control': 'no-store' }

function drawingErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof DrawingPlayNotFoundError) {
    return NextResponse.json({ error: 'Clip not found' }, { status: 404, headers: NO_STORE })
  }
  if (error instanceof DrawingStoreUnavailableError) {
    return NextResponse.json(
      { error: 'Drawings are not available' },
      { status: 503, headers: NO_STORE },
    )
  }
  return null
}

export async function GET(request: Request, context: ClipDrawingsListRouteContext) {
  const { clipId } = await context.params
  if (!parseClipId(clipId)) {
    return NextResponse.json({ error: 'Invalid clip' }, { status: 400, headers: NO_STORE })
  }

  try {
    const viewer = await resolveAuthor(request)
    const playOrds = await listPlayOrdsWithDrawings(clipId, viewer)
    return NextResponse.json({ playOrds }, { headers: NO_STORE })
  } catch (error) {
    const response = drawingErrorResponse(error)
    if (response) return response
    throw error
  }
}
