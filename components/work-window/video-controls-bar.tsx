'use client'

import {
  ChevronsLeft,
  ChevronsRight,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  StepBack,
  StepForward,
  Volume2,
  VolumeX,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  SEEK_BIG_MS,
  SEEK_SMALL_MS,
  type VideoPlayerActions,
  type VideoPlayerState,
} from '@/hooks/use-video-player'
import { cn } from '@/lib/utils'

interface VideoControlsBarProps {
  state: VideoPlayerState
  actions: VideoPlayerActions
  disabled?: boolean
  className?: string
}

interface ControlButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}

function ControlButton({ label, onClick, disabled, children }: ControlButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className="size-9 text-foreground/80 hover:text-foreground"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

const SECONDS_PER_BIG_SEEK = SEEK_BIG_MS / 1000
const MILLIS_PER_SMALL_SEEK = SEEK_SMALL_MS

/** Playback controls mirroring the AVA desktop VideoControlsBar (seek, play/pause, speed, mute). */
export function VideoControlsBar({
  state,
  actions,
  disabled = false,
  className,
}: VideoControlsBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5',
        className,
      )}
    >
      <ControlButton
        label={`Retroceder ${SECONDS_PER_BIG_SEEK}s`}
        onClick={() => actions.seekByMs(-SEEK_BIG_MS)}
        disabled={disabled}
      >
        <ChevronsLeft className="size-5" aria-hidden />
      </ControlButton>
      <ControlButton
        label={`Retroceder ${MILLIS_PER_SMALL_SEEK}ms`}
        onClick={() => actions.seekByMs(-SEEK_SMALL_MS)}
        disabled={disabled}
      >
        <StepBack className="size-5" aria-hidden />
      </ControlButton>

      <ControlButton
        label={state.playing ? 'Pausar' : 'Reproducir'}
        onClick={actions.togglePlay}
        disabled={disabled}
      >
        {state.playing ? (
          <Pause className="size-5" aria-hidden />
        ) : (
          <Play className="size-5" aria-hidden />
        )}
      </ControlButton>

      <ControlButton
        label={`Avanzar ${MILLIS_PER_SMALL_SEEK}ms`}
        onClick={() => actions.seekByMs(SEEK_SMALL_MS)}
        disabled={disabled}
      >
        <StepForward className="size-5" aria-hidden />
      </ControlButton>
      <ControlButton
        label={`Avanzar ${SECONDS_PER_BIG_SEEK}s`}
        onClick={() => actions.seekByMs(SEEK_BIG_MS)}
        disabled={disabled}
      >
        <ChevronsRight className="size-5" aria-hidden />
      </ControlButton>

      <div className="mx-1 h-5 w-px bg-border/70" aria-hidden />

      <ControlButton
        label="Más lento"
        onClick={() => actions.stepRate(-1)}
        disabled={disabled}
      >
        <Minus className="size-5" aria-hidden />
      </ControlButton>
      <button
        type="button"
        onClick={actions.resetRate}
        disabled={disabled}
        aria-label="Restablecer velocidad"
        className="min-w-12 rounded px-1.5 py-1 text-center text-xs font-medium tabular-nums text-foreground/80 hover:text-foreground disabled:opacity-50"
      >
        {state.rate.toFixed(2)}x
      </button>
      <ControlButton
        label="Más rápido"
        onClick={() => actions.stepRate(1)}
        disabled={disabled}
      >
        <Plus className="size-5" aria-hidden />
      </ControlButton>
      <ControlButton
        label="Restablecer velocidad"
        onClick={actions.resetRate}
        disabled={disabled}
      >
        <RotateCcw className="size-4" aria-hidden />
      </ControlButton>

      <div className="mx-1 h-5 w-px bg-border/70" aria-hidden />

      <ControlButton
        label={state.muted ? 'Activar sonido' : 'Silenciar'}
        onClick={actions.toggleMute}
        disabled={disabled}
      >
        {state.muted ? (
          <VolumeX className="size-5" aria-hidden />
        ) : (
          <Volume2 className="size-5" aria-hidden />
        )}
      </ControlButton>
    </div>
  )
}
