'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import {
  MAX_POINTS_PER_STROKE,
  type DrawingPoint,
  type DrawingStroke,
} from '@/lib/clip-drawing-document'
import { cn } from '@/lib/utils'

const MIN_POINT_DISTANCE = 0.0015

interface PlacedRect {
  left: number
  top: number
  width: number
  height: number
}

interface VideoTelestrationOverlayProps {
  drawingEnabled: boolean
  drawingsVisible: boolean
  strokes: DrawingStroke[]
  onStrokeComplete: (stroke: DrawingStroke) => void
}

/**
 * Marker layer over the video picture. Strokes are stored normalized to this
 * rectangle, so they stay put when the modal is resized. The rectangle follows
 * the rendered frame, including letterboxing inside a native video element.
 * A YouTube iframe paints its own bars; those are not visible to the page, so
 * the layer matches the iframe box.
 */
export function VideoTelestrationOverlay({
  drawingEnabled,
  drawingsVisible,
  strokes,
  onStrokeComplete,
}: VideoTelestrationOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef<{ pointerId: number; points: DrawingPoint[] } | null>(null)
  const [frame, setFrame] = useState<PlacedRect | null>(null)
  const [draftPoints, setDraftPoints] = useState<DrawingPoint[] | null>(null)

  useEffect(() => {
    if (drawingEnabled) return
    draftRef.current = null
    setDraftPoints(null)
  }, [drawingEnabled])

  useLayoutEffect(() => {
    if (!drawingsVisible) return
    const root = rootRef.current
    const stage = root?.parentElement
    if (!stage) return

    let frameId = 0
    let observedMedia: HTMLElement | null = null
    const resizeObserver = new ResizeObserver(() => {
      scheduleMeasure()
    })

    function measure() {
      const media = mediaElementInStage(stage)
      if (media !== observedMedia) {
        if (observedMedia) {
          resizeObserver.unobserve(observedMedia)
          unbindMedia(observedMedia, scheduleMeasure)
        }
        observedMedia = media
        if (media) {
          resizeObserver.observe(media)
          bindMedia(media, scheduleMeasure)
        }
      }

      const nextFrame = media ? renderedMediaRect(media, stage) : stageBox(stage)
      setFrame((currentFrame) =>
        rectsEqual(currentFrame, nextFrame) ? currentFrame : nextFrame,
      )
    }

    function scheduleMeasure() {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(measure)
    }

    resizeObserver.observe(stage)
    measure()
    const mutationObserver = new MutationObserver(scheduleMeasure)
    mutationObserver.observe(stage, { childList: true, subtree: true })
    window.addEventListener('resize', scheduleMeasure)

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
      if (observedMedia) unbindMedia(observedMedia, scheduleMeasure)
    }
  }, [drawingsVisible])

  if (!drawingsVisible) return null

  const width = frame?.width ?? 0
  const height = frame?.height ?? 0
  const markerWidth =
    width > 0 && height > 0 ? Math.max(4, Math.min(width, height) * 0.012) : 4

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingEnabled) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const point = pointerToNormalizedPoint(event, event.currentTarget)
    if (!point) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    draftRef.current = { pointerId: event.pointerId, points: [point] }
    setDraftPoints([point])
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const draft = draftRef.current
    if (!draft || draft.pointerId !== event.pointerId) return
    const point = pointerToNormalizedPoint(event, event.currentTarget)
    if (!point) return
    const lastPoint = draft.points[draft.points.length - 1]
    if (
      lastPoint &&
      Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < MIN_POINT_DISTANCE
    ) {
      return
    }
    if (draft.points.length >= MAX_POINTS_PER_STROKE) return
    draft.points.push(point)
    setDraftPoints(draft.points.slice())
  }

  const finishStroke = (event: React.PointerEvent<HTMLDivElement>) => {
    const draft = draftRef.current
    if (!draft || draft.pointerId !== event.pointerId) return
    draftRef.current = null
    setDraftPoints(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (draft.points.length === 0) return
    onStrokeComplete({ points: draft.points })
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        'absolute z-10',
        drawingEnabled ? 'cursor-crosshair touch-none' : 'pointer-events-none',
      )}
      style={{
        left: frame?.left ?? 0,
        top: frame?.top ?? 0,
        width,
        height,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
      onTouchStart={(event) => {
        if (!drawingEnabled) return
        event.stopPropagation()
      }}
    >
      {width > 0 && height > 0 ? (
        <svg
          className="h-full w-full overflow-visible"
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden
        >
          {strokes.map((stroke, index) => (
            <StrokeMark
              key={`stroke-${index}`}
              points={stroke.points}
              width={width}
              height={height}
              markerWidth={markerWidth}
            />
          ))}
          {draftPoints ? (
            <StrokeMark
              points={draftPoints}
              width={width}
              height={height}
              markerWidth={markerWidth}
            />
          ) : null}
        </svg>
      ) : null}
    </div>
  )
}

