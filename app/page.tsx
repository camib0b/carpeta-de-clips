import Link from 'next/link'
import { TeamIcon } from '@/components/team-icon'
import { listTeamLibrariesWithClipCounts } from '@/lib/clip-catalog'
import { siteDescription, siteName } from '@/lib/site-metadata'

export const dynamic = 'force-dynamic'

/** Landing-only labels; catalog/DB names stay unchanged elsewhere. */
function landingTeamRowLabel(team: { id: string; name: string }): string {
  if (team.id === 'others') {
    return 'Otros - Torneo Primera A'
  }
  return team.name
}

/**
 * Home page - Team selection
 * Minimalist list of teams with video counts
 */
export default async function HomePage() {
  const teamsWithClipCounts = await listTeamLibrariesWithClipCounts()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
          <h1 className="text-2xl font-medium tracking-tight text-foreground md:text-3xl">
            {siteName}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {siteDescription}
          </p>
        </div>
      </header>

      {/* Team List */}
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Equipos
        </p>
        <nav>
          <ul className="divide-y divide-border">
            {teamsWithClipCounts.map((team) => (
              <li key={team.id}>
                <Link
                  href={`/${team.slug}`}
                  className="group flex items-center justify-between py-6 transition-colors duration-200 hover:bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <TeamIcon slug={team.slug} name={team.name} size="sm" />
                    <span className="text-base font-medium text-foreground">
                      {landingTeamRowLabel(team)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {team.clipCount} {team.clipCount === 1 ? 'clip' : 'clips'}
                    </span>
                    <svg
                      className="h-4 w-4 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-1"
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
        </nav>
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
