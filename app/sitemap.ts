import type { MetadataRoute } from 'next'
import { listTeamLibraries } from '@/lib/clip-catalog'
import { absoluteSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const teams = await listTeamLibraries()

  return [
    {
      url: absoluteSiteUrl('/'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...teams.map((team) => ({
      url: absoluteSiteUrl(`/${team.slug}`),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
