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
  '2026-05-28--Manquehue--UC_Primera_B--Manquehue': {
    objectKey: 'MQA vs UCB.xml',
    downloadFilename: 'MQA vs UCB.xml',
  },
  '2026-05-30--Old_Reds--UC_Primera_B--Old_Reds': {
    objectKey: 'OR vs UCB.xml',
    downloadFilename: 'OR vs UCB.xml',
  },
  // Others — Primera A cross-club matches (R2 clipped-xml)
  '2026-03-21--Manquehue--Old_Reds--Manquehue_vs_Old_Reds--Others': {
    objectKey: 'MA vs Old reds.xml',
    downloadFilename: 'MA vs Old reds.xml',
  },
  '2026-05-16--Manquehue--Old_Girls--Manquehue_vs_Old_Girls--Others': {
    objectKey: 'MQA vs OGI.xml',
    downloadFilename: 'MQA vs OGI.xml',
  },
  '2026-05-16--Old_Gabs--Old_Reds--Old_Gabs_vs_Old_Reds--Others': {
    objectKey: 'OGA vs OR.xml',
    downloadFilename: 'OGA vs OR.xml',
  },
  '2026-04-25--Old_Girls--Old_Reds--Old_Girls_vs_Old_Reds--Others': {
    objectKey: 'Old Girls vs Old Reds.xml',
    downloadFilename: 'Old Girls vs Old Reds.xml',
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
