'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Scissors } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePlaybackShortcuts } from '@/hooks/use-playback-shortcuts'
import { useVideoPlayer } from '@/hooks/use-video-player'
import type { CodeColor, MatchEvent } from '@/lib/longomatch-xml'
import type { MatchVideoSource } from '@/lib/match-video-catalog'
import { cn } from '@/lib/utils'

import { EventLog } from './event-log'
import { MatchVideoPlayer } from './match-video-player'
import { TimelineBar } from './timeline-bar'
import { VideoControlsBar } from './video-controls-bar'

export interface MatchWorkWindowProps {
  events: MatchEvent[]
  palette: Record<string, CodeColor>
  videoSource: MatchVideoSource | null
  className?: string
}

/**
 * Web port of the AVA desktop Work Window (read-only analyzing mode): a full-match video player
 * with controls + a scrub timeline, alongside the clipped-event log. Selecting an event seeks the
 * one continuous match video to that clip.
 */
export function MatchWorkWindow({
  events,
  palette,
  videoSource,
  className,
}: MatchWorkWindowProps) {
  const { videoRef, state, actions } = useVideoPlayer()
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [clipMode, setClipMode] = useState(false)

  const hasMedia = videoSource !== null
  usePlaybackShortcuts({ actions, enabled: hasMedia })

  const selectedIndex = useMemo(
    () => events.findIndex((event) => event.id === selectedEventId),
    [events, selectedEventId],
  )

  const selectEvent = useCallback(
    (event: MatchEvent) => {
      setSelectedEventId(event.id)
      actions.seekToMs(event.startMs)
      if (hasMedia) {
        actions.play()
      }
    },
    [actions, hasMedia],
  )

  const selectByIndex = useCallback(
    (index: number) => {
      const event = events[index]
      if (event) {
        selectEvent(event)
      }
    },
    [events, selectEvent],
  )

  const canSelectPrevious = events.length > 0 && selectedIndex !== 0
  const canSelectNext =
    events.length > 0 && selectedIndex < events.length - 1

  const handlePrevious = useCallback(() => {
    if (events.length === 0) {
      return
    }
    selectByIndex(selectedIndex <= 0 ? 0 : selectedIndex - 1)
  }, [events.length, selectByIndex, selectedIndex])

  const handleNext = useCallback(() => {
    if (events.length === 0) {
      return
    }
    selectByIndex(selectedIndex < 0 ? 0 : selectedIndex + 1)
  }, [events.length, selectByIndex, selectedIndex])

  // Clip mode: auto-pause when the playhead reaches the selected clip's end.
  useEffect(() => {
    if (!clipMode || selectedIndex < 0 || !state.playing) {
      return
    }
    const selected = events[selectedIndex]
    if (selected && state.currentTimeMs >= selected.endMs) {
      actions.pause()
    }
  }, [clipMode, selectedIndex, events, state.playing, state.currentTimeMs, actions])

  return (
    <div
      className={cn(
        'flex flex-col gap-4 lg:h-[calc(100vh-9rem)] lg:flex-row',
        className,
      )}
    >
      {/* Player column */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="overflow-hidden rounded-lg border border-border/60 bg-black">
          <MatchVideoPlayer videoRef={videoRef} source={videoSource} />
        </div>

        <TimelineBar
          currentTimeMs={state.currentTimeMs}
          durationMs={state.durationMs}
          onSeek={actions.seekToMs}
          disabled={!hasMedia}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <VideoControlsBar state={state} actions={actions} disabled={!hasMedia} />

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  size="sm"
                  variant="outline"
                  pressed={clipMode}
                  onPressedChange={setClipMode}
                  aria-label="Modo clip"
                >
                  <Scissors className="size-4" aria-hidden />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                Modo clip: pausa al final del evento
              </TooltipContent>
            </Tooltip>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              onClick={handlePrevious}
              disabled={!canSelectPrevious}
              aria-label="Evento anterior"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              onClick={handleNext}
              disabled={!canSelectNext}
              aria-label="Evento siguiente"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      {/* Event log column */}
      <div className="flex h-[24rem] shrink-0 flex-col overflow-hidden rounded-lg border border-border/60 lg:h-auto lg:w-80">
        <EventLog
          events={events}
          palette={palette}
          currentTimeMs={state.currentTimeMs}
          selectedEventId={selectedEventId}
          onSelectEvent={selectEvent}
        />
      </div>
    </div>
  )
}
