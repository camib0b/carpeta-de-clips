import assert from 'node:assert/strict'
import test from 'node:test'

import {
  instancesFromSidecar,
  validateClipsSidecar,
  type ClipsSidecar,
} from './clip-instances'

const validSidecar: ClipsSidecar = {
  schemaVersion: 1,
  video: 'demo.mp4',
  durationS: 19.019,
  verified: true,
  clips: [
    {
      ord: 1,
      offsetS: 0,
      durationS: 19.019,
      xmlInstanceId: 3,
      labels: { QUARTOS: 'Q1', RESULTADO: 'UCB 0 - 0 OR' },
    },
  ],
}

test('validateClipsSidecar accepts a valid sidecar', () => {
  validateClipsSidecar(validSidecar)
  const instances = instancesFromSidecar(validSidecar)
  assert.equal(instances.length, 1)
  assert.equal(instances[0].quarter, 'Q1')
})

test('validateClipsSidecar rejects non-contiguous ord', () => {
  assert.throws(() =>
    validateClipsSidecar({
      ...validSidecar,
      clips: [{ ord: 2, offsetS: 0, durationS: 10 }],
    }),
  )
})

test('validateClipsSidecar rejects non-increasing offsets', () => {
  assert.throws(() =>
    validateClipsSidecar({
      ...validSidecar,
      durationS: 30,
      clips: [
        { ord: 1, offsetS: 5, durationS: 10 },
        { ord: 2, offsetS: 5, durationS: 10 },
      ],
    }),
  )
})

test('validateClipsSidecar rejects unverified without flag', () => {
  assert.throws(() =>
    validateClipsSidecar({ ...validSidecar, verified: false }),
  )
  validateClipsSidecar({ ...validSidecar, verified: false }, {
    allowUnverified: true,
  })
})
