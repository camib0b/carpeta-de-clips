import fs from 'fs'
import path from 'path'

import { getCloudflareContext } from '@opennextjs/cloudflare'

import {
  getMatchXmlR2ObjectKey,
  isMatchXmlCataloged,
} from '@/lib/match-xml-catalog'
import { isValidMatchXmlStorageSlug, storageSlugFromClip } from '@/lib/match-keys'
import type { VideoClip } from '@/lib/types'

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

async function readMatchXmlBytesFromR2(
  storageSlug: string,
): Promise<Buffer | null> {
  const objectKey = getMatchXmlR2ObjectKey(storageSlug)

  try {
    const { env } = await getCloudflareContext({ async: true })
    const bucket = env.CLIPPED_XML
    if (!bucket) {
      return null
    }

    const object = await bucket.get(objectKey)
    if (!object) {
      return null
    }

    const bytes = await object.arrayBuffer()
    return Buffer.from(bytes)
  } catch {
    return null
  }
}

export async function readMatchXmlBytes(
  storageSlug: string,
): Promise<Buffer | null> {
  if (!isValidMatchXmlStorageSlug(storageSlug)) {
    return null
  }

  const fromR2 = await readMatchXmlBytesFromR2(storageSlug)
  if (fromR2) {
    return fromR2
  }

  const filePath = getMatchXmlFilePath(storageSlug)
  if (!filePath) {
    return null
  }

  return fs.readFileSync(filePath)
}

export function isMatchXmlAvailable(storageSlug: string): boolean {
  if (!isValidMatchXmlStorageSlug(storageSlug)) {
    return false
  }

  if (isMatchXmlCataloged(storageSlug)) {
    return true
  }

  return getMatchXmlFilePath(storageSlug) !== null
}

export function getMatchXmlAvailabilityForVideos(
  videos: VideoClip[],
): Record<string, boolean> {
  const slugs = new Set(videos.map((video) => storageSlugFromClip(video)))
  const availability: Record<string, boolean> = {}

  for (const slug of slugs) {
    availability[slug] = isMatchXmlAvailable(slug)
  }

  return availability
}
