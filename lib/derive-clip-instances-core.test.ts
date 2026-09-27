import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveDerivedClipCandidate,
  type DerivedClipCandidate,
} from './derive-clip-instances-core'
import type { MatchXmlInstance } from './match-xml-parse'

function mockPick(id: number, boundary: number): DerivedClipCandidate {
  const xmlInstance: MatchXmlInstance = {
    id,
    startS: 0,
    endS: 1,
    code: 'TEST',
    labels: {},
  }
  return {
    xmlPicks: [{ xmlInstance, frameRoundedDurationS: 1 }],
    boundaryTimesS: [boundary],
  }
}

test('resolveDerivedClipCandidate fails on distinct timelines', () => {
  const candidates = [mockPick(1, 10), mockPick(2, 11)]
  assert.throws(
    () => resolveDerivedClipCandidate(candidates, 'test.mp4'),
    /distinct timelines/,
  )
})

test('resolveDerivedClipCandidate picks lexicographic IDs when timeline matches', () => {
  const candidates = [mockPick(2, 10), mockPick(1, 10)]
  const warnings: string[] = []
  const chosen = resolveDerivedClipCandidate(candidates, 'test.mp4', (message) =>
    warnings.push(message),
  )
  assert.equal(chosen.xmlPicks[0].xmlInstance.id, 1)
  assert.equal(warnings.length, 1)
})
