import assert from 'node:assert/strict'
import test from 'node:test'

import { formatMatchDate } from './match-display'

test('formatMatchDate uses a compact day-month-year label', () => {
  assert.equal(formatMatchDate('2026-09-26'), '26-sept-2026')
  assert.equal(formatMatchDate('2024-03-05'), '5-mar-2024')
  assert.equal(formatMatchDate('2026-09-26T03:00:00.000Z'), '26-sept-2026')
})

test('formatMatchDate leaves unrecognized values unchanged', () => {
  assert.equal(formatMatchDate('not-a-date'), 'not-a-date')
})
