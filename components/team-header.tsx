import { Team } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface TeamHeaderProps {
  team: Team
}

/**
 * Country flag emoji helper
 * Converts ISO country code to flag emoji
 */
function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

/**
 * Team header component with name, country flag, and back navigation
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

        {/* Team name and flag */}
        <div className="flex items-center gap-4">
          <span className="text-4xl" role="img" aria-label={`bandera de ${team.country}`}>
            {getCountryFlag(team.country)}
          </span>
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            {team.name}
          </h1>
        </div>
      </div>
    </header>
  )
}
