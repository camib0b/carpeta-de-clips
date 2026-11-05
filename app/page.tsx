import { Suspense } from 'react'
import nextDynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { CurtainReveal } from '@/components/curtain-reveal-client'
import {
  LatestUploadedMatchSection,
  latestUploadedMatchLastEntranceStepIndex,
} from '@/components/latest-uploaded-match-section'
import { TeamIcon } from '@/components/team-icon'
import {
  LONG_OPPONENT_NAME,
  LONG_TEAM_NAME,
  UNBREAKABLE_LABEL,
} from '@/lib/break-ui/worst-case-fixtures'
import { getLatestUploadedMatch, listTeamLibrariesWithClipCounts } from '@/lib/clip-catalog'
import type { TeamLibraryWithClipCount } from '@/lib/catalog'
import { landingEntranceStyle } from '@/lib/landing-entrance'
import {
  landingFolderUsesFehochMark,
  landingTeamRowLabel,
} from '@/lib/landing-team-row-label'
import type { LatestUploadedMatch } from '@/lib/latest-uploaded-match'
import { isPrivateTeamOfferReady } from '@/lib/private-team-offer'
import { siteName } from '@/lib/site-metadata'

export const dynamic = 'force-dynamic'

const PrivateTeamFolderSection = nextDynamic(() =>
  import('@/components/private-team-folder-section').then(
    (module) => module.PrivateTeamFolderSection,
  ),
)

type HomeTeamPreviewMode = 'demo' | 'worst' | 'empty' | 'one' | 'many'

const HOME_TEAM_PREVIEW_SEGMENTS: {
  mode: HomeTeamPreviewMode
  label: string
  href: string
}[] = [
  { mode: 'demo', label: 'Demo data', href: '/' },
  { mode: 'worst', label: 'Worst case', href: '/?teams=worst' },
  { mode: 'empty', label: 'Empty', href: '/?teams=empty' },
  { mode: 'one', label: 'One', href: '/?teams=one' },
  { mode: 'many', label: '1,000 rows', href: '/?teams=many' },
]

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function homeTeamPreviewMode(value: string | undefined): HomeTeamPreviewMode {
  if (value === 'worst' || value === 'empty' || value === 'one' || value === 'many') {
    return value
  }
  return 'demo'
}

function worstCasePublicTeams(): TeamLibraryWithClipCount[] {
  return [
    {
      id: 'others-sub-16',
      name: 'Otros - Torneo Sub-16 A',
      slug: 'others-sub-16',
      country: 'Chile',
      clipCount: 0,
    },
    {
      id: 'others-primera-a',
      name: 'Otros - Torneo Primera A',
      slug: 'others-primera-a',
      country: 'Chile',
      clipCount: 1,
    },
    {
      id: 'worst-aleksandra',
      name: 'Aleksandra Wiśniewska-Kowalczyk',
      slug: 'worst-aleksandra',
      country: 'Polonia',
      clipCount: 1284,
    },
    {
      id: 'worst-jo',
      name: 'Jo',
      slug: 'worst-jo',
      country: 'Chile',
      clipCount: 1,
    },
    {
      id: 'worst-j',
      name: 'J',
      slug: 'worst-j',
      country: 'Chile',
      clipCount: 0,
    },
    {
      id: 'worst-cjk',
      name: '王秀英',
      slug: 'worst-cjk',
      country: 'China',
      clipCount: 1000000,
    },
    {
      id: 'worst-rtl',
      name: 'نور الهدى عبد الرحمن',
      slug: 'worst-rtl',
      country: 'مصر',
      clipCount: 12,
    },
    {
      id: 'worst-vietnamese',
      name: 'Đặng Thị Ngọc Hân',
      slug: 'worst-vietnamese',
      country: 'Việt Nam',
      clipCount: 2,
    },
    {
      id: 'worst-emoji',
      name: '🦊 Fox',
      slug: 'worst-emoji',
      country: 'Chile',
      clipCount: 8,
    },
    {
      id: 'worst-markup',
      name: '<script>alert(1)</script>',
      slug: 'worst-markup',
      country: 'Chile',
      clipCount: 3,
    },
    {
      id: 'worst-particles',
      name: 'María José de la Cruz y Fernández',
      slug: 'worst-particles',
      country: 'España',
      clipCount: 42,
    },
    {
      id: 'worst-compound',
      name: 'Benachrichtigungseinstellungen',
      slug: 'worst-compound',
      country: 'Deutschland',
      clipCount: 7,
    },
    {
      id: 'worst-newline',
      name: 'Line one\nLine two',
      slug: 'worst-newline',
      country: 'Chile',
      clipCount: 9,
    },
    {
      id: 'worst-spaces',
      name: '  Sam   Lee ',
      slug: 'worst-spaces',
      country: 'Chile',
      clipCount: 4,
    },
  ]
}

