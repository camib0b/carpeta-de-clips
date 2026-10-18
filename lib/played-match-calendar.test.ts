import assert from 'node:assert/strict'
import test from 'node:test'

import { PLAYED_MATCHES_GROUPED_QUERY } from './played-matches'
import {
  buildPlayedMatchCalendar,
  calendarToday,
  clipCountToIntensityLevel,
  columnFadeDelayMilliseconds,
  formatPlayedMatchTooltip,
  isUploadWithinLastSevenDays,
  NEW_UPLOAD_WINDOW_MILLISECONDS,
  PLAYED_MATCH_CELL_FADE_DURATION_MILLISECONDS,
  type PlayedMatchCalendarTeam,
  type PlayedMatchRecord,
} from './played-match-calendar'

const NOW = new Date('2026-10-18T15:00:00.000Z')

const TEAMS: PlayedMatchCalendarTeam[] = [
  { slug: 'uc-sub-16-a', name: 'UC Sub-16 A' },
  { slug: 'uc-primera-b', name: 'UC Primera B' },
  { slug: 'others', name: 'Otros' },
]

test('formatPlayedMatchTooltip shows opponent, score, and played date', () => {
  const tooltip = formatPlayedMatchTooltip({
    rivalLabel: 'Old Reds',
    homeGoals: 2,
    awayGoals: 1,
    playedOn: '2026-10-12',
  })

  assert.equal(tooltip, 'vs Old Reds · 2–1 · 12 oct')
  assert.doesNotMatch(tooltip, /jugado|subido|clips|reciente/i)
})

test('formatPlayedMatchTooltip omits score when goals are missing', () => {
  const tooltip = formatPlayedMatchTooltip({
    rivalLabel: 'COGS vs PWCC',
    homeGoals: null,
    awayGoals: null,
    playedOn: '2026-04-25',
  })

  assert.equal(tooltip, 'COGS vs PWCC · 25 abr')
  assert.doesNotMatch(tooltip, /jugado|subido|clips|reciente/i)
})

test('Nuevo follows the upload clock, not how recently the match was played', () => {
  const now = new Date('2026-10-18T15:00:00.000Z')
  const uploadedExactlySevenDaysAgo = new Date(
    now.getTime() - NEW_UPLOAD_WINDOW_MILLISECONDS,
  ).toISOString()
  const uploadedJustOverSevenDaysAgo = new Date(
    now.getTime() - NEW_UPLOAD_WINDOW_MILLISECONDS - 1,
  ).toISOString()

  assert.equal(isUploadWithinLastSevenDays(uploadedExactlySevenDaysAgo, now), true)
  assert.equal(isUploadWithinLastSevenDays(uploadedJustOverSevenDaysAgo, now), false)
  assert.equal(isUploadWithinLastSevenDays('2026-10-17T15:00:00.000Z', now), true)
  assert.equal(isUploadWithinLastSevenDays(null, now), false)
})

test('calendarToday uses the Santiago calendar date', () => {
  assert.equal(calendarToday(new Date('2026-10-19T02:30:00.000Z')).toISOString(), '2026-10-18T00:00:00.000Z')
  assert.equal(calendarToday(new Date('2026-10-19T04:30:00.000Z')).toISOString(), '2026-10-19T00:00:00.000Z')
})

test('intensity follows the season scale', () => {
  assert.equal(clipCountToIntensityLevel(0), 0)
  assert.equal(clipCountToIntensityLevel(1), 1)
  assert.equal(clipCountToIntensityLevel(10), 1)
  assert.equal(clipCountToIntensityLevel(11), 2)
  assert.equal(clipCountToIntensityLevel(25), 2)
  assert.equal(clipCountToIntensityLevel(26), 3)
  assert.equal(clipCountToIntensityLevel(50), 3)
  assert.equal(clipCountToIntensityLevel(51), 4)
})

test('column fade finishes in under 400ms at 8ms per column or less', () => {
  for (const columnCount of [1, 8, 34, 48]) {
    const delays = Array.from({ length: columnCount }, (_, columnIndex) =>
      columnFadeDelayMilliseconds(columnIndex, columnCount),
    )
    assert.equal(delays[0], 0)
    const finish =
      delays[delays.length - 1] + PLAYED_MATCH_CELL_FADE_DURATION_MILLISECONDS
    assert.ok(finish < 400, `column count ${columnCount} finished at ${finish}ms`)
    for (let index = 1; index < delays.length; index += 1) {
      assert.ok(delays[index] - delays[index - 1] <= 8)
    }
  }
})

