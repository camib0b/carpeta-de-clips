'use client'

import { useMemo } from 'react'
import { VideoClip } from '@/lib/types'
import { VideoCard } from './video-card'
import { VideoModal } from './video-modal'
import { useLibraryClipSelection } from '@/hooks/use-library-clip'
import { useLibraryFilters } from '@/hooks/use-library-filters'
import { MatchContextBanner } from './match-context-banner'
import { VideoFilters } from './video-filters'
import { listUniqueMatchSummaries } from '@/lib/match-display'

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
      <p className="text-sm text-muted-foreground">
        {filteredVideos.length} {filteredVideos.length === 1 ? 'clip' : 'clips'}
      </p>

      {/* Video Grid */}
      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onClick={() => openClip(video)}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">
            No hay clips que coincidan con tus filtros.
          </p>
          <button
            onClick={clearFilters}
            className="mt-4 text-sm text-foreground underline underline-offset-4 hover:no-underline"
          >
            Limpiar filtros
          </button>
        </div>
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
