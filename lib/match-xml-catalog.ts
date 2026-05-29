import type { MatchMetadata } from '@/lib/match-display'
import { buildMatchXmlDownloadFilename } from '@/lib/match-display'

/**
 * R2 object keys in the clipped-xml bucket when they differ from
 * public/match-xml/{storageSlug}.xml naming.
 */
export const MATCH_XML_R2_OBJECT_BY_STORAGE_SLUG: Record<
  string,
  { objectKey: string; downloadFilename?: string }
> = {
  '2026-05-16--COGS--UC_Primera_B--COGS': {
    objectKey: 'COGS vs UCB.xml',
    downloadFilename: 'COGS vs UCB.xml',
  },
}

export function getMatchXmlR2ObjectKey(storageSlug: string): string {
  const catalogEntry = MATCH_XML_R2_OBJECT_BY_STORAGE_SLUG[storageSlug]
  if (catalogEntry) {
    return catalogEntry.objectKey
  }

  return `${storageSlug}.xml`
}

export function isMatchXmlCataloged(storageSlug: string): boolean {
  return storageSlug in MATCH_XML_R2_OBJECT_BY_STORAGE_SLUG
}

export function resolveMatchXmlDownloadFilename(match: MatchMetadata): string {
  const override =
    MATCH_XML_R2_OBJECT_BY_STORAGE_SLUG[match.storageSlug]?.downloadFilename

  return override ?? buildMatchXmlDownloadFilename(match)
}
