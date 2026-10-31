'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { CurtainReveal } from '@camib0b/ui'
import { VideoClip } from '@/lib/types'
import { VideoCard } from './video-card'
import { useLibraryClipSelection } from '@/hooks/use-library-clip'
import { useLibraryFilters } from '@/hooks/use-library-filters'
import { MatchContextBanner } from './match-context-banner'
import { VideoFilters } from './video-filters'
import { clipLibraryEmptyState } from '@/lib/break-ui/clip-library-empty-state'
import { listUniqueMatchSummaries } from '@/lib/match-display'
import { storageSlugFromClip } from '@/lib/match-keys'
import { cn } from '@/lib/utils'

const VideoModal = dynamic(
  () => import('./video-modal').then((module) => module.VideoModal),
  { ssr: false },
)

/** Shared curtain stagger is 80ms. Only the first 12 cards get their own step. */
const CURTAIN_STAGGER_CARD_CAP = 12
const CURTAIN_STAGGER_MS = 80
const CURTAIN_FALL_MS = 480

function filteredClipKey(videos: VideoClip[]): string {
  return videos.map((video) => video.id).join('\n')
}

function clipBelongsToHiddenMatch(
  clip: VideoClip,
  hiddenMatchSlugs: ReadonlySet<string>,
): boolean {
  return hiddenMatchSlugs.has(storageSlugFromClip(clip))
}

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
  const [curtainLive, setCurtainLive] = useState(true)

  const {
    selectedConcepts,
    selectedRivals,
    setSelectedConcepts,
    setSelectedRivals,
    clearFilters,
    hasActiveFilters,
  } = useLibraryFilters(availableRivals)

  const [hiddenMatchSlugs, setHiddenMatchSlugs] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const selectedRivalsKey = selectedRivals.join('\u0000')
  useEffect(() => {
    setHiddenMatchSlugs((current) => (current.size === 0 ? current : new Set()))
  }, [selectedRivalsKey])

  const videosForNavigation = useMemo(
    () => videos.filter((video) => !clipBelongsToHiddenMatch(video, hiddenMatchSlugs)),
    [videos, hiddenMatchSlugs],
  )
  const {
    selectedClip,
    isOpen: isClipModalOpen,
    initialPlayOrd,
    openClip,
    setJugadaOrd,
    closeClip,
  } = useLibraryClipSelection(videosForNavigation)

  const clipsMatchingFilters = useMemo(() => {
    return videos.filter((video) => {
      const matchesConcept =
        selectedConcepts.length === 0 || selectedConcepts.includes(video.gameConcept)
      const matchesRival =
        selectedRivals.length === 0 || selectedRivals.includes(video.rivalTeam)
      return matchesConcept && matchesRival
    })
  }, [videos, selectedConcepts, selectedRivals])

  const filteredVideos = useMemo(
    () =>
      clipsMatchingFilters.filter(
        (video) => !clipBelongsToHiddenMatch(video, hiddenMatchSlugs),
      ),
    [clipsMatchingFilters, hiddenMatchSlugs],
  )
  const filteredClipIdentity = filteredClipKey(filteredVideos)
  const previousFilteredClipIdentityRef = useRef<string | null>(null)
  if (previousFilteredClipIdentityRef.current == null) {
    previousFilteredClipIdentityRef.current = filteredClipIdentity
  } else if (previousFilteredClipIdentityRef.current !== filteredClipIdentity) {
    previousFilteredClipIdentityRef.current = filteredClipIdentity
    if (curtainLive) {
      setCurtainLive(false)
    }
  }

  useEffect(() => {
    const settleDelayMs =
      (CURTAIN_STAGGER_CARD_CAP - 1) * CURTAIN_STAGGER_MS + CURTAIN_FALL_MS + 40
    const timeoutId = window.setTimeout(() => {
      setCurtainLive(false)
    }, settleDelayMs)
    return () => window.clearTimeout(timeoutId)
  }, [])

  const shouldShowMatchBanner = selectedRivals.length > 0

  const visibleMatchSummaries = useMemo(() => {
    if (!shouldShowMatchBanner) return []
    return listUniqueMatchSummaries(clipsMatchingFilters)
  }, [clipsMatchingFilters, shouldShowMatchBanner])

  function toggleMatchVisibility(storageSlug: string) {
    const openClipIsThisMatch =
      selectedClip != null && storageSlugFromClip(selectedClip) === storageSlug
    const willHide = !hiddenMatchSlugs.has(storageSlug)

    setHiddenMatchSlugs((current) => {
      const next = new Set(current)
      if (next.has(storageSlug)) {
        next.delete(storageSlug)
      } else {
        next.add(storageSlug)
      }
      return next
    })

    if (openClipIsThisMatch && willHide) {
      closeClip()
    }
  }

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
          hiddenMatchSlugs={hiddenMatchSlugs}
          onToggleMatchVisibility={toggleMatchVisibility}
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
        <div
          data-curtain-live={curtainLive ? '' : undefined}
          className="library-clip-results"
        >
          <CurtainReveal className="library-clip-grid grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map((video, index) => (
              <div key={video.id} className="relative flex min-w-0 hover:z-10">
                <VideoCard
                  video={video}
                  onClick={() => openClip(video)}
                  thumbnailLoading={index < 3 ? 'eager' : 'lazy'}
                  thumbnailFetchPriority={index === 0 ? 'high' : undefined}
                />
              </div>
            ))}
          </CurtainReveal>
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
