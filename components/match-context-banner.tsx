'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { MatchXmlDownloadButton } from '@/components/match-xml-download-button'
import { Button } from '@/components/ui/button'
import {
  formatMatchDate,
  formatMatchScore,
  type MatchSummary,
} from '@/lib/match-display'
import { cn } from '@/lib/utils'

interface MatchContextBannerProps {
  matches: MatchSummary[]
  matchXmlAvailability: Record<string, boolean>
  hiddenMatchSlugs: ReadonlySet<string>
  onToggleMatchVisibility: (storageSlug: string) => void
}

type BreakUiDataMode = 'demo' | 'worst'

/**
 * Dev-only stress rows for this list: a long matchup, a missing score, a
 * match with no XML download, and a one-letter club with no date.
 * Never written to D1.
 */
const WORST_CASE_MATCHES: MatchSummary[] = [
  {
    date: '2026-05-16',
    division: 'Primera División B Femenina — Torneo Largo',
    homeTeam:
      'Club Deportivo Universidad Católica de Chile Primera División B Femenina',
    awayTeam: 'Konstantin Oberhauser-Wettstein',
    homeGoals: 2,
    awayGoals: 1,
    storageSlug: 'worst-long-team-names',
  },
  {
    date: '2026-03-08',
    division: 'Primera B',
    homeTeam: 'UC',
    awayTeam: 'Jo',
    storageSlug: 'worst-missing-score',
  },
  {
    date: '2026-01-12',
    homeTeam: 'Deportes Melipilla',
    awayTeam: 'Unión Española',
    homeGoals: 1,
    awayGoals: 0,
    storageSlug: 'worst-no-xml',
  },
  {
    date: '',
    homeTeam: 'J',
    awayTeam: 'Ñublense',
    storageSlug: 'worst-missing-date',
  },
]

const WORST_CASE_MATCH_XML_AVAILABILITY: Record<string, boolean> = {
  'worst-long-team-names': true,
  'worst-missing-score': true,
  'worst-no-xml': false,
  'worst-missing-date': true,
}

const BREAK_UI_TOGGLE_ENABLED = process.env.NODE_ENV === 'development'

function MatchContextBannerRow({
  match,
  canDownloadMatchXml,
  isHidden,
  onToggleVisibility,
}: {
  match: MatchSummary
  canDownloadMatchXml: boolean
  isHidden: boolean
  onToggleVisibility: (storageSlug: string) => void
}) {
  const formattedDate = match.date ? formatMatchDate(match.date).trim() : ''
  const division = match.division?.trim() ?? ''
  const scoreDisplay = formatMatchScore(match)
  const visibilityLabel = isHidden ? 'Mostrar partido' : 'Ocultar partido'
  const VisibilityIcon = isHidden ? EyeOff : Eye

  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground"
        aria-pressed={isHidden}
        aria-label={visibilityLabel}
        onClick={() => onToggleVisibility(match.storageSlug)}
      >
        <VisibilityIcon className="size-3.5" aria-hidden />
      </Button>
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-2 rounded-md border border-border bg-card px-3 py-2',
          isHidden && 'opacity-50',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="min-w-0 wrap-anywhere text-foreground/80">
            {match.homeTeam} vs {match.awayTeam}
          </span>
          {scoreDisplay && (
            <span className="inline-flex min-w-0 items-baseline gap-x-2">
              <span aria-hidden className="shrink-0 text-muted-foreground/40">
                ·
              </span>
              <span className="min-w-0 wrap-anywhere font-mono font-medium tabular-nums text-foreground">
                {scoreDisplay}
              </span>
            </span>
          )}
          {division && (
            <span className="inline-flex min-w-0 items-baseline gap-x-2">
              <span aria-hidden className="shrink-0 text-muted-foreground/40">
                ·
              </span>
              <span className="min-w-0 wrap-anywhere">{division}</span>
            </span>
          )}
          {formattedDate && (
            <span className="inline-flex shrink-0 items-baseline gap-x-2">
              <span aria-hidden className="shrink-0 text-muted-foreground/40">
                ·
              </span>
              <span className="font-mono tabular-nums">{formattedDate}</span>
            </span>
          )}
        </div>
        <MatchXmlDownloadButton match={match} available={canDownloadMatchXml} />
      </div>
    </div>
  )
}

