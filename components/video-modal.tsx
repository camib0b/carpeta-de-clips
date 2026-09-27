'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react'
import type { ClipInstance, VideoClip } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import YouTube from 'react-youtube'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { findActiveInstanceIndex } from '@/lib/clip-instance-playback'
import { formatPlayTimestamp } from '@/lib/format-play-timestamp'

const MINIMUM_SWIPE_DISTANCE = 60
const SWIPE_HINT_STORAGE_KEY = 'carpeta-de-clips-modal-swipe-hint-seen'
const MINIMUM_HORIZONTAL_TO_VERTICAL_RATIO = 1.25
const INTERACTIVE_TOUCH_TARGET_SELECTOR =
  'button, a, input, textarea, select, [contenteditable="true"], [role="button"]'
const PLAYBACK_POLL_INTERVAL_MS = 250

const YOUTUBE_PLAYER_STATE = {
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
} as const

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

interface YouTubePlayer {
  getPlayerState: () => number
  getCurrentTime: () => number
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
}

interface VideoModalProps {
  video: VideoClip | null
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPlayOrd?: number
  canNavigatePrevious?: boolean
  canNavigateNext?: boolean
  onNavigatePrevious?: () => void
  onNavigateNext?: () => void
}

interface ClipNavButtonProps {
  direction: 'previous' | 'next'
  onClick: () => void
  className?: string
}

function isClipNavTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('[data-clip-nav]'))
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (EDITABLE_TAGS.has(target.tagName)) {
    return true
  }
  return target.isContentEditable
}

function formatMatchSummaryLine(video: VideoClip, formattedDate: string): string {
  const hasScore =
    video.homeGoals !== undefined && video.awayGoals !== undefined
  const matchup = hasScore
    ? `${video.homeTeam} ${video.homeGoals}–${video.awayGoals} ${video.awayTeam}`
    : `${video.homeTeam} – ${video.awayTeam}`
  return `${matchup} · ${formattedDate}`
}

function ClipNavButton({ direction, onClick, className }: ClipNavButtonProps) {
  const isPrevious = direction === 'previous'
  const Icon = isPrevious ? ChevronLeft : ChevronRight
  const label = isPrevious ? 'Clip anterior' : 'Clip siguiente'

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onClick()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter') {
      event.preventDefault()
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      tabIndex={-1}
      data-clip-nav={direction}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={label}
      className={cn(
        'rounded-full border border-white/15 bg-black/40 text-white/80 shadow-md backdrop-blur-sm',
        'hover:bg-black/55 hover:text-white',
        'focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50',
        'size-10 sm:size-11',
        className,
      )}
    >
      <Icon className="size-5 sm:size-6" aria-hidden />
    </Button>
  )
}

function SwipeNavigationHint() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 pb-4 pt-10 md:hidden"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-medium text-white/95 backdrop-blur-sm">
        <MoveHorizontal className="size-4 shrink-0 animate-pulse" aria-hidden />
        <span>Desliza para cambiar de clip</span>
      </div>
    </div>
  )
}

interface JugadasListProps {
  instances: ClipInstance[]
  activeIndex: number
  onSelectPlay: (instance: ClipInstance) => void
  listClassName?: string
}

