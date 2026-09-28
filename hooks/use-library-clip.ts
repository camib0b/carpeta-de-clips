'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
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

/**
 * The open clip is the `clip` query param (legacy: `jugada` alone).
 * Opening from the grid pushes a history entry so Back closes the modal.
 * Moves inside the modal replace that entry so Back still returns to the grid.
 */
export function useLibraryClipSelection(videos: VideoClip[]) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const pushedClipRef = useRef(false)
  const isClosingRef = useRef(false)
  const previousClipParamRef = useRef<string | null>(searchParams.get('clip'))
  const initialJugadaByClipIdRef = useRef<{
    clipId: string
    jugadaOrd?: number
  } | null>(null)

  const rawClip = searchParams.get('clip')
  const clipId = parseClipId(rawClip)
  const clipParamWasProvided = rawClip != null && rawClip !== ''
  const jugadaOrd = parseJugadaOrd(searchParams.get('jugada'))

  const clipFromId = clipId
    ? videos.find((video) => video.id === clipId)
    : undefined
  const legacyClip =
    !clipParamWasProvided && jugadaOrd != null
      ? videos.find((video) => clipIncludesJugada(video, jugadaOrd))
      : undefined
  const selectedClip = clipFromId ?? legacyClip ?? null
  const jugadaForSelected = clipIncludesJugada(selectedClip, jugadaOrd)
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

  useEffect(() => {
    const previousClipParam = previousClipParamRef.current
    previousClipParamRef.current = rawClip
    if (previousClipParam && !rawClip) {
      pushedClipRef.current = false
    }
    isClosingRef.current = false
  }, [rawClip])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (clipFromId) {
      const rawJugada = params.get('jugada')
      if (rawJugada && jugadaForSelected == null) {
        params.delete('jugada')
        router.replace(toLibraryHref(pathname, params), { scroll: false })
      }
      return
    }

    if (!legacyClip) return

    params.set('clip', legacyClip.id)
    router.replace(toLibraryHref(pathname, params), { scroll: false })
  }, [clipFromId, jugadaForSelected, legacyClip, pathname, router, searchParams])

  const openClip = useCallback(
    (video: VideoClip) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('clip', video.id)
      params.delete('jugada')
      pushedClipRef.current = true
      router.push(toLibraryHref(pathname, params), { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const navigateToClip = useCallback(
    (video: VideoClip) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('clip', video.id)
      params.delete('jugada')
      router.replace(toLibraryHref(pathname, params), { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const setJugadaOrd = useCallback(
    (ord: number) => {
      if (!selectedClip) return
      const href = buildClipShareHref({
        pathname,
        currentSearch: searchParams,
        clipId: selectedClip.id,
        jugadaOrd: ord,
      })
      router.replace(href, { scroll: false })
    },
    [pathname, router, searchParams, selectedClip],
  )

  const closeClip = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true

    if (pushedClipRef.current) {
      pushedClipRef.current = false
      router.back()
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    if (!params.has('clip') && !params.has('jugada')) return
    params.delete('clip')
    params.delete('jugada')
    router.replace(toLibraryHref(pathname, params), { scroll: false })
  }, [pathname, router, searchParams])

  return {
    selectedClip,
    isOpen: selectedClip != null,
    initialPlayOrd,
    openClip,
    navigateToClip,
    setJugadaOrd,
    closeClip,
  }
}
