'use client'

import { VideoClip } from '@/lib/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface VideoCardProps {
  video: VideoClip
  onClick: () => void
}

/**
 * Minimalist video card component
 * Shows thumbnail, title, and key metadata
 */
export function VideoCard({ video, onClick }: VideoCardProps) {
  const formattedDate = format(new Date(video.date), "d 'de' MMM, yyyy", { locale: es })
  const hasScore = video.homeGoals !== undefined && video.awayGoals !== undefined
  const score = hasScore ? `${video.homeGoals}–${video.awayGoals}` : null
  const scoreDisplay = score && video.shootoutWinner
    ? `${score} (${video.shootoutWinner === video.homeTeam ? 'L' : 'V'} SP)`
    : score
  const matchupDisplay = video.collection
    ? `${video.homeTeam} vs ${video.awayTeam}`
    : `vs ${video.rivalTeam}`

  return (
    <button
      onClick={onClick}
      className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <img
          src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
          alt={video.title}
          className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-80"
        />
        {/* Play indicator on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/90">
            <svg
              className="ml-1 h-5 w-5 text-background"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-medium leading-snug tracking-tight text-foreground">
          {video.title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{formattedDate}</span>
          <span className="text-muted-foreground/50">·</span>
          <span>{video.gameConcept}</span>
          {video.category && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span>{video.category}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{matchupDisplay}</span>
          {scoreDisplay && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="font-medium text-foreground">{scoreDisplay}</span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}
