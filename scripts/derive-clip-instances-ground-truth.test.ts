/**
 * Ground-truth check for derive-clip-instances (requires local AVA export files).
 *
 *   pnpm exec tsx --test scripts/derive-clip-instances-ground-truth.test.ts
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { teamCodeFromCompiledFilename } from '../lib/ava-clip-filename'
import {
  derivedCandidateToInstances,
  findDerivedClipCandidates,
  resolveDerivedClipCandidate,
} from '../lib/derive-clip-instances-core'
import { probeVideoWithFfprobe } from '../lib/ffprobe-media'
import {
  instancesForCode,
  parseMatchXmlInstances,
} from '../lib/match-xml-parse'

const MATCH_FOLDER =
  '/Users/cam/Documents/VA/UC/1B/2026 Torneo 1A/UCB vs OR'
const MATCH_XML = path.join(MATCH_FOLDER, 'UC B vs OR.xml')
const TARGET_MP4 = 'UC B vs OR - 16-yd OR.mp4'

const EXPECTED_OFFSETS_S = [
  0, 19.0, 32.0, 42.5, 65.6, 79.1, 97.6, 110.6, 123.6, 136.6, 148.6, 167.7,
  181.7, 206.7,
]

test('UC B vs OR - 16-yd OR matches overlay-checked timeline (XML may differ in IDs)', {
  skip: !fs.existsSync(path.join(MATCH_FOLDER, TARGET_MP4)),
}, () => {
  const xmlText = fs.readFileSync(MATCH_XML, 'utf8')
  const allXmlInstances = parseMatchXmlInstances(xmlText)
  const teamCode = teamCodeFromCompiledFilename(TARGET_MP4)
  assert.equal(teamCode, 'OR 16YD+')

  const codeInstances = instancesForCode(allXmlInstances, teamCode)
  const probe = probeVideoWithFfprobe(path.join(MATCH_FOLDER, TARGET_MP4))
  const candidates = findDerivedClipCandidates(
    codeInstances,
    probe.keyframeTimesS,
    probe.durationS,
    probe.fps,
  )

  const chosen = resolveDerivedClipCandidate(
    candidates,
    TARGET_MP4,
    () => {},
  )
  const instances = derivedCandidateToInstances(chosen, allXmlInstances)

  assert.equal(instances.length, EXPECTED_OFFSETS_S.length)
  for (let index = 0; index < EXPECTED_OFFSETS_S.length; index += 1) {
    const actual = instances[index].offsetS
    const expected = EXPECTED_OFFSETS_S[index]
    assert.ok(
      Math.abs(actual - expected) < 0.15,
      `offset ord ${index + 1}: expected ${expected}s, got ${actual}s`,
    )
  }
})
