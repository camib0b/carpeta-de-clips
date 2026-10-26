'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  DRAWING_DOCUMENT_VERSION,
  MAX_DRAWING_STROKES,
  type DrawingStroke,
} from '@/lib/clip-drawing-document'
import {
  DrawingSaveRejectedError,
  fetchPlayDrawing,
  savePlayDrawing,
} from '@/lib/clip-drawings-client'

const DRAWING_SAVE_DEBOUNCE_MS = 400

type PendingDrawingSave = {
  clipId: string
  playOrd: number
  strokes: DrawingStroke[]
}

type CachedPlayDrawing = {
  strokes: DrawingStroke[]
}

/**
 * Load and save one play's drawing through the drawings API.
 * Nothing here talks to D1. Saves are debounced from the end of a stroke,
 * and flushed when the play or the modal changes.
 */
export function usePlayDrawing(
  clipId: string | null,
  playOrd: number | null,
  active: boolean,
): {
  strokes: DrawingStroke[]
  canEdit: boolean
  addStroke: (stroke: DrawingStroke) => void
  clearStrokes: () => void
} {
  const playKey = clipId != null && playOrd != null ? `${clipId}:${playOrd}` : null
  const cacheRef = useRef(new Map<string, CachedPlayDrawing>())
  const [trackedPlayKey, setTrackedPlayKey] = useState<string | null>(null)
  const [strokes, setStrokes] = useState<DrawingStroke[]>([])
  const [canEdit, setCanEdit] = useState(true)

  const strokesRef = useRef(strokes)
  strokesRef.current = strokes
  const canEditRef = useRef(canEdit)
  canEditRef.current = canEdit
  const clipIdRef = useRef(clipId)
  clipIdRef.current = clipId
  const playOrdRef = useRef(playOrd)
  playOrdRef.current = playOrd
  const playKeyRef = useRef(playKey)
  playKeyRef.current = playKey

  const pendingSaveRef = useRef<PendingDrawingSave | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const saveChainRef = useRef<Promise<void>>(Promise.resolve())
  const loadGenerationRef = useRef(0)
  const localEditVersionRef = useRef(0)

  if (playKey !== trackedPlayKey) {
    const cached = playKey ? cacheRef.current.get(playKey) : undefined
    setTrackedPlayKey(playKey)
    setCanEdit(true)
    setStrokes(cached?.strokes ?? [])
  }

  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    const run = saveChainRef.current.then(async () => {
      const pending = pendingSaveRef.current
      if (!pending) return
      pendingSaveRef.current = null
      try {
        await savePlayDrawing(pending.clipId, pending.playOrd, {
          version: DRAWING_DOCUMENT_VERSION,
          strokes: pending.strokes,
        })
        const newerSave = pendingSaveRef.current
        const savedKey = `${pending.clipId}:${pending.playOrd}`
        if (
          newerSave &&
          newerSave.clipId === pending.clipId &&
          newerSave.playOrd === pending.playOrd
        ) {
          return
        }
        cacheRef.current.set(savedKey, { strokes: pending.strokes })
      } catch (error) {
        if (error instanceof DrawingSaveRejectedError) return
        if (pendingSaveRef.current == null) {
          pendingSaveRef.current = pending
        }
      }
    })

    const settled = run.then(
      () => undefined,
      () => undefined,
    )
    saveChainRef.current = settled
    return settled
  }, [])

  const scheduleSave = useCallback(
    (nextClipId: string, nextPlayOrd: number, nextStrokes: DrawingStroke[]) => {
      localEditVersionRef.current += 1
      pendingSaveRef.current = {
        clipId: nextClipId,
        playOrd: nextPlayOrd,
        strokes: nextStrokes,
      }
      const nextKey = `${nextClipId}:${nextPlayOrd}`
      cacheRef.current.set(nextKey, { strokes: nextStrokes })
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null
        void flushPendingSave()
      }, DRAWING_SAVE_DEBOUNCE_MS)
    },
    [flushPendingSave],
  )

  useEffect(() => {
    if (!active || clipId == null || playOrd == null) {
      void flushPendingSave()
      return
    }

    const requestClipId = clipId
    const requestPlayOrd = playOrd
    const requestKey = `${requestClipId}:${requestPlayOrd}`
    const editVersionAtStart = localEditVersionRef.current
    const generation = loadGenerationRef.current + 1
    loadGenerationRef.current = generation
    const controller = new AbortController()
    let ignore = false

    const load = async () => {
      await flushPendingSave()
      if (ignore || generation !== loadGenerationRef.current) return

      let loaded: Awaited<ReturnType<typeof fetchPlayDrawing>>
      try {
        loaded = await fetchPlayDrawing(requestClipId, requestPlayOrd, controller.signal)
      } catch (error) {
        if (isAbortError(error) || ignore || generation !== loadGenerationRef.current) return
        loaded = { state: 'unavailable' }
      }

      if (ignore || generation !== loadGenerationRef.current) return
      if (localEditVersionRef.current !== editVersionAtStart) return
      const pending = pendingSaveRef.current
      if (
        pending &&
        pending.clipId === requestClipId &&
        pending.playOrd === requestPlayOrd
      ) {
        return
      }

      if (loaded.state === 'ready') {
        cacheRef.current.set(requestKey, { strokes: loaded.document.strokes })
        setCanEdit(true)
        setStrokes(loaded.document.strokes)
        return
      }

      if (loaded.state === 'missing' || loaded.state === 'unsupported') {
        setCanEdit(false)
        setStrokes([])
        return
      }

      setCanEdit(true)
    }

    void load()

    return () => {
      ignore = true
      controller.abort()
    }
  }, [active, clipId, playOrd, flushPendingSave])

  useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState === 'hidden') {
        void flushPendingSave()
      }
    }
    document.addEventListener('visibilitychange', flushOnHide)
    window.addEventListener('pagehide', flushOnHide)
    return () => {
      document.removeEventListener('visibilitychange', flushOnHide)
      window.removeEventListener('pagehide', flushOnHide)
      void flushPendingSave()
    }
  }, [flushPendingSave])

  const addStroke = useCallback(
    (stroke: DrawingStroke) => {
      const currentClipId = clipIdRef.current
      const currentPlayOrd = playOrdRef.current
      const currentKey = playKeyRef.current
      if (
        !canEditRef.current ||
        currentClipId == null ||
        currentPlayOrd == null ||
        currentKey == null
      ) {
        return
      }
      if (stroke.points.length === 0) return
      if (strokesRef.current.length >= MAX_DRAWING_STROKES) return

      const nextStrokes = [...strokesRef.current, stroke]
      strokesRef.current = nextStrokes
      setStrokes(nextStrokes)
      scheduleSave(currentClipId, currentPlayOrd, nextStrokes)
    },
    [scheduleSave],
  )

  const clearStrokes = useCallback(() => {
    const currentClipId = clipIdRef.current
    const currentPlayOrd = playOrdRef.current
    const currentKey = playKeyRef.current
    if (currentClipId == null || currentPlayOrd == null || currentKey == null) return
    if (!canEditRef.current) return

    localEditVersionRef.current += 1
    strokesRef.current = []
    setStrokes([])
    cacheRef.current.set(currentKey, { strokes: [] })
    pendingSaveRef.current = {
      clipId: currentClipId,
      playOrd: currentPlayOrd,
      strokes: [],
    }
    void flushPendingSave()
  }, [flushPendingSave])

  return { strokes, canEdit, addStroke, clearStrokes }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
