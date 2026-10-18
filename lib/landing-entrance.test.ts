import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LANDING_ENTRANCE_DELAY_CAP_MS,
  landingEntranceDelay,
} from './landing-entrance'

test('landing entrance delays stagger and cap near 300ms', () => {
  assert.equal(landingEntranceDelay(0, 50), '0ms')
  assert.equal(landingEntranceDelay(1, 50), '50ms')
  assert.equal(landingEntranceDelay(2, 50), '100ms')
  assert.equal(landingEntranceDelay(7, 40), '280ms')
  assert.equal(landingEntranceDelay(8, 40), `${LANDING_ENTRANCE_DELAY_CAP_MS}ms`)
  assert.equal(landingEntranceDelay(20, 50), `${LANDING_ENTRANCE_DELAY_CAP_MS}ms`)
})
