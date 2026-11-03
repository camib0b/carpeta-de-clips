import assert from 'node:assert/strict'
import test from 'node:test'

import { parseMatchXmlInstances, quarterAtTime } from './match-xml-parse'

const SAMPLE_XML = `
<instance>
  <ID>10</ID>
  <start>1.5</start>
  <end>3</end>
  <code>UCB GOAL+</code>
  <label>
    <group>Quarter</group>
    <text>Q1</text>
  </label>
  <label>
    <group>Score</group>
    <text>1-0</text>
  </label>
</instance>
<instance>
  <ID>11</ID>
  <start>4</start>
  <end>9</end>
  <code>Q1</code>
</instance>
<instance>
  <start>1</start>
  <end>2</end>
  <code>SKIP</code>
</instance>
`

test('parseMatchXmlInstances reads tags and labels, and a second pass matches', () => {
  const first = parseMatchXmlInstances(SAMPLE_XML)
  const second = parseMatchXmlInstances(SAMPLE_XML)
  assert.deepEqual(second, first)
  assert.deepEqual(first, [
    {
      id: 10,
      startS: 1.5,
      endS: 3,
      code: 'UCB GOAL+',
      labels: { Quarter: 'Q1', Score: '1-0' },
    },
    {
      id: 11,
      startS: 4,
      endS: 9,
      code: 'Q1',
      labels: {},
    },
  ])
  assert.equal(quarterAtTime(first, 5), 'Q1')
  assert.equal(quarterAtTime(first, 1.5), null)
})
