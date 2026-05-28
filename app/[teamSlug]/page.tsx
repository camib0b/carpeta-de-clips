import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getTeamBySlug, getTeamRivals, getTeamVideos, teams } from '@/lib/data'
import { getMatchXmlAvailabilityForVideos } from '@/lib/match-xml.server'
import { TeamHeader } from '@/components/team-header'
import { VideoGrid } from '@/components/video-grid'
import { VideoGridSkeleton } from '@/components/video-grid-skeleton'
import { Metadata } from 'next'

interface TeamPageProps {
  params: Promise<{ teamSlug: string }>
}

/**
 * Generate static params for all teams
 */
export async function generateStaticParams() {
  return teams.map((team) => ({
    teamSlug: team.slug,
  }))
}

/**
 * Generate metadata for team pages
 */
export async function generateMetadata({
  params,
}: TeamPageProps): Promise<Metadata> {
  const { teamSlug } = await params
  const team = getTeamBySlug(teamSlug)

  if (!team) {
    return {
      title: 'Equipo No Encontrado',
    }
  }

  const pageTitle = `${team.name} — Carpeta de Clips`
  const pageDescription = `Clips ${team.name}`

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `/${team.slug}`,
      siteName: 'Carpeta de Clips',
      locale: 'es_CL',
      type: 'website',
    },
  }
}

/**
 * Team video library page
 * Displays all videos for a specific team with filtering
 */
export default async function TeamPage({ params }: TeamPageProps) {
  const { teamSlug } = await params
  const team = getTeamBySlug(teamSlug)

  if (!team) {
    notFound()
  }

  const videos = getTeamVideos(teamSlug)
  const rivals = getTeamRivals(teamSlug)
  const matchXmlAvailability = getMatchXmlAvailabilityForVideos(videos)

  return (
    <div className="min-h-screen bg-background">
      <TeamHeader team={team} />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <Suspense fallback={<VideoGridSkeleton />}>
          <VideoGrid
            videos={videos}
            rivals={rivals}
            matchXmlAvailability={matchXmlAvailability}
          />
        </Suspense>
      </main>
    </div>
  )
}
