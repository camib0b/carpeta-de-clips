'use client'

import { formatMatchDate, formatScoreWithShootout } from '@/lib/match-display'
import { formatHomeAwayMatchup, getTeamAbbreviation } from '@/lib/team-abbreviations'
import { VideoClip } from '@/lib/types'

interface VideoCardProps {
  video: VideoClip
  onClick: () => void
}

/**
 * One library clip. Thumbnail and caption share a bordered card so the title
 * belongs to the image above it.
 * Metadata hierarchy: clip title → home vs away (and score) → date (and optional division).
 */
export function VideoCard({ video, onClick }: VideoCardProps) {
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
      className="group w-full overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition-colors hover:border-foreground/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
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

      {/* Caption sits inside the same card as the thumbnail above it. */}
      <div className="space-y-1 border-t border-border/70 bg-muted/40 px-3 py-2.5">
        <h3 className="text-sm font-medium leading-snug tracking-tight text-foreground">
          {video.title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-foreground/80">
          <span>{matchupDisplay}</span>
          {scoreDisplay && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="font-medium text-foreground">{scoreDisplay}</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{formattedDate}</span>
          {video.division && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span>{video.division}</span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}
