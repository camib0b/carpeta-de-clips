'use client'

import { useEffect, useMemo, useRef } from 'react'
import { VideoClip } from '@/lib/types'
import { VideoCard } from './video-card'
import { VideoModal } from './video-modal'
import { useLibraryClipSelection } from '@/hooks/use-library-clip'
import { useLibraryFilters } from '@/hooks/use-library-filters'
import { MatchContextBanner } from './match-context-banner'
import { VideoFilters } from './video-filters'
import { clipLibraryEmptyState } from '@/lib/break-ui/clip-library-empty-state'
import { listUniqueMatchSummaries } from '@/lib/match-display'
import { cn } from '@/lib/utils'

function LibraryEmptyState({
  hasActiveFilters,
  onClearFilters,
}: {
  hasActiveFilters: boolean
  onClearFilters: () => void
}) {
  const emptyState = clipLibraryEmptyState(hasActiveFilters)

  return (
    <div className="py-16 text-center">
      <p className="text-muted-foreground">{emptyState.message}</p>
      {emptyState.offerClearFilters ? (
        <button
          onClick={onClearFilters}
          className="mt-4 text-sm text-foreground underline underline-offset-4 transition-colors duration-200 hover:no-underline"
        >
          Limpiar filtros
        </button>
      ) : null}
    </div>
  )
}

interface VideoGridProps {
  videos: VideoClip[]
  availableRivals: string[]
  matchXmlAvailability: Record<string, boolean>
}

/**
 * Video grid component with filtering
 * Displays videos in a responsive grid with client-side filtering
 */
export function VideoGrid({ videos, availableRivals, matchXmlAvailability }: VideoGridProps) {
  const skipCardEntranceAnimationRef = useRef(false)
  useEffect(() => {
    skipCardEntranceAnimationRef.current = true
  }, [])
  const playCardEntranceAnimation = !skipCardEntranceAnimationRef.current

  const {
    selectedClip,
    isOpen: isClipModalOpen,
    initialPlayOrd,
    openClip,
    setJugadaOrd,
    closeClip,
  } = useLibraryClipSelection(videos)
  const {
    selectedConcepts,
    selectedRivals,
    setSelectedConcepts,
    setSelectedRivals,
    clearFilters,
    hasActiveFilters,
  } = useLibraryFilters(availableRivals)

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesConcept =
        selectedConcepts.length === 0 || selectedConcepts.includes(video.gameConcept)
      const matchesRival =
        selectedRivals.length === 0 || selectedRivals.includes(video.rivalTeam)
      return matchesConcept && matchesRival
    })
  }, [videos, selectedConcepts, selectedRivals])

  const shouldShowMatchBanner = selectedRivals.length > 0

  const visibleMatchSummaries = useMemo(() => {
    if (!shouldShowMatchBanner) return []
    return listUniqueMatchSummaries(filteredVideos)
  }, [filteredVideos, shouldShowMatchBanner])

  return (
    <div className="space-y-10">
      {/* Filters */}
      <VideoFilters
        selectedConcepts={selectedConcepts}
        selectedRivals={selectedRivals}
        onConceptsChange={setSelectedConcepts}
        onRivalsChange={setSelectedRivals}
        availableRivals={availableRivals}
        videos={videos}
        hasActiveFilters={hasActiveFilters}
      />

      {shouldShowMatchBanner && (
        <MatchContextBanner
          matches={visibleMatchSummaries}
          matchXmlAvailability={matchXmlAvailability}
        />
      )}

      {/* Results count */}
      <p
        className={cn(
          'text-sm tabular-nums',
          hasActiveFilters ? 'font-medium text-state' : 'text-muted-foreground',
        )}
      >
        {filteredVideos.length} {filteredVideos.length === 1 ? 'clip' : 'clips'}
      </p>

      {/* Video Grid */}
      {filteredVideos.length > 0 ? (
        <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              playEntranceAnimation={playCardEntranceAnimation}
              onClick={() => openClip(video)}
              thumbnailLoading={index < 3 ? 'eager' : 'lazy'}
              thumbnailFetchPriority={index === 0 ? 'high' : undefined}
            />
          ))}
        </div>
      ) : (
        <LibraryEmptyState
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />
      )}

      {/* Video Modal */}
      <VideoModal
        video={selectedClip}
        open={isClipModalOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeClip()
        }}
        initialPlayOrd={initialPlayOrd}
        onJugadaOrdChange={setJugadaOrd}
      />
    </div>
  )
}
