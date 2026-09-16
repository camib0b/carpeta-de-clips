import { NextResponse } from 'next/server'

import { isValidMatchXmlStorageSlug } from '@/lib/match-keys'
import { readMatchXmlBytes } from '@/lib/match-xml.server'

interface MatchXmlRouteContext {
  params: Promise<{ storageSlug: string }>
}

function sanitizeDownloadFilename(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim().replace(/[/\\]/g, '-')
  if (!trimmed.endsWith('.xml')) {
    return null
  }
  if (trimmed.length > 200 || !/^[\w\s().áéíóúÁÉÍÓÚñÑ,-]+\.xml$/u.test(trimmed)) {
    return null
  }
  return trimmed
}

export async function GET(request: Request, context: MatchXmlRouteContext) {
  const { storageSlug } = await context.params

  if (!isValidMatchXmlStorageSlug(storageSlug)) {
    return NextResponse.json({ error: 'Invalid match identifier' }, { status: 400 })
  }

  const xmlBytes = await readMatchXmlBytes(storageSlug)
  if (!xmlBytes) {
    return NextResponse.json({ error: 'Match XML not found' }, { status: 404 })
  }

  const requestedName = sanitizeDownloadFilename(
    new URL(request.url).searchParams.get('filename'),
  )
  const downloadName = requestedName ?? `${storageSlug}.xml`

  return new NextResponse(new Uint8Array(xmlBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${downloadName}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
