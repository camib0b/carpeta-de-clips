import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { MatchWorkWindow } from '@/components/work-window/match-work-window'
import {
  getTeamBySlug,
  getTeamVideos,
  teams,
} from '@/lib/data'
import { parseMatchXml } from '@/lib/longomatch-xml'
import {
  formatMatchDate,
  formatMatchScore,
  getUniqueMatchesFromVideos,
  type MatchMetadata,
} from '@/lib/match-display'
import { isValidMatchXmlStorageSlug } from '@/lib/match-keys'
import { resolveMatchVideoSource } from '@/lib/match-video-catalog'
import { readMatchXmlBytes } from '@/lib/match-xml.server'

interface MatchPageProps {
  params: Promise<{ teamSlug: string; slug: string }>
}

function findMatch(teamSlug: string, slug: string): MatchMetadata | undefined {
  const videos = getTeamVideos(teamSlug)
  const matches = getUniqueMatchesFromVideos(videos)
  return matches.find((match) => match.storageSlug === slug)
}

/** Pre-render every known (team, match) pair; falls back to the public XML at build time. */
export async function generateStaticParams() {
  const params: { teamSlug: string; slug: string }[] = []
  for (const team of teams) {
    const matches = getUniqueMatchesFromVideos(getTeamVideos(team.slug))
    for (const match of matches) {
      params.push({ teamSlug: team.slug, slug: match.storageSlug })
    }
  }
  return params
}

export async function generateMetadata({
  params,
}: MatchPageProps): Promise<Metadata> {
  const { teamSlug, slug } = await params
  const match = findMatch(teamSlug, slug)
  if (!match) {
    return { title: 'Partido no encontrado' }
  }
  return {
    title: `${match.homeTeam} vs ${match.awayTeam} — Work Window`,
  }
}

export default async function MatchWorkWindowPage({ params }: MatchPageProps) {
  const { teamSlug, slug } = await params

  const team = getTeamBySlug(teamSlug)
  if (!team || !isValidMatchXmlStorageSlug(slug)) {
    notFound()
  }

  const match = findMatch(teamSlug, slug)
  if (!match) {
    notFound()
  }

  const xmlBytes = await readMatchXmlBytes(slug)
  const { events, palette } = xmlBytes
    ? parseMatchXml(xmlBytes.toString('utf-8'))
    : { events: [], palette: {} }

  const videoSource = resolveMatchVideoSource(slug)
  const scoreDisplay = formatMatchScore(match)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <Link
            href={`/${team.slug}`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{team.name}</span>
          </Link>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-medium tracking-tight text-foreground">
              {match.homeTeam} vs {match.awayTeam}
            </h1>
            {scoreDisplay && (
              <span className="text-sm font-medium text-muted-foreground">
                {scoreDisplay}
              </span>
            )}
            <span aria-hidden className="text-muted-foreground/40">
              ·
            </span>
            <span className="text-sm text-muted-foreground">
              {formatMatchDate(match.date)}
            </span>
            {match.tournament && (
              <>
                <span aria-hidden className="text-muted-foreground/40">
                  ·
                </span>
                <span className="text-sm text-muted-foreground">
                  {match.tournament}
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <MatchWorkWindow
          events={events}
          palette={palette}
          videoSource={videoSource}
        />
      </main>
    </div>
  )
}
