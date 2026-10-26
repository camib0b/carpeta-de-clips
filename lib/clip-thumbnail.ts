import { publicMediaObjectUrl } from '@/lib/media-url'
import type { ClipVisibility } from '@/lib/types'

/** Standard YouTube poster size used on library cards before self-hosted thumbs exist. */
const YOUTUBE_MQDEFAULT = 'https://img.youtube.com/vi'

/** Layout dimensions for 16:9 card posters (match generated assets). */
export const CLIP_CARD_THUMB_WIDTH = 480
export const CLIP_CARD_THUMB_HEIGHT = 270
export const CLIP_CARD_THUMB_WIDTH_2X = 640
export const CLIP_CARD_THUMB_HEIGHT_2X = 360

/** Grid cards are ~360 CSS px wide on desktop; cap decoded size for srcset. */
export const CLIP_CARD_THUMB_SIZES =
  '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px'

export type ClipThumbnailInput = {
  youtubeId: string
  thumbKey?: string | null
  visibility?: ClipVisibility | string | null
}

export type ClipThumbnailSource = 'self-hosted' | 'youtube' | 'fallback'

export type ResolvedClipThumbnail = {
  source: ClipThumbnailSource
  /** Absent when `source` is `fallback`. */
  url: string | null
}

export type SelfHostedThumbnailImage = {
  src: string
  srcSet?: string
  width: number
  height: number
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

/**
 * True for canonical YouTube video ids (11 characters). Placeholder ids such as
 * `pending-2026-10-25-uc-s16a-mq-01` are rejected so cards do not request a
 * broken mqdefault image.
 */
export function isRealYouTubeVideoId(youtubeId: string): boolean {
  const trimmed = youtubeId.trim()
  if (trimmed.toLowerCase().startsWith('pending-')) {
    return false
  }
  return YOUTUBE_VIDEO_ID_PATTERN.test(trimmed)
}

export function youtubeThumbnailUrl(youtubeId: string): string {
  return `${YOUTUBE_MQDEFAULT}/${youtubeId.trim()}/mqdefault.jpg`
}

function clipMayUsePublicMedia(
  visibility: ClipVisibility | string | null | undefined,
): boolean {
  return visibility == null || visibility === '' || visibility === 'public'
}

/**
 * Derive the 640w sibling of a versioned `.480.webp` thumb key stored in D1.
 */
export function thumbKeyForWidth(primaryThumbKey: string, width: 480 | 640): string {
  if (width === 480) {
    return primaryThumbKey
  }
  return primaryThumbKey.replace(/\.480\.webp$/i, '.640.webp')
}

/**
 * Build src/srcSet for self-hosted thumbs. Legacy single `.thumb.jpg` keys stay
 * a one-url image without srcset.
 */
export function selfHostedThumbnailImage(
  thumbKey: string | null | undefined,
): SelfHostedThumbnailImage | null {
  const primaryUrl = publicMediaObjectUrl(thumbKey)
  if (primaryUrl == null || thumbKey == null) {
    return null
  }

  if (/\.480\.webp$/i.test(thumbKey)) {
    const url640 = publicMediaObjectUrl(thumbKeyForWidth(thumbKey, 640))
    if (url640 != null) {
      return {
        src: primaryUrl,
        srcSet: `${primaryUrl} ${CLIP_CARD_THUMB_WIDTH}w, ${url640} ${CLIP_CARD_THUMB_WIDTH_2X}w`,
        width: CLIP_CARD_THUMB_WIDTH,
        height: CLIP_CARD_THUMB_HEIGHT,
      }
    }
  }

  return {
    src: primaryUrl,
    width: CLIP_CARD_THUMB_WIDTH,
    height: CLIP_CARD_THUMB_HEIGHT,
  }
}

/**
 * Resolution order for library card posters: thumb_key WebP/JPEG, YouTube still,
 * then an in-component neutral placeholder (no network request).
 */
export function resolveClipThumbnail(
  clip: ClipThumbnailInput,
): ResolvedClipThumbnail {
  if (clipMayUsePublicMedia(clip.visibility)) {
    const selfHosted = selfHostedThumbnailImage(clip.thumbKey)
    if (selfHosted != null) {
      return { source: 'self-hosted', url: selfHosted.src }
    }
  }

  if (isRealYouTubeVideoId(clip.youtubeId)) {
    return {
      source: 'youtube',
      url: youtubeThumbnailUrl(clip.youtubeId),
    }
  }

  return { source: 'fallback', url: null }
}

/**
 * Base path (no version suffix) for generated thumbs next to the clip MP4.
 */
export function thumbKeyBaseFromR2Key(r2Key: string): string {
  const trimmed = r2Key.trim().replace(/^\/+/, '')
  const withoutVideo = trimmed
    .replace(/\.(\d{3,4}\.)?mp4$/i, '')
    .replace(/\.mp4$/i, '')
  return withoutVideo
}

/**
 * Versioned immutable object key stored in `clips.thumb_key` (480w WebP).
 * Sibling 640w: replace `.480.webp` with `.640.webp`.
 */
export function thumbKeyFromR2KeyAndHash(
  r2Key: string,
  contentHashHex: string,
): string {
  const version = contentHashHex.slice(0, 12)
  return `${thumbKeyBaseFromR2Key(r2Key)}.thumb.${version}.480.webp`
}

/** @deprecated Use {@link thumbKeyFromR2KeyAndHash} after encoding. */
export function thumbKeyFromR2Key(r2Key: string): string {
  return `${thumbKeyBaseFromR2Key(r2Key)}.thumb.jpg`
}
