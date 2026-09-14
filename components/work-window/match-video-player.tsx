'use client'

import { useEffect } from 'react'

import type { MatchVideoSource } from '@/lib/match-video-catalog'
import { cn } from '@/lib/utils'

interface MatchVideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  source: MatchVideoSource | null
  className?: string
}

const HLS_MIME = 'application/vnd.apple.mpegurl'

/**
 * Source-agnostic full-match video surface.
 *   - mp4: native `<video src>` (HTTP range seeking).
 *   - hls: native playback on Safari, otherwise hls.js (lazy-loaded, client-only).
 * Renders a placeholder when no source is configured for the match yet.
 */
export function MatchVideoPlayer({
  videoRef,
  source,
  className,
}: MatchVideoPlayerProps) {
  useEffect(() => {
    const video = videoRef.current
    if (!video || !source) {
      return
    }

    if (source.kind === 'mp4') {
      video.src = source.url
      return
    }

    // HLS: prefer native support (Safari) before falling back to hls.js.
    if (video.canPlayType(HLS_MIME)) {
      video.src = source.url
      return
    }

    let destroyed = false
    let hlsInstance: { destroy: () => void } | null = null

    void import('hls.js').then(({ default: Hls }) => {
      if (destroyed) {
        return
      }
      if (!Hls.isSupported()) {
        // Last resort: let the browser try the manifest URL directly.
        video.src = source.url
        return
      }
      const hls = new Hls({ enableWorker: true })
      hlsInstance = hls
      hls.loadSource(source.url)
      hls.attachMedia(video)
    })

    return () => {
      destroyed = true
      if (hlsInstance) {
        hlsInstance.destroy()
      }
    }
  }, [videoRef, source])

  if (!source) {
    return (
      <div
        className={cn(
          'flex aspect-video w-full items-center justify-center bg-black text-center text-sm text-white/70',
          className,
        )}
      >
        <p className="max-w-xs px-6">
          El video completo del partido aún no está disponible.
        </p>
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      className={cn('aspect-video w-full bg-black', className)}
      playsInline
      preload="metadata"
    />
  )
}
