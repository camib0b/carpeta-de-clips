'use client'

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import Link from 'next/link'

import type {
  PlayedMatchCalendarCell,
  PlayedMatchCalendarModel,
  PlayedMatchCalendarRow,
} from '@/lib/played-match-calendar'
import { cn } from '@/lib/utils'

const CELL_SIZE_PIXELS = 14
const CELL_GAP_PIXELS = 3
const MONTH_ROW_HEIGHT_PIXELS = 14
const NEW_TAG_SLOT_PIXELS = 12
const ROW_HEIGHT_PIXELS = CELL_SIZE_PIXELS + NEW_TAG_SLOT_PIXELS
const SCROLL_EDGE_TOLERANCE_PIXELS = 1
const LEGEND_HUE = 172
const ENTRANCE_STORAGE_KEY = 'carpeta-played-matches-calendar-animated'
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'

interface CalendarTooltip {
  cellKey: string
  x: number
  y: number
  lines: { id: string; text: string; isNew: boolean }[]
}

interface PlayedMatchesCalendarProps {
  calendar: PlayedMatchCalendarModel
}

export function PlayedMatchesCalendar({ calendar }: PlayedMatchesCalendarProps) {
  const [tooltip, setTooltip] = useState<CalendarTooltip | null>(null)
  const [animateCells, setAnimateCells] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const userHasScrolledRef = useRef(false)
  const pendingUserScrollFrameRef = useRef<number | null>(null)
  const weekCount = calendar.weeks.length

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    try {
      if (window.sessionStorage.getItem(ENTRANCE_STORAGE_KEY) === '1') return
      window.sessionStorage.setItem(ENTRANCE_STORAGE_KEY, '1')
    } catch {
      // Storage can throw in private mode. Play the entrance for this load.
    }
    setAnimateCells(true)
  }, [])

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    scrollContainerToNewestWeeks(scrollContainer)

    const resizeObserver = new ResizeObserver(() => {
      if (userHasScrolledRef.current || pendingUserScrollFrameRef.current !== null) return
      scrollContainerToNewestWeeks(scrollContainer)
    })
    resizeObserver.observe(scrollContainer)

    return () => {
      resizeObserver.disconnect()
    }
  }, [weekCount])

  useEffect(() => {
    if (!tooltip) return
    const hideWhenPointerStartsOutside = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (scrollContainerRef.current?.contains(target)) return
      setTooltip(null)
    }
    document.addEventListener('pointerdown', hideWhenPointerStartsOutside)
    return () => document.removeEventListener('pointerdown', hideWhenPointerStartsOutside)
  }, [tooltip])

  const hideTooltip = () => {
    setTooltip(null)
  }

  const handleCalendarScroll = () => {
    hideTooltip()
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    if (isScrolledToNewestWeeks(scrollContainer)) {
      if (pendingUserScrollFrameRef.current !== null) {
        cancelAnimationFrame(pendingUserScrollFrameRef.current)
        pendingUserScrollFrameRef.current = null
      }
      return
    }

    if (pendingUserScrollFrameRef.current !== null) return

    // Content swaps can emit a scroll event before useLayoutEffect pins the
    // right edge. Wait a frame so that correction is not treated as a user scroll.
    pendingUserScrollFrameRef.current = requestAnimationFrame(() => {
      pendingUserScrollFrameRef.current = null
      const containerAfterFrame = scrollContainerRef.current
      if (!containerAfterFrame || isScrolledToNewestWeeks(containerAfterFrame)) return
      userHasScrolledRef.current = true
    })
  }

  const showTooltip = (element: HTMLElement, row: PlayedMatchCalendarRow, cell: PlayedMatchCalendarCell) => {
    if (cell.matches.length === 0) return
    const rect = element.getBoundingClientRect()
    setTooltip({
      cellKey: cellKey(row.teamSlug, cell.weekStart),
      x: tooltipCenter(rect),
      y: rect.top,
      lines: cell.matches.map((match) => ({
        id: match.id,
        text: match.tooltipText,
        isNew: match.isNew,
      })),
    })
  }

  const handleMatchLinkClick = (
    event: MouseEvent<HTMLAnchorElement>,
    row: PlayedMatchCalendarRow,
    cell: PlayedMatchCalendarCell,
  ) => {
    if (event.detail === 0) return
    if (primaryPointerIsFine()) return
    const key = cellKey(row.teamSlug, cell.weekStart)
    if (tooltip?.cellKey === key) return
    event.preventDefault()
    showTooltip(event.currentTarget, row, cell)
  }

  const gridWidth =
    weekCount * CELL_SIZE_PIXELS + Math.max(0, weekCount - 1) * CELL_GAP_PIXELS
  const showGrid = calendar.rows.length > 0 && weekCount > 0

  return (
    <section className="mt-14" aria-labelledby="partidos-por-fecha-jugada">
      <h2 id="partidos-por-fecha-jugada" className="text-base font-medium text-foreground">
        Partidos por fecha jugada
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Cada cuadro es una semana de la temporada.
      </p>

      {showGrid ? (
        <div
          className="played-match-calendar mt-4"
          data-animate={animateCells ? 'true' : 'false'}
          style={{
            ['--played-match-fade-duration' as string]: `${calendar.fadeDurationMilliseconds}ms`,
          }}
        >
          <div className="flex gap-2">
            <div className="flex w-28 shrink-0 flex-col">
              <div style={{ height: MONTH_ROW_HEIGHT_PIXELS, marginBottom: 2 }} />
              <div className="flex flex-col" style={{ gap: CELL_GAP_PIXELS }}>
                {calendar.rows.map((row) => (
                  <div
                    key={row.teamSlug}
                    className="flex items-end truncate text-xs text-muted-foreground"
                    style={{ height: ROW_HEIGHT_PIXELS }}
                    title={row.teamName}
                  >
                    {row.teamName}
                  </div>
                ))}
              </div>
            </div>

            <div
              ref={scrollContainerRef}
              className="min-w-0 flex-1 overflow-x-auto pb-1"
              role="region"
              aria-label="Partidos por fecha jugada"
              onScroll={handleCalendarScroll}
            >
              <div className="inline-block" style={{ minWidth: gridWidth }}>
                <div
                  className="grid text-[10px] leading-none text-muted-foreground"
                  aria-hidden="true"
                  style={{
                    height: MONTH_ROW_HEIGHT_PIXELS,
                    marginBottom: 2,
                    gridTemplateColumns: `repeat(${weekCount}, ${CELL_SIZE_PIXELS}px)`,
                    columnGap: CELL_GAP_PIXELS,
                  }}
                >
                  {calendar.monthLabels.map((month, index) => (
                    <span
                      key={`${month.label}-${index}`}
                      className="truncate"
                      style={{ gridColumn: `span ${month.span}` }}
                    >
                      {month.label}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col" style={{ gap: CELL_GAP_PIXELS }}>
                  {calendar.rows.map((row) => (
                    <div
                      key={row.teamSlug}
                      className="grid"
                      style={{
                        height: ROW_HEIGHT_PIXELS,
                        gridTemplateColumns: `repeat(${weekCount}, ${CELL_SIZE_PIXELS}px)`,
                        columnGap: CELL_GAP_PIXELS,
                      }}
                    >
                      {row.cells.map((cell, columnIndex) => (
                        <WeekCell
                          key={cell.weekStart}
                          row={row}
                          cell={cell}
                          delayMilliseconds={calendar.fadeDelayMillisecondsByColumn[columnIndex] ?? 0}
                          onShowTooltip={showTooltip}
                          onHideTooltip={hideTooltip}
                          onMatchLinkClick={handleMatchLinkClick}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <span>Menos</span>
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <span
                key={level}
                aria-hidden="true"
                data-level={level}
                className="played-match-cell inline-block rounded-[2px]"
                style={{
                  width: CELL_SIZE_PIXELS,
                  height: CELL_SIZE_PIXELS,
                  ['--team-hue' as string]: LEGEND_HUE,
                }}
              />
            ))}
            <span>Más</span>
          </div>
        </div>
      ) : null}

      {tooltip ? (
        <div
          role="tooltip"
          className="played-match-tooltip pointer-events-none fixed z-50 max-w-[min(18rem,calc(100vw-1rem))] -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          {tooltip.lines.map((line) => (
            <p key={line.id} className="leading-snug">
              {line.text}
              {line.isNew ? <span className="ml-1 font-medium text-state">Nuevo</span> : null}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function WeekCell({
  row,
  cell,
  delayMilliseconds,
  onShowTooltip,
  onHideTooltip,
  onMatchLinkClick,
}: {
  row: PlayedMatchCalendarRow
  cell: PlayedMatchCalendarCell
  delayMilliseconds: number
  onShowTooltip: (element: HTMLElement, row: PlayedMatchCalendarRow, cell: PlayedMatchCalendarCell) => void
  onHideTooltip: () => void
  onMatchLinkClick: (
    event: MouseEvent<HTMLAnchorElement>,
    row: PlayedMatchCalendarRow,
    cell: PlayedMatchCalendarCell,
  ) => void
}) {
  const cellStyle = {
    ['--team-hue' as string]: LEGEND_HUE,
    ['--played-match-fade-delay' as string]: `${delayMilliseconds}ms`,
  }

  return (
    <div className="relative" style={{ height: ROW_HEIGHT_PIXELS }}>
      {cell.isNew ? (
        <span
          aria-hidden="true"
          className="played-match-cell-enter pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-sm bg-background px-0.5 text-[9px] font-medium leading-[12px] text-state"
          style={cellStyle}
        >
          Nuevo
        </span>
      ) : null}
      {cell.href && cell.ariaLabel ? (
        <Link
          href={cell.href}
          aria-label={cell.ariaLabel}
          data-level={cell.intensityLevel}
          className={cn(
            'played-match-cell played-match-cell-enter absolute bottom-0 left-0 block rounded-[2px]',
            'before:absolute before:-top-3 before:left-0 before:h-3 before:w-full before:content-[""]',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'hover:ring-1 hover:ring-foreground/25',
          )}
          style={{ ...cellStyle, width: CELL_SIZE_PIXELS, height: CELL_SIZE_PIXELS }}
          onMouseEnter={(event) => {
            if (!primaryPointerIsFine()) return
            onShowTooltip(event.currentTarget, row, cell)
          }}
          onMouseLeave={() => {
            if (!primaryPointerIsFine()) return
            onHideTooltip()
          }}
          onFocus={(event) => onShowTooltip(event.currentTarget, row, cell)}
          onBlur={onHideTooltip}
          onClick={(event) => onMatchLinkClick(event, row, cell)}
        />
      ) : (
        <span
          aria-hidden="true"
          data-level={0}
          className="played-match-cell played-match-cell-enter absolute bottom-0 left-0 block rounded-[2px]"
          style={{ ...cellStyle, width: CELL_SIZE_PIXELS, height: CELL_SIZE_PIXELS }}
        />
      )}
    </div>
  )
}

function cellKey(teamSlug: string, weekStart: string): string {
  return `${teamSlug}:${weekStart}`
}

function primaryPointerIsFine(): boolean {
  return window.matchMedia(FINE_POINTER_QUERY).matches
}

function tooltipCenter(rect: DOMRect): number {
  const tooltipWidth = Math.min(18 * 16, window.innerWidth - 16)
  const halfWidth = tooltipWidth / 2
  const center = rect.left + rect.width / 2
  return Math.min(window.innerWidth - 8 - halfWidth, Math.max(8 + halfWidth, center))
}

let rightToLeftRightEdgeIsZeroCache: boolean | null = null

function scrollContainerToNewestWeeks(scrollContainer: HTMLElement): void {
  const maximumScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth
  if (maximumScrollLeft <= SCROLL_EDGE_TOLERANCE_PIXELS) return

  const newestScrollLeft = scrollLeftForVisualRightEdge(scrollContainer, maximumScrollLeft)
  if (Math.abs(scrollContainer.scrollLeft - newestScrollLeft) <= SCROLL_EDGE_TOLERANCE_PIXELS) {
    return
  }

  scrollContainer.scrollLeft = newestScrollLeft
}

function isScrolledToNewestWeeks(scrollContainer: HTMLElement): boolean {
  const maximumScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth
  if (maximumScrollLeft <= SCROLL_EDGE_TOLERANCE_PIXELS) return true

  const newestScrollLeft = scrollLeftForVisualRightEdge(scrollContainer, maximumScrollLeft)
  return Math.abs(scrollContainer.scrollLeft - newestScrollLeft) <= SCROLL_EDGE_TOLERANCE_PIXELS
}

// Weeks stay in DOM order, oldest on the left and newest on the right.
// scrollLeft = scrollWidth - clientWidth opens on that right edge in LTR.
// RTL scrollports use either 0 or that same maximum for the visual right edge;
// flipping flex direction would reverse the chronology, so only the scroll offset changes.
function scrollLeftForVisualRightEdge(scrollContainer: HTMLElement, maximumScrollLeft: number): number {
  if (getComputedStyle(scrollContainer).direction !== 'rtl') return maximumScrollLeft
  return rightToLeftRightEdgeIsZero() ? 0 : maximumScrollLeft
}

function rightToLeftRightEdgeIsZero(): boolean {
  if (rightToLeftRightEdgeIsZeroCache !== null) return rightToLeftRightEdgeIsZeroCache
  if (!document.body) return false

  const probe = document.createElement('div')
  const content = document.createElement('div')
  probe.dir = 'rtl'
  probe.style.direction = 'rtl'
  probe.style.position = 'absolute'
  probe.style.top = '-9999px'
  probe.style.width = '4px'
  probe.style.height = '1px'
  probe.style.overflow = 'scroll'
  content.style.width = '8px'
  content.style.height = '1px'
  probe.appendChild(content)
  document.body.appendChild(probe)
  rightToLeftRightEdgeIsZeroCache = probe.scrollLeft === 0
  probe.remove()
  return rightToLeftRightEdgeIsZeroCache
}