function JugadasList({
  instances,
  activeIndex,
  onSelectPlay,
  listClassName,
}: JugadasListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const total = instances.length

  useEffect(() => {
    const activeInstance = instances[activeIndex]
    if (!activeInstance) {
      return
    }
    const row = rowRefs.current.get(activeInstance.ord)
    row?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, instances])

  return (
    <div className="mt-3 flex min-h-0 flex-col">
      <h3 className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground md:text-[0.625rem]">
        Jugadas
      </h3>
      <div
        ref={listRef}
        className={cn(
          'mt-1.5 min-h-0 overflow-y-auto overscroll-contain border-t border-border/60',
          listClassName,
        )}
      >
        {instances.map((instance, index) => {
          const isActive = index === activeIndex
          const timestamp = formatPlayTimestamp(instance.offsetS)
          const ariaLabel = `Jugada ${instance.ord} de ${total}, ${timestamp}`

          return (
            <button
              key={instance.ord}
              type="button"
              ref={(element) => {
                if (element) {
                  rowRefs.current.set(instance.ord, element)
                } else {
                  rowRefs.current.delete(instance.ord)
                }
              }}
              onClick={() => onSelectPlay(instance)}
              aria-label={ariaLabel}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'flex w-full items-baseline gap-2 border-b border-border/40 px-0.5 py-2 text-left text-xs tabular-nums transition-colors sm:text-sm md:text-xs',
                'hover:bg-muted/40',
                isActive && 'bg-muted/60',
              )}
            >
              <span className="w-9 shrink-0 text-muted-foreground">
                {instance.ord}/{total}
              </span>
              <span className="w-10 shrink-0 text-foreground">{timestamp}</span>
              {instance.quarter && (
                <span className="w-7 shrink-0 text-muted-foreground">
                  {instance.quarter}
                </span>
              )}
              {instance.scoreLabel && (
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {instance.scoreLabel}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Modal component for playing YouTube videos
 * Desktop: wide layout with video dominant and compact sidebar
 * Mobile: full-width video with overlay navigation controls
 */
export function VideoModal({
  video,
  open,
  onOpenChange,
  initialPlayOrd,
  canNavigatePrevious = false,
  canNavigateNext = false,
  onNavigatePrevious,
  onNavigateNext,
}: VideoModalProps) {
  const isMobile = useIsMobile()
  const showClipNavigation = open && (canNavigatePrevious || canNavigateNext)
  const touchStartPoint = useRef<{ x: number; y: number } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null)
  const pendingInitialPlayOrdRef = useRef<number | undefined>(undefined)
  const [swipeHintDismissed, setSwipeHintDismissed] = useState(true)
  const [playbackTimeS, setPlaybackTimeS] = useState(0)
  const [isPlaybackPolling, setIsPlaybackPolling] = useState(false)
  const [manualActiveIndex, setManualActiveIndex] = useState<number | null>(null)

  const instances = video?.instances ?? []
  const hasInstances = instances.length > 0

  useEffect(() => {
    try {
      setSwipeHintDismissed(localStorage.getItem(SWIPE_HINT_STORAGE_KEY) === '1')
    } catch {
      setSwipeHintDismissed(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      youtubePlayerRef.current = null
      setIsPlaybackPolling(false)
      setPlaybackTimeS(0)
      setManualActiveIndex(null)
    }
  }, [open])

  useEffect(() => {
    youtubePlayerRef.current = null
    setIsPlaybackPolling(false)
    setPlaybackTimeS(0)
    setManualActiveIndex(null)
    pendingInitialPlayOrdRef.current = initialPlayOrd
  }, [video?.id, initialPlayOrd])

  const dismissSwipeHint = useCallback(() => {
    setSwipeHintDismissed(true)
    try {
      localStorage.setItem(SWIPE_HINT_STORAGE_KEY, '1')
    } catch {
      // ignore private browsing / storage errors
    }
  }, [])

  const showSwipeHint =
    isMobile && open && showClipNavigation && !swipeHintDismissed

  const preventCloseOnClipNav = useCallback((event: Event) => {
    if (isClipNavTarget(event.target)) {
      event.preventDefault()
    }
  }, [])

  const seekToPlay = useCallback(
    (instance: ClipInstance, instanceIndex: number) => {
      const player = youtubePlayerRef.current
      if (!player) {
        return
      }
      player.seekTo(instance.offsetS, true)
      player.playVideo()
      setPlaybackTimeS(instance.offsetS)
      setManualActiveIndex(instanceIndex)
      setIsPlaybackPolling(true)
    },
    [],
  )

  const applyInitialPlayOrd = useCallback(() => {
    const ord = pendingInitialPlayOrdRef.current
    if (!ord || instances.length === 0) {
      return
    }

    const index = instances.findIndex((instance) => instance.ord === ord)
    const resolvedIndex = index >= 0 ? index : ord - 1
    const instance = instances[resolvedIndex]
    if (!instance) {
      return
    }

    pendingInitialPlayOrdRef.current = undefined
    seekToPlay(instance, resolvedIndex)
  }, [instances, seekToPlay])

  const handleYouTubeReady = useCallback(
    (event: { target: YouTubePlayer }) => {
      youtubePlayerRef.current = event.target
      applyInitialPlayOrd()
    },
    [applyInitialPlayOrd],
  )

  useEffect(() => {
    if (!open || !youtubePlayerRef.current) {
      return
    }
    applyInitialPlayOrd()
  }, [open, applyInitialPlayOrd])

  const handleYouTubeStateChange = useCallback(
    (event: { data: number }) => {
      const state = event.data
      if (
        state === YOUTUBE_PLAYER_STATE.PLAYING ||
        state === YOUTUBE_PLAYER_STATE.BUFFERING
      ) {
        setIsPlaybackPolling(true)
      } else {
        setIsPlaybackPolling(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!open || !isPlaybackPolling) {
      return
    }

    const intervalId = window.setInterval(() => {
      const player = youtubePlayerRef.current
      if (!player) {
        return
      }
      const currentTime = player.getCurrentTime()
      if (typeof currentTime === 'number' && Number.isFinite(currentTime)) {
        setPlaybackTimeS(currentTime)
        setManualActiveIndex(null)
      }
    }, PLAYBACK_POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [open, isPlaybackPolling, video?.id])

  const computedActiveIndex = findActiveInstanceIndex(instances, playbackTimeS)
  const activeIndex =
    manualActiveIndex != null ? manualActiveIndex : computedActiveIndex

  const navigatePlay = useCallback(
    (direction: 'previous' | 'next') => {
      if (instances.length === 0) {
        return
      }
      const nextIndex =
        direction === 'previous'
          ? Math.max(0, activeIndex - 1)
          : Math.min(instances.length - 1, activeIndex + 1)
      const instance = instances[nextIndex]
      if (instance) {
        seekToPlay(instance, nextIndex)
      }
    },
    [activeIndex, instances, seekToPlay],
  )

  const toggleYouTubePlayback = useCallback(() => {
    const player = youtubePlayerRef.current
    if (!player) {
      return
    }

    const state = player.getPlayerState()
    if (
      state === YOUTUBE_PLAYER_STATE.PLAYING ||
      state === YOUTUBE_PLAYER_STATE.BUFFERING
    ) {
      player.pauseVideo()
    } else {
      player.playVideo()
    }
  }, [])

  const handleOpenAutoFocus = useCallback((event: Event) => {
    event.preventDefault()
    contentRef.current?.focus()
  }, [])

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null

    if (target?.closest(INTERACTIVE_TOUCH_TARGET_SELECTOR)) {
      touchStartPoint.current = null
      return
    }

    const touch = event.touches[0]
    if (!touch) return

    touchStartPoint.current = {
      x: touch.clientX,
      y: touch.clientY,
    }
  }, [])

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!open || !touchStartPoint.current) return

    const touch = event.changedTouches[0]
    if (!touch) {
      touchStartPoint.current = null
      return
    }

    const deltaX = touch.clientX - touchStartPoint.current.x
    const deltaY = touch.clientY - touchStartPoint.current.y
    const horizontalDistance = Math.abs(deltaX)
    const verticalDistance = Math.abs(deltaY)

    touchStartPoint.current = null

    if (
      horizontalDistance < MINIMUM_SWIPE_DISTANCE ||
      horizontalDistance < verticalDistance * MINIMUM_HORIZONTAL_TO_VERTICAL_RATIO
    ) {
      return
    }

    if (deltaX < 0 && canNavigateNext && onNavigateNext) {
      dismissSwipeHint()
      onNavigateNext()
    } else if (deltaX > 0 && canNavigatePrevious && onNavigatePrevious) {
      dismissSwipeHint()
      onNavigatePrevious()
    }
  }, [
    open,
    canNavigateNext,
    canNavigatePrevious,
    onNavigateNext,
    onNavigatePrevious,
    dismissSwipeHint,
  ])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Spacebar') {
        if (isEditableTarget(event.target)) {
          return
        }
        event.preventDefault()
        toggleYouTubePlayback()
        return
      }

      if (hasInstances && (event.key === '[' || event.key === ']')) {
        if (isEditableTarget(event.target)) {
          return
        }
        event.preventDefault()
        navigatePlay(event.key === '[' ? 'previous' : 'next')
        return
      }

      if (event.key === 'ArrowLeft' && canNavigatePrevious && onNavigatePrevious) {
        event.preventDefault()
        onNavigatePrevious()
      } else if (event.key === 'ArrowRight' && canNavigateNext && onNavigateNext) {
        event.preventDefault()
        onNavigateNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [
    open,
    hasInstances,
    canNavigatePrevious,
    canNavigateNext,
    onNavigatePrevious,
    onNavigateNext,
    toggleYouTubePlayback,
    navigatePlay,
  ])

  if (!video) return null

  const formattedDate = format(parseISO(video.date), "d 'de' MMMM, yyyy", { locale: es })
  const matchSummaryLine = formatMatchSummaryLine(video, formattedDate)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'gap-0 overflow-hidden p-0',
          'max-w-none sm:max-w-none',
          'w-[min(calc(100vw-1rem),100%)]',
          'max-h-[100dvh] sm:max-h-[94vh]',
          'md:w-[min(94vw,80rem)] md:max-h-[92vh]',
        )}
        onOpenAutoFocus={handleOpenAutoFocus}
        onPointerDownOutside={preventCloseOnClipNav}
        onInteractOutside={preventCloseOnClipNav}
      >
        {showClipNavigation && !isMobile && (
          <>
            {canNavigatePrevious && onNavigatePrevious && (
              <ClipNavButton
                direction="previous"
                onClick={onNavigatePrevious}
                className={cn(
                  'fixed top-1/2 z-[60] hidden -translate-y-1/2 md:flex',
                  'size-10 border-border/60 bg-background/55 text-foreground/90 hover:bg-background/75',
                  'left-[max(0.75rem,calc((100vw-min(94vw,80rem))/2-3rem))]',
                )}
              />
            )}
            {canNavigateNext && onNavigateNext && (
              <ClipNavButton
                direction="next"
                onClick={onNavigateNext}
                className={cn(
                  'fixed top-1/2 z-[60] hidden -translate-y-1/2 md:flex',
                  'size-10 border-border/60 bg-background/55 text-foreground/90 hover:bg-background/75',
                  'right-[max(0.75rem,calc((100vw-min(94vw,80rem))/2-3rem))]',
                )}
              />
            )}
          </>
        )}

        <div
          ref={contentRef}
          tabIndex={-1}
          className={cn(
            'flex max-h-[100dvh] flex-col overflow-hidden outline-none sm:max-h-[94vh] md:max-h-[92vh]',
            'md:flex-row md:items-stretch',
          )}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            touchStartPoint.current = null
          }}
        >
          <div className="relative min-w-0 shrink-0 bg-black md:flex-1">
            <div className="relative aspect-video w-full">
              <YouTube
                videoId={video.youtubeId}
                className="absolute inset-0"
                iframeClassName="h-full w-full"
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: {
                    autoplay: 1,
                    modestbranding: 1,
                    rel: 0,
                  },
                }}
                onReady={handleYouTubeReady}
                onStateChange={handleYouTubeStateChange}
              />

              {showSwipeHint && <SwipeNavigationHint />}
            </div>
          </div>

          <div
            className={cn(
              'flex min-h-0 flex-col border-border',
              'max-h-[42vh] border-t p-4 sm:p-5',
              'md:max-h-[92vh] md:w-80 md:shrink-0 md:border-t-0 md:border-l md:p-4',
              hasInstances && 'md:min-h-0',
            )}
          >
            <DialogHeader className="shrink-0 space-y-1 text-left">
              <DialogTitle className="text-sm font-medium leading-snug tracking-tight sm:text-base md:text-[0.9375rem]">
                {video.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground sm:text-sm md:text-xs">
                {matchSummaryLine}
              </DialogDescription>
            </DialogHeader>

            {hasInstances && (
              <JugadasList
                instances={instances}
                activeIndex={activeIndex}
                onSelectPlay={(instance) => {
                  const index = instances.findIndex(
                    (row) => row.ord === instance.ord,
                  )
                  seekToPlay(instance, index >= 0 ? index : 0)
                }}
                listClassName={cn(
                  'max-h-[28vh] md:max-h-none md:flex-1',
                )}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
