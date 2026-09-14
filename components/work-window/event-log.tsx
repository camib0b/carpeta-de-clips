'use client'

import { useEffect, useMemo, useRef } from 'react'

import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cssColorForCode, parseEventCode } from '@/lib/event-codes'
import { formatTimecode } from '@/lib/format-time'
import type { CodeColor, MatchEvent } from '@/lib/longomatch-xml'
import { cn } from '@/lib/utils'

interface EventLogProps {
  events: MatchEvent[]
  palette: Record<string, CodeColor>
  currentTimeMs: number
  selectedEventId: number | null
  onSelectEvent: (event: MatchEvent) => void
  className?: string
}

/** Index of the event whose interval contains the playhead (latest matching start), else -1. */
function findActiveEventIndex(events: MatchEvent[], currentTimeMs: number): number {
  let activeIndex = -1
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    if (currentTimeMs >= event.startMs && currentTimeMs <= event.endMs) {
      activeIndex = index
    }
  }
  return activeIndex
}

function eventLabel(code: string): string {
  const parsed = parseEventCode(code)
  if (parsed.isNeutral) {
    return parsed.raw
  }
  const base = parsed.eventLabel ?? parsed.raw
  return `${base}${parsed.polarity ?? ''}`
}

/**
 * Chronological log of clipped events parsed from the match XML. Clicking a row seeks the player
 * to the event's start; the event under the playhead is highlighted (desktop tags-table parity).
 */
export function EventLog({
  events,
  palette,
  currentTimeMs,
  selectedEventId,
  onSelectEvent,
  className,
}: EventLogProps) {
  const activeIndex = useMemo(
    () => findActiveEventIndex(events, currentTimeMs),
    [events, currentTimeMs],
  )
  const activeEventId = activeIndex >= 0 ? events[activeIndex].id : null
  const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  useEffect(() => {
    if (activeEventId === null) {
      return
    }
    rowRefs.current
      .get(activeEventId)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeEventId])

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <h2 className="text-sm font-medium text-foreground">Eventos</h2>
        <span className="text-xs text-muted-foreground">{events.length}</span>
      </div>

      {events.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
          No hay eventos en el XML de este partido.
        </p>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <ul className="divide-y divide-border/40">
            {events.map((event) => {
              const parsed = parseEventCode(event.code)
              const isSelected = event.id === selectedEventId
              const isActive = event.id === activeEventId
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    ref={(node) => {
                      if (node) {
                        rowRefs.current.set(event.id, node)
                      } else {
                        rowRefs.current.delete(event.id)
                      }
                    }}
                    onClick={() => onSelectEvent(event)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
                      'hover:bg-muted/60 focus:bg-muted/60 focus:outline-none',
                      isActive && 'bg-primary/10',
                      isSelected && 'bg-primary/15',
                    )}
                  >
                    <span className="w-12 shrink-0 tabular-nums text-muted-foreground">
                      {formatTimecode(event.startMs)}
                    </span>
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cssColorForCode(event.code, palette) }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {parsed.teamAbbrev && (
                        <span className="font-medium text-muted-foreground">
                          {parsed.teamAbbrev}{' '}
                        </span>
                      )}
                      {eventLabel(event.code)}
                    </span>
                    {event.period && (
                      <Badge
                        variant="outline"
                        className="shrink-0 px-1.5 py-0 text-[0.625rem] font-normal"
                      >
                        {event.period}
                      </Badge>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  )
}
