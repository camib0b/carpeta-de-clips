'use client'

import { VideoClip } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import YouTube from 'react-youtube'
import { format } from 'date-fns'

interface VideoModalProps {
  video: VideoClip | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal component for playing YouTube videos
 * Clean, minimal design with video player and metadata
 */
export function VideoModal({ video, open, onOpenChange }: VideoModalProps) {
  if (!video) return null

  const formattedDate = format(new Date(video.date), 'MMMM d, yyyy')
  const score = `${video.homeGoals}–${video.awayGoals}`
  const scoreDisplay = video.shootoutWinner
    ? `${score} (${video.shootoutWinner} wins shootout)`
    : score

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 p-0 overflow-hidden">
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
        <div className="p-6 space-y-4">
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
                  Match
                </p>
                <p className="text-foreground">
                  {video.homeTeam} vs {video.awayTeam}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Date
                </p>
                <p className="text-foreground">{formattedDate}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Score
                </p>
                <p className="text-foreground font-medium">
                  {video.rivalTeam === 'Training Session' ? '—' : scoreDisplay}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Venue
                </p>
                <p className="text-foreground">{video.place}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
