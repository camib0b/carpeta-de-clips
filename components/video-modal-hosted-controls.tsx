'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize, Minimize, Pause, Play } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatPlayTimestamp } from '@/lib/format-play-timestamp'
import { cn } from '@/lib/utils'

const hostedControlButtonClassName = cn(
  'shrink-0 rounded-full border border-white/15 bg-black/40 text-white/80 shadow-md backdrop-blur-sm',
  'hover:bg-black/55 hover:text-white',
  'focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50',
  'size-10',
)

export function useCoarsePointer() {
  const [coarsePointer, setCoarsePointer] = useState(false)

  useEffect(() => {
    const mediaQueryList = window.matchMedia('(pointer: coarse)')
    const updateCoarsePointer = () => {
      setCoarsePointer(mediaQueryList.matches)
    }
    mediaQueryList.addEventListener('change', updateCoarsePointer)
    updateCoarsePointer()
    return () => mediaQueryList.removeEventListener('change', updateCoarsePointer)
  }, [])

  return coarsePointer
}

interface VideoModalHostedControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  stageRef: React.RefObject<HTMLDivElement | null>
  currentTimeS: number
  durationS: number
  isPlaying: boolean
  onTogglePlayback: () => void
  onSeek: (timeS: number) => void
}

export function VideoModalHostedControls({
  videoRef,
  stageRef,
  currentTimeS,
  durationS,
  isPlaying,
  onTogglePlayback,
  onSeek,
}: VideoModalHostedControlsProps) {
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubTimeS, setScrubTimeS] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const scrubValueRef = useRef(0)

  const safeDurationS = Number.isFinite(durationS) && durationS > 0 ? durationS : 0
  const displayedTimeS = isScrubbing ? scrubTimeS : currentTimeS

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    handleFullscreenChange()
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const commitScrub = useCallback(
    (timeS: number) => {
      const clamped =
        safeDurationS > 0 ? Math.min(safeDurationS, Math.max(0, timeS)) : Math.max(0, timeS)
      onSeek(clamped)
    },
    [onSeek, safeDurationS],
  )

  const handleScrubInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextTimeS = Number.parseFloat(event.target.value)
    if (!Number.isFinite(nextTimeS)) {
      return
    }
    scrubValueRef.current = nextTimeS
    setScrubTimeS(nextTimeS)
    commitScrub(nextTimeS)
  }

  const handleScrubPointerDown = (event: React.PointerEvent<HTMLInputElement>) => {
    event.stopPropagation()
    const nextTimeS = Number.parseFloat(event.currentTarget.value)
    setIsScrubbing(true)
    if (Number.isFinite(nextTimeS)) {
      scrubValueRef.current = nextTimeS
      setScrubTimeS(nextTimeS)
    }
  }

  const handleScrubPointerUp = (event: React.PointerEvent<HTMLInputElement>) => {
    event.stopPropagation()
    setIsScrubbing(false)
    commitScrub(scrubValueRef.current)
  }

  const toggleFullscreen = useCallback(async () => {
    const stage = stageRef.current
    const video = videoRef.current
    if (!stage || !video) {
      return
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    const webkitVideo = video as HTMLVideoElement & {
      webkitEnterFullscreen?: () => void
      webkitDisplayingFullscreen?: boolean
    }
    if (typeof webkitVideo.webkitEnterFullscreen === 'function') {
      webkitVideo.webkitEnterFullscreen()
      return
    }

    await stage.requestFullscreen()
  }, [stageRef, videoRef])

  const handleControlPointerDown = (event: React.PointerEvent) => {
    event.stopPropagation()
  }

  return (
    <>
      {!isPlaying ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          aria-hidden={isPlaying}
        >
          <Button
            type="button"
            variant="secondary"
            size="icon"
            tabIndex={-1}
            aria-label="Reproducir"
            onClick={onTogglePlayback}
            onPointerDown={handleControlPointerDown}
            style={{ pointerEvents: 'auto' }}
            className={cn(
              hostedControlButtonClassName,
              'size-9 bg-black/30 hover:bg-black/45',
            )}
          >
            <Play className="size-4 fill-current" aria-hidden />
          </Button>
        </div>
      ) : null}

      <div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-1 px-2 pb-2 pt-6"
        onPointerDown={handleControlPointerDown}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="flex min-h-10 items-center gap-2 rounded-lg bg-black/45 px-2 py-1.5 backdrop-blur-sm">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            tabIndex={-1}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            onClick={onTogglePlayback}
            className={hostedControlButtonClassName}
          >
            {isPlaying ? (
              <Pause className="size-4" aria-hidden />
            ) : (
              <Play className="size-4 fill-current" aria-hidden />
            )}
          </Button>

          <span className="shrink-0 font-mono text-[0.65rem] tabular-nums text-white/90">
            {formatPlayTimestamp(displayedTimeS)}
            <span className="text-white/50"> / {formatPlayTimestamp(safeDurationS)}</span>
          </span>

          <label className="relative flex min-h-10 min-w-0 flex-1 items-center">
            <span className="sr-only">Posición en el video</span>
            <input
              type="range"
              min={0}
              max={safeDurationS > 0 ? safeDurationS : 1}
              step={0.1}
              value={Math.min(displayedTimeS, safeDurationS > 0 ? safeDurationS : displayedTimeS)}
              disabled={safeDurationS <= 0}
              onChange={handleScrubInput}
              onPointerDown={handleScrubPointerDown}
              onPointerUp={handleScrubPointerUp}
              onPointerCancel={handleScrubPointerUp}
              className="h-1.5 w-full min-w-0 cursor-pointer appearance-none rounded-full bg-white/25 accent-white [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </label>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            tabIndex={-1}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            onClick={() => {
              void toggleFullscreen()
            }}
            className={hostedControlButtonClassName}
          >
            {isFullscreen ? (
              <Minimize className="size-4" aria-hidden />
            ) : (
              <Maximize className="size-4" aria-hidden />
            )}
          </Button>
        </div>
      </div>
    </>
  )
}
