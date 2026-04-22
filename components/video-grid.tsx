'use client'

import { useState, useMemo } from 'react'
import { VideoClip } from '@/lib/types'
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
 */
export function VideoGrid({ videos, rivals }: VideoGridProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoClip | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedConcept, setSelectedConcept] = useState('All Concepts')
  const [selectedRival, setSelectedRival] = useState('All Opponents')

  // Filter videos based on selected filters
  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesConcept =
        selectedConcept === 'All Concepts' || video.gameConcept === selectedConcept
      const matchesRival =
        selectedRival === 'All Opponents' || video.rivalTeam === selectedRival
      return matchesConcept && matchesRival
    })
  }, [videos, selectedConcept, selectedRival])

  const handleVideoClick = (video: VideoClip) => {
    setSelectedVideo(video)
    setModalOpen(true)
  }

  return (
    <div className="space-y-10">
      {/* Filters */}
      <VideoFilters
        selectedConcept={selectedConcept}
        selectedRival={selectedRival}
        onConceptChange={setSelectedConcept}
        onRivalChange={setSelectedRival}
        rivals={rivals}
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
            No clips match your filters.
          </p>
          <button
            onClick={() => {
              setSelectedConcept('All Concepts')
              setSelectedRival('All Opponents')
            }}
            className="mt-4 text-sm text-foreground underline underline-offset-4 hover:no-underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Video Modal */}
      <VideoModal
        video={selectedVideo}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
