import assert from 'node:assert/strict'
import test from 'node:test'

import { highestAvailablePlaybackQuality } from './youtube-playback-quality'

test('highestAvailablePlaybackQuality prefers the sharpest known level', () => {
  assert.equal(
    highestAvailablePlaybackQuality(['small', 'hd1080', 'medium']),
    'hd1080',
  )
  assert.equal(highestAvailablePlaybackQuality(['large', 'hd720']), 'hd720')
  assert.equal(highestAvailablePlaybackQuality(['hd1440', 'hd2160']), 'hd2160')
  assert.equal(highestAvailablePlaybackQuality(['tiny', 'highres']), 'highres')
})

test('highestAvailablePlaybackQuality ranks an unknown hd pixel height by its number', () => {
  assert.equal(highestAvailablePlaybackQuality(['hd480', 'tiny']), 'hd480')
  assert.equal(highestAvailablePlaybackQuality(['highres', 'hd4320']), 'hd4320')
  assert.equal(highestAvailablePlaybackQuality(['hd720', 'hd480']), 'hd480')
})

test('highestAvailablePlaybackQuality ignores labels that are not a concrete size', () => {
  assert.equal(highestAvailablePlaybackQuality([]), null)
  assert.equal(
    highestAvailablePlaybackQuality(['auto', 'default', 'HD1080', 'hd', '']),
    null,
  )
})
