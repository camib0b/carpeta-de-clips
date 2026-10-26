'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, EyeOff, MoveHorizontal, Pen } from 'lucide-react'
import type { ClipInstance, VideoClip } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import YouTube from 'react-youtube'
import { ShareClipButton } from '@/components/share-clip-button'
import { cn } from '@/lib/utils'
import {
  LONG_OPPONENT_NAME,
  LONG_PLAYER_NAME,
  LONG_TEAM_NAME,
  UNBREAKABLE_LABEL,
  worstCaseScoreLabel,
} from '@/lib/break-ui/worst-case-fixtures'
import { formatClipMatchSummary } from '@/lib/match-display'
import { mediaUrl } from '@/lib/media-url'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  findActiveInstanceIndex,
  playbackTimeIsBeforePlay,
  stepPlayIndex,
} from '@/lib/clip-instance-playback'
import {
  PLAYBACK_RATES,
  formatPlaybackRate,
  htmlVideoPlaybackHandle,
  readMediaConnectionSnapshot,
  shouldPreferLowMedia,
  stepPausedFrameTime,
  type ClipPlaybackHandle,
  type PlaybackRate,
} from '@/lib/clip-player'
import { formatPlayTimestamp } from '@/lib/format-play-timestamp'
import {
  KEYBOARD_SEEK_STEP_SECONDS,
  videoModalKeyAction,
} from '@/lib/video-modal-keyboard'
import { highestAvailablePlaybackQuality } from '@/lib/youtube-playback-quality'
import { WHOLE_CLIP_PLAY_ORD } from '@/lib/clip-drawing-document'
import { VideoTelestrationOverlay } from '@/components/video-telestration-overlay'
import { usePlayDrawing } from '@/hooks/use-play-drawing'

const MINIMUM_SWIPE_DISTANCE = 60
const SWIPE_HINT_STORAGE_KEY = 'carpeta-de-clips-modal-swipe-hint-seen'
const MINIMUM_HORIZONTAL_TO_VERTICAL_RATIO = 1.25
const INTERACTIVE_TOUCH_TARGET_SELECTOR =
  'button, a, input, textarea, select, video, [contenteditable="true"], [role="button"]'
const PLAYBACK_POLL_INTERVAL_MS = 250
const PLAYER_FRAME_FOCUS_POLL_MS = 100
const KEYBOARD_SEEK_REPEAT_WINDOW_MS = 400

const YOUTUBE_PLAYER_STATE = {
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
} as const

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

interface YouTubePlayer {
  getPlayerState: () => number
  getCurrentTime: () => number
  getIframe: () => HTMLIFrameElement
  getDuration: () => number
  getAvailableQualityLevels: () => string[]
  setPlaybackQuality: (suggestedQuality: string) => void
  setPlaybackQualityRange?: (quality: string) => void
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
}

function youtubePlaybackHandle(player: YouTubePlayer): ClipPlaybackHandle {
  return {
    getCurrentTime: () => player.getCurrentTime(),
    seekTo: (seconds) => {
      player.seekTo(seconds, true)
    },
    play: () => {
      player.playVideo()
    },
    pause: () => {
      player.pauseVideo()
    },
    isPlaying: () => {
      const state = player.getPlayerState()
      return (
        state === YOUTUBE_PLAYER_STATE.PLAYING ||
        state === YOUTUBE_PLAYER_STATE.BUFFERING
      )
    },
  }
}

interface VideoModalProps {
  video: VideoClip | null
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPlayOrd?: number
  onJugadaOrdChange?: (jugadaOrd: number) => void
}

interface ClipNavButtonProps {
  direction: 'previous' | 'next'
  onClick: () => void
  disabled?: boolean
  className?: string
}

function isClipNavTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('[data-clip-nav]'))
}

function isBreakUiToggleTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('[data-break-ui-toggle]'))
  )
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (EDITABLE_TAGS.has(target.tagName)) {
    return true
  }
  return target.isContentEditable
}

function ClipNavButton({
  direction,
  onClick,
  disabled = false,
  className,
}: ClipNavButtonProps) {
  const isPrevious = direction === 'previous'
  const Icon = isPrevious ? ChevronLeft : ChevronRight
  const label = isPrevious ? 'Jugada anterior' : 'Jugada siguiente'

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (disabled) {
      return
    }
    onClick()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter') {
      event.preventDefault()
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      tabIndex={-1}
      data-clip-nav={direction}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={label}
      style={{ pointerEvents: 'auto' }}
      className={cn(
        'rounded-full border border-white/15 bg-black/40 text-white/80 shadow-md backdrop-blur-sm',
        'hover:bg-black/55 hover:text-white',
        'disabled:hover:bg-black/40 disabled:hover:text-white/80',
        'focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50',
        'size-10 sm:size-11',
        className,
      )}
    >
      <Icon className="size-5 sm:size-6" aria-hidden />
    </Button>
  )
}

function SwipeNavigationHint() {
  return (
    <div
      className="swipe-navigation-hint pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 pb-4 pt-10 md:hidden"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-medium text-white/95 backdrop-blur-sm">
        <MoveHorizontal className="swipe-navigation-hint-icon size-4 shrink-0" aria-hidden />
        <span>Desliza para cambiar de jugada</span>
      </div>
    </div>
  )
}

interface JugadasListProps {
  instances: ClipInstance[]
  activeIndex: number
  onSelectPlay: (instance: ClipInstance) => void
  listClassName?: string
}

const modalChipClassName =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[0.7rem] transition-colors duration-200 motion-safe:active:scale-[0.98] disabled:opacity-50'

const modalChipSelectedClassName = 'bg-state text-state-foreground'
const modalChipIdleClassName = 'bg-muted text-muted-foreground hover:text-foreground'

