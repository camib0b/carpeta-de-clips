import { rivalToSlug } from '@/lib/library-filters/slug'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const SANTIAGO_TIME_ZONE = 'America/Santiago'
const SEASON_START_MONTH_INDEX = 2
const SEASON_END_MONTH_INDEX = 11
const MAXIMUM_SEASON_WEEKS = 60

const MONTH_NAMES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sept',
  'oct',
  'nov',
  'dic',
] as const

export const NEW_UPLOAD_WINDOW_MILLISECONDS = 7 * MILLISECONDS_PER_DAY
export const PLAYED_MATCH_CELL_FADE_DURATION_MILLISECONDS = 160
const PLAYED_MATCH_CELL_FADE_TOTAL_MILLISECONDS = 380
const PLAYED_MATCH_COLUMN_DELAY_MILLISECONDS = 8

export type PlayedMatchIntensityLevel = 0 | 1 | 2 | 3 | 4

export interface PlayedMatchCalendarTeam {
  slug: string
  name: string
}

export interface PlayedMatchRecord {
  id: string
  playedOn: string
  libraryId: string
  libraryName: string
  rivalLabel: string
  homeGoals: number | null
  awayGoals: number | null
  clipCount: number
  firstUploaded: string | null
}

export interface PlayedMatchCalendarMatch {
  id: string
  href: string
  tooltipText: string
  isNew: boolean
}

export interface PlayedMatchCalendarCell {
  weekStart: string
  intensityLevel: PlayedMatchIntensityLevel
  isNew: boolean
  href: string | null
  ariaLabel: string | null
  matches: PlayedMatchCalendarMatch[]
}

export interface PlayedMatchCalendarRow {
  teamSlug: string
  teamName: string
  cells: PlayedMatchCalendarCell[]
}

export interface PlayedMatchCalendarMonthLabel {
  label: string
  span: number
}

export interface PlayedMatchCalendarModel {
  seasonYear: number
  weeks: { start: string }[]
  monthLabels: PlayedMatchCalendarMonthLabel[]
  rows: PlayedMatchCalendarRow[]
  fadeDurationMilliseconds: number
  fadeDelayMillisecondsByColumn: number[]
}

