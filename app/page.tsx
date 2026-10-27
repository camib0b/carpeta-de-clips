import { Suspense } from 'react'
import nextDynamic from 'next/dynamic'
import Link from 'next/link'
import {
  LatestUploadedMatchSection,
  latestUploadedMatchLastEntranceStepIndex,
} from '@/components/latest-uploaded-match-section'
import { TeamIcon } from '@/components/team-icon'
import { getLatestUploadedMatch, listTeamLibrariesWithClipCounts } from '@/lib/clip-catalog'
import {
  LANDING_ENTRANCE_STEP_MS,
  landingEntranceDelay,
} from '@/lib/landing-entrance'
import { landingTeamRowLabel } from '@/lib/landing-team-row-label'
import { isPrivateTeamOfferReady } from '@/lib/private-team-offer'
import { siteDescription, siteName } from '@/lib/site-metadata'

export const dynamic = 'force-dynamic'

const PrivateTeamFolderSection = nextDynamic(() =>
  import('@/components/private-team-folder-section').then(
    (module) => module.PrivateTeamFolderSection,
  ),
)

const TEAM_ROW_START_STEP_INDEX = 2

/**
 * Home page - Team selection
 * Minimalist list of teams with video counts
 */
export default async function HomePage() {
  const [teamsWithClipCounts, latestUploadedMatch] = await Promise.all([
    listTeamLibrariesWithClipCounts(),
    getLatestUploadedMatch(),
  ])

  const afterTeamsEntranceStepIndex =
    TEAM_ROW_START_STEP_INDEX + teamsWithClipCounts.length
  const latestUploadEntranceStepStart = afterTeamsEntranceStepIndex

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div
          className="landing-enter mx-auto max-w-2xl px-6 py-16 md:py-24"
          style={{ animationDelay: landingEntranceDelay(0, LANDING_ENTRANCE_STEP_MS) }}
        >
          <h1 className="text-2xl font-medium tracking-tight text-foreground md:text-3xl">
            {siteName}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-foreground">
            {siteDescription}
          </p>
        </div>
      </header>

      {/* Team List */}
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p
          className="landing-enter mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
          style={{ animationDelay: landingEntranceDelay(1, LANDING_ENTRANCE_STEP_MS) }}
        >
          Carpetas públicas
        </p>
        <nav className="mb-28">
          {teamsWithClipCounts.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Todavía no hay equipos públicos.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {teamsWithClipCounts.map((team, teamIndex) => (
                <li
                  key={team.id}
                  className="landing-enter"
                  style={{
                    animationDelay: landingEntranceDelay(
                      TEAM_ROW_START_STEP_INDEX + teamIndex,
                      LANDING_ENTRANCE_STEP_MS,
                    ),
                  }}
                >
                  <Link
                    href={`/${team.slug}`}
                    className="group flex min-w-0 items-center justify-between gap-3 py-6 transition-colors duration-200 hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <TeamIcon slug={team.slug} name={team.name} size="sm" />
                      <span className="min-w-0 wrap-anywhere text-base font-medium text-foreground">
                        {landingTeamRowLabel(team)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                        {team.clipCount} {team.clipCount === 1 ? 'clip' : 'clips'}
                      </span>
                      <svg
                        className="h-4 w-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>
        {latestUploadedMatch && (
          <LatestUploadedMatchSection
            match={latestUploadedMatch}
            entranceStepStart={latestUploadEntranceStepStart}
          />
        )}
        {(process.env.NODE_ENV !== 'production' || isPrivateTeamOfferReady()) && (
          <Suspense fallback={null}>
            <PrivateTeamFolderSection
              entranceStepStart={
                latestUploadedMatch
                  ? latestUploadEntranceStepStart +
                    latestUploadedMatchLastEntranceStepIndex(
                      latestUploadedMatch.previews.length,
                    ) +
                    1
                  : latestUploadEntranceStepStart
              }
            />
          </Suspense>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <p className="text-xs text-muted-foreground">
            {siteName} — Clips de partido.
          </p>
          <p className="text-xs text-muted-foreground">
            camilaescudero@uc.cl
          </p>
        </div>
      </footer>
    </div>
  )
}
