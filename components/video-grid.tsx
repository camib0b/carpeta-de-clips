'use client'

import { useState, useMemo, useCallback } from 'react'
import { VideoClip, VideoNote } from '@/lib/types'
import { getVideoNotes } from '@/lib/data'
import { VideoCard } from './video-card'
import { VideoModal } from './video-modal'
import { VideoFilters } from './video-filters'

interface VideoGridProps {
  videos: VideoClip[]
  rivals: string[]
}

/**
 * Video grid component with filtering
 * Displays videos in a responsive grid with client-side filtering
 * Manages notes state for all videos
 */
export function VideoGrid({ videos, rivals }: VideoGridProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoClip | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedConcept, setSelectedConcept] = useState('Todos los Conceptos')
  const [selectedRival, setSelectedRival] = useState('Todos los Rivales')
  
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
      />

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
            onClick={() => {
              setSelectedConcept('Todos los Conceptos')
              setSelectedRival('Todos los Rivales')
            }}
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
      />
    </div>
  )
}
