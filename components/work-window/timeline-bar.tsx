'use client'

import { useEffect, useRef, useState } from 'react'

import { Slider } from '@/components/ui/slider'
import { formatTimecode, parseTimecodeToMs } from '@/lib/format-time'
import { cn } from '@/lib/utils'

interface TimelineBarProps {
  currentTimeMs: number
  durationMs: number
  onSeek: (positionMs: number) => void
  disabled?: boolean
  className?: string
}

/** Scrub slider + position/duration readout with manual timecode entry (desktop TimelineBar). */
export function TimelineBar({
  currentTimeMs,
  durationMs,
  onSeek,
  disabled = false,
  className,
}: TimelineBarProps) {
  const hasDuration = durationMs > 0
  const [isEditing, setIsEditing] = useState(false)
  const [draftValue, setDraftValue] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const beginEditing = () => {
    if (disabled || !hasDuration) {
      return
    }
    setDraftValue(formatTimecode(currentTimeMs))
    setIsEditing(true)
  }

  const commitEditing = () => {
    const parsedMs = parseTimecodeToMs(draftValue)
    if (parsedMs !== null) {
      onSeek(parsedMs)
    }
    setIsEditing(false)
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Slider
        value={[Math.min(currentTimeMs, durationMs)]}
        min={0}
        max={hasDuration ? durationMs : 1}
        step={100}
        disabled={disabled || !hasDuration}
        onValueChange={(values) => {
          const next = values[0]
          if (typeof next === 'number') {
            onSeek(next)
          }
        }}
        aria-label="Línea de tiempo del video"
        className="flex-1"
      />

      {isEditing ? (
        <input
          ref={inputRef}
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commitEditing}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitEditing()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              cancelEditing()
            }
          }}
          className="w-28 rounded border border-border bg-background px-2 py-1 text-right text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Ir a un instante (m:ss)"
        />
      ) : (
        <button
          type="button"
          onClick={beginEditing}
          disabled={disabled || !hasDuration}
          className="shrink-0 rounded px-1 py-1 text-xs tabular-nums text-muted-foreground hover:text-foreground disabled:cursor-default disabled:hover:text-muted-foreground"
          aria-label="Editar instante actual"
        >
          {formatTimecode(currentTimeMs)} / {formatTimecode(durationMs)}
        </button>
      )}
    </div>
  )
}
