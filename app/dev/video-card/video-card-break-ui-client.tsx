'use client'

import { useMemo, useState } from 'react'

import { VideoCard } from '@/components/video-card'
import {
  type VideoCardThumbnailFixtureMode,
  videoCardThumbnailClips,
} from '@/lib/break-ui/video-card-thumbnail-fixtures'

const MODES: { id: VideoCardThumbnailFixtureMode; label: string }[] = [
  { id: 'demo', label: 'Demo data' },
  { id: 'worst', label: 'Worst case' },
]

export function VideoCardBreakUiClient() {
  const [mode, setMode] = useState<VideoCardThumbnailFixtureMode>('demo')
  const clips = useMemo(() => videoCardThumbnailClips(mode), [mode])

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-lg font-medium tracking-tight">Video card thumbnails</h1>
        <p className="text-sm text-muted-foreground">
          Break-ui toggle for poster sources: self-hosted thumb, YouTube, and neutral fallback.
        </p>
      </div>

      <div
        className="inline-flex rounded-md border border-border p-0.5"
        role="tablist"
        aria-label="Fixture mode"
      >
        {MODES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={mode === entry.id}
            className={
              mode === entry.id
                ? 'rounded-sm bg-muted px-3 py-1.5 text-sm font-medium text-foreground'
                : 'rounded-sm px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground'
            }
            onClick={() => setMode(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
        {clips.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            playEntranceAnimation={false}
            onClick={() => undefined}
          />
        ))}
      </div>
    </main>
  )
}
