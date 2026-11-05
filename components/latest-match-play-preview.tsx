'use client'

import { useEffect, useState } from 'react'
import type { YouTubePlayer } from 'react-youtube'

import { ClipThumbnailVisual } from '@/components/clip-thumbnail-visual'
import { resolveClipThumbnail } from '@/lib/clip-thumbnail'
import { homePreviewPlayback } from '@/lib/home-latest-match'
import type { LatestUploadedMatchPreview } from '@/lib/latest-uploaded-match'
import { cn } from '@/lib/utils'

type YouTubePlayerComponent = typeof import('react-youtube').default

const EMPTY_PREVIEW: LatestUploadedMatchPreview = {
  clipId: 'none',
  title: '',
  youtubeId: '',
}

function useYouTubePlayerComponent(shouldLoad: boolean): YouTubePlayerComponent | null {
  const [YouTubePlayer, setYouTubePlayer] = useState<YouTubePlayerComponent | null>(null)

  useEffect(() => {
    if (!shouldLoad || YouTubePlayer != null) {
      return
    }
    let cancelled = false
    void import('react-youtube').then((youTubeModule) => {
      if (!cancelled) {
        setYouTubePlayer(() => youTubeModule.default)
      }
    })
    return () => {
      cancelled = true
    }
  }, [shouldLoad, YouTubePlayer])

  return YouTubePlayer
}

function useAllowsMotionPreview(): boolean {
  const [allowsMotion, setAllowsMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      setAllowsMotion(!mediaQuery.matches)
    }
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return allowsMotion
}

/**
 * Still of the best play. When motion is allowed and the clip has a public
 * R2 file, a muted looping video from media.carpeta.cl covers that still.
 * YouTube is only used when the clip has no R2 file. Reduced motion, a
 * missing public URL, and a playback error stay on the still.
 * The video does not receive clicks. The card link around it is the carpeta page.
 */
export function LatestMatchPlayPreview({
  preview,
}: {
  preview: LatestUploadedMatchPreview | null
}) {
  const clip = preview ?? EMPTY_PREVIEW
  const allowsMotion = useAllowsMotionPreview()
  const playback = homePreviewPlayback(clip, allowsMotion)
  const [hostedFailed, setHostedFailed] = useState(false)
  const [playbackVisible, setPlaybackVisible] = useState(false)
  const hosted = playback.kind === 'hosted' && !hostedFailed ? playback : null
  const youtubeId = playback.kind === 'youtube' ? playback.youtubeId : null
  const YouTubePlayer = useYouTubePlayerComponent(youtubeId != null)
  const still = resolveClipThumbnail(clip)

  useEffect(() => {
    setHostedFailed(false)
    setPlaybackVisible(false)
  }, [clip.clipId])

  return (
    <>
      {still.source === 'fallback' ? (
        <span className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <svg
            className="h-10 w-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M10 9.5v5l4.5-2.5L10 9.5z" fill="currentColor" stroke="none" />
          </svg>
        </span>
      ) : (
        <ClipThumbnailVisual
          youtubeId={clip.youtubeId}
          thumbKey={clip.thumbKey}
          visibility={clip.visibility}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full"
          loading="eager"
          fetchPriority="high"
        />
      )}
      {hosted != null ? (
        <video
          key={hosted.src}
          ref={(node) => {
            if (node) {
              node.muted = true
            }
          }}
          src={hosted.src}
          poster={hosted.poster ?? undefined}
          muted
          playsInline
          loop
          autoPlay
          preload="auto"
          tabIndex={-1}
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-color ease-color',
            playbackVisible ? 'opacity-100' : 'opacity-0',
          )}
          onPlaying={() => {
            setPlaybackVisible(true)
          }}
          onError={() => {
            setHostedFailed(true)
            setPlaybackVisible(false)
          }}
        />
      ) : null}
      {youtubeId != null && YouTubePlayer != null ? (
        <span
          className={cn(
            'pointer-events-none absolute inset-0 transition-opacity duration-color ease-color',
            playbackVisible ? 'opacity-100' : 'opacity-0',
          )}
          aria-hidden="true"
        >
          <YouTubePlayer
            videoId={youtubeId}
            title=""
            className="h-full w-full"
            iframeClassName="pointer-events-none h-full w-full"
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 1,
                mute: 1,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                playsinline: 1,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3,
                loop: 1,
                playlist: youtubeId,
              },
            }}
            onReady={(event) => {
              const player = event.target as YouTubePlayer
              player.getIframe().tabIndex = -1
              player.mute()
              player.playVideo()
            }}
            onPlay={() => {
              setPlaybackVisible(true)
            }}
            onError={() => {
              setPlaybackVisible(false)
            }}
          />
        </span>
      ) : null}
    </>
  )
}
