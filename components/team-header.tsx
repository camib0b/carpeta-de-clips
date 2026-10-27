import { TeamIcon } from '@/components/team-icon'
import { TEAM_LIBRARY_HOME_HREF } from '@/lib/team-library-home-link'
import { landingTeamRowLabel } from '@/lib/landing-team-row-label'
import { Team } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'

interface TeamHeaderProps {
  team: Team
}

/**
 * Team header component with name, team icon, and back navigation.
 * The control is a plain anchor so the browser always loads `/`.
 * A client `router.push` after `preventDefault` never left the team page:
 * Next's Link bails out once the click is cancelled, and the clip dialog's
 * overlay sits above the page so the anchor is not the hit target while a
 * clip is open. That case is handled in the dialog.
 */
export function TeamHeader({ team }: TeamHeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <a
          href={TEAM_LIBRARY_HOME_HREF}
          data-team-library-home=""
          className="link-underline pointer-events-auto relative z-[60] mb-8 inline-flex items-center gap-2 bg-background text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Todos los Equipos</span>
        </a>

        <div className="hero-enter flex min-w-0 items-center gap-4">
          <TeamIcon slug={team.slug} name={team.name} size="lg" />
          <h1 className="min-w-0 wrap-anywhere text-2xl font-medium tracking-tight text-foreground">
            {landingTeamRowLabel(team)}
          </h1>
        </div>
      </div>
    </header>
  )
}
