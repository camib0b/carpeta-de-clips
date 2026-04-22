'use client'

import { GAME_CONCEPTS } from '@/lib/types'
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
}: VideoFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* Game Concept Filter */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="concept-filter"
          className="text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap"
        >
          Concept
        </label>
        <Select value={selectedConcept} onValueChange={onConceptChange}>
          <SelectTrigger id="concept-filter" className="w-[180px] border-border">
            <SelectValue placeholder="All Concepts" />
          </SelectTrigger>
          <SelectContent>
            {GAME_CONCEPTS.map((concept) => (
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
          Opponent
        </label>
        <Select value={selectedRival} onValueChange={onRivalChange}>
          <SelectTrigger id="rival-filter" className="w-[180px] border-border">
            <SelectValue placeholder="All Opponents" />
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
