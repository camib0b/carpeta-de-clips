import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { formatHomeAwayMatchup } from '../team-abbreviations'
import { formatMatchScore, listUniqueMatchSummaries } from '../match-display'
import { clipLibraryEmptyState } from './clip-library-empty-state'
import {
  LARGE_AWAY_GOALS,
  LARGE_HOME_GOALS,
  LONG_CLIP_LIST_COUNT,
  LONG_OPPONENT_NAME,
  LONG_PLAYER_NAME,
  LONG_TEAM_NAME,
  MANY_MATCH_COUNT,
  NARROW_CONTENT_PX,
  UNBREAKABLE_LABEL,
  estimatedLineWidthPx,
  emptyClipList,
  longestToken,
  worstCaseClips,
  worstCaseMatches,
  worstCaseScoreLabel,
  worstCaseTeam,
} from './worst-case-fixtures'

const repoRoot = path.resolve(import.meta.dirname, '../..')

function source(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

test('worst-case names and the unbreakable label exceed the 320px content column on one line', () => {
  assert.ok(estimatedLineWidthPx(LONG_TEAM_NAME, 24) > NARROW_CONTENT_PX)
  assert.ok(estimatedLineWidthPx(LONG_PLAYER_NAME, 16) > 180)
  assert.ok(estimatedLineWidthPx(UNBREAKABLE_LABEL, 16) + 32 + 16 > NARROW_CONTENT_PX)
  assert.equal(longestToken(UNBREAKABLE_LABEL), UNBREAKABLE_LABEL)
  assert.equal(worstCaseTeam.name, LONG_TEAM_NAME)
})

test('a fixed 200px filter trigger plus its label overflows the narrow page', () => {
  const conceptLabelPx = 82
  const gapPx = 12
  const fixedTriggerPx = 200
  assert.ok(conceptLabelPx + gapPx + fixedTriggerPx > NARROW_CONTENT_PX)
})

test('formatters keep long names and large scores intact', () => {
  const matchup = formatHomeAwayMatchup(LONG_TEAM_NAME, LONG_OPPONENT_NAME)
  assert.ok(matchup.includes(LONG_TEAM_NAME))
  assert.ok(matchup.includes(LONG_OPPONENT_NAME))

  const [firstMatch] = worstCaseMatches()
  assert.ok(firstMatch)
  const score = formatMatchScore(firstMatch)
  assert.equal(score, worstCaseScoreLabel())
  assert.ok(score?.includes(String(LARGE_HOME_GOALS)))
  assert.ok(score?.includes(String(LARGE_AWAY_GOALS)))
  assert.equal(score?.includes('NaN'), false)
})

test('fixtures cover an empty library, one short name, and a long clip list', () => {
  assert.equal(emptyClipList.length, 0)

  const clips = worstCaseClips()
  assert.equal(clips.length, LONG_CLIP_LIST_COUNT)
  assert.ok(clips.some((clip) => clip.title.startsWith('Jo ')))
  assert.ok(clips.some((clip) => clip.title.startsWith('J ')))
  assert.ok(clips.some((clip) => clip.title.includes(LONG_PLAYER_NAME)))
  assert.ok(clips.some((clip) => clip.title.includes(UNBREAKABLE_LABEL)))

  const matches = listUniqueMatchSummaries(clips)
  assert.ok(matches.length >= MANY_MATCH_COUNT)
  assert.equal(worstCaseMatches().length, MANY_MATCH_COUNT)
})

test('an empty carpeta does not pretend the filters excluded every clip', () => {
  const emptyLibrary = clipLibraryEmptyState(false)
  assert.equal(emptyLibrary.offerClearFilters, false)
  assert.match(emptyLibrary.message, /todavía no tiene clips/i)

  const filteredEmpty = clipLibraryEmptyState(true)
  assert.equal(filteredEmpty.offerClearFilters, true)
  assert.match(filteredEmpty.message, /filtros/)
})

test('team identity rows can wrap and keep the icon and clip count', () => {
  const header = source('components/team-header.tsx')
  const landing = source('app/page.tsx')
  const icon = source('components/team-icon.tsx')

  assert.match(header, /min-w-0 wrap-anywhere/)
  assert.match(landing, /min-w-0 wrap-anywhere/)
  assert.match(landing, /shrink-0 items-center gap-3/)
  assert.match(landing, /Todavía no hay equipos públicos/)
  assert.match(icon, /shrink-0/)
})

test('cards, banners, and the latest-upload row wrap instead of overflowing', () => {
  const card = source('components/video-card.tsx')
  const grid = source('components/video-grid.tsx')
  const banner = source('components/match-context-banner.tsx')
  const latest = source('components/latest-uploaded-match-section.tsx')

  assert.match(card, /line-clamp-2 wrap-anywhere/)
  assert.match(card, /title=\{video\.title\}/)
  assert.match(card, /min-w-0/)
  assert.match(grid, /grid min-w-0 grid-cols-1/)
  assert.match(grid, /clipLibraryEmptyState/)
  assert.match(banner, /min-w-0 flex-1/)
  assert.match(banner, /wrap-anywhere/)
  assert.match(latest, /wrap-anywhere/)
  assert.match(latest, /grid min-w-0 grid-cols-4/)
  assert.match(latest, /shrink-0/)
})

test('filters shrink on a narrow page and long options wrap inside a scrolling menu', () => {
  const filters = source('components/video-filters.tsx')

  assert.match(filters, /minmax\(0,1fr\)/)
  assert.match(filters, /title=\{triggerLabel\}/)
  assert.match(filters, /min-w-0 truncate/)
  assert.match(filters, /wrap-anywhere/)
  assert.match(filters, /max-h-\[min\(24rem,70dvh\)\]/)
  assert.equal(filters.includes('triggerClassName="w-[200px]"'), false)
  assert.equal(filters.includes('triggerClassName="w-[180px]"'), false)
})

test('calendar labels truncate with the full name available, and tooltips wrap', () => {
  const calendar = source('components/played-matches-calendar.tsx')

  assert.match(calendar, /title=\{row\.teamName\}/)
  assert.match(calendar, /truncate/)
  assert.match(calendar, /wrap-anywhere/)
})

test('the clip modal wraps titles and keeps truncated jugada text readable', () => {
  const modal = source('components/video-modal.tsx')

  assert.match(modal, /wrap-anywhere/)
  assert.match(modal, /title=\{instance\.scoreLabel\}/)
  assert.match(modal, /title=\{instance\.quarter\}/)
  assert.match(modal, /minmax\(0,max-content\)/)
})
