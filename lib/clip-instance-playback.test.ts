import assert from 'node:assert/strict'
import test from 'node:test'

import type { ClipInstance } from './types'
import { findActiveInstanceIndex, stepPlayIndex } from './clip-instance-playback'

const instances: ClipInstance[] = [
  { ord: 1, offsetS: 0, durationS: 19 },
  { ord: 2, offsetS: 19, durationS: 13 },
  { ord: 3, offsetS: 32, durationS: 10.5 },
  { ord: 7, offsetS: 97.6, durationS: 13 },
]

test('findActiveInstanceIndex selects last play at or before current time', () => {
  assert.equal(findActiveInstanceIndex(instances, 0), 0)
  assert.equal(findActiveInstanceIndex(instances, 18.9), 0)
  assert.equal(findActiveInstanceIndex(instances, 19), 1)
  assert.equal(findActiveInstanceIndex(instances, 42.5), 2)
  assert.equal(findActiveInstanceIndex(instances, 97.6), 3)
  assert.equal(findActiveInstanceIndex(instances, 200), 3)
})

test('findActiveInstanceIndex returns 0 for empty list edge via single play', () => {
  assert.equal(
    findActiveInstanceIndex([{ ord: 1, offsetS: 0, durationS: 5 }], -1),
    0,
  )
})

test('stepPlayIndex moves to the neighboring play and stops at the ends', () => {
  assert.equal(stepPlayIndex(4, 0, 'previous'), null)
  assert.equal(stepPlayIndex(4, 0, 'next'), 1)
  assert.equal(stepPlayIndex(4, 2, 'previous'), 1)
  assert.equal(stepPlayIndex(4, 2, 'next'), 3)
  assert.equal(stepPlayIndex(4, 3, 'previous'), 2)
  assert.equal(stepPlayIndex(4, 3, 'next'), null)
})

test('stepPlayIndex stays inside a clip that has no further play', () => {
  assert.equal(stepPlayIndex(0, 0, 'next'), null)
  assert.equal(stepPlayIndex(0, 0, 'previous'), null)
  assert.equal(stepPlayIndex(1, 0, 'previous'), null)
  assert.equal(stepPlayIndex(1, 0, 'next'), null)
  assert.equal(stepPlayIndex(3, -1, 'next'), null)
  assert.equal(stepPlayIndex(3, 3, 'previous'), null)
})
