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

function playbackFps(fps: number | null | undefined): number {
  if (typeof fps !== 'number' || !Number.isFinite(fps) || fps <= 0) {
    return DEFAULT_CLIP_FPS
  }
  return fps
}

export function frameDurationSeconds(fps: number | null | undefined): number {
  return 1 / playbackFps(fps)
}

/**
 * Move one frame while paused. The step is `frameIndex / fps`, so a stored
 * rate such as 59.94 stays on that grid. Adding `1/fps` on each press drifts.
 * Times are clamped to the file when its duration is known.
 */
export function stepPausedFrameTime(input: {
  currentTimeS: number
  direction: -1 | 1
  fps: number | null | undefined
  durationS?: number | null
}): number {
  const fps = playbackFps(input.fps)
  const current = Number.isFinite(input.currentTimeS)
    ? Math.max(0, input.currentTimeS)
    : 0
  const frameIndex = Math.round(current * fps)
  const nextIndex = Math.max(0, frameIndex + input.direction)
  const next = nextIndex / fps
  const duration = input.durationS
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    return next
  }
  return Math.min(next, duration)
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
