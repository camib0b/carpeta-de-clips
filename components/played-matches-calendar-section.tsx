import { PlayedMatchesCalendar } from '@/components/played-matches-calendar'
import { listTeamLibraries } from '@/lib/clip-catalog'
import { buildPlayedMatchCalendar } from '@/lib/played-match-calendar'
import { listPlayedMatches } from '@/lib/played-matches'

export async function PlayedMatchesCalendarSection() {
  const [teams, matches] = await Promise.all([
    listTeamLibraries(),
    listPlayedMatches(),
  ])

  const calendar = buildPlayedMatchCalendar({
    teams: teams.map((team) => ({ slug: team.slug, name: team.name })),
    matches,
    now: new Date(),
  })

  return <PlayedMatchesCalendar calendar={calendar} />
}
