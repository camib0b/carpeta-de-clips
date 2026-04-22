import Link from 'next/link'
import { teams, getTeamVideos } from '@/lib/data'

/**
 * Country flag emoji helper
 */
function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

/**
 * Home page - Team selection
 * Minimalist list of teams with video counts
 */
export default function HomePage() {
  // Get video counts for each team
  const teamsWithCounts = teams.map((team) => ({
    ...team,
    videoCount: getTeamVideos(team.slug).length,
  }))

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
          <h1 className="text-2xl font-medium tracking-tight text-foreground md:text-3xl">
            Carpeta de Clips
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Analisis de partidos y clips de entrenamiento de hockey cesped.
            <br />
            Selecciona un equipo para ver su coleccion de videos.
          </p>
        </div>
      </header>

      {/* Team List */}
      <main className="mx-auto max-w-2xl px-6 py-12">
        <nav>
          <ul className="divide-y divide-border">
            {teamsWithCounts.map((team) => (
              <li key={team.id}>
                <Link
                  href={`/${team.slug}`}
                  className="group flex items-center justify-between py-6 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="text-2xl"
                      role="img"
                      aria-label={`bandera de ${team.country}`}
                    >
                      {getCountryFlag(team.country)}
                    </span>
                    <span className="text-base font-medium text-foreground">
                      {team.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {team.videoCount} {team.videoCount === 1 ? 'clip' : 'clips'}
                    </span>
                    <svg
                      className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1"
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
            carpeta.cl — Biblioteca de videos para equipos de hockey cesped.
          </p>
        </div>
      </footer>
    </div>
  )
}