function PlaybackRateControl({
  rate,
  onChange,
}: {
  rate: number
  onChange: (rate: PlaybackRate) => void
}) {
  return (
    <div className="px-3 pb-2">
      <h3 className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Velocidad
      </h3>
      <div className="mt-1 flex w-full min-w-0 flex-nowrap items-center gap-1">
        {PLAYBACK_RATES.map((preset) => {
          const selected = preset === rate
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={selected}
              aria-label={`Velocidad ${formatPlaybackRate(preset)}`}
              onClick={() => onChange(preset)}
              className={cn(
                modalChipClassName,
                'font-mono tabular-nums',
                selected ? modalChipSelectedClassName : modalChipIdleClassName,
              )}
            >
              {formatPlaybackRate(preset)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DrawingControls({
  penEnabled,
  drawingsVisible,
  canEdit,
  hasStrokes,
  confirmClear,
  onTogglePen,
  onToggleVisibility,
  onAskClear,
  onConfirmClear,
  onCancelClear,
}: {
  penEnabled: boolean
  drawingsVisible: boolean
  canEdit: boolean
  hasStrokes: boolean
  confirmClear: boolean
  onTogglePen: () => void
  onToggleVisibility: () => void
  onAskClear: () => void
  onConfirmClear: () => void
  onCancelClear: () => void
}) {
  const visibilityLabel = drawingsVisible ? 'Ocultar dibujos' : 'Mostrar dibujos'
  const VisibilityIcon = drawingsVisible ? Eye : EyeOff

  return (
    <div className="flex flex-wrap items-center gap-1 px-3 pb-2">
      <button
        type="button"
        aria-pressed={penEnabled}
        disabled={!canEdit}
        onClick={onTogglePen}
        className={cn(
          modalChipClassName,
          penEnabled ? modalChipSelectedClassName : modalChipIdleClassName,
        )}
      >
        <Pen className="size-3" aria-hidden />
        Dibujar
      </button>
      <button
        type="button"
        aria-pressed={drawingsVisible}
        onClick={onToggleVisibility}
        className={cn(
          modalChipClassName,
          drawingsVisible ? modalChipSelectedClassName : modalChipIdleClassName,
        )}
      >
        <VisibilityIcon className="size-3" aria-hidden />
        {visibilityLabel}
      </button>
      {hasStrokes && confirmClear ? (
        <>
          <span className="text-[0.7rem] text-muted-foreground">¿Borrar este dibujo?</span>
          <button
            type="button"
            onClick={onConfirmClear}
            className={cn(modalChipClassName, modalChipIdleClassName)}
          >
            Sí
          </button>
          <button
            type="button"
            onClick={onCancelClear}
            className={cn(modalChipClassName, modalChipIdleClassName)}
          >
            No
          </button>
        </>
      ) : hasStrokes ? (
        <button
          type="button"
          onClick={onAskClear}
          className={cn(modalChipClassName, modalChipIdleClassName)}
        >
          Borrar
        </button>
      ) : null}
    </div>
  )
}

function JugadasList({
  instances,
  activeIndex,
  onSelectPlay,
  listClassName,
}: JugadasListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const total = instances.length

  useEffect(() => {
    const activeInstance = instances[activeIndex]
    if (!activeInstance) {
      return
    }
    const row = rowRefs.current.get(activeInstance.ord)
    row?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }, [activeIndex, instances])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h3 className="px-3 pt-2 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Jugadas
      </h3>
      <div
        ref={listRef}
        className={cn(
          'mt-1.5 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain border-t border-border',
          listClassName,
        )}
      >
        {instances.map((instance, index) => {
          const isActive = index === activeIndex
          const timestamp = formatPlayTimestamp(instance.offsetS)
          const ariaLabel = `Jugada ${instance.ord} de ${total}, ${timestamp}`

          return (
            <button
              key={instance.ord}
              type="button"
              ref={(element) => {
                if (element) {
                  rowRefs.current.set(instance.ord, element)
                } else {
                  rowRefs.current.delete(instance.ord)
                }
              }}
              onClick={() => onSelectPlay(instance)}
              aria-label={ariaLabel}
              aria-current={isActive ? 'true' : undefined}
              className={cn(
                'grid w-full min-w-0 grid-cols-[auto_auto_minmax(0,max-content)_minmax(0,1fr)] items-baseline gap-x-2 border-b border-border px-3 py-2 text-left font-mono text-xs tabular-nums transition-[background-color] duration-[120ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
                isActive
                  ? 'bg-state font-medium text-state-foreground hover:bg-state'
                  : 'hover:bg-muted/60',
              )}
            >
              <span
                className={cn(
                  'whitespace-nowrap',
                  isActive ? 'text-state-foreground' : 'text-muted-foreground',
                )}
                title={`${instance.ord}/${total}`}
              >
                {instance.ord}/{total}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap',
                  isActive ? 'text-state-foreground' : 'text-foreground',
                )}
                title={timestamp}
              >
                {timestamp}
              </span>
              <span
                className={cn(
                  'min-w-0 truncate',
                  isActive ? 'text-state-foreground' : 'text-muted-foreground',
                )}
                title={instance.quarter}
              >
                {instance.quarter}
              </span>
              <span
                className={cn(
                  'min-w-0 truncate',
                  isActive ? 'text-state-foreground' : 'text-muted-foreground',
                )}
                title={instance.scoreLabel}
              >
                {instance.scoreLabel}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Dev-only. Production builds inline NODE_ENV and drop the toggle. */
const MODAL_BREAK_UI_ENABLED = process.env.NODE_ENV === 'development'

type ModalBreakUiMode = 'demo' | 'worst' | 'empty' | 'one' | 'many'

const MODAL_BREAK_UI_MANY_COUNT = 1000

function readModalBreakUiMode(): ModalBreakUiMode {
  const data = new URLSearchParams(window.location.search).get('modalData')
  if (data === 'worst' || data === 'empty' || data === 'one' || data === 'many') {
    return data
  }
  return 'demo'
}

function writeModalBreakUiMode(mode: ModalBreakUiMode) {
  const url = new URL(window.location.href)
  if (mode === 'demo') {
    url.searchParams.delete('modalData')
  } else {
    url.searchParams.set('modalData', mode)
  }
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

function useModalBreakUiMode(): [ModalBreakUiMode, (mode: ModalBreakUiMode) => void] {
  const [mode, setMode] = useState<ModalBreakUiMode>('demo')

  useEffect(() => {
    if (!MODAL_BREAK_UI_ENABLED) return
    setMode(readModalBreakUiMode())
  }, [])

  function selectMode(nextMode: ModalBreakUiMode) {
    writeModalBreakUiMode(nextMode)
    setMode(nextMode)
  }

  return [mode, selectMode]
}

function mixedWorstInstances(): ClipInstance[] {
  const rows: Array<Pick<ClipInstance, 'quarter' | 'scoreLabel'> & { offsetS?: number }> = [
    { quarter: LONG_PLAYER_NAME, scoreLabel: worstCaseScoreLabel() },
    {},
    { quarter: 'J', scoreLabel: '1–0' },
    { quarter: UNBREAKABLE_LABEL, scoreLabel: '0–1' },
    { quarter: 'Đặng Thị Ngọc Hân', scoreLabel: '2–2' },
    { quarter: '<script>alert(1)</script>', scoreLabel: '&amp;' },
    { quarter: 'نور الهدى عبد الرحمن', offsetS: 1284 * 60 },
    { quarter: '🦊 Fox', scoreLabel: '  ' },
  ]

  return rows.map((row, index) => ({
    ord: index + 1,
    offsetS: row.offsetS ?? index * 45,
    durationS: 8,
    quarter: row.quarter,
    scoreLabel: row.scoreLabel,
  }))
}

function manyModalInstances(): ClipInstance[] {
  return Array.from({ length: MODAL_BREAK_UI_MANY_COUNT }, (_, index) => ({
    ord: index + 1,
    offsetS: index * 12,
    durationS: 6,
    quarter:
      index % 5 === 0 ? undefined : index % 5 === 1 ? LONG_PLAYER_NAME : `Q${(index % 4) + 1}`,
    scoreLabel:
      index % 7 === 0 ? undefined : index % 7 === 1 ? worstCaseScoreLabel() : `${index % 8}–${index % 5}`,
  }))
}

function modalBreakUiVideo(
  video: VideoClip | null,
  mode: ModalBreakUiMode,
): VideoClip | null {
  if (!video || mode === 'demo') return video

  const longTitle = `${LONG_PLAYER_NAME} ${UNBREAKABLE_LABEL} ingreso al área tras una salida de 22 metros`

  if (mode === 'empty') {
    return {
      ...video,
      title: longTitle,
      homeTeam: LONG_TEAM_NAME,
      awayTeam: LONG_OPPONENT_NAME,
      homeGoals: undefined,
      awayGoals: undefined,
      shootoutWinner: undefined,
      instances: [],
    }
  }

  if (mode === 'one') {
    return {
      ...video,
      title: 'Jo',
      homeTeam: 'Jo',
      awayTeam: 'J',
      homeGoals: 1,
      awayGoals: 0,
      shootoutWinner: undefined,
      instances: [{ ord: 1, offsetS: 12, durationS: 6 }],
    }
  }

  if (mode === 'many') {
    return {
      ...video,
      title: longTitle,
      homeTeam: LONG_TEAM_NAME,
      awayTeam: LONG_OPPONENT_NAME,
      homeGoals: 1284,
      awayGoals: 1_000_000,
      instances: manyModalInstances(),
    }
  }

  return {
    ...video,
    title: longTitle,
    homeTeam: LONG_TEAM_NAME,
    awayTeam: LONG_OPPONENT_NAME,
    homeGoals: 1284,
    awayGoals: 1_000_000,
    shootoutWinner: LONG_OPPONENT_NAME,
    instances: mixedWorstInstances(),
  }
}

function ModalBreakUiToggle({
  mode,
  onModeChange,
}: {
  mode: ModalBreakUiMode
  onModeChange: (mode: ModalBreakUiMode) => void
}) {
  const segments: { mode: ModalBreakUiMode; label: string }[] = [
    { mode: 'demo', label: 'Demo data' },
    { mode: 'worst', label: 'Worst case' },
    { mode: 'empty', label: 'Empty' },
    { mode: 'one', label: 'One' },
    { mode: 'many', label: '1,000 rows' },
  ]

  return (
    <div
      data-break-ui-toggle=""
      role="radiogroup"
      aria-label="Break UI data"
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        zIndex: 80,
        transform: 'translateX(-50%)',
        display: 'flex',
        maxWidth: 'calc(100% - 1rem)',
        overflowX: 'auto',
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
              whiteSpace: 'nowrap',
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

/**
 * Modal player. A public self-hosted file uses a native video element.
 * Every other clip keeps the YouTube embed.
 * The player uses the widest 16:9 that fits the viewport. The jugadas
 * column is only as wide as its rows, and it scrolls beside the video
 * instead of stretching the dialog.
 */
export function VideoModal({
  video: videoProp,
  open,
  onOpenChange,
  initialPlayOrd,
  onJugadaOrdChange,
}: VideoModalProps) {
  const [breakUiMode, selectBreakUiMode] = useModalBreakUiMode()
  const video = useMemo(() => {
    if (!MODAL_BREAK_UI_ENABLED || breakUiMode === 'demo') return videoProp
    return modalBreakUiVideo(videoProp, breakUiMode)
  }, [videoProp, breakUiMode])
  const isMobile = useIsMobile()
  const touchStartPoint = useRef<{ x: number; y: number } | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<ClipPlaybackHandle | null>(null)
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null)
  const playerFrameRef = useRef<HTMLIFrameElement | null>(null)
  const appliedPlaybackQualityRef = useRef<string | null>(null)
  const keyboardSeekTargetRef = useRef<{ timeS: number; atMs: number } | null>(null)
  const hostedVideoRef = useRef<HTMLVideoElement | null>(null)
  const seekHoldIndexRef = useRef<number | null>(null)
  const pendingInitialPlayOrdRef = useRef<number | undefined>(undefined)
  const initialPlayOrdRef = useRef(initialPlayOrd)
  initialPlayOrdRef.current = initialPlayOrd
  const playbackRateRef = useRef<PlaybackRate>(1)
  const [shareJugadaOrd, setShareJugadaOrd] = useState<number | undefined>(initialPlayOrd)
  const [swipeHintDismissed, setSwipeHintDismissed] = useState(true)
  const [playbackTimeS, setPlaybackTimeS] = useState(0)
  const [isPlaybackPolling, setIsPlaybackPolling] = useState(false)
  const [manualActiveIndex, setManualActiveIndex] = useState<number | null>(null)
  const [qualityReady, setQualityReady] = useState(false)
  const [preferLow, setPreferLow] = useState(false)
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1)
  const keyboardSeekBadgeIdRef = useRef(0)
  const [keyboardSeekBadge, setKeyboardSeekBadge] = useState<{
    id: number
    label: string
  } | null>(null)
  const [penEnabled, setPenEnabled] = useState(false)
  const [drawingsVisible, setDrawingsVisible] = useState(true)
  const [confirmClearDrawing, setConfirmClearDrawing] = useState(false)
  playbackRateRef.current = playbackRate

  const instances = video?.instances ?? []
  const hasInstances = instances.length > 0
  const hasSelfHostedFile = video != null && mediaUrl(video) != null
  const instancesRef = useRef(instances)
  instancesRef.current = instances

  useEffect(() => {
    try {
      setSwipeHintDismissed(localStorage.getItem(SWIPE_HINT_STORAGE_KEY) === '1')
    } catch {
      setSwipeHintDismissed(false)
    }
  }, [])

  useEffect(() => {
    setManualActiveIndex(null)
  }, [breakUiMode])

  useEffect(() => {
    if (!open) {
      playerRef.current = null
      youtubePlayerRef.current = null
      playerFrameRef.current = null
      appliedPlaybackQualityRef.current = null
      keyboardSeekTargetRef.current = null
      seekHoldIndexRef.current = null
      setIsPlaybackPolling(false)
      setPlaybackTimeS(0)
      setManualActiveIndex(null)
      setQualityReady(false)
      setKeyboardSeekBadge(null)
      setPenEnabled(false)
      setDrawingsVisible(true)
      setConfirmClearDrawing(false)
      return
    }
    setPreferLow(shouldPreferLowMedia(readMediaConnectionSnapshot()))
    setQualityReady(true)
  }, [open, video?.id])

  useEffect(() => {
    playerRef.current = null
    youtubePlayerRef.current = null
    playerFrameRef.current = null
    appliedPlaybackQualityRef.current = null
    keyboardSeekTargetRef.current = null
    seekHoldIndexRef.current = null
    setIsPlaybackPolling(false)
    setPlaybackTimeS(0)
    setManualActiveIndex(null)
    setPlaybackRate(1)
    pendingInitialPlayOrdRef.current = initialPlayOrdRef.current
    setShareJugadaOrd(initialPlayOrdRef.current)
    setKeyboardSeekBadge(null)
    setPenEnabled(false)
    setDrawingsVisible(true)
    setConfirmClearDrawing(false)
  }, [video?.id])

  const dismissSwipeHint = useCallback(() => {
    setSwipeHintDismissed(true)
    try {
      localStorage.setItem(SWIPE_HINT_STORAGE_KEY, '1')
    } catch {
      // ignore private browsing / storage errors
    }
  }, [])

  const showSwipeHint =
    isMobile && open && instances.length > 1 && !swipeHintDismissed

  const preventCloseOnClipNav = useCallback((event: Event) => {
    if (isClipNavTarget(event.target) || isBreakUiToggleTarget(event.target)) {
      event.preventDefault()
    }
  }, [])

  const seekToPlay = useCallback(
    (instance: ClipInstance, instanceIndex: number) => {
      const player = playerRef.current
      if (!player) {
        return
      }
      keyboardSeekTargetRef.current = {
        timeS: instance.offsetS,
        atMs: performance.now(),
      }
      seekHoldIndexRef.current = instanceIndex
      player.seekTo(instance.offsetS)
      player.play()
      setPlaybackTimeS(instance.offsetS)
      setManualActiveIndex(instanceIndex)
      setIsPlaybackPolling(true)
    },
    [],
  )

  const selectPlay = useCallback(
    (instance: ClipInstance, instanceIndex: number) => {
      seekToPlay(instance, instanceIndex)
      setShareJugadaOrd(instance.ord)
      onJugadaOrdChange?.(instance.ord)
    },
    [onJugadaOrdChange, seekToPlay],
  )

  const applyInitialPlayOrd = useCallback(() => {
    const ord = pendingInitialPlayOrdRef.current
    if (!ord || instances.length === 0) {
      return
    }

    const index = instances.findIndex((instance) => instance.ord === ord)
    const instance = index >= 0 ? instances[index] : undefined
    if (!instance || index < 0) {
      return
    }

    pendingInitialPlayOrdRef.current = undefined
    seekToPlay(instance, index)
  }, [instances, seekToPlay])

  const applyHighestPlaybackQuality = useCallback((player: YouTubePlayer) => {
    let qualityLevels: string[]
    try {
      qualityLevels = player.getAvailableQualityLevels()
    } catch {
      return
    }
    if (!Array.isArray(qualityLevels)) {
      return
    }

    const highestQuality = highestAvailablePlaybackQuality(qualityLevels)
    if (!highestQuality || appliedPlaybackQualityRef.current === highestQuality) {
      return
    }

    try {
      player.setPlaybackQualityRange?.(highestQuality)
    } catch {
      // Older players do not expose a quality range.
    }

    try {
      player.setPlaybackQuality(highestQuality)
      appliedPlaybackQualityRef.current = highestQuality
    } catch {
      // The player can reject quality changes before the video metadata arrives.
    }
  }, [])

  const handleYouTubeReady = useCallback(
    (event: { target: YouTubePlayer }) => {
      const player = event.target
      youtubePlayerRef.current = player
      playerRef.current = youtubePlaybackHandle(player)
      try {
        const playerFrame = player.getIframe()
        playerFrame.tabIndex = -1
        playerFrameRef.current = playerFrame
      } catch {
        playerFrameRef.current = null
      }
      applyHighestPlaybackQuality(player)
      applyInitialPlayOrd()
    },
    [applyHighestPlaybackQuality, applyInitialPlayOrd],
  )

  const handleHostedMetadata = useCallback(
    (event: React.SyntheticEvent<HTMLVideoElement>) => {
      const element = event.currentTarget
      element.playbackRate = playbackRateRef.current
      playerRef.current = htmlVideoPlaybackHandle(element)
      applyInitialPlayOrd()
    },
    [applyInitialPlayOrd],
  )

  const handleHostedRateChange = useCallback(
    (event: React.SyntheticEvent<HTMLVideoElement>) => {
      const rate = event.currentTarget.playbackRate
      const preset = PLAYBACK_RATES.find((candidate) => candidate === rate)
      if (preset != null) {
        setPlaybackRate(preset)
      }
    },
    [],
  )

  useEffect(() => {
    const element = hostedVideoRef.current
    if (!element) {
      return
    }
    element.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    if (!open || !playerRef.current) {
      return
    }
    applyInitialPlayOrd()
  }, [open, applyInitialPlayOrd])

  const handleYouTubeStateChange = useCallback(
    (event: { data: number; target?: YouTubePlayer }) => {
      const state = event.data
      const player = event.target ?? youtubePlayerRef.current
      if (player) {
        applyHighestPlaybackQuality(player)
      }
      if (
        state === YOUTUBE_PLAYER_STATE.PLAYING ||
        state === YOUTUBE_PLAYER_STATE.BUFFERING
      ) {
        setIsPlaybackPolling(true)
      } else {
        setIsPlaybackPolling(false)
      }
    },
    [applyHighestPlaybackQuality],
  )

  useEffect(() => {
    if (!open || !isPlaybackPolling) {
      return
    }

    const intervalId = window.setInterval(() => {
      const player = playerRef.current
      if (!player) {
        return
      }
      const currentTime = player.getCurrentTime()
      if (typeof currentTime !== 'number' || !Number.isFinite(currentTime)) {
        return
      }
      const pendingKeyboardSeek = keyboardSeekTargetRef.current
      if (
        pendingKeyboardSeek != null &&
        performance.now() - pendingKeyboardSeek.atMs < KEYBOARD_SEEK_REPEAT_WINDOW_MS
      ) {
        return
      }
      const heldIndex = seekHoldIndexRef.current
      if (
        heldIndex != null &&
        playbackTimeIsBeforePlay(instancesRef.current, heldIndex, currentTime)
      ) {
        return
      }
      seekHoldIndexRef.current = null
      setPlaybackTimeS(currentTime)
      setManualActiveIndex(null)
    }, PLAYBACK_POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [open, isPlaybackPolling, video?.id])

  const computedActiveIndex = findActiveInstanceIndex(instances, playbackTimeS)
  const activeIndex =
    manualActiveIndex != null ? manualActiveIndex : computedActiveIndex

  const activePlay = hasInstances ? instances[activeIndex] : undefined
  const playOrd = !video
    ? null
    : activePlay
      ? activePlay.ord
      : hasInstances
        ? null
        : WHOLE_CLIP_PLAY_ORD
  const {
    strokes: drawingStrokes,
    canEdit: canEditDrawing,
    addStroke: addDrawingStroke,
    clearStrokes: clearDrawingStrokes,
  } = usePlayDrawing(video?.id ?? null, playOrd, open && video != null)

  useEffect(() => {
    setConfirmClearDrawing(false)
  }, [video?.id, playOrd])

  const togglePen = useCallback(() => {
    setPenEnabled((current) => {
      const next = !current
      if (next) setDrawingsVisible(true)
      return next
    })
  }, [])

  const toggleDrawingsVisible = useCallback(() => {
    setDrawingsVisible((current) => {
      const next = !current
      if (!next) setPenEnabled(false)
      return next
    })
  }, [])

  const canStepToPreviousPlay =
    stepPlayIndex(instances.length, activeIndex, 'previous') != null
  const canStepToNextPlay =
    stepPlayIndex(instances.length, activeIndex, 'next') != null

  const navigatePlay = useCallback(
    (direction: 'previous' | 'next') => {
      const nextIndex = stepPlayIndex(instances.length, activeIndex, direction)
      if (nextIndex == null) {
        return false
      }
      const instance = instances[nextIndex]
      if (!instance) {
        return false
      }
      selectPlay(instance, nextIndex)
      return true
    },
    [activeIndex, instances, selectPlay],
  )

  const togglePlayback = useCallback(() => {
    const player = playerRef.current
    if (!player) {
      return
    }

    if (player.isPlaying()) {
      player.pause()
    } else {
      player.play()
    }
  }, [])

  const stepPausedFrame = useCallback(
    (direction: -1 | 1) => {
      const player = playerRef.current
      if (!player || player.isPlaying()) {
        return false
      }
      const mediaDuration = hostedVideoRef.current?.duration
      const durationS = Number.isFinite(mediaDuration)
        ? mediaDuration
        : video?.durationS
      const nextTime = stepPausedFrameTime({
        currentTimeS: player.getCurrentTime(),
        direction,
        fps: video?.fps,
        durationS,
      })
      keyboardSeekTargetRef.current = { timeS: nextTime, atMs: performance.now() }
      player.seekTo(nextTime)
      seekHoldIndexRef.current = null
      setPlaybackTimeS(nextTime)
      setManualActiveIndex(null)
      return true
    },
    [video?.durationS, video?.fps],
  )

  const readOpenClipDurationSeconds = useCallback((): number | null => {
    const hostedElement = hostedVideoRef.current
    if (hostedElement?.isConnected) {
      const hostedDuration = hostedElement.duration
      if (
        typeof hostedDuration === 'number' &&
        Number.isFinite(hostedDuration) &&
        hostedDuration > 0
      ) {
        return hostedDuration
      }
    }

    const youtubePlayer = youtubePlayerRef.current
    if (youtubePlayer) {
      try {
        const reportedDuration = youtubePlayer.getDuration()
        if (
          typeof reportedDuration === 'number' &&
          Number.isFinite(reportedDuration) &&
          reportedDuration > 0
        ) {
          return reportedDuration
        }
      } catch {
        // Player metadata is not ready yet.
      }
    }

    const catalogDuration = video?.durationS
    if (
      typeof catalogDuration === 'number' &&
      Number.isFinite(catalogDuration) &&
      catalogDuration > 0
    ) {
      return catalogDuration
    }

    return null
  }, [video?.durationS])

  const seekByKeyboardStep = useCallback(
    (direction: 'backward' | 'forward') => {
      const player = playerRef.current
      if (!player) {
        return
      }

      let reportedTimeSeconds = 0
      try {
        const currentTimeSeconds = player.getCurrentTime()
        if (
          typeof currentTimeSeconds === 'number' &&
          Number.isFinite(currentTimeSeconds)
        ) {
          reportedTimeSeconds = currentTimeSeconds
        }
      } catch {
        return
      }

      const nowMs = performance.now()
      const pendingSeek = keyboardSeekTargetRef.current
      const repeatSeekIsInFlight =
        pendingSeek != null && nowMs - pendingSeek.atMs < KEYBOARD_SEEK_REPEAT_WINDOW_MS
      const baseTimeSeconds = repeatSeekIsInFlight ? pendingSeek.timeS : reportedTimeSeconds
      const durationSeconds = readOpenClipDurationSeconds()
      const stepSeconds =
        direction === 'backward' ? -KEYBOARD_SEEK_STEP_SECONDS : KEYBOARD_SEEK_STEP_SECONDS
      let nextTimeSeconds = baseTimeSeconds + stepSeconds
      if (nextTimeSeconds < 0) {
        nextTimeSeconds = 0
      }
      if (durationSeconds != null && nextTimeSeconds > durationSeconds) {
        nextTimeSeconds = durationSeconds
      }

      seekHoldIndexRef.current = null
      try {
        player.seekTo(nextTimeSeconds)
      } catch {
        return
      }
      keyboardSeekTargetRef.current = { timeS: nextTimeSeconds, atMs: nowMs }
      setPlaybackTimeS(nextTimeSeconds)
      setManualActiveIndex(null)
      setIsPlaybackPolling(true)
      keyboardSeekBadgeIdRef.current += 1
      setKeyboardSeekBadge({
        id: keyboardSeekBadgeIdRef.current,
        label:
          direction === 'backward'
            ? `−${KEYBOARD_SEEK_STEP_SECONDS}s`
            : `+${KEYBOARD_SEEK_STEP_SECONDS}s`,
      })
    },
    [readOpenClipDurationSeconds],
  )

  const handleOpenAutoFocus = useCallback((event: Event) => {
    event.preventDefault()
    contentRef.current?.focus()
  }, [])

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null

    if (target?.closest(INTERACTIVE_TOUCH_TARGET_SELECTOR)) {
      touchStartPoint.current = null
      return
    }

    const touch = event.touches[0]
    if (!touch) return

    touchStartPoint.current = {
      x: touch.clientX,
      y: touch.clientY,
    }
  }, [])

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!open || !touchStartPoint.current) return

    const touch = event.changedTouches[0]
    if (!touch) {
      touchStartPoint.current = null
      return
    }

    const deltaX = touch.clientX - touchStartPoint.current.x
    const deltaY = touch.clientY - touchStartPoint.current.y
    const horizontalDistance = Math.abs(deltaX)
    const verticalDistance = Math.abs(deltaY)

    touchStartPoint.current = null

    if (
      horizontalDistance < MINIMUM_SWIPE_DISTANCE ||
      horizontalDistance < verticalDistance * MINIMUM_HORIZONTAL_TO_VERTICAL_RATIO
    ) {
      return
    }

    const direction = deltaX < 0 ? 'next' : 'previous'
    if (navigatePlay(direction)) {
      dismissSwipeHint()
    }
  }, [open, navigatePlay, dismissSwipeHint])

  useEffect(() => {
    if (!open || hasSelfHostedFile) {
      return
    }

    // Scrubbing the YouTube timeline leaves focus in the iframe, so the next
    // Space key hits the seek bar. Return focus once the pointer is released.
    let pointerIsDownOnPlayerFrame = false
    let releaseFocusTimerId: number | undefined

    const playerFrameElement = () => {
      const playerFrame = playerFrameRef.current
      if (playerFrame?.isConnected) {
        return playerFrame
      }
      const frame = contentRef.current?.querySelector('iframe')
      return frame instanceof HTMLIFrameElement ? frame : null
    }

    const playerFrameIsFocused = () => {
      const playerFrame = playerFrameElement()
      return playerFrame != null && document.activeElement === playerFrame
    }

    const eventTargetsPlayerFrame = (target: EventTarget | null) => {
      const playerFrame = playerFrameElement()
      return playerFrame != null && target === playerFrame
    }

    const releasePlayerFrameFocus = () => {
      if (!playerFrameIsFocused()) {
        return
      }
      const activeElement = document.activeElement
      if (activeElement instanceof HTMLIFrameElement) {
        activeElement.blur()
      }
      contentRef.current?.focus({ preventScroll: true })
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return
      }
      if (eventTargetsPlayerFrame(event.target)) {
        pointerIsDownOnPlayerFrame = true
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      if ((event.buttons & 1) === 0) {
        return
      }
      if (eventTargetsPlayerFrame(event.target)) {
        pointerIsDownOnPlayerFrame = true
      }
    }

    const handlePointerEnd = () => {
      if (!pointerIsDownOnPlayerFrame) {
        return
      }
      pointerIsDownOnPlayerFrame = false
      window.clearTimeout(releaseFocusTimerId)
      releaseFocusTimerId = window.setTimeout(releasePlayerFrameFocus, 0)
    }

    const releasePlayerFrameFocusWhenPointerIsUp = () => {
      if (pointerIsDownOnPlayerFrame) {
        return
      }
      releasePlayerFrameFocus()
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('pointermove', handlePointerMove, true)
    window.addEventListener('pointerup', handlePointerEnd, true)
    window.addEventListener('pointercancel', handlePointerEnd, true)
    const intervalId = window.setInterval(
      releasePlayerFrameFocusWhenPointerIsUp,
      PLAYER_FRAME_FOCUS_POLL_MS,
    )

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('pointermove', handlePointerMove, true)
      window.removeEventListener('pointerup', handlePointerEnd, true)
      window.removeEventListener('pointercancel', handlePointerEnd, true)
      window.clearInterval(intervalId)
      window.clearTimeout(releaseFocusTimerId)
    }
  }, [open, hasSelfHostedFile])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === ',' || event.key === '.') &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        if (isEditableTarget(event.target) || !hasSelfHostedFile) {
          return
        }
        const stepped = stepPausedFrame(event.key === ',' ? -1 : 1)
        if (!stepped) {
          return
        }
        event.preventDefault()
        event.stopPropagation()
        return
      }

      const decision = videoModalKeyAction({
        key: event.key,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        repeat: event.repeat,
        targetIsEditable: isEditableTarget(event.target),
        hasMarkedPlays: hasInstances,
      })

      if (!decision.capture) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      if (decision.action === 'toggle-playback') {
        togglePlayback()
        return
      }

      if (decision.action === 'seek-backward' || decision.action === 'seek-forward') {
        seekByKeyboardStep(decision.action === 'seek-backward' ? 'backward' : 'forward')
        return
      }

      if (decision.action === 'previous-play' || decision.action === 'next-play') {
        navigatePlay(decision.action === 'previous-play' ? 'previous' : 'next')
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [
    open,
    hasInstances,
    togglePlayback,
    navigatePlay,
    hasSelfHostedFile,
    stepPausedFrame,
    seekByKeyboardStep,
  ])

  if (!video) return null

  const matchSummaryLine = formatClipMatchSummary(video)
  // `preferLow` still returns `r2Key` when `r2KeyLow` is null.
  const hostedUrl =
    hasSelfHostedFile && qualityReady ? mediaUrl(video, { preferLow }) : null

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex w-[calc(100%-0.5rem)] max-w-none flex-col gap-0 overflow-hidden p-0',
          'max-h-[calc(100dvh-0.5rem)] sm:max-w-none',
          'video-modal-motion zoom-in-100! zoom-out-100! ease-[cubic-bezier(0.23,1,0.32,1)]',
          'data-[state=open]:duration-150 data-[state=closed]:duration-100',
        )}
        onOpenAutoFocus={handleOpenAutoFocus}
        onPointerDownOutside={preventCloseOnClipNav}
        onInteractOutside={preventCloseOnClipNav}
      >
        <div
          ref={contentRef}
          tabIndex={-1}
          className={cn(
            'flex max-h-[calc(100dvh-0.5rem)] w-full min-h-0 flex-col outline-none',
            hasInstances && 'md:flex-row md:items-start',
          )}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            touchStartPoint.current = null
          }}
        >
          <div
            className={cn(
              'flex w-full min-w-0 justify-center bg-black max-md:shrink-0',
              hasInstances && 'md:w-auto md:flex-1',
            )}
          >
            <div
              className="relative aspect-video"
              style={{ width: 'min(100%, calc((100dvh - 0.5rem) * 16 / 9))' }}
            >
              {hostedUrl ? (
                <video
                  key={hostedUrl}
                  ref={hostedVideoRef}
                  src={hostedUrl}
                  className="absolute inset-0 h-full w-full bg-black"
                  playsInline
                  controls
                  autoPlay
                  crossOrigin="anonymous"
                  preload="auto"
                  onLoadedMetadata={handleHostedMetadata}
                  onPlay={() => setIsPlaybackPolling(true)}
                  onPlaying={() => setIsPlaybackPolling(true)}
                  onWaiting={() => setIsPlaybackPolling(true)}
                  onPause={() => setIsPlaybackPolling(false)}
                  onEnded={() => setIsPlaybackPolling(false)}
                  onRateChange={handleHostedRateChange}
                />
              ) : hasSelfHostedFile ? null : (
                <YouTube
                  videoId={video.youtubeId}
                  className="absolute inset-0"
                  iframeClassName="h-full w-full"
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: {
                      autoplay: 1,
                      modestbranding: 1,
                      rel: 0,
                      vq: 'highres',
                    },
                  }}
                  onReady={handleYouTubeReady}
                  onStateChange={handleYouTubeStateChange}
                />
              )}

              {playOrd != null ? (
                <VideoTelestrationOverlay
                  key={`${video.id}:${playOrd}`}
                  drawingEnabled={penEnabled && canEditDrawing}
                  drawingsVisible={drawingsVisible || penEnabled}
                  strokes={drawingStrokes}
                  onStrokeComplete={addDrawingStroke}
                />
              ) : null}

              {open && hasInstances && (
                <ClipNavButton
                  direction="previous"
                  disabled={!canStepToPreviousPlay}
                  onClick={() => navigatePlay('previous')}
                  className="absolute top-1/2 left-2 z-20 hidden -translate-y-1/2 md:flex"
                />
              )}
              {open && hasInstances && (
                <ClipNavButton
                  direction="next"
                  disabled={!canStepToNextPlay}
                  onClick={() => navigatePlay('next')}
                  className="absolute top-1/2 right-2 z-20 hidden -translate-y-1/2 md:flex"
                />
              )}

              {showSwipeHint && <SwipeNavigationHint />}
              {keyboardSeekBadge ? (
                <span
                  key={keyboardSeekBadge.id}
                  className="keyboard-seek-badge pointer-events-none absolute top-1/2 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-md bg-black/75 px-2.5 py-1 font-mono text-sm text-white tabular-nums"
                  aria-hidden
                  onAnimationEnd={(event) => {
                    if (event.target !== event.currentTarget) {
                      return
                    }
                    const finishedBadgeId = keyboardSeekBadge.id
                    setKeyboardSeekBadge((currentBadge) =>
                      currentBadge?.id === finishedBadgeId ? null : currentBadge,
                    )
                  }}
                >
                  {keyboardSeekBadge.label}
                </span>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              'relative flex min-h-0 min-w-0 w-full flex-col overflow-hidden border-t border-border',
              hasInstances
                ? 'max-h-[38dvh] md:max-h-none md:w-56 md:shrink-0 md:self-stretch md:border-t-0 md:border-l'
                : 'shrink-0',
            )}
          >
            <div
              className={cn(
                'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
                hasInstances && 'md:absolute md:inset-0',
              )}
            >
              <DialogHeader className="min-w-0 shrink-0 space-y-1 px-3 pt-3 pr-12 pb-2 text-left">
                <div className="flex min-w-0 items-start gap-2">
                  <DialogTitle
                    className="min-w-0 flex-1 wrap-anywhere text-sm font-medium leading-snug tracking-tight"
                    title={video.title}
                  >
                    {video.title}
                  </DialogTitle>
                  <ShareClipButton
                    clipId={video.id}
                    jugadaOrd={shareJugadaOrd}
                    title={video.title}
                  />
                </div>
                <DialogDescription
                  className="min-w-0 wrap-anywhere text-xs leading-snug tabular-nums text-muted-foreground"
                  title={matchSummaryLine}
                >
                  {matchSummaryLine}
                </DialogDescription>
              </DialogHeader>

              <p
                className="hidden shrink-0 px-3 pb-2 text-[0.65rem] leading-snug text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:block"
              >
                <kbd>←</kbd> <kbd>→</kbd> avanzan 3 s.
                <br />
                <kbd>↑</kbd> <kbd>↓</kbd> cambian de jugada.
                <br />
                <kbd>.</kbd> y <kbd>,</kbd> avanzan cuadros en pausa
              </p>

              <DrawingControls
                penEnabled={penEnabled}
                drawingsVisible={drawingsVisible || penEnabled}
                canEdit={canEditDrawing}
                hasStrokes={drawingStrokes.length > 0}
                confirmClear={confirmClearDrawing}
                onTogglePen={togglePen}
                onToggleVisibility={toggleDrawingsVisible}
                onAskClear={() => setConfirmClearDrawing(true)}
                onConfirmClear={() => {
                  clearDrawingStrokes()
                  setConfirmClearDrawing(false)
                }}
                onCancelClear={() => setConfirmClearDrawing(false)}
              />

              {hostedUrl && (
                <PlaybackRateControl
                  rate={playbackRate}
                  onChange={setPlaybackRate}
                />
              )}

              {hasInstances && (
                <JugadasList
                  instances={instances}
                  activeIndex={activeIndex}
                  onSelectPlay={(instance) => {
                    const index = instances.findIndex(
                      (row) => row.ord === instance.ord,
                    )
                    selectPlay(instance, index >= 0 ? index : 0)
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {MODAL_BREAK_UI_ENABLED && open ? (
      <ModalBreakUiToggle mode={breakUiMode} onModeChange={selectBreakUiMode} />
    ) : null}
    </>
  )
}
