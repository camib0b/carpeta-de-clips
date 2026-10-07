/**
 * Shared playback handle for the YouTube embed and the self-hosted <video>.
 * The modal is the only caller; both players implement this so jugada seeks,
 * polling, and the keyboard shortcuts do not care which element is on screen.
 */
export type ClipPlaybackHandle = {
  getCurrentTime: () => number
  seekTo: (seconds: number) => void
  play: () => void
  pause: () => void
  isPlaying: () => boolean
}

export const PLAYBACK_RATES = [0.25, 0.5, 1, 2] as const

export type PlaybackRate = (typeof PLAYBACK_RATES)[number]

/** Used when a self-hosted clip has no probed `fps`. */
export const DEFAULT_CLIP_FPS = 30

/** Matches the Tailwind `md` breakpoint: below this width we request 720p. */
export const LOW_MEDIA_VIEWPORT_WIDTH_PX = 768

/** `navigator.connection.downlink` is megabits per second. */
export const SLOW_DOWNLINK_MBPS = 3

export type MediaConnectionSnapshot = {
  viewportWidth: number
  saveData: boolean
  downlinkMbps: number | null
}

type NetworkInformationLike = {
  saveData?: boolean
  downlink?: number
}

export function shouldPreferLowMedia(snapshot: MediaConnectionSnapshot): boolean {
  if (snapshot.viewportWidth < LOW_MEDIA_VIEWPORT_WIDTH_PX) {
    return true
  }
  if (snapshot.saveData) {
    return true
  }
  if (
    snapshot.downlinkMbps != null &&
    snapshot.downlinkMbps < SLOW_DOWNLINK_MBPS
  ) {
    return true
  }
  return false
}

/**
 * Read once when the modal opens. The chosen file stays for that open clip
 * so a resize does not swap the URL mid-playback.
 */
export function readMediaConnectionSnapshot(): MediaConnectionSnapshot {
  if (typeof window === 'undefined') {
    return {
      viewportWidth: LOW_MEDIA_VIEWPORT_WIDTH_PX,
      saveData: false,
      downlinkMbps: null,
    }
  }

  const connection = (
    navigator as Navigator & { connection?: NetworkInformationLike }
  ).connection
  const downlink = connection?.downlink

  return {
    viewportWidth: window.innerWidth,
    saveData: connection?.saveData === true,
    downlinkMbps:
      typeof downlink === 'number' && Number.isFinite(downlink) ? downlink : null,
  }
}

export function frameDurationSeconds(fps: number | null | undefined): number {
  if (fps == null || !Number.isFinite(fps) || fps <= 0) {
    return 1 / DEFAULT_CLIP_FPS
  }
  return 1 / fps
}

/**
 * Move one frame while paused. Times are clamped to the file when its
 * duration is known.
 */
export function stepPausedFrameTime(input: {
  currentTimeS: number
  direction: -1 | 1
  fps: number | null | undefined
  durationS?: number | null
}): number {
  const current = Number.isFinite(input.currentTimeS) ? input.currentTimeS : 0
  const next = current + input.direction * frameDurationSeconds(input.fps)
  const atOrAfterZero = Math.max(0, next)
  const duration = input.durationS
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    return atOrAfterZero
  }
  return Math.min(atOrAfterZero, duration)
}

export function formatPlaybackRate(rate: number): string {
  return `${rate}×`
}

export function htmlVideoPlaybackHandle(
  element: HTMLVideoElement,
): ClipPlaybackHandle {
  return {
    getCurrentTime: () => element.currentTime,
    seekTo: (seconds: number) => {
      element.currentTime = seconds
    },
    play: () => {
      void element.play()
    },
    pause: () => {
      element.pause()
    },
    isPlaying: () => !element.paused && !element.ended,
  }
}
