'use client'

import { useEffect } from 'react'

import {
  SEEK_BIG_MS,
  SEEK_SMALL_MS,
  type VideoPlayerActions,
} from '@/hooks/use-video-player'

interface UsePlaybackShortcutsOptions {
  actions: VideoPlayerActions
  /** When false, no shortcuts are bound (e.g. video not loaded). */
  enabled?: boolean
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** Mirrors the desktop focus gate: ignore shortcuts while the user is typing in a field. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (EDITABLE_TAGS.has(target.tagName)) {
    return true
  }
  return target.isContentEditable
}

/**
 * Global keyboard shortcuts reproducing the AVA desktop bindings:
 *   Space play/pause, Arrow Left/Right +/-250ms, Shift+Arrow +/-3000ms,
 *   `-` slower, `+` faster, Shift+`}` reset speed.
 */
export function usePlaybackShortcuts({
  actions,
  enabled = true,
}: UsePlaybackShortcutsOptions): void {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      switch (event.key) {
        case ' ':
        case 'Spacebar':
          event.preventDefault()
          actions.togglePlay()
          break
        case 'ArrowLeft':
          event.preventDefault()
          actions.seekByMs(event.shiftKey ? -SEEK_BIG_MS : -SEEK_SMALL_MS)
          break
        case 'ArrowRight':
          event.preventDefault()
          actions.seekByMs(event.shiftKey ? SEEK_BIG_MS : SEEK_SMALL_MS)
          break
        case '-':
          event.preventDefault()
          actions.stepRate(-1)
          break
        case '+':
        case '=':
          event.preventDefault()
          actions.stepRate(1)
          break
        case '}':
          event.preventDefault()
          actions.resetRate()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [actions, enabled])
}