function homeTeamPreviewTeams(
  mode: Exclude<HomeTeamPreviewMode, 'demo'>,
): TeamLibraryWithClipCount[] {
  if (mode === 'empty') return []
  if (mode === 'one') {
    return [
      {
        id: 'one-jo',
        name: 'Jo',
        slug: 'one-jo',
        country: 'Chile',
        clipCount: 1,
      },
    ]
  }
  const worstCaseTeams = worstCasePublicTeams()
  if (mode === 'worst') return worstCaseTeams
  return Array.from({ length: 1000 }, (_, index) => {
    const sample = worstCaseTeams[index]
    if (sample) return sample
    const clipCount = index % 3 === 0 ? 0 : index % 3 === 1 ? 1 : 1284
    return {
      id: `many-${index}`,
      name: `Equipo ${index + 1}`,
      slug: `many-${index}`,
      country: 'Chile',
      clipCount,
    }
  })
}

function previewLatestMatch(
  mode: Exclude<HomeTeamPreviewMode, 'demo' | 'empty'>,
): LatestUploadedMatch {
  if (mode === 'one') {
    return {
      matchId: 'one-match',
      librarySlug: 'one-jo',
      libraryName: 'Jo',
      rivalLabel: 'J',
      playedOn: '2026-10-25',
      uploadedAt: '2026-10-26T12:00:00Z',
      homeTeam: 'Jo',
      awayTeam: 'J',
      previews: [
        {
          clipId: 'one-goal',
          title: 'Goles',
          youtubeId: 'pending-one-goal',
        },
      ],
    }
  }
  if (mode === 'many') {
    return {
      matchId: 'many-match',
      librarySlug: 'many-1',
      libraryName: 'Equipo 1',
      rivalLabel: 'Equipo 2',
      playedOn: '2026-10-25',
      uploadedAt: '2026-10-26T12:00:00Z',
      homeTeam: 'Equipo 1',
      awayTeam: 'Equipo 2',
      previews: [
        {
          clipId: 'many-goal',
          title: 'Goles',
          youtubeId: 'pending-many-goal',
        },
      ],
    }
  }
  return {
    matchId: 'worst-match',
    librarySlug: 'worst-aleksandra',
    libraryName: LONG_TEAM_NAME,
    rivalLabel: UNBREAKABLE_LABEL,
    playedOn: '2026-10-25',
    uploadedAt: '2026-10-26T12:00:00Z',
    homeTeam: LONG_TEAM_NAME,
    awayTeam: `${LONG_OPPONENT_NAME} ${UNBREAKABLE_LABEL}`,
    previews: [
      {
        clipId: 'worst-full',
        title: 'Partido Completo',
        youtubeId: 'pending-worst-full',
      },
      {
        clipId: 'worst-goal',
        title: 'Goles',
        youtubeId: 'pending-worst-goal',
      },
    ],
  }
}

