/**
 * Keyboard behavior for the clip modal.
 * Space toggles playback. Arrow left and right seek by a short step.
 * Arrow up and down, Tab, Shift-Tab, and the bracket keys step between marked plays.
 * Comma and period are not handled here; the modal frame-steps self-hosted clips itself.
 */

export const KEYBOARD_SEEK_STEP_SECONDS = 5

export type VideoModalKeyAction =
  | 'toggle-playback'
  | 'previous-play'
  | 'next-play'
  | 'seek-backward'
  | 'seek-forward'

export interface VideoModalKeyInput {
  key: string
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  repeat: boolean
  targetIsEditable: boolean
  hasMarkedPlays: boolean
}

export interface VideoModalKeyDecision {
  /** Stop the browser and the focused control from handling this key. */
  capture: boolean
  action: VideoModalKeyAction | null
}

function hasBrowserShortcutModifier(input: VideoModalKeyInput): boolean {
  return input.altKey || input.ctrlKey || input.metaKey
}

function isSpaceKey(key: string): boolean {
  return key === ' ' || key === 'Spacebar'
}

/**
 * Decide what the open clip modal should do with a keydown.
 * Editable fields and browser shortcuts (Ctrl/Alt/Cmd) are left alone.
 * A repeated Space is swallowed so it does not scroll or toggle twice.
 * Arrow up and down are captured when the clip has marked plays so the page does not scroll.
 */
export function videoModalKeyAction(input: VideoModalKeyInput): VideoModalKeyDecision {
  if (input.targetIsEditable || hasBrowserShortcutModifier(input)) {
    return { capture: false, action: null }
  }

  if (isSpaceKey(input.key)) {
    return {
      capture: true,
      action: input.repeat ? null : 'toggle-playback',
    }
  }

  if (input.key === 'Tab') {
    if (!input.hasMarkedPlays) {
      return { capture: false, action: null }
    }
    return {
      capture: true,
      action: input.shiftKey ? 'previous-play' : 'next-play',
    }
  }

  if (input.key === 'ArrowLeft') {
    return { capture: true, action: 'seek-backward' }
  }

  if (input.key === 'ArrowRight') {
    return { capture: true, action: 'seek-forward' }
  }

  if (!input.hasMarkedPlays) {
    return { capture: false, action: null }
  }

  if (input.key === 'ArrowUp') {
    return { capture: true, action: 'previous-play' }
  }

  if (input.key === 'ArrowDown') {
    return { capture: true, action: 'next-play' }
  }

  if (input.key === '[') {
    return { capture: true, action: 'previous-play' }
  }

  if (input.key === ']') {
    return { capture: true, action: 'next-play' }
  }

  return { capture: false, action: null }
}
