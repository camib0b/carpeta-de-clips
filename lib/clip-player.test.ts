import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_CLIP_FPS,
  frameDurationSeconds,
  shouldPreferLowMedia,
  stepPausedFrameTime,
} from './clip-player'

test('shouldPreferLowMedia uses 720p on a narrow viewport, save-data, or a slow link', () => {
  assert.equal(
    shouldPreferLowMedia({
      viewportWidth: 767,
      saveData: false,
      downlinkMbps: 10,
    }),
    true,
  )
  assert.equal(
    shouldPreferLowMedia({
      viewportWidth: 768,
      saveData: false,
      downlinkMbps: 10,
    }),
    false,
  )
  assert.equal(
    shouldPreferLowMedia({
      viewportWidth: 1280,
      saveData: true,
      downlinkMbps: 20,
    }),
    true,
  )
  assert.equal(
    shouldPreferLowMedia({
      viewportWidth: 1280,
      saveData: false,
      downlinkMbps: 2.9,
    }),
    true,
  )
  assert.equal(
    shouldPreferLowMedia({
      viewportWidth: 1280,
      saveData: false,
      downlinkMbps: 3,
    }),
    false,
  )
  assert.equal(
    shouldPreferLowMedia({
      viewportWidth: 1280,
      saveData: false,
      downlinkMbps: null,
    }),
    false,
  )
})

test('frameDurationSeconds defaults to 30 fps and keeps fractional rates', () => {
  assert.equal(frameDurationSeconds(undefined), 1 / DEFAULT_CLIP_FPS)
  assert.equal(frameDurationSeconds(null), 1 / DEFAULT_CLIP_FPS)
  assert.equal(frameDurationSeconds(0), 1 / DEFAULT_CLIP_FPS)
  assert.equal(frameDurationSeconds(24), 1 / 24)
  assert.equal(frameDurationSeconds(59.94), 1 / 59.94)
  assert.notEqual(frameDurationSeconds(59.94), 1 / 60)
  assert.notEqual(frameDurationSeconds(59.94), 1 / 59)
})

test('stepPausedFrameTime moves one frame and stays inside the file', () => {
  assert.equal(
    stepPausedFrameTime({
      currentTimeS: 1,
      direction: 1,
      fps: 24,
      durationS: 10,
    }),
    1 + 1 / 24,
  )
  assert.equal(
    stepPausedFrameTime({
      currentTimeS: 0.01,
      direction: -1,
      fps: 30,
      durationS: 10,
    }),
    0,
  )
  assert.equal(
    stepPausedFrameTime({
      currentTimeS: 9.99,
      direction: 1,
      fps: 30,
      durationS: 10,
    }),
    10,
  )
  assert.equal(
    stepPausedFrameTime({
      currentTimeS: 2,
      direction: -1,
      fps: undefined,
      durationS: null,
    }),
    2 - 1 / 30,
  )
})

test('stepPausedFrameTime stays on a 59.94 fps grid across repeated steps', () => {
  let time = 0
  for (let frame = 1; frame <= 120; frame += 1) {
    time = stepPausedFrameTime({
      currentTimeS: time,
      direction: 1,
      fps: 59.94,
      durationS: 30,
    })
    assert.equal(time, frame / 59.94)
  }

  const back = stepPausedFrameTime({
    currentTimeS: time,
    direction: -1,
    fps: 59.94,
    durationS: 30,
  })
  assert.equal(back, 119 / 59.94)
  assert.notEqual(back, 120 / 60)
})
