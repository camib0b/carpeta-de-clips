'use client'

import { MatchXmlDownloadButton } from '@/components/match-xml-download-button'
import {
  formatMatchDate,
  formatMatchScore,
  type MatchMetadata,
} from '@/lib/match-display'

interface MatchContextBannerProps {
  matches: MatchMetadata[]
  matchXmlAvailability: Record<string, boolean>
}

function MatchContextBannerRow({
  match,
  xmlAvailable,
}: {
  match: MatchMetadata
  xmlAvailable: boolean
}) {
  const formattedDate = formatMatchDate(match.date)
  const scoreDisplay = formatMatchScore(match)

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
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
      <MatchXmlDownloadButton match={match} available={xmlAvailable} />
    </div>
  )
}

/**
 * Thin contextual banner for the active rival filter.
 * Surfaces match metadata without competing with the video grid.
 */
export function MatchContextBanner({
  matches,
  matchXmlAvailability,
}: MatchContextBannerProps) {
  if (matches.length === 0) return null

  const anyXmlAvailable = matches.some(
    (match) => matchXmlAvailability[match.storageSlug] === true,
  )

  return (
    <div
      className="rounded-md border border-border/60 bg-muted/30 px-3 py-2"
      aria-label="Contexto del partido"
    >
      {anyXmlAvailable && (
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          Codificación de eventos (XML)
        </p>
      )}
      <div className="space-y-2">
        {matches.map((match) => (
          <MatchContextBannerRow
            key={match.storageSlug}
            match={match}
            xmlAvailable={matchXmlAvailability[match.storageSlug] === true}
          />
        ))}
      </div>
    </div>
  )
}
