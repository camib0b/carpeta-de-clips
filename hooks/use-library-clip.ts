'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CLIP_PARAM,
  JUGADA_PARAM,
  buildClipShareHref,
  parseClipId,
  parseJugadaOrd,
  toLibraryHref,
} from '@/lib/library-filters/clip-params'
import type { VideoClip } from '@/lib/types'

function clipIncludesJugada(
  clip: VideoClip | null | undefined,
  jugadaOrd: number | undefined,
): boolean {
  if (!clip || jugadaOrd == null) return false
  return clip.instances?.some((instance) => instance.ord === jugadaOrd) ?? false
}

type SearchParamsReader = {
  get: (name: string) => string | null
}

/**
 * The open clip is the `clip` query param (legacy: `jugada` alone).
 * The modal reads local state so a click opens it before Next applies the URL.
 * `pushState` / `replaceState` keep the query in sync without a dynamic RSC fetch.
 * Opening from the grid pushes a history entry so Back closes the modal.
 * Moves inside the modal replace that entry so Back still returns to the grid.
 */
function clipFromSearchParams(
  videos: readonly VideoClip[],
  searchParams: SearchParamsReader,
): VideoClip | null {
  const rawClip = searchParams.get(CLIP_PARAM)
  const clipId = parseClipId(rawClip)
  const clipParamWasProvided = rawClip != null && rawClip !== ''
  const jugadaOrd = parseJugadaOrd(searchParams.get(JUGADA_PARAM))

  if (clipId) {
    return videos.find((video) => video.id === clipId) ?? null
  }

  if (!clipParamWasProvided && jugadaOrd != null) {
    return videos.find((video) => clipIncludesJugada(video, jugadaOrd)) ?? null
  }

  return null
}

function currentLocationHref(): string {
  return `${window.location.pathname}${window.location.search}`
}

function writeLibraryHistory(
  params: URLSearchParams,
  mode: 'push' | 'replace',
): void {
  const href = toLibraryHref(window.location.pathname, params)
  if (mode === 'replace' && currentLocationHref() === href) return
  if (mode === 'push') {
    window.history.pushState(null, '', href)
    return
  }
  window.history.replaceState(null, '', href)
}

