'use client'

import { useEffect, useMemo } from 'react'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { GAME_CONCEPTS, VideoClip } from '@/lib/types'
import {
  ALL_CONCEPTS_FILTER_LABEL,
  ALL_RIVALS_FILTER_LABEL,
} from '@/lib/library-filters/params'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ShareFiltersButton } from '@/components/share-filters-button'
import { cn } from '@/lib/utils'

interface VideoFiltersProps {
  selectedConcepts: string[]
  selectedRivals: string[]
  onConceptsChange: (concepts: string[]) => void
  onRivalsChange: (rivals: string[]) => void
  availableRivals: string[]
  videos: VideoClip[]
  hasActiveFilters: boolean
}

interface MultiSelectFilterProps {
  id: string
  label: string
  allLabel: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  triggerClassName: string
  multipleCountLabel: (count: number) => string
}

function getTriggerLabel(
  selected: string[],
  allLabel: string,
  multipleCountLabel: (count: number) => string,
): string {
  if (selected.length === 0) return allLabel
  if (selected.length === 1) return selected[0]
  return multipleCountLabel(selected.length)
}

function toggleSelectedValue(selected: string[], option: string): string[] {
  if (selected.includes(option)) {
    return selected.filter((item) => item !== option)
  }
  return [...selected, option]
}

function OptionCheck({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input shadow-xs',
        checked && 'border-primary bg-primary text-primary-foreground',
      )}
      aria-hidden
    >
      {checked ? <CheckIcon className="size-3.5" /> : null}
    </span>
  )
}

function MultiSelectFilter({
  id,
  label,
  allLabel,
  options,
  selected,
  onChange,
  triggerClassName,
  multipleCountLabel,
}: MultiSelectFilterProps) {
  const isAllSelected = selected.length === 0
  const triggerLabel = getTriggerLabel(selected, allLabel, multipleCountLabel)
  const labelId = `${id}-label`

  return (
    <div className="flex items-center gap-3">
      <span
        id={labelId}
        className="text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap"
      >
        {label}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            id={id}
            variant="outline"
            aria-labelledby={`${labelId} ${id}-value`}
            className={cn(
              'h-9 justify-between border-border font-normal',
              triggerClassName,
            )}
          >
            <span id={`${id}-value`} className="truncate">
              {triggerLabel}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-1"
        >
          <div role="menu" aria-labelledby={labelId} className="flex flex-col">
            <div
              role="menuitemcheckbox"
              aria-label={allLabel}
              aria-checked={isAllSelected}
              tabIndex={0}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              onClick={() => onChange([])}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onChange([])
                }
              }}
            >
              <OptionCheck checked={isAllSelected} />
              <span>{allLabel}</span>
            </div>
            {options.map((option) => {
              const isSelected = selected.includes(option)
              return (
                <div
                  key={option}
                  role="menuitemcheckbox"
                  aria-label={option}
                  aria-checked={isSelected}
                  tabIndex={0}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => onChange(toggleSelectedValue(selected, option))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onChange(toggleSelectedValue(selected, option))
                    }
                  }}
                >
                  <OptionCheck checked={isSelected} />
                  <span>{option}</span>
                </div>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/**
 * Filter controls for the video library
 * Checkbox dropdowns for multi-select concept and rival filtering
 */
export function VideoFilters({
  selectedConcepts,
  selectedRivals,
  onConceptsChange,
  onRivalsChange,
  availableRivals,
  videos,
  hasActiveFilters,
}: VideoFiltersProps) {
  const selectableConcepts = useMemo(() => {
    const conceptHasClips = (concept: (typeof GAME_CONCEPTS)[number]) => {
      if (selectedRivals.length === 0) {
        return videos.some((video) => video.gameConcept === concept)
      }
      return videos.some(
        (video) =>
          video.gameConcept === concept &&
          selectedRivals.includes(video.rivalTeam),
      )
    }

    return GAME_CONCEPTS.filter(conceptHasClips)
  }, [videos, selectedRivals])

  const selectableRivals = useMemo(() => {
    const rivalOptions = availableRivals.filter((rival) => rival !== ALL_RIVALS_FILTER_LABEL)

    if (selectedConcepts.length === 0) {
      return rivalOptions
    }

    return rivalOptions.filter((rival) =>
      videos.some(
        (video) =>
          video.rivalTeam === rival &&
          selectedConcepts.includes(video.gameConcept),
      ),
    )
  }, [videos, selectedConcepts, availableRivals])

  useEffect(() => {
    const nextConcepts = selectedConcepts.filter((concept) =>
      selectableConcepts.includes(concept as (typeof GAME_CONCEPTS)[number]),
    )
    if (nextConcepts.length !== selectedConcepts.length) {
      onConceptsChange(nextConcepts)
    }
  }, [selectedConcepts, selectableConcepts, onConceptsChange])

  useEffect(() => {
    const nextRivals = selectedRivals.filter((rival) =>
      selectableRivals.includes(rival),
    )
    if (nextRivals.length !== selectedRivals.length) {
      onRivalsChange(nextRivals)
    }
  }, [selectedRivals, selectableRivals, onRivalsChange])

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
      <MultiSelectFilter
        id="concept-filter"
        label="Concepto"
        allLabel={ALL_CONCEPTS_FILTER_LABEL}
        options={selectableConcepts}
        selected={selectedConcepts}
        onChange={onConceptsChange}
        triggerClassName="w-[200px]"
        multipleCountLabel={(count) => `${count} conceptos`}
      />

      <MultiSelectFilter
        id="rival-filter"
        label="Rival"
        allLabel={ALL_RIVALS_FILTER_LABEL}
        options={selectableRivals}
        selected={selectedRivals}
        onChange={onRivalsChange}
        triggerClassName="w-[180px]"
        multipleCountLabel={(count) => `${count} rivales`}
      />

      <ShareFiltersButton visible={hasActiveFilters} />
    </div>
  )
}