test('buildPlayedMatchCalendar shows the current season by the week each match was played', () => {
  const calendar = buildPlayedMatchCalendar({
    teams: TEAMS,
    now: NOW,
    matches: [
      match({
        id: 'old-season',
        playedOn: '2024-03-15',
        libraryId: 'uc-primera-b',
        rivalLabel: 'PWCC',
        clipCount: 40,
        firstUploaded: '2024-03-20T10:00:00.000Z',
      }),
      match({
        id: 'october-home',
        playedOn: '2026-10-12',
        libraryId: 'uc-primera-b',
        rivalLabel: 'Old Reds',
        homeGoals: 2,
        awayGoals: 1,
        clipCount: 34,
        firstUploaded: '2026-10-15T08:00:00.000Z',
      }),
      match({
        id: 'may-away',
        playedOn: '2026-05-16',
        libraryId: 'uc-sub-16-a',
        rivalLabel: 'Manquehue',
        homeGoals: null,
        awayGoals: null,
        clipCount: 8,
        firstUploaded: '2026-05-20T10:00:00.000Z',
      }),
      match({
        id: 'same-week-later',
        playedOn: '2026-10-14',
        libraryId: 'uc-primera-b',
        rivalLabel: 'PWCC',
        homeGoals: 1,
        awayGoals: 0,
        clipCount: 20,
        firstUploaded: '2026-09-01T10:00:00.000Z',
      }),
    ],
  })

  assert.equal(calendar.seasonYear, 2026)
  assert.equal(calendar.weeks[0]?.start, '2026-02-23')
  assert.equal(calendar.weeks[calendar.weeks.length - 1]?.start, '2026-10-12')
  assert.deepEqual(
    calendar.monthLabels.map((month) => month.label),
    ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sept', 'Oct'],
  )
  assert.equal(
    calendar.monthLabels.reduce((sum, month) => sum + month.span, 0),
    calendar.weeks.length,
  )
  assert.deepEqual(
    calendar.rows.map((row) => row.teamSlug),
    ['uc-sub-16-a', 'uc-primera-b', 'others'],
  )
  const primera = calendar.rows[1]
  assert.ok(primera)
  const octoberCell = primera.cells.find((cell) => cell.weekStart === '2026-10-12')
  assert.ok(octoberCell)
  assert.equal(octoberCell.intensityLevel, 4)
  assert.equal(octoberCell.isNew, true)
  assert.equal(octoberCell.href, '/uc-primera-b?rival=pwcc')
  assert.equal(octoberCell.matches[0]?.id, 'same-week-later')
  assert.equal(octoberCell.matches[1]?.id, 'october-home')
  assert.equal(octoberCell.matches[1]?.tooltipText, 'vs Old Reds · 2–1 · 12 oct')
  assert.match(octoberCell.ariaLabel ?? '', /Nuevo/)
  assert.doesNotMatch(octoberCell.ariaLabel ?? '', /reciente/i)
  assert.equal(octoberCell.matches[0]?.isNew, false)
  assert.equal(octoberCell.matches[1]?.isNew, true)

  const youth = calendar.rows[0]
  const mayCell = youth?.cells.find((cell) => cell.weekStart === '2026-05-11')
  assert.equal(mayCell?.intensityLevel, 1)
  assert.equal(mayCell?.isNew, false)
  assert.equal(mayCell?.href, '/uc-sub-16-a?rival=manquehue')
  assert.equal(mayCell?.matches[0]?.tooltipText, 'vs Manquehue · 16 may')

  const emptyWeek = primera.cells.find((cell) => cell.weekStart === '2026-03-02')
  assert.equal(emptyWeek?.href, null)
  assert.equal(emptyWeek?.ariaLabel, null)
  assert.equal(emptyWeek?.matches.length, 0)

  const finish =
    calendar.fadeDelayMillisecondsByColumn[calendar.fadeDelayMillisecondsByColumn.length - 1] +
    calendar.fadeDurationMilliseconds
  assert.ok(finish < 400)
})

test('a past season still runs March through December', () => {
  const calendar = buildPlayedMatchCalendar({
    teams: [{ slug: 'uc-primera-b', name: 'UC Primera B' }],
    now: NOW,
    matches: [
      match({
        id: 'march-2024',
        playedOn: '2024-03-10',
        libraryId: 'uc-primera-b',
        rivalLabel: 'Old Girls',
        clipCount: 4,
        firstUploaded: '2024-03-12T10:00:00.000Z',
      }),
    ],
  })

  assert.equal(calendar.seasonYear, 2024)
  assert.equal(calendar.weeks[0]?.start, '2024-02-26')
  assert.equal(calendar.weeks[calendar.weeks.length - 1]?.start, '2024-12-30')
  assert.equal(calendar.monthLabels[0]?.label, 'Mar')
  assert.equal(calendar.monthLabels[calendar.monthLabels.length - 1]?.label, 'Dic')
})

test('the grouped match query is a single aggregation', () => {
  assert.match(PLAYED_MATCHES_GROUPED_QUERY, /COUNT\(c\.id\) AS clip_count/)
  assert.match(PLAYED_MATCHES_GROUPED_QUERY, /MIN\(c\.uploaded_at\) AS first_uploaded/)
  assert.match(PLAYED_MATCHES_GROUPED_QUERY, /GROUP BY m\.id/)
  assert.equal(PLAYED_MATCHES_GROUPED_QUERY.match(/GROUP BY/gi)?.length, 1)
  assert.doesNotMatch(PLAYED_MATCHES_GROUPED_QUERY, /ALTER|CREATE TABLE/i)
})

function match(overrides: Partial<PlayedMatchRecord> & Pick<PlayedMatchRecord, 'id' | 'playedOn' | 'libraryId' | 'rivalLabel' | 'clipCount' | 'firstUploaded'>): PlayedMatchRecord {
  return {
    libraryName: 'UC Primera B',
    homeGoals: 1,
    awayGoals: 0,
    ...overrides,
  }
}
