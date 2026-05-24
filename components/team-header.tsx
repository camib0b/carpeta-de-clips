import { TeamIcon } from '@/components/team-icon'
import { Team } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface TeamHeaderProps {
  team: Team
}

/**
 * Team header component with name, team icon, and back navigation
 * Minimalist design with generous spacing
 */
export function TeamHeader({ team }: TeamHeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Todos los Equipos</span>
        </Link>

        {/* Team name and icon */}
        <div className="flex items-center gap-4">
          <TeamIcon slug={team.slug} name={team.name} size="lg" />
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            {team.name}
          </h1>
        </div>
      </div>
    </header>
  )
}
