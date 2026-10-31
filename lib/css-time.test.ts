import assert from 'node:assert/strict'
import test from 'node:test'

import { cssTimeToMilliseconds } from './css-time'

test('css times parse milliseconds, seconds, and a unitless number', () => {
  assert.equal(cssTimeToMilliseconds('250ms'), 250)
  assert.equal(cssTimeToMilliseconds('0.01ms'), 0.01)
  assert.equal(cssTimeToMilliseconds('1.8s'), 1800)
  assert.equal(cssTimeToMilliseconds('150ms, 100ms'), 150)
  assert.equal(cssTimeToMilliseconds('12'), 12)
  assert.equal(cssTimeToMilliseconds(''), 0)
  assert.equal(cssTimeToMilliseconds('nope'), 0)
})