export function useLibraryClipSelection(videos: VideoClip[]) {
  const searchParams = useSearchParams()
  const urlSearch = searchParams.toString()
  const urlClip = useMemo(
    () => clipFromSearchParams(videos, new URLSearchParams(urlSearch)),
    [videos, urlSearch],
  )
  const urlClipId = urlClip?.id ?? null

  const [selectedClipId, setSelectedClipId] = useState<string | null>(urlClipId)
  const selectedClipIdRef = useRef(selectedClipId)
  selectedClipIdRef.current = selectedClipId
  const videosRef = useRef(videos)
  videosRef.current = videos

  const pushedClipRef = useRef(false)
  const isClosingRef = useRef(false)
  const closingClipIdRef = useRef<string | null>(null)
  const closeGenerationRef = useRef(0)
  const closeFallbackTimerRef = useRef<number | null>(null)
  const previousSearchRef = useRef<string | null>(null)
  const initialJugadaByClipIdRef = useRef<{
    clipId: string
    jugadaOrd?: number
  } | null>(null)

  const selectedClip =
    selectedClipId == null
      ? null
      : (videos.find((video) => video.id === selectedClipId) ?? null)

  const rawClip = searchParams.get(CLIP_PARAM)
  const clipIdFromUrl = parseClipId(rawClip)
  const clipParamWasProvided = rawClip != null && rawClip !== ''
  const jugadaOrd = parseJugadaOrd(searchParams.get(JUGADA_PARAM))
  const urlLegacyClip =
    !clipParamWasProvided && jugadaOrd != null
      ? (videos.find((video) => clipIncludesJugada(video, jugadaOrd)) ?? null)
      : null
  const selectionMatchesUrl =
    selectedClip != null &&
    (clipIdFromUrl === selectedClip.id ||
      (clipIdFromUrl == null && urlLegacyClip?.id === selectedClip.id))
  const jugadaForSelected =
    selectionMatchesUrl && clipIncludesJugada(selectedClip, jugadaOrd)
      ? jugadaOrd
      : undefined

  if (!selectedClip) {
    initialJugadaByClipIdRef.current = null
  } else if (initialJugadaByClipIdRef.current?.clipId !== selectedClip.id) {
    initialJugadaByClipIdRef.current = {
      clipId: selectedClip.id,
      jugadaOrd: jugadaForSelected,
    }
  }

  const initialPlayOrd =
    selectedClip && initialJugadaByClipIdRef.current?.clipId === selectedClip.id
      ? initialJugadaByClipIdRef.current.jugadaOrd
      : undefined

  const releaseClosingLock = useCallback((generation: number) => {
    if (closeGenerationRef.current !== generation) return
    isClosingRef.current = false
    closingClipIdRef.current = null
  }, [])

  const clearCloseFallback = useCallback(() => {
    if (closeFallbackTimerRef.current == null) return
    window.clearTimeout(closeFallbackTimerRef.current)
    closeFallbackTimerRef.current = null
  }, [])

  useEffect(() => {
    const onPopState = () => {
      clearCloseFallback()
      const nextClip = clipFromSearchParams(
        videosRef.current,
        new URLSearchParams(window.location.search),
      )
      const nextClipId = nextClip?.id ?? null
      setSelectedClipId(nextClipId)
      if (nextClipId == null) {
        pushedClipRef.current = false
      }
      isClosingRef.current = false
      closingClipIdRef.current = null
    }

    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      clearCloseFallback()
    }
  }, [clearCloseFallback])

  useEffect(() => {
    if (previousSearchRef.current === urlSearch) return
    const isFirstSearch = previousSearchRef.current == null
    previousSearchRef.current = urlSearch
    if (isFirstSearch) return

    if (
      isClosingRef.current &&
      urlClipId != null &&
      urlClipId === closingClipIdRef.current
    ) {
      return
    }

    setSelectedClipId(urlClipId)
    if (urlClipId == null) {
      pushedClipRef.current = false
    }
    isClosingRef.current = false
    closingClipIdRef.current = null
  }, [urlClipId, urlSearch])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rawClipInLocation = params.get(CLIP_PARAM)
    const clipIdInLocation = parseClipId(rawClipInLocation)
    const clipParamInLocation =
      rawClipInLocation != null && rawClipInLocation !== ''

    if (clipParamInLocation) {
      if (!clipIdInLocation) return
      const clipInLocation = videos.find((video) => video.id === clipIdInLocation)
      const rawJugada = params.get(JUGADA_PARAM)
      const jugadaInLocation = parseJugadaOrd(rawJugada)
      if (
        rawJugada &&
        !(clipInLocation && clipIncludesJugada(clipInLocation, jugadaInLocation))
      ) {
        params.delete(JUGADA_PARAM)
        writeLibraryHistory(params, 'replace')
      }
      return
    }

    const jugadaInLocation = parseJugadaOrd(params.get(JUGADA_PARAM))
    if (jugadaInLocation == null) return
    const legacyClip = videos.find((video) =>
      clipIncludesJugada(video, jugadaInLocation),
    )
    if (!legacyClip) return
    params.set(CLIP_PARAM, legacyClip.id)
    writeLibraryHistory(params, 'replace')
  }, [videos])

  const openClip = useCallback((video: VideoClip) => {
    closeGenerationRef.current += 1
    clearCloseFallback()
    isClosingRef.current = false
    closingClipIdRef.current = null
    setSelectedClipId(video.id)

    const params = new URLSearchParams(window.location.search)
    params.set(CLIP_PARAM, video.id)
    params.delete(JUGADA_PARAM)
    const href = toLibraryHref(window.location.pathname, params)
    if (currentLocationHref() === href) return
    pushedClipRef.current = true
    window.history.pushState(null, '', href)
  }, [clearCloseFallback])

  const setJugadaOrd = useCallback((ord: number) => {
    const clipId = selectedClipIdRef.current
    if (!clipId) return
    const href = buildClipShareHref({
      pathname: window.location.pathname,
      currentSearch: new URLSearchParams(window.location.search),
      clipId,
      jugadaOrd: ord,
    })
    if (currentLocationHref() === href) return
    window.history.replaceState(null, '', href)
  }, [])

  const closeClip = useCallback(() => {
    if (isClosingRef.current) return

    const params = new URLSearchParams(window.location.search)
    const urlHasClip = params.has(CLIP_PARAM) || params.has(JUGADA_PARAM)
    if (selectedClipIdRef.current == null && !urlHasClip) return

    const generation = closeGenerationRef.current + 1
    closeGenerationRef.current = generation
    isClosingRef.current = true
    closingClipIdRef.current = selectedClipIdRef.current
    setSelectedClipId(null)

    if (pushedClipRef.current) {
      pushedClipRef.current = false
      const hrefAtClose = currentLocationHref()
      clearCloseFallback()
      closeFallbackTimerRef.current = window.setTimeout(() => {
        closeFallbackTimerRef.current = null
        if (closeGenerationRef.current !== generation) return
        if (currentLocationHref() === hrefAtClose) {
          const latestParams = new URLSearchParams(window.location.search)
          latestParams.delete(CLIP_PARAM)
          latestParams.delete(JUGADA_PARAM)
          writeLibraryHistory(latestParams, 'replace')
        }
        releaseClosingLock(generation)
      }, 1000)
      window.history.back()
      return
    }

    if (urlHasClip) {
      params.delete(CLIP_PARAM)
      params.delete(JUGADA_PARAM)
      writeLibraryHistory(params, 'replace')
    }
    releaseClosingLock(generation)
  }, [clearCloseFallback, releaseClosingLock])

  return {
    selectedClip,
    isOpen: selectedClip != null,
    initialPlayOrd,
    openClip,
    setJugadaOrd,
    closeClip,
  }
}
