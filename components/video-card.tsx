'use client'

import { useRef } from 'react'
import { PenLine } from 'lucide-react'
import { formatMatchDate, formatScoreWithShootout } from '@/lib/match-display'
import { formatHomeAwayMatchup, getTeamAbbreviation } from '@/lib/team-abbreviations'
import { ClipThumbnailVisual } from '@/components/clip-thumbnail-visual'
import { VideoClip } from '@/lib/types'
import { cn } from '@/lib/utils'

interface VideoCardProps {
  video: VideoClip
  onClick: () => void
  playEntranceAnimation: boolean
  thumbnailLoading?: 'eager' | 'lazy'
  thumbnailFetchPriority?: 'high' | 'low' | 'auto'
}

/**
 * One library clip. Thumbnail and caption share a bordered card so the title
 * belongs to the image above it.
 * Metadata hierarchy: clip title → home vs away (and score) → date (and optional division).
 */
export function VideoCard({
  video,
  onClick,
  playEntranceAnimation,
  thumbnailLoading = 'lazy',
  thumbnailFetchPriority,
}: VideoCardProps) {
  // Keep the class that was chosen on this card's first mount. A later grid
  // render must not strip an entrance that is already running.
  const playEntranceAnimationRef = useRef(playEntranceAnimation)
  const formattedDate = formatMatchDate(video.date)
  const scoreDisplay =
    video.homeGoals !== undefined && video.awayGoals !== undefined
      ? formatScoreWithShootout(
          video.homeGoals,
          video.awayGoals,
          video.shootoutWinner,
        )
      : null
  const matchupDisplay =
    video.homeTeam && video.awayTeam
      ? formatHomeAwayMatchup(video.homeTeam, video.awayTeam)
      : `vs ${getTeamAbbreviation(video.rivalTeam)}`

  return (
    <button
      onClick={onClick}
      className={cn(
        'press tap-reset group h-full w-full min-w-0 cursor-pointer overflow-hidden rounded-md border border-border bg-card text-left shadow-elev-1 duration-color ease-color hover:border-foreground/25 hover:shadow-elev-2 motion-safe:hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-state focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        playEntranceAnimationRef.current && 'motion-safe:animate-fade-up',
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <ClipThumbnailVisual
          youtubeId={video.youtubeId}
          thumbKey={video.thumbKey}
          visibility={video.visibility}
          alt={video.title}
          className="group-hover:opacity-80"
          loading={thumbnailLoading}
          fetchPriority={thumbnailFetchPriority}
        />
        {/* Play indicator on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-color ease-color group-hover:opacity-100">
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
        {video.hasDrawings ? (
          <span className="pointer-events-none absolute bottom-1.5 left-1.5 z-10 inline-flex shrink-0 rounded-sm bg-black/50 p-0.5 text-sm leading-none text-white">
            {/* White on black/50 is 3.95:1 over a white thumbnail. */}
            <PenLine className="size-[1em] shrink-0" aria-hidden />
            <span className="sr-only">Tiene dibujos</span>
          </span>
        ) : null}
      </div>

      {/* Caption sits inside the same card as the thumbnail above it. */}
      <div className="space-y-1 border-t border-border bg-card px-3 py-2.5">
        <h3
          className="line-clamp-2 wrap-anywhere text-sm font-medium leading-snug tracking-tight text-foreground"
          title={video.title}
        >
          {video.title}
        </h3>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-foreground/80">
          <span className="min-w-0 wrap-anywhere">{matchupDisplay}</span>
          {scoreDisplay && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="min-w-0 wrap-anywhere font-mono font-medium tabular-nums text-foreground">
                {scoreDisplay}
              </span>
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{formattedDate}</span>
          {video.division && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="min-w-0 wrap-anywhere">{video.division}</span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}
