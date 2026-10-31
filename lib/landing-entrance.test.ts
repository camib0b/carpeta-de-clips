import assert from 'node:assert/strict'
import test from 'node:test'

import { landingEntranceStyle } from './landing-entrance'

test('landing entrance style only sets the step index', () => {
  assert.deepEqual(landingEntranceStyle(0), { '--landing-index': '0' })
  assert.deepEqual(landingEntranceStyle(4), { '--landing-index': '4' })
})
