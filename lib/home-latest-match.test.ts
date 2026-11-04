import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  formatPlayedOnCaption,
  matchupLabel,
  selectBestPlayPreview,
} from './home-latest-match'

test('formatPlayedOnCaption uses the compact day and month', () => {
  assert.equal(formatPlayedOnCaption('2026-10-25'), 'jugado el 25-oct')
  assert.equal(formatPlayedOnCaption('2026-09-02T15:00:00Z'), 'jugado el 2-sept')
})

test('formatPlayedOnCaption omits a date that is not a calendar day', () => {
  assert.equal(formatPlayedOnCaption('not-a-date'), null)
  assert.equal(formatPlayedOnCaption(''), null)
})

test('selectBestPlayPreview prefers a goal over a full match and keeps order on a tie', () => {
  const previews = [
    { title: 'Partido Completo', clipId: 'full' },
    { title: 'Salidas', clipId: 'press' },
    { title: 'Goles', clipId: 'goals' },
    { title: 'Gol de visita', clipId: 'later-goal' },
  ]
  assert.equal(selectBestPlayPreview(previews)?.clipId, 'goals')
  assert.equal(selectBestPlayPreview([]) , null)
  assert.equal(
    selectBestPlayPreview([
      { title: 'Salidas', clipId: 'first' },
      { title: 'Presiones', clipId: 'second' },
    ])?.clipId,
    'first',
  )
})

test('matchupLabel keeps both sides and collapses broken whitespace', () => {
  assert.equal(matchupLabel('UC', 'COGS'), 'UC vs COGS')
  assert.equal(matchupLabel('Line one\nLine two', '  Sam   Lee '), 'Line one Line two vs Sam Lee')
  assert.equal(matchupLabel('   ', 'COGS'), 'COGS')
  assert.equal(matchupLabel('  ', '  '), 'Partido')
})

test('the home page leads with the latest match, the audience, and no section canyon', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..')
  const page = readFileSync(path.join(repoRoot, 'app/page.tsx'), 'utf8')
  const latest = readFileSync(
    path.join(repoRoot, 'components/latest-uploaded-match-section.tsx'),
    'utf8',
  )
  const privateFolder = readFileSync(
    path.join(repoRoot, 'components/private-team-folder-section.tsx'),
    'utf8',
  )

  const matchUse = page.indexOf('<LatestUploadedMatchSection')
  const folders = page.indexOf('Carpetas públicas')
  assert.ok(matchUse !== -1 && folders !== -1 && matchUse < folders)
  assert.match(page, /para jugadoras y cuerpos técnicos\./)
  assert.match(page, /cursor-pointer/)
  assert.equal(page.includes('mb-28'), false)
  assert.equal(latest.includes('mb-28'), false)
  assert.equal(privateFolder.includes('mb-28'), false)
  assert.match(latest, /formatPlayedOnCaption/)
  assert.match(latest, /cursor-pointer/)
})
