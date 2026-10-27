'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  CLIP_CARD_THUMB_HEIGHT,
  CLIP_CARD_THUMB_SIZES,
  CLIP_CARD_THUMB_WIDTH,
  isRealYouTubeVideoId,
  resolveClipThumbnail,
  selfHostedThumbnailImage,
  youtubeThumbnailUrl,
  type ClipThumbnailInput,
} from '@/lib/clip-thumbnail'
import { cn } from '@/lib/utils'

type ClipThumbnailVisualProps = ClipThumbnailInput & {
  alt: string
  className?: string
  loading?: 'eager' | 'lazy'
  fetchPriority?: 'high' | 'low' | 'auto'
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

type ThumbnailStage = 'resolved' | 'youtube-retry' | 'neutral'

/**
 * Library card poster: thumb_key → YouTube mqdefault → neutral placeholder.
 * Failed image loads step down without changing layout (fixed aspect-video parent).
 */
export function ClipThumbnailVisual({
  alt,
  className,
  youtubeId,
  thumbKey,
  visibility,
  loading = 'lazy',
  fetchPriority,
}: ClipThumbnailVisualProps) {
  const clipInput = useMemo(
    () => ({ youtubeId, thumbKey, visibility }),
    [thumbKey, visibility, youtubeId],
  )
  const resolved = useMemo(() => resolveClipThumbnail(clipInput), [clipInput])
  const selfHosted = useMemo(
    () =>
      clipInput.visibility === 'restricted'
        ? null
        : selfHostedThumbnailImage(thumbKey),
    [clipInput.visibility, thumbKey],
  )
  const [stage, setStage] = useState<ThumbnailStage>('resolved')
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const loadedSrcRef = useRef<string | null>(null)

  const youtubeUrl =
    isRealYouTubeVideoId(youtubeId) ? youtubeThumbnailUrl(youtubeId) : null

  const showSelfHosted =
    stage === 'resolved' && resolved.source === 'self-hosted' && selfHosted != null

  const showYoutube =
    (stage === 'resolved' && resolved.source === 'youtube' && youtubeUrl != null) ||
    (stage === 'youtube-retry' && youtubeUrl != null)

  const stepDownFromImageError = () => {
    setStage((current) => {
      if (current === 'resolved' && resolved.source === 'self-hosted') {
        if (youtubeUrl != null) {
          return 'youtube-retry'
        }
        return 'neutral'
      }
      return 'neutral'
    })
  }

  const currentSrc =
    showSelfHosted && selfHosted != null
      ? selfHosted.src
      : showYoutube && youtubeUrl != null
        ? youtubeUrl
        : null
  if (loadedSrcRef.current !== currentSrc) {
    loadedSrcRef.current = currentSrc
    if (loadedSrc != null) {
      setLoadedSrc(null)
    }
  }
  const imageIsLoaded = currentSrc != null && loadedSrc === currentSrc
  const currentSrcRef = useRef(currentSrc)
  currentSrcRef.current = currentSrc

  const markImageLoaded = useCallback((image: HTMLImageElement) => {
    const source = image.currentSrc || image.src
    if (source.length === 0 || image.dataset.thumbSrc !== currentSrcRef.current) {
      return
    }
    setLoadedSrc(currentSrcRef.current)
  }, [])

  const assignThumbnail = useCallback(
    (image: HTMLImageElement | null) => {
      if (image != null && image.complete && image.naturalWidth > 0) {
        markImageLoaded(image)
      }
    },
    [markImageLoaded],
  )

  const imageClassName = cn(
    'h-full w-full object-cover transition-opacity duration-200 ease-out-strong',
    imageIsLoaded ? cn('opacity-100', className) : 'opacity-0',
  )

  if (showSelfHosted && selfHosted != null) {
    return (
      <img
        src={selfHosted.src}
        srcSet={selfHosted.srcSet}
        sizes={selfHosted.srcSet ? CLIP_CARD_THUMB_SIZES : undefined}
        width={selfHosted.width}
        height={selfHosted.height}
        alt={alt}
        data-thumb-src={selfHosted.src}
        className={imageClassName}
        ref={assignThumbnail}
        onLoad={(event) => {
          markImageLoaded(event.currentTarget)
        }}
        onError={stepDownFromImageError}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
      />
    )
  }

  if (showYoutube && youtubeUrl != null) {
    return (
      <img
        src={youtubeUrl}
        width={CLIP_CARD_THUMB_WIDTH}
        height={CLIP_CARD_THUMB_HEIGHT}
        alt={alt}
        data-thumb-src={youtubeUrl}
        className={imageClassName}
        ref={assignThumbnail}
        onLoad={(event) => {
          markImageLoaded(event.currentTarget)
        }}
        onError={() => setStage('neutral')}
        loading={loading}
        decoding="async"
        fetchPriority={fetchPriority}
      />
    )
  }

  return <NeutralClipThumbnail className={className} />
}