function StrokeMark({
  points,
  width,
  height,
  markerWidth,
}: {
  points: DrawingPoint[]
  width: number
  height: number
  markerWidth: number
}) {
  const first = points[0]
  if (!first) return null
  if (points.length === 1) {
    return (
      <circle
        cx={first.x * width}
        cy={first.y * height}
        r={markerWidth / 2}
        className="fill-destructive"
      />
    )
  }

  return (
    <path
      d={smoothStrokePath(points, width, height)}
      className="fill-none stroke-destructive"
      strokeWidth={markerWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

function smoothStrokePath(
  points: DrawingPoint[],
  width: number,
  height: number,
): string {
  const pixelPoints = points.map((point) => ({
    x: point.x * width,
    y: point.y * height,
  }))
  const first = pixelPoints[0]
  if (!first) return ''
  let path = `M ${first.x} ${first.y}`
  if (pixelPoints.length === 2) {
    const second = pixelPoints[1]
    return `${path} L ${second.x} ${second.y}`
  }

  for (let index = 1; index < pixelPoints.length - 1; index += 1) {
    const current = pixelPoints[index]
    const next = pixelPoints[index + 1]
    const midX = (current.x + next.x) / 2
    const midY = (current.y + next.y) / 2
    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`
  }
  const last = pixelPoints[pixelPoints.length - 1]
  return `${path} L ${last.x} ${last.y}`
}

function pointerToNormalizedPoint(
  event: React.PointerEvent<HTMLDivElement>,
  element: HTMLDivElement,
): DrawingPoint | null {
  const bounds = element.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return null
  return {
    x: clampUnit((event.clientX - bounds.left) / bounds.width),
    y: clampUnit((event.clientY - bounds.top) / bounds.height),
  }
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  if (value > 1) return 1
  return value
}

function mediaElementInStage(stage: HTMLElement): HTMLElement | null {
  const video = stage.querySelector('video')
  if (video instanceof HTMLVideoElement) return video
  const frame = stage.querySelector('iframe')
  if (frame instanceof HTMLIFrameElement) return frame
  return null
}

function bindMedia(media: HTMLElement, scheduleMeasure: () => void) {
  media.addEventListener('loadedmetadata', scheduleMeasure)
  media.addEventListener('resize', scheduleMeasure)
}

function unbindMedia(media: HTMLElement, scheduleMeasure: () => void) {
  media.removeEventListener('loadedmetadata', scheduleMeasure)
  media.removeEventListener('resize', scheduleMeasure)
}

function stageBox(stage: HTMLElement): PlacedRect {
  const bounds = stage.getBoundingClientRect()
  return { left: 0, top: 0, width: bounds.width, height: bounds.height }
}

function renderedMediaRect(media: HTMLElement, stage: HTMLElement): PlacedRect {
  const stageBounds = stage.getBoundingClientRect()
  const mediaBounds = media.getBoundingClientRect()
  const elementRect: PlacedRect = {
    left: mediaBounds.left - stageBounds.left,
    top: mediaBounds.top - stageBounds.top,
    width: mediaBounds.width,
    height: mediaBounds.height,
  }

  if (!(media instanceof HTMLVideoElement)) return elementRect

  const intrinsicWidth = media.videoWidth
  const intrinsicHeight = media.videoHeight
  if (
    intrinsicWidth <= 0 ||
    intrinsicHeight <= 0 ||
    elementRect.width <= 0 ||
    elementRect.height <= 0
  ) {
    return elementRect
  }

  const objectFit = getComputedStyle(media).objectFit
  if (objectFit === 'fill') return elementRect

  const scaleX = elementRect.width / intrinsicWidth
  const scaleY = elementRect.height / intrinsicHeight
  let scale = Math.min(scaleX, scaleY)
  if (objectFit === 'cover') {
    scale = Math.max(scaleX, scaleY)
  } else if (objectFit === 'none') {
    scale = 1
  } else if (objectFit === 'scale-down') {
    scale = Math.min(1, scaleX, scaleY)
  }

  const fittedWidth = intrinsicWidth * scale
  const fittedHeight = intrinsicHeight * scale
  const position = readObjectPosition(getComputedStyle(media).objectPosition)
  const fitted: PlacedRect = {
    left: elementRect.left + (elementRect.width - fittedWidth) * position.x,
    top: elementRect.top + (elementRect.height - fittedHeight) * position.y,
    width: fittedWidth,
    height: fittedHeight,
  }
  return intersectRects(fitted, elementRect)
}

function readObjectPosition(position: string): { x: number; y: number } {
  const tokens = position.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return { x: 0.5, y: 0.5 }
  if (tokens.length === 1) {
    const token = tokens[0]
    if (token === 'top' || token === 'bottom') {
      return { x: 0.5, y: keywordRatio(token) }
    }
    return { x: axisRatio(token, 'x'), y: 0.5 }
  }
  return {
    x: axisRatio(tokens[0], 'x'),
    y: axisRatio(tokens[1], 'y'),
  }
}

function axisRatio(token: string, axis: 'x' | 'y'): number {
  if (token.endsWith('%')) {
    const value = Number.parseFloat(token)
    if (!Number.isFinite(value)) return 0.5
    return Math.min(1, Math.max(0, value / 100))
  }
  if (axis === 'x') {
    if (token === 'left') return 0
    if (token === 'right') return 1
    if (token === 'center') return 0.5
  }
  return keywordRatio(token)
}

function keywordRatio(token: string): number {
  if (token === 'left' || token === 'top') return 0
  if (token === 'right' || token === 'bottom') return 1
  return 0.5
}

function intersectRects(first: PlacedRect, second: PlacedRect): PlacedRect {
  const left = Math.max(first.left, second.left)
  const top = Math.max(first.top, second.top)
  const right = Math.min(first.left + first.width, second.left + second.width)
  const bottom = Math.min(first.top + first.height, second.top + second.height)
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}

function rectsEqual(current: PlacedRect | null, next: PlacedRect): boolean {
  if (!current) return false
  return (
    roundHalfPixel(current.left) === roundHalfPixel(next.left) &&
    roundHalfPixel(current.top) === roundHalfPixel(next.top) &&
    roundHalfPixel(current.width) === roundHalfPixel(next.width) &&
    roundHalfPixel(current.height) === roundHalfPixel(next.height)
  )
}

function roundHalfPixel(value: number): number {
  return Math.round(value * 2) / 2
}
