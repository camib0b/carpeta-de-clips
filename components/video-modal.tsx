'use client'

import { useCallback, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { VideoClip, VideoNote } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPortal,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { VideoNotes } from './video-notes'
import YouTube from 'react-youtube'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const MINIMUM_SWIPE_DISTANCE = 60
const MINIMUM_HORIZONTAL_TO_VERTICAL_RATIO = 1.25
const INTERACTIVE_TOUCH_TARGET_SELECTOR =
  'button, a, input, textarea, select, [contenteditable="true"], [role="button"]'

interface VideoModalProps {
  video: VideoClip | null
  notes: VideoNote[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddNote: (videoId: string, note: { content: string; authorName?: string }) => void
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

function ClipNavButton({ direction, onClick, className }: ClipNavButtonProps) {
  const isPrevious = direction === 'previous'
  const Icon = isPrevious ? ChevronLeft : ChevronRight
  const label = isPrevious ? 'Clip anterior' : 'Clip siguiente'

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      data-clip-nav={direction}
      onClick={onClick}
      aria-label={label}
      className={cn(
        'rounded-full border border-white/25 bg-black/75 text-white shadow-lg backdrop-blur-sm',
        'hover:bg-black/90 hover:text-white',
        'focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50',
        'size-12 sm:size-14',
        className,
      )}
    >
      <Icon className="size-7 sm:size-8" aria-hidden />
    </Button>
  )
}

/**
 * Modal component for playing YouTube videos
 * Desktop: wide layout with video dominant and compact sidebar
 * Mobile: full-width video with overlay navigation controls
 */
export function VideoModal({
  video,
  notes,
  open,
  onOpenChange,
  onAddNote,
  canNavigatePrevious = false,
  canNavigateNext = false,
  onNavigatePrevious,
  onNavigateNext,
}: VideoModalProps) {
  const showClipNavigation = open && (canNavigatePrevious || canNavigateNext)
  const touchStartPoint = useRef<{ x: number; y: number } | null>(null)

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
      onNavigateNext()
    } else if (deltaX > 0 && canNavigatePrevious && onNavigatePrevious) {
      onNavigatePrevious()
    }
  }, [open, canNavigateNext, canNavigatePrevious, onNavigateNext, onNavigatePrevious])

  useEffect(() => {
    if (!open || (!canNavigatePrevious && !canNavigateNext)) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && canNavigatePrevious && onNavigatePrevious) {
        event.preventDefault()
        onNavigatePrevious()
      } else if (event.key === 'ArrowRight' && canNavigateNext && onNavigateNext) {
        event.preventDefault()
        onNavigateNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, canNavigatePrevious, canNavigateNext, onNavigatePrevious, onNavigateNext])

  if (!video) return null

  const formattedDate = format(new Date(video.date), "d 'de' MMMM, yyyy", { locale: es })
  const hasScore = video.homeGoals !== undefined && video.awayGoals !== undefined
  const score = hasScore ? `${video.homeGoals}–${video.awayGoals}` : null
  const scoreDisplay = score && video.shootoutWinner
    ? `${score} (${video.shootoutWinner} gana en penales)`
    : score

  const handleAddNote = (note: { content: string; authorName?: string }) => {
    onAddNote(video.id, note)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'gap-0 overflow-hidden p-0',
          'w-[min(100vw-0.5rem,36rem)] max-w-none',
          'max-h-[100dvh] sm:max-h-[94vh]',
          'lg:w-[min(96vw,90rem)] lg:max-h-[92vh]',
        )}
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement | null
          if (target?.closest('[data-clip-nav]')) {
            event.preventDefault()
          }
        }}
      >
        <div
          className={cn(
            'flex max-h-[100dvh] flex-col overflow-hidden sm:max-h-[94vh] lg:max-h-[92vh]',
            'lg:h-[min(88vh,52rem)] lg:flex-row',
          )}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            touchStartPoint.current = null
          }}
        >
          {/* Video Player — primary focus, ~75%+ of modal on desktop */}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-black lg:basis-[76%]">
            <div className="relative aspect-video w-full lg:aspect-auto lg:h-full lg:min-h-0">
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
              />

              {/* Mobile navigation — overlaid on video for visibility and touch access */}
              {showClipNavigation && (
                <div
                  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between px-2 sm:px-3 lg:hidden"
                  aria-hidden={false}
                >
                  <div className="pointer-events-auto">
                    {canNavigatePrevious && onNavigatePrevious && (
                      <ClipNavButton
                        direction="previous"
                        onClick={onNavigatePrevious}
                      />
                    )}
                  </div>
                  <div className="pointer-events-auto">
                    {canNavigateNext && onNavigateNext && (
                      <ClipNavButton
                        direction="next"
                        onClick={onNavigateNext}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata + notes — compact sidebar on desktop, scrollable below on mobile */}
          <div
            className={cn(
              'overflow-y-auto border-border',
              'max-h-[42vh] border-t p-4 sm:p-5',
              'lg:max-h-none lg:w-[min(100%,22rem)] lg:shrink-0 lg:basis-[24%] lg:border-t-0 lg:border-l lg:p-4',
            )}
          >
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-sm font-medium leading-snug tracking-tight sm:text-base lg:text-[0.9375rem]">
                {video.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground sm:text-sm lg:text-xs">
                {video.gameConcept}
              </DialogDescription>
            </DialogHeader>

            <dl className="mt-3 space-y-2 text-xs sm:text-sm lg:text-xs">
              <div>
                <dt className="mb-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground sm:text-xs lg:text-[0.625rem]">
                  Partido
                </dt>
                <dd className="text-foreground">
                  {video.homeTeam} vs {video.awayTeam}
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-1">
                <div>
                  <dt className="mb-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground sm:text-xs lg:text-[0.625rem]">
                    Fecha
                  </dt>
                  <dd className="text-foreground">{formattedDate}</dd>
                </div>
                {video.category && (
                  <div>
                    <dt className="mb-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground sm:text-xs lg:text-[0.625rem]">
                      Categoría
                    </dt>
                    <dd className="text-foreground">{video.category}</dd>
                  </div>
                )}
                {scoreDisplay && (
                  <div>
                    <dt className="mb-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground sm:text-xs lg:text-[0.625rem]">
                      Resultado
                    </dt>
                    <dd className="font-medium text-foreground">{scoreDisplay}</dd>
                  </div>
                )}
                {video.place && (
                  <div>
                    <dt className="mb-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground sm:text-xs lg:text-[0.625rem]">
                      Lugar
                    </dt>
                    <dd className="text-foreground">{video.place}</dd>
                  </div>
                )}
              </div>
            </dl>

            <div className="my-3 border-t border-border lg:my-4" />

            <VideoNotes
              videoId={video.id}
              initialNotes={notes}
              onAddNote={handleAddNote}
            />
          </div>
        </div>
      </DialogContent>

      {/* Desktop navigation — flanking the wide modal */}
      {showClipNavigation && (
        <DialogPortal>
          {canNavigatePrevious && onNavigatePrevious && (
            <ClipNavButton
              direction="previous"
              onClick={onNavigatePrevious}
              className={cn(
                'fixed top-1/2 z-50 hidden -translate-y-1/2 lg:flex',
                'size-12 border-border bg-background/95 text-foreground hover:bg-background',
                'left-[max(0.75rem,calc((100vw-min(96vw,90rem))/2-3.5rem))]',
              )}
            />
          )}
          {canNavigateNext && onNavigateNext && (
            <ClipNavButton
              direction="next"
              onClick={onNavigateNext}
              className={cn(
                'fixed top-1/2 z-50 hidden -translate-y-1/2 lg:flex',
                'size-12 border-border bg-background/95 text-foreground hover:bg-background',
                'right-[max(0.75rem,calc((100vw-min(96vw,90rem))/2-3.5rem))]',
              )}
            />
          )}
        </DialogPortal>
      )}
    </Dialog>
  )
}
