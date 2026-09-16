'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react'
import { VideoClip } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import YouTube from 'react-youtube'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

const MINIMUM_SWIPE_DISTANCE = 60
const SWIPE_HINT_STORAGE_KEY = 'carpeta-de-clips-modal-swipe-hint-seen'
const MINIMUM_HORIZONTAL_TO_VERTICAL_RATIO = 1.25
const INTERACTIVE_TOUCH_TARGET_SELECTOR =
  'button, a, input, textarea, select, [contenteditable="true"], [role="button"]'

const YOUTUBE_PLAYER_STATE = {
  PLAYING: 1,
  BUFFERING: 3,
} as const

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

interface YouTubePlayer {
  getPlayerState: () => number
  playVideo: () => void
  pauseVideo: () => void
}

interface VideoModalProps {
  video: VideoClip | null
  open: boolean
  onOpenChange: (open: boolean) => void
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

/**
 * Modal component for playing YouTube videos
 * Desktop: wide layout with video dominant and compact sidebar
 * Mobile: full-width video with overlay navigation controls
 */
export function VideoModal({
  video,
  open,
  onOpenChange,
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
  const [swipeHintDismissed, setSwipeHintDismissed] = useState(true)

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
    }
  }, [open])

  useEffect(() => {
    youtubePlayerRef.current = null
  }, [video?.id])

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

  const handleYouTubeReady = useCallback((event: { target: YouTubePlayer }) => {
    youtubePlayerRef.current = event.target
  }, [])

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
    canNavigatePrevious,
    canNavigateNext,
    onNavigatePrevious,
    onNavigateNext,
    toggleYouTubePlayback,
  ])

  if (!video) return null

  const formattedDate = format(new Date(video.date), "d 'de' MMMM, yyyy", { locale: es })
  const hasScore = video.homeGoals !== undefined && video.awayGoals !== undefined
  const score = hasScore ? `${video.homeGoals}–${video.awayGoals}` : null
  const scoreDisplay = score && video.shootoutWinner
    ? `${score} (${video.shootoutWinner} gana en penales)`
    : score

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'gap-0 overflow-hidden p-0',
          // Override dialog defaults (sm:max-w-lg caps at 512px and breaks the wide layout)
          'max-w-none sm:max-w-none',
          'w-[min(calc(100vw-1rem),100%)]',
          'max-h-[100dvh] sm:max-h-[94vh]',
          'md:w-[min(94vw,80rem)] md:max-h-[92vh]',
        )}
        onOpenAutoFocus={handleOpenAutoFocus}
        onPointerDownOutside={preventCloseOnClipNav}
        onInteractOutside={preventCloseOnClipNav}
      >
        {/* Desktop clip navigation — must live inside DialogContent so clicks are not treated as outside dismiss */}
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
            'md:flex-row md:items-start',
          )}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            touchStartPoint.current = null
          }}
        >
          {/* Video Player — primary focus; 16:9 aspect drives modal height on desktop */}
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
              />

              {showSwipeHint && <SwipeNavigationHint />}
            </div>
          </div>

          {/* Metadata — compact sidebar on desktop, scrollable below on mobile */}
          <div
            className={cn(
              'overflow-y-auto border-border',
              'max-h-[42vh] border-t p-4 sm:p-5',
              'md:max-h-[92vh] md:w-72 md:shrink-0 md:border-t-0 md:border-l md:p-4',
            )}
          >
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-sm font-medium leading-snug tracking-tight sm:text-base md:text-[0.9375rem]">
                {video.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground sm:text-sm md:text-xs">
                {video.gameConcept}
              </DialogDescription>
            </DialogHeader>

            <dl className="mt-3 space-y-2 text-xs sm:text-sm md:text-xs">
              <div>
                <dt className="mb-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground sm:text-xs md:text-[0.625rem]">
                  Partido
                </dt>
                <dd className="text-foreground">
                  {video.homeTeam} vs {video.awayTeam}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-1">
                <div>
                  <dt className="mb-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground sm:text-xs md:text-[0.625rem]">
                    Fecha
                  </dt>
                  <dd className="text-foreground">{formattedDate}</dd>
                </div>
                {video.division && (
                  <div>
                    <dt className="mb-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground sm:text-xs md:text-[0.625rem]">
                      Categoría
                    </dt>
                    <dd className="text-foreground">{video.division}</dd>
                  </div>
                )}
                {scoreDisplay && (
                  <div>
                    <dt className="mb-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground sm:text-xs md:text-[0.625rem]">
                      Resultado
                    </dt>
                    <dd className="font-medium text-foreground">{scoreDisplay}</dd>
                  </div>
                )}
                {video.place && (
                  <div>
                    <dt className="mb-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground sm:text-xs md:text-[0.625rem]">
                      Lugar
                    </dt>
                    <dd className="text-foreground">{video.place}</dd>
                  </div>
                )}
              </div>
            </dl>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
