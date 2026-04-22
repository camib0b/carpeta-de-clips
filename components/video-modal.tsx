'use client'

import { VideoClip, VideoNote } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
}

/**
 * Modal component for playing YouTube videos
 * Clean, minimal design with video player, metadata, and notes
 */
export function VideoModal({ video, notes, open, onOpenChange, onAddNote }: VideoModalProps) {
  if (!video) return null

  const formattedDate = format(new Date(video.date), "d 'de' MMMM, yyyy", { locale: es })
  const score = `${video.homeGoals}–${video.awayGoals}`
  const scoreDisplay = video.shootoutWinner
    ? `${score} (${video.shootoutWinner} gana en penales)`
    : score

  const handleAddNote = (note: { content: string; authorName?: string }) => {
    onAddNote(video.id, note)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] gap-0 p-0 overflow-hidden">
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
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Resultado
                  </p>
                  <p className="text-foreground font-medium">
                    {video.rivalTeam === 'Entrenamiento' ? '—' : scoreDisplay}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Lugar
                  </p>
                  <p className="text-foreground">{video.place}</p>
                </div>
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
    </Dialog>
  )
}
