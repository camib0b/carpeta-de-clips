import { mediaUrl, publicMediaObjectUrl, type MediaUrlClip } from '@/lib/media-url'
import type { ClipVisibility } from '@/lib/types'

/** Media fragment used with `<video preload="metadata">` to show an early frame. */
export const CLIP_VIDEO_POSTER_MEDIA_FRAGMENT = '#t=0.1'

/** Standard YouTube poster size used on library cards before self-hosted thumbs existed. */
const YOUTUBE_MQDEFAULT = 'https://img.youtube.com/vi'

export type ClipThumbnailInput = {
  youtubeId: string
  thumbKey?: string | null
  r2Key?: string | null
  r2KeyLow?: string | null
  visibility?: ClipVisibility | string | null
}

export type ClipThumbnailSource =
  | 'self-hosted'
  | 'video-poster'
  | 'youtube'
  | 'fallback'

export type ResolvedClipThumbnail = {
  source: ClipThumbnailSource
  /** Absent when `source` is `fallback`. */
  url: string | null
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

function mediaUrlClipFromThumbnailInput(
  clip: ClipThumbnailInput,
): MediaUrlClip {
  return {
    r2Key: clip.r2Key,
    r2KeyLow: clip.r2KeyLow,
    visibility: clip.visibility,
  }
}

/**
 * Public MP4 URL for the metadata-frame poster trick (no time fragment).
 */
export function clipVideoPosterUrl(clip: ClipThumbnailInput): string | null {
  if (!clipMayUsePublicMedia(clip.visibility)) {
    return null
  }
  return mediaUrl(mediaUrlClipFromThumbnailInput(clip))
}

/**
 * Resolution order for library card posters: JPEG thumb_key, R2 video frame,
 * YouTube still, then an in-component neutral placeholder (no network request).
 */
export function resolveClipThumbnail(
  clip: ClipThumbnailInput,
): ResolvedClipThumbnail {
  if (clipMayUsePublicMedia(clip.visibility)) {
    const selfHosted = publicMediaObjectUrl(clip.thumbKey)
    if (selfHosted != null) {
      return { source: 'self-hosted', url: selfHosted }
    }

    const videoPoster = clipVideoPosterUrl(clip)
    if (videoPoster != null) {
      return { source: 'video-poster', url: videoPoster }
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
 * Object key for a generated card thumbnail alongside the clip MP4 in R2.
 * Example: `match/184-salidas.720.mp4` → `match/184-salidas.thumb.jpg`
 */
export function thumbKeyFromR2Key(r2Key: string): string {
  const trimmed = r2Key.trim().replace(/^\/+/, '')
  const withoutVideo = trimmed
    .replace(/\.(\d{3,4}\.)?mp4$/i, '')
    .replace(/\.mp4$/i, '')
  return `${withoutVideo}.thumb.jpg`
}
