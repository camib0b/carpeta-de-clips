'use client'

import { useMemo } from 'react'
import { GAME_CONCEPTS, VideoClip } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ShareFiltersButton } from '@/components/share-filters-button'

interface VideoFiltersProps {
  selectedConcept: string
  selectedRival: string
  onConceptChange: (concept: string) => void
  onRivalChange: (rival: string) => void
  rivals: string[]
  videos: VideoClip[]
  hasActiveFilters: boolean
}

/**
 * Filter controls for the video library
 * Clean, minimal dropdowns for concept and rival selection
 */
export function VideoFilters({
  selectedConcept,
  selectedRival,
  onConceptChange,
  onRivalChange,
  rivals,
  videos,
  hasActiveFilters,
}: VideoFiltersProps) {
  // Compute available concepts based on selected rival
  const availableConcepts = useMemo(() => {
    if (selectedRival === 'Todos los Rivales') {
      // No rival filter - show all concepts that have at least one video
      const conceptsWithVideos = new Set(videos.map((v) => v.gameConcept))
      return GAME_CONCEPTS.filter((concept) => conceptsWithVideos.has(concept))
    }
    
    // Filter to concepts that have videos for the selected rival
    const conceptsForRival = new Set(
      videos
        .filter((v) => v.rivalTeam === selectedRival)
        .map((v) => v.gameConcept)
    )
    return GAME_CONCEPTS.filter((concept) => conceptsForRival.has(concept))
  }, [videos, selectedRival])

  // Compute available rivals based on selected concept
  const availableRivals = useMemo(() => {
    if (selectedConcept === 'Todos los Conceptos') {
      // No concept filter - show all rivals that have at least one video
      return rivals
    }
    
    // Filter to rivals that have videos for the selected concept
    const rivalsForConcept = new Set(
      videos
        .filter((v) => v.gameConcept === selectedConcept)
        .map((v) => v.rivalTeam)
    )
    return rivals.filter((rival) => rival === 'Todos los Rivales' || rivalsForConcept.has(rival))
  }, [videos, selectedConcept, rivals])

  // Reset concept filter if current selection is no longer available
  const effectiveConcept = useMemo(() => {
    if (selectedConcept === 'Todos los Conceptos') return selectedConcept
    if (availableConcepts.includes(selectedConcept as typeof GAME_CONCEPTS[number])) {
      return selectedConcept
    }
    // Current concept not available - reset to all
    return 'Todos los Conceptos'
  }, [selectedConcept, availableConcepts])

  // Reset rival filter if current selection is no longer available
  const effectiveRival = useMemo(() => {
    if (selectedRival === 'Todos los Rivales') return selectedRival
    if (availableRivals.includes(selectedRival)) {
      return selectedRival
    }
    // Current rival not available - reset to all
    return 'Todos los Rivales'
  }, [selectedRival, availableRivals])

  // Notify parent if concept was reset
  if (effectiveConcept !== selectedConcept) {
    onConceptChange(effectiveConcept)
  }

  // Notify parent if rival was reset
  if (effectiveRival !== selectedRival) {
    onRivalChange(effectiveRival)
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Game Concept Filter */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="concept-filter"
          className="text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap"
        >
          Concepto
        </label>
        <Select value={effectiveConcept} onValueChange={onConceptChange}>
          <SelectTrigger id="concept-filter" className="w-[200px] border-border">
            <SelectValue placeholder="Todos los Conceptos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos los Conceptos">Todos los Conceptos</SelectItem>
            {availableConcepts.map((concept) => (
              <SelectItem key={concept} value={concept}>
                {concept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rival/Opponent Filter */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="rival-filter"
          className="text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap"
        >
          Rival
        </label>
        <Select value={effectiveRival} onValueChange={onRivalChange}>
          <SelectTrigger id="rival-filter" className="w-[180px] border-border">
            <SelectValue placeholder="Todos los Rivales" />
          </SelectTrigger>
          <SelectContent>
            {availableRivals.map((rival) => (
              <SelectItem key={rival} value={rival}>
                {rival}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ShareFiltersButton visible={hasActiveFilters} />
    </div>
  )
}