function HomeTeamPreviewToggle({ mode }: { mode: HomeTeamPreviewMode }) {
  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div
      role="radiogroup"
      aria-label="Break UI data"
      style={{
        position: 'fixed',
        bottom: '4.75rem',
        left: '50%',
        zIndex: 80,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: 'calc(100vw - 2rem)',
        transform: 'translateX(-50%)',
        padding: '0.25rem',
        borderRadius: '9999px',
        backgroundColor: '#d4d4d4',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {HOME_TEAM_PREVIEW_SEGMENTS.map((segment) => {
        const selected = mode === segment.mode
        return (
          <a
            key={segment.mode}
            href={segment.href}
            role="radio"
            aria-checked={selected}
            className="inline-flex cursor-pointer"
            style={{
              border: 'none',
              borderRadius: '9999px',
              padding: '0.25rem 0.75rem',
              backgroundColor: selected ? '#ffffff' : 'transparent',
              color: '#171717',
              font: 'inherit',
              fontSize: '0.75rem',
              textDecoration: 'none',
            }}
          >
            {segment.label}
          </a>
        )
      })}
    </div>
  )
}

/**
 * Home page - Team selection
 * Minimalist list of teams with video counts
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ teams?: string | string[] }>
}) {
  const [teamsWithClipCounts, latestUploadedMatch, params] = await Promise.all([
    listTeamLibrariesWithClipCounts(),
    getLatestUploadedMatch(),
    searchParams,
  ])
  const previewMode =
    process.env.NODE_ENV === 'development'
      ? homeTeamPreviewMode(firstQueryValue(params.teams))
      : 'demo'
  const publicTeams =
    previewMode === 'demo'
      ? teamsWithClipCounts
      : homeTeamPreviewTeams(previewMode)
  const displayedMatch =
    previewMode === 'demo'
      ? latestUploadedMatch
      : previewMode === 'empty'
        ? null
        : previewLatestMatch(previewMode)
  const folderEntranceStep = displayedMatch
    ? 1 + latestUploadedMatchLastEntranceStepIndex() + 1
    : 1

  return (
    <div
      className={
        process.env.NODE_ENV === 'development' ? 'min-h-screen pb-28' : 'min-h-screen'
      }
    >
      {/* Header */}
      <header className="border-b border-border">
        <div
          className="hero-enter mx-auto max-w-2xl px-6 py-16 md:py-24"
          style={landingEntranceStyle(0)}
        >
          <h1 className="text-2xl font-medium tracking-tight text-foreground md:text-3xl">
            {siteName}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-foreground">
            Carpetas de clips de hockey césped, filtradas por concepto, para jugadoras y cuerpos técnicos.
          </p>
        </div>
      </header>

      {/* Team List */}
      <main className="mx-auto max-w-2xl bg-background px-6 py-12">
        {displayedMatch ? (
          <LatestUploadedMatchSection
            match={displayedMatch}
            entranceStepStart={1}
          />
        ) : null}
        <p
          className={`landing-enter mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground${displayedMatch ? ' mt-6' : ''}`}
          style={landingEntranceStyle(folderEntranceStep)}
        >
          Carpetas públicas
        </p>
        <nav>
          {publicTeams.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              Todavía no hay equipos públicos.
            </p>
          ) : (
            <div
              className="home-team-list"
              data-break-ui-static={
                process.env.NODE_ENV === 'development' && previewMode !== 'demo'
                  ? ''
                  : undefined
              }
            >
              <CurtainReveal as="ul" className="divide-y divide-border">
                {publicTeams.map((team) => (
                  <li key={team.id}>
                    <Link
                      href={`/${team.slug}`}
                      className="press tap-reset duration-color group flex min-w-0 w-full cursor-pointer items-center justify-between gap-3 py-6 outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-state focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        {landingFolderUsesFehochMark(team) ? (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white">
                            <Image
                              src="/teams/fehoch.webp"
                              alt="FEHOCH"
                              width={64}
                              height={64}
                              className="h-7 w-7"
                            />
                          </span>
                        ) : (
                          <TeamIcon slug={team.slug} name={team.name} size="sm" />
                        )}
                        <span
                          dir="auto"
                          className="min-w-0 wrap-anywhere text-base font-medium text-foreground"
                        >
                          {landingTeamRowLabel(team)}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                          {team.clipCount} {team.clipCount === 1 ? 'clip' : 'clips'}
                        </span>
                        <svg
                          className="h-4 w-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-row motion-safe:ease-out-strong motion-safe:group-hover:translate-x-1"
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
              </CurtainReveal>
            </div>
          )}
        </nav>
        {(process.env.NODE_ENV !== 'production' || isPrivateTeamOfferReady()) && (
          <Suspense fallback={null}>
            <PrivateTeamFolderSection entranceStepStart={folderEntranceStep + 1} />
          </Suspense>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto bg-background">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <p className="text-xs text-muted-foreground">
            {siteName} — Clips de partido.
          </p>
          <p className="text-xs text-muted-foreground">
            camilaescudero@uc.cl
          </p>
        </div>
      </footer>
      <HomeTeamPreviewToggle mode={previewMode} />
    </div>
  )
}
