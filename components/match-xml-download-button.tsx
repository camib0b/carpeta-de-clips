'use client'

import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  getMatchXmlDownloadHref,
  type MatchSummary,
} from '@/lib/match-display'
import { resolveMatchXmlDownloadFilename } from '@/lib/match-xml-catalog'

interface MatchXmlDownloadButtonProps {
  match: MatchSummary
  available: boolean
}

/**
 * Downloads the LongoMatch-style event XML for the filtered match (~200 KB per file).
 */
export function MatchXmlDownloadButton({
  match,
  available,
}: MatchXmlDownloadButtonProps) {
  if (!available) {
    return null
  }

  const downloadFilename = resolveMatchXmlDownloadFilename(match)
  const href = getMatchXmlDownloadHref(match.storageSlug, downloadFilename)

  return (
    <Button variant="outline" size="sm" className="h-7 shrink-0 gap-1.5 text-xs" asChild>
      <a href={href} download={downloadFilename}>
        <Download className="size-3.5" aria-hidden />
        Descargar XML
      </a>
    </Button>
  )
}
