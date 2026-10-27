'use client'

import { TeamIcon } from '@/components/team-icon'
import { landingTeamRowLabel } from '@/lib/landing-team-row-label'
import { Team } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface TeamHeaderProps {
  team: Team
}

/**
 * Team header component with name, team icon, and back navigation
 * Minimalist design with generous spacing
 */
export function TeamHeader({ team }: TeamHeaderProps) {
  const router = useRouter()

  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Back link */}
        <Link
          href="/"
          data-team-library-home=""
          className="pointer-events-auto relative z-[60] mb-8 inline-flex items-center gap-2 bg-background text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={(event) => {
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return
            }
            event.preventDefault()
            router.push('/')
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Todos los Equipos</span>
        </Link>

        {/* Team name and icon */}
        <div className="flex min-w-0 items-center gap-4">
          <TeamIcon slug={team.slug} name={team.name} size="lg" />
          <h1 className="min-w-0 wrap-anywhere text-2xl font-medium tracking-tight text-foreground">
            {landingTeamRowLabel(team)}
          </h1>
        </div>
      </div>
    </header>
  )
}
