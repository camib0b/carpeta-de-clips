'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { VideoClip, VideoNote } from '@/lib/types'
import { getVideoNotes } from '@/lib/data'
import { VideoCard } from './video-card'
import { VideoModal } from './video-modal'
import { useLibraryFilters } from '@/hooks/use-library-filters'
import { MatchContextBanner } from './match-context-banner'
import { VideoFilters } from './video-filters'
import { getUniqueMatchesFromVideos } from '@/lib/match-display'

interface VideoGridProps {
  videos: VideoClip[]
  rivals: string[]
  matchXmlAvailability: Record<string, boolean>
}

/**
 * Video grid component with filtering
 * Displays videos in a responsive grid with client-side filtering
 * Manages notes state for all videos
 */
export function VideoGrid({ videos, rivals, matchXmlAvailability }: VideoGridProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoClip | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const {
    concept: selectedConcept,
    rival: selectedRival,
    setConcept: setSelectedConcept,
    setRival: setSelectedRival,
    clearFilters,
    hasActiveFilters,
  } = useLibraryFilters(rivals)
  
  // Notes state - in production this would be fetched from/persisted to database
  const [notesMap, setNotesMap] = useState<Record<string, VideoNote[]>>(() => {
    // Initialize with sample notes from data
    const map: Record<string, VideoNote[]> = {}
    videos.forEach((video) => {
      map[video.id] = getVideoNotes(video.id)
    })
    return map
  })

  // Filter videos based on selected filters
  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesConcept =
        selectedConcept === 'Todos los Conceptos' || video.gameConcept === selectedConcept
      const matchesRival =
        selectedRival === 'Todos los Rivales' || video.rivalTeam === selectedRival
      return matchesConcept && matchesRival
    })
  }, [videos, selectedConcept, selectedRival])

  const showMatchContext = selectedRival !== 'Todos los Rivales'

  const matchContext = useMemo(() => {
    if (!showMatchContext) return []
    return getUniqueMatchesFromVideos(filteredVideos)
  }, [filteredVideos, showMatchContext])

  const handleVideoClick = (video: VideoClip) => {
    setSelectedVideo(video)
    setModalOpen(true)
  }

  // Add note handler - in production this would call an API
  const handleAddNote = useCallback((videoId: string, note: { content: string; authorName?: string }) => {
    const newNote: VideoNote = {
      id: `note-${Date.now()}`,
      videoId,
      content: note.content,
      authorName: note.authorName,
      createdAt: new Date().toISOString(),
    }
    
    setNotesMap((prev) => ({
      ...prev,
      [videoId]: [newNote, ...(prev[videoId] || [])],
    }))
  }, [])

  // Get notes for selected video
  const selectedVideoNotes = selectedVideo ? (notesMap[selectedVideo.id] || []) : []

  const selectedIndex =
    selectedVideo && modalOpen
      ? filteredVideos.findIndex((videoItem) => videoItem.id === selectedVideo.id)
      : -1

  const canNavigatePrevious = selectedIndex > 0
  const canNavigateNext =
    selectedIndex >= 0 && selectedIndex < filteredVideos.length - 1

  const handleNavigatePrevious = useCallback(() => {
    setSelectedVideo((current) => {
      if (!current) return current
      const index = filteredVideos.findIndex((videoItem) => videoItem.id === current.id)
      if (index <= 0) return current
      return filteredVideos[index - 1]
    })
  }, [filteredVideos])

  const handleNavigateNext = useCallback(() => {
    setSelectedVideo((current) => {
      if (!current) return current
      const index = filteredVideos.findIndex((videoItem) => videoItem.id === current.id)
      if (index < 0 || index >= filteredVideos.length - 1) return current
      return filteredVideos[index + 1]
    })
  }, [filteredVideos])

  useEffect(() => {
    if (!modalOpen || !selectedVideo) return
    const stillInFilteredList = filteredVideos.some(
      (videoItem) => videoItem.id === selectedVideo.id,
    )
    if (!stillInFilteredList) {
      setModalOpen(false)
      setSelectedVideo(null)
    }
  }, [filteredVideos, modalOpen, selectedVideo])

  return (
    <div className="space-y-10">
      {/* Filters */}
      <VideoFilters
        selectedConcept={selectedConcept}
        selectedRival={selectedRival}
        onConceptChange={setSelectedConcept}
        onRivalChange={setSelectedRival}
        rivals={rivals}
        videos={videos}
        hasActiveFilters={hasActiveFilters}
      />

      {showMatchContext && (
        <MatchContextBanner
          matches={matchContext}
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
              onClick={() => handleVideoClick(video)}
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
        video={selectedVideo}
        notes={selectedVideoNotes}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAddNote={handleAddNote}
        canNavigatePrevious={canNavigatePrevious}
        canNavigateNext={canNavigateNext}
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
      />
    </div>
  )
}
