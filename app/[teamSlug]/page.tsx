import { notFound } from 'next/navigation'
import { teams, getTeamVideos, getTeamRivals, getTeamBySlug } from '@/lib/data'
import { TeamHeader } from '@/components/team-header'
import { VideoGrid } from '@/components/video-grid'
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

  return {
    title: `${team.name} — Carpeta de Clips`,
    description: `Biblioteca de videos de hockey cesped para ${team.name}`,
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

  return (
    <div className="min-h-screen bg-background">
      <TeamHeader team={team} />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <VideoGrid videos={videos} rivals={rivals} />
      </main>
    </div>
  )
}
