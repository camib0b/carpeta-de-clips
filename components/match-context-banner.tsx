'use client'

import {
  formatMatchDate,
  formatMatchScore,
  type MatchMetadata,
} from '@/lib/match-display'

interface MatchContextBannerProps {
  matches: MatchMetadata[]
}

function MatchContextBannerRow({ match }: { match: MatchMetadata }) {
  const formattedDate = formatMatchDate(match.date)
  const scoreDisplay = formatMatchScore(match)

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
      <span className="text-foreground/80">
        {match.homeTeam} vs {match.awayTeam}
      </span>
      {scoreDisplay && (
        <>
          <span aria-hidden className="text-muted-foreground/40">
            ·
          </span>
          <span className="font-medium text-foreground/70">{scoreDisplay}</span>
        </>
      )}
      {match.tournament && (
        <>
          <span aria-hidden className="text-muted-foreground/40">
            ·
          </span>
          <span>{match.tournament}</span>
        </>
      )}
      <span aria-hidden className="text-muted-foreground/40">
        ·
      </span>
      <span>{formattedDate}</span>
    </div>
  )
}

/**
 * Thin contextual banner for the active rival filter.
 * Surfaces match metadata without competing with the video grid.
 */
export function MatchContextBanner({ matches }: MatchContextBannerProps) {
  if (matches.length === 0) return null

  return (
    <div
      className="rounded-md border border-border/60 bg-muted/30 px-3 py-2"
      aria-label="Contexto del partido"
    >
      <div className="space-y-1">
        {matches.map((match) => (
          <MatchContextBannerRow
            key={`${match.date}-${match.homeTeam}-${match.awayTeam}`}
            match={match}
          />
        ))}
      </div>
    </div>
  )
}
