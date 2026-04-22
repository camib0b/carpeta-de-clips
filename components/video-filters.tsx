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

interface VideoFiltersProps {
  selectedConcept: string
  selectedRival: string
  onConceptChange: (concept: string) => void
  onRivalChange: (rival: string) => void
  rivals: string[]
  videos: VideoClip[]
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

  // Reset concept filter if current selection is no longer available
  const effectiveConcept = useMemo(() => {
    if (selectedConcept === 'Todos los Conceptos') return selectedConcept
    if (availableConcepts.includes(selectedConcept as typeof GAME_CONCEPTS[number])) {
      return selectedConcept
    }
    // Current concept not available - reset to all
    return 'Todos los Conceptos'
  }, [selectedConcept, availableConcepts])

  // Notify parent if concept was reset
  if (effectiveConcept !== selectedConcept) {
    onConceptChange(effectiveConcept)
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
        <Select value={selectedRival} onValueChange={onRivalChange}>
          <SelectTrigger id="rival-filter" className="w-[180px] border-border">
            <SelectValue placeholder="Todos los Rivales" />
          </SelectTrigger>
          <SelectContent>
            {rivals.map((rival) => (
              <SelectItem key={rival} value={rival}>
                {rival}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
