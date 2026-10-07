import assert from 'node:assert/strict'
import test from 'node:test'

import { KEYBOARD_SEEK_STEP_SECONDS, videoModalKeyAction, type VideoModalKeyInput } from './video-modal-keyboard'

function keyInput(overrides: Partial<VideoModalKeyInput> = {}): VideoModalKeyInput {
  return {
    key: 'a',
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    repeat: false,
    targetIsEditable: false,
    hasMarkedPlays: true,
    ...overrides,
  }
}

test('space toggles playback and a held space does not toggle again', () => {
  assert.deepEqual(videoModalKeyAction(keyInput({ key: ' ' })), {
    capture: true,
    action: 'toggle-playback',
  })
  assert.deepEqual(videoModalKeyAction(keyInput({ key: ' ', repeat: true })), {
    capture: true,
    action: null,
  })
  assert.deepEqual(videoModalKeyAction(keyInput({ key: 'Spacebar' })), {
    capture: true,
    action: 'toggle-playback',
  })
})

test('space is ignored in editable fields and browser shortcuts', () => {
  assert.deepEqual(
    videoModalKeyAction(keyInput({ key: ' ', targetIsEditable: true })),
    { capture: false, action: null },
  )
  assert.deepEqual(
    videoModalKeyAction(keyInput({ key: ' ', metaKey: true })),
    { capture: false, action: null },
  )
})

test('tab and shift-tab step between marked plays', () => {
  assert.deepEqual(videoModalKeyAction(keyInput({ key: 'Tab' })), {
    capture: true,
    action: 'next-play',
  })
  assert.deepEqual(
    videoModalKeyAction(keyInput({ key: 'Tab', shiftKey: true })),
    { capture: true, action: 'previous-play' },
  )
})

test('tab does not step plays when the clip has no marked plays', () => {
  assert.deepEqual(
    videoModalKeyAction(keyInput({ key: 'Tab', hasMarkedPlays: false })),
    { capture: false, action: null },
  )
  assert.deepEqual(
    videoModalKeyAction(keyInput({ key: 'Tab', shiftKey: true, hasMarkedPlays: false })),
    { capture: false, action: null },
  )
})

test('tab is left to the browser when a command modifier is held', () => {
  assert.deepEqual(
    videoModalKeyAction(keyInput({ key: 'Tab', ctrlKey: true })),
    { capture: false, action: null },
  )
})

test('arrow keys seek the video and brackets step marked plays', () => {
  assert.deepEqual(videoModalKeyAction(keyInput({ key: 'ArrowRight' })), {
    capture: true,
    action: 'seek-forward',
  })
  assert.deepEqual(videoModalKeyAction(keyInput({ key: 'ArrowLeft' })), {
    capture: true,
    action: 'seek-backward',
  })
  assert.deepEqual(
    videoModalKeyAction(keyInput({ key: 'ArrowRight', hasMarkedPlays: false })),
    { capture: true, action: 'seek-forward' },
  )
  assert.deepEqual(videoModalKeyAction(keyInput({ key: ']' })), {
    capture: true,
    action: 'next-play',
  })
  assert.deepEqual(videoModalKeyAction(keyInput({ key: '[' })), {
    capture: true,
    action: 'previous-play',
  })
  assert.equal(KEYBOARD_SEEK_STEP_SECONDS, 5)
})
