'use client'

import { useEffect } from 'react'
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
        className="max-w-4xl max-h-[90vh] gap-0 p-0 overflow-hidden"
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement | null
          if (target?.closest('[data-clip-nav]')) {
            event.preventDefault()
          }
        }}
      >
        <div className="overflow-y-auto max-h-[90vh]">
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
          <div className="p-6 space-y-6">
            <DialogHeader className="text-left space-y-2">
              <DialogTitle className="text-lg font-medium leading-snug tracking-tight">
                {video.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {video.gameConcept}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Partido
                  </p>
                  <p className="text-foreground">
                    {video.homeTeam} vs {video.awayTeam}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Fecha
                  </p>
                  <p className="text-foreground">{formattedDate}</p>
                </div>
              </div>
              <div className="space-y-3">
                {scoreDisplay && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      Resultado
                    </p>
                    <p className="text-foreground font-medium">{scoreDisplay}</p>
                  </div>
                )}
                {video.place && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
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
