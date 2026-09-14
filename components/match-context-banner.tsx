'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

// Parallel-rollout flag: the AVA Work Window link is hidden in production until enabled.
// The existing YouTube modal remains the default clip-viewing surface regardless of this flag.
const WORK_WINDOW_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_WORK_WINDOW === '1' ||
  process.env.NEXT_PUBLIC_ENABLE_WORK_WINDOW === 'true'

/** Extracts the team slug from the team library route (`/{teamSlug}`). */
function teamSlugFromPathname(pathname: string | null): string | null {
  if (!pathname) {
    return null
  }
  const firstSegment = pathname.split('/').filter(Boolean)[0]
  return firstSegment ?? null
}

function MatchContextBannerRow({
  match,
  xmlAvailable,
  teamSlug,
}: {
  match: MatchMetadata
  xmlAvailable: boolean
  teamSlug: string | null
}) {
  const formattedDate = formatMatchDate(match.date)
  const scoreDisplay = formatMatchScore(match)
  const showWorkWindowLink =
    WORK_WINDOW_ENABLED && xmlAvailable && teamSlug !== null

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
      <div className="flex items-center gap-2">
        {showWorkWindowLink && (
          <Link
            href={`/${teamSlug}/partido/${match.storageSlug}`}
            className="inline-flex items-center rounded-md border border-border/60 px-2 py-1 text-xs text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            Abrir Work Window
          </Link>
        )}
        <MatchXmlDownloadButton match={match} available={xmlAvailable} />
      </div>
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
  const pathname = usePathname()
  const teamSlug = teamSlugFromPathname(pathname)

  if (matches.length === 0) return null

  return (
    <div
      className="rounded-md border border-border/60 bg-muted/30 px-3 py-2"
      aria-label="Contexto del partido"
    >
      <div className="space-y-2">
        {matches.map((match) => (
          <MatchContextBannerRow
            key={match.storageSlug}
            match={match}
            xmlAvailable={matchXmlAvailability[match.storageSlug] === true}
            teamSlug={teamSlug}
          />
        ))}
      </div>
    </div>
  )
}
