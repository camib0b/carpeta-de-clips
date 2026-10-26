'use client'

import { useEffect, useState } from 'react'

import { MatchXmlDownloadButton } from '@/components/match-xml-download-button'
import {
  formatMatchDate,
  formatMatchScore,
  type MatchSummary,
} from '@/lib/match-display'

interface MatchContextBannerProps {
  matches: MatchSummary[]
  matchXmlAvailability: Record<string, boolean>
}

type BreakUiDataMode = 'demo' | 'worst'

/**
 * Dev-only stress rows for this list: a long matchup, a missing score, and
 * a match with no XML download. Never written to D1.
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
]

const WORST_CASE_MATCH_XML_AVAILABILITY: Record<string, boolean> = {
  'worst-long-team-names': true,
  'worst-missing-score': true,
  'worst-no-xml': false,
}

const BREAK_UI_TOGGLE_ENABLED = process.env.NODE_ENV === 'development'

function MatchContextBannerRow({
  match,
  canDownloadMatchXml,
}: {
  match: MatchSummary
  canDownloadMatchXml: boolean
}) {
  const formattedDate = formatMatchDate(match.date)
  const scoreDisplay = formatMatchScore(match)

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-md border border-border bg-card px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span className="min-w-0 wrap-anywhere text-foreground/80">
          {match.homeTeam} vs {match.awayTeam}
        </span>
        {scoreDisplay && (
          <>
            <span aria-hidden className="text-muted-foreground/40">
              ·
            </span>
            <span className="min-w-0 wrap-anywhere font-mono font-medium tabular-nums text-foreground">
              {scoreDisplay}
            </span>
          </>
        )}
        {match.division && (
          <>
            <span aria-hidden className="text-muted-foreground/40">
              ·
            </span>
            <span className="min-w-0 wrap-anywhere">{match.division}</span>
          </>
        )}
        <span aria-hidden className="text-muted-foreground/40">
          ·
        </span>
        <span className="font-mono tabular-nums">{formattedDate}</span>
      </div>
      <MatchXmlDownloadButton match={match} available={canDownloadMatchXml} />
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
        />
      ))}
      {BREAK_UI_TOGGLE_ENABLED ? (
        <BreakUiDataToggle mode={breakUiDataMode} onModeChange={selectBreakUiDataMode} />
      ) : null}
    </div>
  )
}
