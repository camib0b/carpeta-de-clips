'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Playback constants mirrored from the AVA desktop player (components/VideoPlayer.cpp):
 *   small seek 250ms, big seek 3000ms, rate 0.25..4.0 step 0.25.
 */
export const SEEK_SMALL_MS = 250
export const SEEK_BIG_MS = 3000
export const RATE_MIN = 0.25
export const RATE_MAX = 4.0
export const RATE_STEP = 0.25

export interface VideoPlayerState {
  currentTimeMs: number
  durationMs: number
  playing: boolean
  rate: number
  muted: boolean
  ready: boolean
}

export interface VideoPlayerActions {
  play: () => void
  pause: () => void
  togglePlay: () => void
  seekToMs: (positionMs: number) => void
  seekByMs: (deltaMs: number) => void
  setRate: (rate: number) => void
  stepRate: (deltaSteps: number) => void
  resetRate: () => void
  toggleMute: () => void
}

export interface UseVideoPlayerResult {
  videoRef: React.RefObject<HTMLVideoElement | null>
  state: VideoPlayerState
  actions: VideoPlayerActions
}

function clampRate(rate: number): number {
  return Math.min(RATE_MAX, Math.max(RATE_MIN, rate))
}

/**
 * Wraps an `<video>` element with reactive state + imperative actions, reproducing the desktop
 * Work Window playback semantics for the web. The consumer attaches `videoRef` to its
 * `<video>` element.
 */
export function useVideoPlayer(): UseVideoPlayerResult {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [state, setState] = useState<VideoPlayerState>({
    currentTimeMs: 0,
    durationMs: 0,
    playing: false,
    rate: 1.0,
    muted: false,
    ready: false,
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    const updateTime = () => {
      setState((prev) => ({
        ...prev,
        currentTimeMs: Math.round(video.currentTime * 1000),
      }))
    }
    const updateDuration = () => {
      setState((prev) => ({
        ...prev,
        durationMs: Number.isFinite(video.duration)
          ? Math.round(video.duration * 1000)
          : 0,
        ready: true,
      }))
    }
    const handlePlay = () => setState((prev) => ({ ...prev, playing: true }))
    const handlePause = () => setState((prev) => ({ ...prev, playing: false }))
    const handleRateChange = () =>
      setState((prev) => ({ ...prev, rate: video.playbackRate }))
    const handleVolumeChange = () =>
      setState((prev) => ({ ...prev, muted: video.muted }))

    video.addEventListener('timeupdate', updateTime)
    video.addEventListener('seeking', updateTime)
    video.addEventListener('seeked', updateTime)
    video.addEventListener('durationchange', updateDuration)
    video.addEventListener('loadedmetadata', updateDuration)
    video.addEventListener('play', handlePlay)
    video.addEventListener('playing', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handlePause)
    video.addEventListener('ratechange', handleRateChange)
    video.addEventListener('volumechange', handleVolumeChange)

    return () => {
      video.removeEventListener('timeupdate', updateTime)
      video.removeEventListener('seeking', updateTime)
      video.removeEventListener('seeked', updateTime)
      video.removeEventListener('durationchange', updateDuration)
      video.removeEventListener('loadedmetadata', updateDuration)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('playing', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handlePause)
      video.removeEventListener('ratechange', handleRateChange)
      video.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [])

  const play = useCallback(() => {
    void videoRef.current?.play().catch(() => {
      // Autoplay/interrupt rejections are non-fatal; state syncs via the 'pause' event.
    })
  }, [])

  const pause = useCallback(() => {
    videoRef.current?.pause()
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    if (video.paused) {
      void video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [])

  const seekToMs = useCallback((positionMs: number) => {
    const video = videoRef.current
    if (!video) {
      return
    }
    const durationMs = Number.isFinite(video.duration)
      ? video.duration * 1000
      : Number.POSITIVE_INFINITY
    const clampedMs = Math.min(Math.max(0, positionMs), durationMs)
    video.currentTime = clampedMs / 1000
    setState((prev) => ({ ...prev, currentTimeMs: Math.round(clampedMs) }))
  }, [])

  const seekByMs = useCallback(
    (deltaMs: number) => {
      const video = videoRef.current
      if (!video) {
        return
      }
      seekToMs(Math.round(video.currentTime * 1000) + deltaMs)
    },
    [seekToMs],
  )

  const setRate = useCallback((rate: number) => {
    const video = videoRef.current
    if (!video) {
      return
    }
    const next = clampRate(rate)
    video.playbackRate = next
    setState((prev) => ({ ...prev, rate: next }))
  }, [])

  const stepRate = useCallback(
    (deltaSteps: number) => {
      const video = videoRef.current
      if (!video) {
        return
      }
      setRate(video.playbackRate + deltaSteps * RATE_STEP)
    },
    [setRate],
  )

  const resetRate = useCallback(() => setRate(1.0), [setRate])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    video.muted = !video.muted
    setState((prev) => ({ ...prev, muted: video.muted }))
  }, [])

  return {
    videoRef,
    state,
    actions: {
      play,
      pause,
      togglePlay,
      seekToMs,
      seekByMs,
      setRate,
      stepRate,
      resetRate,
      toggleMute,
    },
  }
}