function readBreakUiDataModeFromLocation(): BreakUiDataMode {
  const data = new URLSearchParams(window.location.search).get('data')
  return data === 'worst' ? 'worst' : 'demo'
}

function writeBreakUiDataModeToLocation(mode: BreakUiDataMode) {
  const url = new URL(window.location.href)
  if (mode === 'worst') {
    url.searchParams.set('data', 'worst')
  } else {
    url.searchParams.delete('data')
  }
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

function BreakUiDataToggle({
  mode,
  onModeChange,
}: {
  mode: BreakUiDataMode
  onModeChange: (mode: BreakUiDataMode) => void
}) {
  const segments: { mode: BreakUiDataMode; label: string }[] = [
    { mode: 'demo', label: 'Demo data' },
    { mode: 'worst', label: 'Worst case' },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Break UI data"
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        zIndex: 80,
        marginTop: 0,
        transform: 'translateX(-50%)',
        display: 'flex',
        padding: '0.25rem',
        borderRadius: '9999px',
        backgroundColor: '#d4d4d4',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {segments.map((segment) => {
        const selected = mode === segment.mode
        return (
          <button
            key={segment.mode}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onModeChange(segment.mode)}
            style={{
              border: 'none',
              borderRadius: '9999px',
              padding: '0.25rem 0.75rem',
              backgroundColor: selected ? '#ffffff' : 'transparent',
              color: '#171717',
              font: 'inherit',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
          >
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}

function useBreakUiDataMode(): [BreakUiDataMode, (mode: BreakUiDataMode) => void] {
  const [mode, setMode] = useState<BreakUiDataMode>('demo')

  useEffect(() => {
    if (!BREAK_UI_TOGGLE_ENABLED) return
    setMode(readBreakUiDataModeFromLocation())
  }, [])

  function selectMode(nextMode: BreakUiDataMode) {
    writeBreakUiDataModeToLocation(nextMode)
    setMode(nextMode)
  }

  return [mode, selectMode]
}

/**
 * Match metadata for the active rival filter.
 * Each match is its own surface so several games stay readable.
 */
export function MatchContextBanner({
  matches,
  matchXmlAvailability,
  hiddenMatchSlugs,
  onToggleMatchVisibility,
}: MatchContextBannerProps) {
  const [breakUiDataMode, selectBreakUiDataMode] = useBreakUiDataMode()
  const showWorstCase = BREAK_UI_TOGGLE_ENABLED && breakUiDataMode === 'worst'
  const visibleMatches = showWorstCase ? WORST_CASE_MATCHES : matches
  const visibleXmlAvailability = showWorstCase
    ? WORST_CASE_MATCH_XML_AVAILABILITY
    : matchXmlAvailability

  if (visibleMatches.length === 0) {
    if (!BREAK_UI_TOGGLE_ENABLED) return null
    return (
      <BreakUiDataToggle mode={breakUiDataMode} onModeChange={selectBreakUiDataMode} />
    )
  }

  return (
    <div className="min-w-0 space-y-2" aria-label="Contexto del partido">
      {visibleMatches.map((match) => (
        <MatchContextBannerRow
          key={match.storageSlug}
          match={match}
          canDownloadMatchXml={visibleXmlAvailability[match.storageSlug] === true}
          isHidden={hiddenMatchSlugs.has(match.storageSlug)}
          onToggleVisibility={onToggleMatchVisibility}
        />
      ))}
      {BREAK_UI_TOGGLE_ENABLED ? (
        <BreakUiDataToggle mode={breakUiDataMode} onModeChange={selectBreakUiDataMode} />
      ) : null}
    </div>
  )
}