export function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null

  const date = new Date(Date.UTC(year, monthIndex, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

export function formatCalendarDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Calendar day in Santiago, so the open week follows the local season rather than UTC midnight. */
export function calendarToday(now: Date): Date {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: SANTIAGO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return (
    parseCalendarDate(formatted) ??
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  )
}

export function formatCalendarDay(value: string): string {
  const date = parseCalendarDate(value)
  if (!date) return value
  const monthName = MONTH_NAMES[date.getUTCMonth()]
  if (!monthName) return value
  return `${date.getUTCDate()} ${monthName}`
}

export function clipCountToIntensityLevel(clipCount: number): PlayedMatchIntensityLevel {
  if (clipCount <= 0) return 0
  if (clipCount <= 10) return 1
  if (clipCount <= 25) return 2
  if (clipCount <= 50) return 3
  return 4
}

export function isUploadWithinLastSevenDays(
  firstUploaded: string | null,
  now: Date,
): boolean {
  const uploadedAt = parseUploadedAt(firstUploaded)
  if (uploadedAt === null) return false
  const ageMilliseconds = now.getTime() - uploadedAt
  return ageMilliseconds >= 0 && ageMilliseconds <= NEW_UPLOAD_WINDOW_MILLISECONDS
}

/**
 * Stagger is 8ms per column, and the last cell finishes before 400ms.
 * Shorter steps keep long seasons inside that total.
 */
export function columnFadeDelayMilliseconds(
  columnIndex: number,
  columnCount: number,
): number {
  if (columnCount <= 1 || columnIndex <= 0) return 0
  const maximumDelay =
    PLAYED_MATCH_CELL_FADE_TOTAL_MILLISECONDS -
    PLAYED_MATCH_CELL_FADE_DURATION_MILLISECONDS
  const step = Math.min(
    PLAYED_MATCH_COLUMN_DELAY_MILLISECONDS,
    maximumDelay / (columnCount - 1),
  )
  return Math.min(maximumDelay, Math.round(columnIndex * step))
}

export function formatPlayedMatchTooltip(match: {
  rivalLabel: string
  homeGoals: number | null
  awayGoals: number | null
  playedOn: string
}): string {
  const parts = [formatOpponentLabel(match.rivalLabel)]
  const score = formatMatchGoals(match.homeGoals, match.awayGoals)
  if (score) parts.push(score)
  parts.push(formatCalendarDay(match.playedOn))
  return parts.join(' · ')
}

export function playedMatchHref(teamSlug: string, rivalLabel: string): string {
  return `/${teamSlug}?rival=${encodeURIComponent(rivalToSlug(rivalLabel))}`
}

export function buildPlayedMatchCalendar(input: {
  teams: readonly PlayedMatchCalendarTeam[]
  matches: readonly PlayedMatchRecord[]
  now: Date
}): PlayedMatchCalendarModel {
  const seasonYear = selectSeasonYear(
    input.matches.map((match) => match.playedOn),
    input.now,
  )
  const seasonMatches = input.matches.filter((match) =>
    isDateInSeason(match.playedOn, seasonYear),
  )
  const latestPlayed = latestCalendarDate(seasonMatches.map((match) => match.playedOn))
  const weekStarts = buildWeekStarts(seasonYear, input.now, latestPlayed)
  const monthLabels = monthLabelSpans(weekStarts, seasonYear)
  const matchesByCell = groupMatchesByTeamWeek(seasonMatches)
  const rows = buildRows(input.teams, seasonMatches, weekStarts, matchesByCell, input.now)

  return {
    seasonYear,
    weeks: weekStarts.map((weekStart) => ({ start: formatCalendarDate(weekStart) })),
    monthLabels,
    rows,
    fadeDurationMilliseconds: PLAYED_MATCH_CELL_FADE_DURATION_MILLISECONDS,
    fadeDelayMillisecondsByColumn: weekStarts.map((_, columnIndex) =>
      columnFadeDelayMilliseconds(columnIndex, weekStarts.length),
    ),
  }
}

function selectSeasonYear(playedOnDates: readonly string[], now: Date): number {
  let latestSeasonYear: number | null = null
  for (const playedOn of playedOnDates) {
    const parsed = parseCalendarDate(playedOn)
    if (!parsed) continue
    const monthIndex = parsed.getUTCMonth()
    if (monthIndex < SEASON_START_MONTH_INDEX || monthIndex > SEASON_END_MONTH_INDEX) {
      continue
    }
    const year = parsed.getUTCFullYear()
    if (latestSeasonYear === null || year > latestSeasonYear) {
      latestSeasonYear = year
    }
  }
  if (latestSeasonYear !== null) return latestSeasonYear

  const today = calendarToday(now)
  const todayMonth = today.getUTCMonth()
  const todayYear = today.getUTCFullYear()
  return todayMonth < SEASON_START_MONTH_INDEX ? todayYear - 1 : todayYear
}

function isDateInSeason(playedOn: string, seasonYear: number): boolean {
  const parsed = parseCalendarDate(playedOn)
  if (!parsed) return false
  const monthIndex = parsed.getUTCMonth()
  return (
    parsed.getUTCFullYear() === seasonYear &&
    monthIndex >= SEASON_START_MONTH_INDEX &&
    monthIndex <= SEASON_END_MONTH_INDEX
  )
}

function latestCalendarDate(playedOnDates: readonly string[]): Date | null {
  let latest: Date | null = null
  for (const playedOn of playedOnDates) {
    const parsed = parseCalendarDate(playedOn)
    if (!parsed) continue
    if (!latest || parsed.getTime() > latest.getTime()) latest = parsed
  }
  return latest
}

function seasonGridEnd(seasonYear: number, now: Date, latestPlayed: Date | null): Date {
  const seasonStartTime = Date.UTC(seasonYear, SEASON_START_MONTH_INDEX, 1)
  const seasonEndTime = Date.UTC(seasonYear, SEASON_END_MONTH_INDEX, 31)
  const todayTime = calendarToday(now).getTime()

  let endTime = seasonEndTime
  if (todayTime >= seasonStartTime && todayTime <= seasonEndTime) {
    endTime = todayTime
  }

  if (latestPlayed) {
    const latestTime = latestPlayed.getTime()
    if (latestTime > endTime && latestTime <= seasonEndTime) {
      endTime = latestTime
    }
  }

  return new Date(endTime)
}

function buildWeekStarts(seasonYear: number, now: Date, latestPlayed: Date | null): Date[] {
  const seasonStart = new Date(Date.UTC(seasonYear, SEASON_START_MONTH_INDEX, 1))
  const gridEnd = seasonGridEnd(seasonYear, now, latestPlayed)
  let cursor = startOfMondayWeek(seasonStart)
  const lastWeek = startOfMondayWeek(gridEnd)
  const weeks: Date[] = []

  while (cursor.getTime() <= lastWeek.getTime() && weeks.length < MAXIMUM_SEASON_WEEKS) {
    weeks.push(cursor)
    cursor = addUtcDays(cursor, 7)
  }

  return weeks
}

function monthLabelSpans(
  weekStarts: readonly Date[],
  seasonYear: number,
): PlayedMatchCalendarMonthLabel[] {
  const spans: PlayedMatchCalendarMonthLabel[] = []

  for (const weekStart of weekStarts) {
    const label = monthLabelForWeek(weekStart, seasonYear)
    const previous = spans[spans.length - 1]
    if (label === null) {
      if (previous) previous.span += 1
      continue
    }
    if (previous && previous.label === label) {
      previous.span += 1
    } else {
      spans.push({ label, span: 1 })
    }
  }

  return spans
}

function monthLabelForWeek(weekStart: Date, seasonYear: number): string | null {
  const weekEnd = weekStart.getTime() + 6 * MILLISECONDS_PER_DAY
  for (
    let monthIndex = SEASON_START_MONTH_INDEX;
    monthIndex <= SEASON_END_MONTH_INDEX;
    monthIndex += 1
  ) {
    const firstOfMonth = Date.UTC(seasonYear, monthIndex, 1)
    if (firstOfMonth >= weekStart.getTime() && firstOfMonth <= weekEnd) {
      return monthHeader(monthIndex)
    }
  }
  return null
}

function monthHeader(monthIndex: number): string {
  const monthName = MONTH_NAMES[monthIndex]
  if (!monthName) return ''
  return monthName.charAt(0).toUpperCase() + monthName.slice(1)
}

function groupMatchesByTeamWeek(
  matches: readonly PlayedMatchRecord[],
): Map<string, PlayedMatchRecord[]> {
  const matchesByCell = new Map<string, PlayedMatchRecord[]>()
  for (const match of matches) {
    const playedOn = parseCalendarDate(match.playedOn)
    if (!playedOn) continue
    const weekStart = formatCalendarDate(startOfMondayWeek(playedOn))
    const key = cellKey(match.libraryId, weekStart)
    const cellMatches = matchesByCell.get(key) ?? []
    cellMatches.push(match)
    matchesByCell.set(key, cellMatches)
  }
  return matchesByCell
}

function buildRows(
  teams: readonly PlayedMatchCalendarTeam[],
  seasonMatches: readonly PlayedMatchRecord[],
  weekStarts: readonly Date[],
  matchesByCell: Map<string, PlayedMatchRecord[]>,
  now: Date,
): PlayedMatchCalendarRow[] {
  const rowTeams = rowTeamsInOrder(teams, seasonMatches)

  return rowTeams.map((team) => {
    const cells = weekStarts.map((weekStartDate) => {
      const weekStart = formatCalendarDate(weekStartDate)
      const cellMatches = sortMatchesNewestFirst(matchesByCell.get(cellKey(team.slug, weekStart)) ?? [])
      return buildCell(team, weekStart, cellMatches, now)
    })

    return {
      teamSlug: team.slug,
      teamName: team.name,
      cells,
    }
  })
}

function rowTeamsInOrder(
  teams: readonly PlayedMatchCalendarTeam[],
  seasonMatches: readonly PlayedMatchRecord[],
): PlayedMatchCalendarTeam[] {
  const ordered = teams.map((team) => ({ slug: team.slug, name: team.name }))
  const seen = new Set(ordered.map((team) => team.slug))

  const extras = new Map<string, string>()
  for (const match of seasonMatches) {
    if (seen.has(match.libraryId) || extras.has(match.libraryId)) continue
    extras.set(match.libraryId, match.libraryName)
  }

  const extraTeams = [...extras.entries()]
    .sort((left, right) => left[1].localeCompare(right[1], 'es'))
    .map(([slug, name]) => ({ slug, name }))

  return [...ordered, ...extraTeams]
}

function buildCell(
  team: PlayedMatchCalendarTeam,
  weekStart: string,
  cellMatches: readonly PlayedMatchRecord[],
  now: Date,
): PlayedMatchCalendarCell {
  if (cellMatches.length === 0) {
    return {
      weekStart,
      intensityLevel: 0,
      isNew: false,
      href: null,
      ariaLabel: null,
      matches: [],
    }
  }

  const matches = cellMatches.map((match) => {
    const isNew = isUploadWithinLastSevenDays(match.firstUploaded, now)
    return {
      id: match.id,
      href: playedMatchHref(team.slug, match.rivalLabel),
      tooltipText: formatPlayedMatchTooltip(match),
      isNew,
    }
  })
  const clipCount = cellMatches.reduce((sum, match) => sum + match.clipCount, 0)
  const newest = matches[0]
  const accessibleMatches = matches.map((match) =>
    match.isNew ? `${match.tooltipText} · Nuevo` : match.tooltipText,
  )

  return {
    weekStart,
    intensityLevel: clipCountToIntensityLevel(clipCount),
    isNew: matches.some((match) => match.isNew),
    href: newest?.href ?? null,
    ariaLabel: `${team.name}, semana del ${formatCalendarDay(weekStart)}: ${accessibleMatches.join('. ')}`,
    matches,
  }
}

function sortMatchesNewestFirst(matches: readonly PlayedMatchRecord[]): PlayedMatchRecord[] {
  return [...matches].sort((left, right) => {
    if (left.playedOn !== right.playedOn) {
      return right.playedOn < left.playedOn ? -1 : 1
    }
    if (left.id === right.id) return 0
    return right.id < left.id ? -1 : 1
  })
}

function cellKey(teamSlug: string, weekStart: string): string {
  return `${teamSlug}\u0000${weekStart}`
}

function formatOpponentLabel(rivalLabel: string): string {
  if (/\svs\s/i.test(rivalLabel)) return rivalLabel
  return `vs ${rivalLabel}`
}

function formatMatchGoals(homeGoals: number | null, awayGoals: number | null): string | null {
  if (homeGoals == null || awayGoals == null) return null
  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return null
  return `${homeGoals}–${awayGoals}`
}

function parseUploadedAt(value: string | null): number | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseCalendarDate(value)?.getTime() ?? null
  }
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

function startOfMondayWeek(date: Date): Date {
  const weekday = date.getUTCDay()
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1
  return addUtcDays(date, -daysSinceMonday)
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MILLISECONDS_PER_DAY)
}
