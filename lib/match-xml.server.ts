import fs from 'fs'
import path from 'path'

import type { VideoClip } from '@/lib/types'
import {
  isValidMatchXmlStorageSlug,
  storageSlugFromClip,
} from '@/lib/match-keys'

const MATCH_XML_DIR = path.join(process.cwd(), 'public', 'match-xml')

export function getMatchXmlFilePath(storageSlug: string): string | null {
  if (!isValidMatchXmlStorageSlug(storageSlug)) {
    return null
  }

  const filePath = path.join(MATCH_XML_DIR, `${storageSlug}.xml`)
  if (!fs.existsSync(filePath)) {
    return null
  }

  return filePath
}

export function readMatchXmlBytes(storageSlug: string): Buffer | null {
  const filePath = getMatchXmlFilePath(storageSlug)
  if (!filePath) {
    return null
  }

  return fs.readFileSync(filePath)
}

export function getMatchXmlAvailabilityForVideos(
  videos: VideoClip[],
): Record<string, boolean> {
  const slugs = new Set(videos.map((video) => storageSlugFromClip(video)))
  const availability: Record<string, boolean> = {}

  for (const slug of slugs) {
    availability[slug] = getMatchXmlFilePath(slug) !== null
  }

  return availability
}
