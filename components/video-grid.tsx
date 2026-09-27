'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { VideoClip } from '@/lib/types'
import { VideoCard } from './video-card'
import { VideoModal } from './video-modal'
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
  const searchParams = useSearchParams()
  const initialPlayOrd = useMemo(() => {
    const raw = searchParams.get('jugada')
    if (!raw) return undefined
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
  }, [searchParams])

  const [selectedClip, setSelectedClip] = useState<VideoClip | null>(null)
  const [isClipModalOpen, setIsClipModalOpen] = useState(false)
  const jugadaAutoOpenDoneRef = useRef(false)

  useEffect(() => {
    if (jugadaAutoOpenDoneRef.current || initialPlayOrd == null) {
      return
    }

    const clipWithPlay = videos.find((videoItem) =>
      videoItem.instances?.some((instance) => instance.ord === initialPlayOrd),
    )
    if (!clipWithPlay) {
      return
    }

    jugadaAutoOpenDoneRef.current = true
    setSelectedClip(clipWithPlay)
    setIsClipModalOpen(true)
  }, [initialPlayOrd, videos])
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

  const openClipModal = (video: VideoClip) => {
    setSelectedClip(video)
    setIsClipModalOpen(true)
  }

  const selectedIndex =
    selectedClip && isClipModalOpen
      ? filteredVideos.findIndex((videoItem) => videoItem.id === selectedClip.id)
      : -1

  const canNavigatePrevious = selectedIndex > 0
  const canNavigateNext =
    selectedIndex >= 0 && selectedIndex < filteredVideos.length - 1

  const handleNavigatePrevious = useCallback(() => {
    setSelectedClip((current) => {
      if (!current) return current
      const index = filteredVideos.findIndex((videoItem) => videoItem.id === current.id)
      if (index <= 0) return current
      return filteredVideos[index - 1]
    })
  }, [filteredVideos])

  const handleNavigateNext = useCallback(() => {
    setSelectedClip((current) => {
      if (!current) return current
      const index = filteredVideos.findIndex((videoItem) => videoItem.id === current.id)
      if (index < 0 || index >= filteredVideos.length - 1) return current
      return filteredVideos[index + 1]
    })
  }, [filteredVideos])

  useEffect(() => {
    if (!isClipModalOpen || !selectedClip) return
    const stillInFilteredList = filteredVideos.some(
      (videoItem) => videoItem.id === selectedClip.id,
    )
    if (!stillInFilteredList) {
      setIsClipModalOpen(false)
      setSelectedClip(null)
    }
  }, [filteredVideos, isClipModalOpen, selectedClip])

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
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onClick={() => openClipModal(video)}
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
        onOpenChange={setIsClipModalOpen}
        initialPlayOrd={initialPlayOrd}
        canNavigatePrevious={canNavigatePrevious}
        canNavigateNext={canNavigateNext}
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
      />
    </div>
  )
}
