import Link from 'next/link'
import {
  LANDING_ENTRANCE_STEP_MS,
  landingEntranceDelay,
} from '@/lib/landing-entrance'
import { toLibraryHref } from '@/lib/library-filters/clip-params'
import { serializeLibraryFilters } from '@/lib/library-filters/params'
import {
  formatMatchScore,
  formatUploadedAndPlayedLine,
} from '@/lib/match-display'
import type { LatestUploadedMatch } from '@/lib/latest-uploaded-match'

const LATEST_UPLOAD_POSTER_ENTRANCE_STEP_START = 3

/** Last relative entrance step index inside this section (heading through posters). */
export function latestUploadedMatchLastEntranceStepIndex(previewCount: number): number {
  return previewCount > 0
    ? LATEST_UPLOAD_POSTER_ENTRANCE_STEP_START + previewCount - 1
    : 2
}

/**
 * React's video typings omit `loading`. Where a browser honors it on video,
 * the poster waits until it is near the viewport. `preload="metadata"` still
 * avoids downloading the whole file, and nothing here sets autoplay.
 */
declare module 'react' {
  interface VideoHTMLAttributes<T> {
    loading?: 'eager' | 'lazy'
  }
}

function entranceStyle(
  stepIndex: number,
  entranceStepStart: number,
): { animationDelay: string } {
  return {
    animationDelay: landingEntranceDelay(
      entranceStepStart + stepIndex,
      LANDING_ENTRANCE_STEP_MS,
    ),
  }
}

export function LatestUploadedMatchSection({
  match,
  entranceStepStart = 0,
}: {
  match: LatestUploadedMatch
  entranceStepStart?: number
}) {
  const matchHref = toLibraryHref(
    `/${match.librarySlug}`,
    serializeLibraryFilters({
      concepts: [],
      rivals: [match.rivalLabel],
    }),
  )
  const scoreLabel = formatMatchScore({
    date: match.playedOn,
    division: match.division,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeGoals: match.homeGoals,
    awayGoals: match.awayGoals,
    shootoutWinner: match.shootoutWinner,
    storageSlug: match.matchId,
  })
  const uploadedAndPlayedLabel = formatUploadedAndPlayedLine(
    match.uploadedAt,
    match.playedOn,
  )
  return (
    <section aria-labelledby="latest-uploaded-match-heading" className="mb-14">
      <p
        id="latest-uploaded-match-heading"
        className="landing-enter mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
        style={entranceStyle(0, entranceStepStart)}
      >
        Último partido subido
      </p>
      <Link
        href={matchHref}
        className="group block rounded-md py-4 transition-colors duration-200 hover:bg-muted/30"
      >
        <span
          className="landing-enter flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
          style={entranceStyle(1, entranceStepStart)}
        >
          <span className="min-w-0 text-base font-medium text-foreground">
            {match.homeTeam} vs {match.awayTeam}
          </span>
          <span className="flex items-center gap-3">
            {scoreLabel && (
              <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                {scoreLabel}
              </span>
            )}
            <span className="text-sm text-muted-foreground">{match.libraryName}</span>
            <svg
              className="h-4 w-4 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </span>
        <span
          className="landing-enter mt-1 block text-xs text-muted-foreground"
          style={entranceStyle(2, entranceStepStart)}
        >
          {uploadedAndPlayedLabel}
        </span>
        {match.previews.length > 0 && (
          <span className="mt-4 grid grid-cols-4 gap-2">
            {match.previews.map((preview, previewIndex) => (
              <span
                key={preview.clipId}
                className="landing-enter block overflow-hidden rounded-sm border border-border bg-muted"
                style={entranceStyle(
                  LATEST_UPLOAD_POSTER_ENTRANCE_STEP_START + previewIndex,
                  entranceStepStart,
                )}
              >
                <video
                  className="landing-match-poster pointer-events-none aspect-video w-full object-cover"
                  src={`${preview.mediaUrl}#t=0.1`}
                  muted
                  playsInline
                  preload="metadata"
                  controls={false}
                  disablePictureInPicture
                  disableRemotePlayback
                  loading="lazy"
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </span>
            ))}
          </span>
        )}
      </Link>
    </section>
  )
}
