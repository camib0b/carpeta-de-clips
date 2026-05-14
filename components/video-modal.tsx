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

/**
 * Modal component for playing YouTube videos
 * Clean, minimal design with video player, metadata, and notes
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
        className="w-[min(94vw,72rem)] max-w-none max-h-[94vh] gap-0 p-0 overflow-hidden"
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement | null
          if (target?.closest('[data-clip-nav]')) {
            event.preventDefault()
          }
        }}
      >
        <div
          className="overflow-y-auto max-h-[94vh]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            touchStartPoint.current = null
          }}
        >
          {/* Video Player */}
          <div className="relative aspect-video w-full bg-black">
            <YouTube
              videoId={video.youtubeId}
              className="absolute inset-0"
              iframeClassName="w-full h-full"
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
          </div>

          {/* Video Info */}
          <div className="space-y-4 p-4 sm:p-5">
            <DialogHeader className="text-left space-y-1.5">
              <DialogTitle className="text-base font-medium leading-snug tracking-tight sm:text-lg">
                {video.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {video.gameConcept}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="space-y-2.5">
                <div>
                  <p className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                    Partido
                  </p>
                  <p className="text-foreground">
                    {video.homeTeam} vs {video.awayTeam}
                  </p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                    Fecha
                  </p>
                  <p className="text-foreground">{formattedDate}</p>
                </div>
              </div>
              <div className="space-y-2.5">
                {video.category && (
                  <div>
                    <p className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                      Categoría
                    </p>
                    <p className="text-foreground">{video.category}</p>
                  </div>
                )}
                {scoreDisplay && (
                  <div>
                    <p className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                      Resultado
                    </p>
                    <p className="text-foreground font-medium">{scoreDisplay}</p>
                  </div>
                )}
                {video.place && (
                  <div>
                    <p className="mb-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                      Lugar
                    </p>
                    <p className="text-foreground">{video.place}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Notes Section */}
            <VideoNotes
              videoId={video.id}
              initialNotes={notes}
              onAddNote={handleAddNote}
            />
          </div>
        </div>
      </DialogContent>
      {showClipNavigation && (
        <DialogPortal>
          {canNavigatePrevious && onNavigatePrevious && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              data-clip-nav="previous"
              onClick={onNavigatePrevious}
              className="fixed left-4 top-1/2 z-50 size-11 -translate-y-1/2 rounded-full border-0 bg-background/90 text-foreground shadow-lg backdrop-blur hover:bg-background sm:left-6"
              aria-label="Clip anterior"
            >
              <ChevronLeft className="size-6" aria-hidden />
            </Button>
          )}
          {canNavigateNext && onNavigateNext && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              data-clip-nav="next"
              onClick={onNavigateNext}
              className="fixed right-4 top-1/2 z-50 size-11 -translate-y-1/2 rounded-full border-0 bg-background/90 text-foreground shadow-lg backdrop-blur hover:bg-background sm:right-6"
              aria-label="Clip siguiente"
            >
              <ChevronRight className="size-6" aria-hidden />
            </Button>
          )}
        </DialogPortal>
      )}
    </Dialog>
  )
}
