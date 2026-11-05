import Link from 'next/link'
import { LatestMatchPlayPreview } from '@/components/latest-match-play-preview'
import { landingEntranceStyle } from '@/lib/landing-entrance'
import {
  formatPlayedOnCaption,
  latestMatchCardHref,
  matchupLabel,
  selectBestPlayPreview,
} from '@/lib/home-latest-match'
import type { LatestUploadedMatch } from '@/lib/latest-uploaded-match'

/** Last relative entrance step inside this section (matchup, preview, date). */
export function latestUploadedMatchLastEntranceStepIndex(): number {
  return 2
}

function entranceStyle(stepIndex: number, entranceStepStart: number) {
  return landingEntranceStyle(entranceStepStart + stepIndex)
}

export function LatestUploadedMatchSection({
  match,
  entranceStepStart = 0,
}: {
  match: LatestUploadedMatch
  entranceStepStart?: number
}) {
  const bestPlay = selectBestPlayPreview(match.previews)
  const matchHref = latestMatchCardHref({
    librarySlug: match.librarySlug,
    rivalLabel: match.rivalLabel,
    clipId: bestPlay?.clipId,
  })
  const playedOnCaption = formatPlayedOnCaption(match.playedOn)
  const teamsLabel = matchupLabel(match.homeTeam, match.awayTeam)

  return (
    <section aria-label={teamsLabel} className="min-w-0">
      <Link
        href={matchHref}
        className="press tap-reset duration-color block min-w-0 cursor-pointer outline-none transition-colors duration-color ease-color hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-state focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span
          dir="auto"
          className="landing-enter block min-w-0 wrap-anywhere text-base font-medium text-foreground"
          style={entranceStyle(0, entranceStepStart)}
        >
          {teamsLabel}
        </span>
        <span
          className="landing-enter relative mt-3 block aspect-video w-full min-w-0 shrink-0 overflow-hidden bg-muted"
          style={entranceStyle(1, entranceStepStart)}
        >
          <LatestMatchPlayPreview preview={bestPlay} />
        </span>
        {playedOnCaption ? (
          <span
            className="landing-enter mt-2 block text-xs leading-normal text-muted-foreground"
            style={entranceStyle(2, entranceStepStart)}
          >
            {playedOnCaption}
          </span>
        ) : null}
      </Link>
    </section>
  )
}
