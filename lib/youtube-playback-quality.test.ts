import assert from 'node:assert/strict'
import test from 'node:test'

import { highestAvailablePlaybackQuality } from './youtube-playback-quality'

test('highestAvailablePlaybackQuality picks the sharpest concrete level', () => {
  assert.equal(
    highestAvailablePlaybackQuality(['hd720', 'hd1080', 'large', 'auto']),
    'hd1080',
  )
  assert.equal(
    highestAvailablePlaybackQuality(['tiny', 'medium', 'hd2160', 'hd1080']),
    'hd2160',
  )
  assert.equal(
    highestAvailablePlaybackQuality(['hd1080', 'highres', 'hd720']),
    'highres',
  )
  assert.equal(
    highestAvailablePlaybackQuality(['hd1080', 'hd2880']),
    'hd2880',
  )
  assert.equal(highestAvailablePlaybackQuality(['small']), 'small')
})

test('highestAvailablePlaybackQuality ignores auto and empty lists', () => {
  assert.equal(highestAvailablePlaybackQuality([]), null)
  assert.equal(highestAvailablePlaybackQuality(['auto', 'default']), null)
})
