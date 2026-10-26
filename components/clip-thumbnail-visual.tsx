'use client'

import { useMemo, useState } from 'react'
import {
  CLIP_VIDEO_POSTER_MEDIA_FRAGMENT,
  clipVideoPosterUrl,
  isRealYouTubeVideoId,
  resolveClipThumbnail,
  youtubeThumbnailUrl,
  type ClipThumbnailInput,
} from '@/lib/clip-thumbnail'
import { cn } from '@/lib/utils'

type ClipThumbnailVisualProps = ClipThumbnailInput & {
  alt: string
  className?: string
}

function NeutralClipThumbnail({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-muted text-muted-foreground/40',
        className,
      )}
      aria-hidden="true"
    >
      <svg
        className="h-10 w-10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M10 9.5v5l4.5-2.5L10 9.5z" fill="currentColor" stroke="none" />
      </svg>
    </div>
  )
}

type ThumbnailStage = 'resolved' | 'video-retry' | 'youtube-retry' | 'neutral'

const videoPosterClassName =
  'landing-match-poster pointer-events-none h-full w-full object-cover'

/**
 * Library card poster: JPEG thumb → R2 video frame → YouTube → neutral.
 * Failed loads step down without changing layout (fixed aspect-video parent).
 */
export function ClipThumbnailVisual({
  alt,
  className,
  youtubeId,
  thumbKey,
  r2Key,
  r2KeyLow,
  visibility,
}: ClipThumbnailVisualProps) {
  const clipInput = useMemo(
    () => ({ youtubeId, thumbKey, r2Key, r2KeyLow, visibility }),
    [r2Key, r2KeyLow, thumbKey, visibility, youtubeId],
  )
  const resolved = useMemo(() => resolveClipThumbnail(clipInput), [clipInput])
  const videoPosterUrl = useMemo(
    () => clipVideoPosterUrl(clipInput),
    [clipInput],
  )
  const [stage, setStage] = useState<ThumbnailStage>('resolved')

  const showVideoPoster =
    (stage === 'resolved' && resolved.source === 'video-poster') ||
    stage === 'video-retry'

  const displayImageUrl = useMemo(() => {
    if (stage === 'neutral' || showVideoPoster) {
      return null
    }
    if (stage === 'youtube-retry' && isRealYouTubeVideoId(youtubeId)) {
      return youtubeThumbnailUrl(youtubeId)
    }
    if (
      resolved.source === 'self-hosted' ||
      resolved.source === 'youtube'
    ) {
      return resolved.url
    }
    return null
  }, [resolved.source, resolved.url, showVideoPoster, stage, youtubeId])

  const stepDownFromImageError = () => {
    setStage((current) => {
      if (current === 'resolved' && resolved.source === 'self-hosted') {
        if (videoPosterUrl != null) {
          return 'video-retry'
        }
        if (isRealYouTubeVideoId(youtubeId)) {
          return 'youtube-retry'
        }
        return 'neutral'
      }
      if (current === 'youtube-retry' || current === 'resolved') {
        return 'neutral'
      }
      return 'neutral'
    })
  }

  const stepDownFromVideoError = () => {
    setStage((current) => {
      if (
        (current === 'resolved' || current === 'video-retry') &&
        isRealYouTubeVideoId(youtubeId)
      ) {
        return 'youtube-retry'
      }
      return 'neutral'
    })
  }

  if (showVideoPoster && videoPosterUrl != null) {
    return (
      <video
        className={cn(videoPosterClassName, className)}
        src={`${videoPosterUrl}${CLIP_VIDEO_POSTER_MEDIA_FRAGMENT}`}
        muted
        playsInline
        preload="metadata"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        loading="lazy"
        aria-hidden="true"
        tabIndex={-1}
        onError={stepDownFromVideoError}
      />
    )
  }

  if (displayImageUrl == null) {
    return <NeutralClipThumbnail className={className} />
  }

  return (
    <img
      src={displayImageUrl}
      alt={alt}
      className={cn(
        'h-full w-full object-cover transition-opacity duration-200',
        className,
      )}
      onError={stepDownFromImageError}
      loading="lazy"
      decoding="async"
    />
  )
}
