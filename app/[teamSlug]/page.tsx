import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import {
  getTeamBySlug,
  getTeamLibraryClips,
  listRivalsFromClips,
} from '@/lib/clip-catalog'
import { getMatchXmlAvailabilityByStorageSlug } from '@/lib/match-xml.server'
import { TeamHeader } from '@/components/team-header'
import { VideoGrid } from '@/components/video-grid'
import { VideoGridSkeleton } from '@/components/video-grid-skeleton'
import { Metadata } from 'next'
import type { Team, VideoClip } from '@/lib/types'
import { formatClipMatchSummary } from '@/lib/match-display'
import {
  buildClipOpenGraphQuery,
  parseClipId,
  parseJugadaOrd,
  readQueryValue,
  toLibraryHref,
} from '@/lib/library-filters/clip-params'
import {
  siteLocale,
  siteName,
  teamOpenGraphTitle,
  teamPageDescription,
} from '@/lib/site-metadata'

export const dynamic = 'force-dynamic'

interface TeamPageProps {
  params: Promise<{ teamSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function teamPageMetadata(team: Team): Metadata {
  const pageDescription = teamPageDescription(team.name)
  const openGraphTitle = teamOpenGraphTitle(team.name)

  return {
    title: team.name,
    description: pageDescription,
    openGraph: {
      title: openGraphTitle,
      description: pageDescription,
      url: `/${team.slug}`,
      siteName,
      locale: siteLocale,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: openGraphTitle,
      description: pageDescription,
    },
  }
}

function clipPageMetadata(team: Team, clip: VideoClip, query: URLSearchParams): Metadata {
  const description = formatClipMatchSummary(clip)
  const openGraphTitle = `${clip.title} · ${siteName}`
  const url = toLibraryHref(`/${team.slug}`, query)

  return {
    title: clip.title,
    description,
    openGraph: {
      title: openGraphTitle,
      description,
      url,
      siteName,
      locale: siteLocale,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: openGraphTitle,
      description,
    },
  }
}

/**
 * Generate metadata for team pages.
 * A valid `clip` query makes the preview describe that clip. Any other URL
 * keeps the team library preview.
 */
export async function generateMetadata({
  params,
  searchParams,
}: TeamPageProps): Promise<Metadata> {
  const { teamSlug } = await params
  const team = await getTeamBySlug(teamSlug)

  if (!team) {
    return {
      title: 'Equipo no encontrado',
    }
  }

  const query = await searchParams
  const clipId = parseClipId(readQueryValue(query.clip))
  if (!clipId) {
    return teamPageMetadata(team)
  }

  const clips = await getTeamLibraryClips(teamSlug)
  const clip = clips.find((candidate) => candidate.id === clipId)
  if (!clip) {
    return teamPageMetadata(team)
  }

  const jugadaOrd = parseJugadaOrd(readQueryValue(query.jugada))
  const jugadaBelongs =
    jugadaOrd != null && clip.instances?.some((instance) => instance.ord === jugadaOrd)

  return clipPageMetadata(
    team,
    clip,
    buildClipOpenGraphQuery({
      concept: readQueryValue(query.concept),
      rival: readQueryValue(query.rival),
      clipId,
      jugadaOrd: jugadaBelongs ? jugadaOrd : undefined,
    }),
  )
}

/**
 * Team video library page
 * Displays all videos for a specific team with filtering
 */
export default async function TeamPage({ params }: TeamPageProps) {
  const { teamSlug } = await params
  const team = await getTeamBySlug(teamSlug)

  if (!team) {
    notFound()
  }

  const clips = await getTeamLibraryClips(teamSlug)
  const availableRivals = listRivalsFromClips(clips)
  const matchXmlAvailability = getMatchXmlAvailabilityByStorageSlug(clips)

  return (
    <div className="min-h-screen bg-background">
      <TeamHeader team={team} />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <Suspense fallback={<VideoGridSkeleton />}>
          <VideoGrid
            videos={clips}
            availableRivals={availableRivals}
            matchXmlAvailability={matchXmlAvailability}
          />
        </Suspense>
      </main>
    </div>
  )
}
