'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { useRevealPresence } from '@camib0b/ui'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  ONE_TEAM_INBOX_EMAIL,
  ONE_TEAM_INBOX_FILE,
  ONE_TEAM_INBOX_NAME,
  TEAM_INBOX_ERROR_MESSAGE,
  TEAM_INBOX_PROGRESS_LABEL,
  WORST_EXTERNAL_LINK,
  WORST_TEAM_INBOX_EMAIL,
  WORST_TEAM_INBOX_FILES,
  WORST_TEAM_INBOX_NAME,
  type TeamInboxFileFixture,
} from '@/lib/break-ui/team-inbox-form-fixtures'
import {
  LANDING_ENTRANCE_STEP_MS,
  landingEntranceDelay,
} from '@/lib/landing-entrance'
import {
  PRIVATE_TEAM_OFFER_DETAIL_LEVELS,
  PRIVATE_TEAM_OFFER_TURNAROUNDS,
  PRIVATE_TEAM_OFFER_WIDEST_PRICE_CLP,
  TEAM_INBOX_EMAIL,
  formatPricePerMatchClp,
  paymentUrlForPrice,
  priceForPrivateTeamOffer,
  turnaroundForPrivateTeamOffer,
  teamInboxMailtoHref,
  type PrivateTeamOfferDetailId,
  type PrivateTeamOfferTurnaroundId,
} from '@/lib/private-team-offer'
import {
  CONTACT_EMAIL_MAX_LENGTH,
  EXTERNAL_LINK_MAX_LENGTH,
  TEAM_NAME_MAX_LENGTH,
  formatByteSize,
  formatInboxLimitSummary,
  formatSelectedFileSummary,
  teamInboxMessages,
  validateTeamInboxSubmission,
  type TeamInboxField,
} from '@/lib/team-inbox'
import { submitTeamInbox } from '@/lib/team-inbox-upload'

const BREAK_UI_TOGGLE_ENABLED = process.env.NODE_ENV === 'development'

const STEPS = [
  'Envía los videos en cualquier formato, ocupando alguno de los 3 mecanismos ofrecidos.',
  'Realiza el pago según el nivel de detalle requerido y el plazo aceptado.',
  'Recibirás tu carpeta con los partidos cortados, ordenados por concepto, listos para ser presentados.',
]

const OFFER_BREAK_UI_COMBOS: {
  detailId: PrivateTeamOfferDetailId
  turnaroundId: PrivateTeamOfferTurnaroundId
}[] = [
  { detailId: 'basic', turnaroundId: 'standard' },
  { detailId: 'basic', turnaroundId: 'express' },
  { detailId: 'exhaustive', turnaroundId: 'standard' },
  { detailId: 'exhaustive', turnaroundId: 'express' },
]

const OFFER_PRICE_MIN_WIDTH = formatPricePerMatchClp(PRIVATE_TEAM_OFFER_WIDEST_PRICE_CLP)

const fieldClassName =
  'h-9 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors duration-color ease-color focus-visible:border-state focus-visible:ring-2 focus-visible:ring-state focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50'

const labelClassName =
  'text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'

type PreviewMode = 'demo' | 'worst' | 'one' | 'error'

type SelectedInboxFile = {
  name: string
  sizeBytes: number
  contentType: string
  file: File | null
}

type InboxFields = {
  teamName: string
  contactEmail: string
  externalLink: string
  files: SelectedInboxFile[]
}

type PreviewDraft = {
  fields: InboxFields
  errorMessage: string | null
  progressLabel: string | null
  successTeamName: string | null
  successEmail: string | null
}

const EMPTY_FIELDS: InboxFields = {
  teamName: '',
  contactEmail: '',
  externalLink: '',
  files: [],
}

function fixtureFiles(files: TeamInboxFileFixture[]): SelectedInboxFile[] {
  return files.map((file) => ({
    name: file.name,
    sizeBytes: file.sizeBytes,
    contentType: file.contentType,
    file: null,
  }))
}

function previewDraft(mode: PreviewMode): PreviewDraft | null {
  if (process.env.NODE_ENV !== 'development' || mode === 'demo') {
    return null
  }
  if (mode === 'one') {
    return {
      fields: {
        teamName: ONE_TEAM_INBOX_NAME,
        contactEmail: ONE_TEAM_INBOX_EMAIL,
        externalLink: '',
        files: fixtureFiles([ONE_TEAM_INBOX_FILE]),
      },
      errorMessage: null,
      progressLabel: null,
      successTeamName: null,
      successEmail: null,
    }
  }
  const fields: InboxFields = {
    teamName: WORST_TEAM_INBOX_NAME,
    contactEmail: WORST_TEAM_INBOX_EMAIL,
    externalLink: WORST_EXTERNAL_LINK,
    files: fixtureFiles(WORST_TEAM_INBOX_FILES),
  }
  if (mode === 'error') {
    return {
      fields,
      errorMessage: TEAM_INBOX_ERROR_MESSAGE,
      progressLabel: TEAM_INBOX_PROGRESS_LABEL,
      successTeamName: null,
      successEmail: null,
    }
  }
  return {
    fields,
    errorMessage: null,
    progressLabel: TEAM_INBOX_PROGRESS_LABEL,
    successTeamName: WORST_TEAM_INBOX_NAME,
    successEmail: WORST_TEAM_INBOX_EMAIL,
  }
}

function readPreviewMode(): PreviewMode {
  const data = new URLSearchParams(window.location.search).get('data')
  if (data === 'worst' || data === 'one' || data === 'error') {
    return data
  }
  return 'demo'
}

function writePreviewMode(mode: PreviewMode) {
  const url = new URL(window.location.href)
  if (mode === 'demo') {
    url.searchParams.delete('data')
  } else {
    url.searchParams.set('data', mode)
  }
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

function BreakUiDataToggle({
  mode,
  onModeChange,
}: {
  mode: PreviewMode
  onModeChange: (mode: PreviewMode) => void
}) {
  const segments: { mode: PreviewMode; label: string }[] = [
    { mode: 'demo', label: 'Demo data' },
    { mode: 'worst', label: 'Worst case' },
    { mode: 'one', label: 'One' },
    { mode: 'error', label: 'Error' },
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
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: 'calc(100vw - 2rem)',
        transform: 'translateX(-50%)',
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

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string
  children: string
}) {
  return (
    <label htmlFor={htmlFor} className={labelClassName}>
      {children}
    </label>
  )
}

const SEND_METHODS = [
  { id: 'upload', label: 'Carga directa' },
  { id: 'link', label: 'Enlace' },
  { id: 'email', label: 'Correo' },
] as const

type SendMethod = (typeof SEND_METHODS)[number]['id']

function sendMethodTabClassName(selected: boolean): string {
  return [
    'shrink-0 whitespace-nowrap pb-3 text-sm transition-colors duration-color ease-color',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
  ].join(' ')
}

type TabIndicator = {
  left: number
  top: number
  width: number
}

function measureTabIndicator(list: HTMLElement, tab: HTMLElement): TabIndicator {
  const listRect = list.getBoundingClientRect()
  const tabRect = tab.getBoundingClientRect()
  return {
    left: tabRect.left - listRect.left,
    top: tabRect.bottom - listRect.top - 2,
    width: tabRect.width,
  }
}

function uploadProgressPercent(progressLabel: string | null): number | null {
  if (progressLabel == null) {
    return null
  }
  const match = /parte (\d+) de (\d+)/.exec(progressLabel)
  if (match == null) {
    return null
  }
  const partNumber = Number(match[1])
  const partCount = Number(match[2])
  if (!Number.isFinite(partNumber) || !Number.isFinite(partCount) || partCount <= 0) {
    return null
  }
  return Math.min(100, Math.max(0, (partNumber / partCount) * 100))
}

function sendMethodPanelClassName(selected: boolean, animate: boolean): string {
  return [
    'w-full min-w-0',
    animate ? 'contact-reveal' : '',
    selected ? 'relative' : 'absolute inset-x-0 top-0',
    !animate && !selected ? 'pointer-events-none opacity-0' : '',
  ]
    .filter((className) => className.length > 0)
    .join(' ')
}

function useAnimatedPanelHeight(node: HTMLElement | null): number | null {
  const [height, setHeight] = useState<number | null>(null)
  const hasMeasuredRef = useRef(false)

  useLayoutEffect(() => {
    if (node == null) {
      return
    }
    let outerFrame = 0
    let innerFrame = 0

    const readAndSet = (immediate: boolean) => {
      const nextHeight = node.offsetHeight
      if (immediate || !hasMeasuredRef.current) {
        hasMeasuredRef.current = true
        setHeight(nextHeight)
        return
      }
      window.cancelAnimationFrame(outerFrame)
      window.cancelAnimationFrame(innerFrame)
      outerFrame = window.requestAnimationFrame(() => {
        innerFrame = window.requestAnimationFrame(() => {
          setHeight(node.offsetHeight)
        })
      })
    }

    readAndSet(!hasMeasuredRef.current)
    const observer = new ResizeObserver(() => {
      readAndSet(false)
    })
    observer.observe(node)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(outerFrame)
      window.cancelAnimationFrame(innerFrame)
    }
  }, [node])

  return height
}

function OfferPrice({ amountLabel }: { amountLabel: string }) {
  const activeLabelRef = useRef(amountLabel)
  const [hasChanged, setHasChanged] = useState(false)
  const [outgoingLabel, setOutgoingLabel] = useState<string | null>(null)
  const [outgoingOpen, setOutgoingOpen] = useState(false)
  const { isRevealMounted } = useRevealPresence(outgoingOpen)

  if (activeLabelRef.current !== amountLabel) {
    const previousLabel = activeLabelRef.current
    activeLabelRef.current = amountLabel
    setOutgoingLabel(previousLabel)
    setOutgoingOpen(true)
    if (!hasChanged) {
      setHasChanged(true)
    }
  }

  useEffect(() => {
    if (!outgoingOpen) {
      return
    }
    const frameId = window.requestAnimationFrame(() => {
      setOutgoingOpen(false)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [outgoingOpen, outgoingLabel])

  return (
    <span
      className="inline-grid whitespace-nowrap tabular-nums"
      style={{ minWidth: `${OFFER_PRICE_MIN_WIDTH.length}ch` }}
    >
      {isRevealMounted && outgoingLabel != null ? (
        <span
          className="contact-reveal col-start-1 row-start-1"
          data-state={outgoingOpen ? 'open' : undefined}
        >
          {outgoingLabel}
        </span>
      ) : null}
      <span
        key={hasChanged ? amountLabel : 'current'}
        className={hasChanged ? 'contact-reveal col-start-1 row-start-1' : 'col-start-1 row-start-1'}
        data-state={hasChanged ? 'open' : undefined}
      >
        {amountLabel}
      </span>
    </span>
  )
}

function OfferSegmentGroup<T extends string>({
  groupId,
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  groupId: string
  label: string
  options: { id: T; label: string }[]
  value: T
  disabled: boolean
  onChange: (next: T) => void
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  function moveSelection(index: number, key: string) {
    if (disabled) {
      return
    }
    const lastIndex = options.length - 1
    let nextIndex = index
    if (key === 'ArrowRight') {
      nextIndex = index === lastIndex ? 0 : index + 1
    } else if (key === 'ArrowLeft') {
      nextIndex = index === 0 ? lastIndex : index - 1
    } else if (key === 'Home') {
      nextIndex = 0
    } else if (key === 'End') {
      nextIndex = lastIndex
    } else {
      return
    }
    const next = options[nextIndex]
    if (next == null) {
      return
    }
    onChange(next.id)
    tabRefs.current[nextIndex]?.focus({ preventScroll: true })
  }

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  )

  return (
    <div className="min-w-0 space-y-2">
      <span id={`${groupId}-label`} className={labelClassName}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-label`}
        data-count={options.length}
        data-segment={selectedIndex}
        className="segmented w-full min-w-0"
      >
        {options.map((option, index) => {
          const selected = value === option.id
          return (
            <button
              key={option.id}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              className="!min-w-0"
              onClick={() => onChange(option.id)}
              onKeyDown={(event) => {
                if (
                  event.key !== 'ArrowRight' &&
                  event.key !== 'ArrowLeft' &&
                  event.key !== 'Home' &&
                  event.key !== 'End'
                ) {
                  return
                }
                event.preventDefault()
                moveSelection(index, event.key)
              }}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TeamContactFields({
  idPrefix,
  teamName,
  contactEmail,
  previewLocked,
  submitting,
  invalidField,
  describedBy,
  onTeamNameChange,
  onContactEmailChange,
}: {
  idPrefix: string
  teamName: string
  contactEmail: string
  previewLocked: boolean
  submitting: boolean
  invalidField: TeamInboxField | null
  describedBy: (
    field: TeamInboxField,
    hintId?: string,
    errorElementId?: string,
  ) => string | undefined
  onTeamNameChange: (value: string) => void
  onContactEmailChange: (value: string) => void
}) {
  const teamNameId = `${idPrefix}-team-name`
  const emailId = `${idPrefix}-email`

  return (
    <>
      <div className="min-w-0 space-y-2">
        <FieldLabel htmlFor={teamNameId}>Nombre del equipo</FieldLabel>
        <input
          id={teamNameId}
          name="teamName"
          type="text"
          autoComplete="organization"
          maxLength={TEAM_NAME_MAX_LENGTH}
          value={teamName}
          readOnly={previewLocked}
          disabled={submitting}
          aria-invalid={invalidField === 'teamName'}
          aria-describedby={describedBy('teamName', undefined, `${idPrefix}-error`)}
          onChange={(event) => {
            onTeamNameChange(event.target.value)
          }}
          className={fieldClassName}
        />
      </div>
      <div className="min-w-0 space-y-2">
        <FieldLabel htmlFor={emailId}>Correo de contacto</FieldLabel>
        <input
          id={emailId}
          name="contactEmail"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          maxLength={CONTACT_EMAIL_MAX_LENGTH}
          value={contactEmail}
          readOnly={previewLocked}
          disabled={submitting}
          aria-invalid={invalidField === 'contactEmail'}
          aria-describedby={describedBy('contactEmail', undefined, `${idPrefix}-error`)}
          onChange={(event) => {
            onContactEmailChange(event.target.value)
          }}
          className={fieldClassName}
        />
      </div>
    </>
  )
}

function InboxSubmissionNotice({
  note,
  progressLabel,
  errorMessage,
  errorElementId,
  successTeamName,
  successEmail,
  submitting,
  previewLocked,
}: {
  note?: string
  progressLabel: string | null
  errorMessage: string | null
  errorElementId: string
  successTeamName: string | null
  successEmail: string | null
  submitting: boolean
  previewLocked: boolean
}) {
  const progressPercent = uploadProgressPercent(progressLabel)

  return (
    <div className="min-w-0 py-8">
      {progressLabel && (
        <div className="mb-4 min-w-0">
          <p
            id={`${errorElementId}-progress`}
            aria-live="polite"
            className="min-w-0 wrap-anywhere text-sm tabular-nums text-muted-foreground"
          >
            {progressLabel}
          </p>
          {progressPercent != null ? (
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPercent)}
              aria-labelledby={`${errorElementId}-progress`}
              className="mt-2 h-1 w-full overflow-hidden bg-muted"
            >
              <div
                className="h-full bg-foreground motion-safe:transition-[width] motion-safe:duration-color motion-safe:ease-out-strong"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          ) : null}
        </div>
      )}
      <Button type="submit" variant="outline" disabled={previewLocked || submitting}>
        {submitting ? 'Enviando' : 'Enviar'}
      </Button>
      {note != null && note.length > 0 && (
        <p className="mt-3 min-w-0 text-sm leading-relaxed text-muted-foreground">{note}</p>
      )}
      {errorMessage && (
        <p
          id={errorElementId}
          role="alert"
          className="mt-4 min-w-0 wrap-anywhere text-sm text-destructive"
        >
          {errorMessage}
        </p>
      )}
      {successTeamName && successEmail && (
        <p role="status" className="mt-4 min-w-0 wrap-anywhere text-sm text-foreground">
          Quedó registrado para {successTeamName}. El correo de contacto es {successEmail}. La
          carpeta se arma después del pago.
        </p>
      )}
    </div>
  )
}

const PRIVATE_FOLDER_PANEL_ID = 'equipos-panel'

function hashIdentifier(hash: string): string | null {
  if (!hash.startsWith('#') || hash.length < 2) {
    return null
  }
  try {
    const identifier = decodeURIComponent(hash.slice(1))
    return identifier.length > 0 ? identifier : null
  } catch {
    return null
  }
}

function transitionDurationMs(element: HTMLElement): number {
  const raw = getComputedStyle(element).transitionDuration.split(',')[0]?.trim() ?? '0s'
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value)) {
    return 0
  }
  return raw.endsWith('ms') ? value : value * 1000
}

function hashTargetInSection(section: HTMLElement, hash: string): HTMLElement | null {
  const identifier = hashIdentifier(hash)
  if (identifier == null) {
    return null
  }
  if (section.id === identifier) {
    return section
  }
  const target = document.getElementById(identifier)
  if (target == null || !section.contains(target)) {
    return null
  }
  return target
}

export function PrivateTeamFolderSection({
  entranceStepStart = 0,
}: {
  entranceStepStart?: number
}) {
  const fileInputId = useId()
  const sendMethodBaseId = useId()
  const offerDetailGroupId = useId()
  const offerTurnaroundGroupId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendMethodTabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [previewMode, setPreviewMode] = useState<PreviewMode>('demo')
  const [sendMethod, setSendMethod] = useState<SendMethod>('upload')
  const [detailId, setDetailId] = useState<PrivateTeamOfferDetailId>('basic')
  const [turnaroundId, setTurnaroundId] =
    useState<PrivateTeamOfferTurnaroundId>('standard')
  const [offerBreakComboIndex, setOfferBreakComboIndex] = useState(0)
  const [fields, setFields] = useState<InboxFields>(EMPTY_FIELDS)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [invalidField, setInvalidField] = useState<TeamInboxField | null>(null)
  const [progressLabel, setProgressLabel] = useState<string | null>(null)
  const [successTeamName, setSuccessTeamName] = useState<string | null>(null)
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [animateSendMethodPanels, setAnimateSendMethodPanels] = useState(false)
  const [tabIndicator, setTabIndicator] = useState<TabIndicator | null>(null)
  const [privateFolderOpen, setPrivateFolderOpen] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const privateFolderOpenRef = useRef(false)
  const pendingHashTargetRef = useRef<HTMLElement | null>(null)
  const sendMethodTabListRef = useRef<HTMLDivElement>(null)
  const [emailPanel, setEmailPanel] = useState<HTMLDivElement | null>(null)
  const [uploadPanel, setUploadPanel] = useState<HTMLFormElement | null>(null)
  const [linkPanel, setLinkPanel] = useState<HTMLFormElement | null>(null)
  const activeSendPanel =
    sendMethod === 'upload' ? uploadPanel : sendMethod === 'link' ? linkPanel : emailPanel
  const sendPanelHeight = useAnimatedPanelHeight(activeSendPanel)

  const previewLocked = BREAK_UI_TOGGLE_ENABLED && previewMode !== 'demo'

  useEffect(() => {
    if (!BREAK_UI_TOGGLE_ENABLED) {
      return
    }
    const mode = readPreviewMode()
    setPreviewMode(mode)
    applyPreview(mode)
  }, [])

  useLayoutEffect(() => {
    privateFolderOpenRef.current = privateFolderOpen
  }, [privateFolderOpen])

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (section == null) {
      return
    }

    const revealHash = (hash: string) => {
      const target = hashTargetInSection(section, hash)
      if (target == null) {
        return
      }
      if (privateFolderOpenRef.current) {
        target.scrollIntoView()
        return
      }
      pendingHashTargetRef.current = target
      setPrivateFolderOpen(true)
    }

    const revealCurrentHash = () => {
      revealHash(window.location.hash)
    }

    const revealSamePageHashClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      const anchor = (event.target as Element | null)?.closest?.('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) {
        return
      }
      let url: URL
      try {
        url = new URL(anchor.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) {
        return
      }
      if (url.hash === window.location.hash) {
        revealHash(url.hash)
      }
    }

    revealCurrentHash()
    window.addEventListener('hashchange', revealCurrentHash)
    document.addEventListener('click', revealSamePageHashClick)
    return () => {
      window.removeEventListener('hashchange', revealCurrentHash)
      document.removeEventListener('click', revealSamePageHashClick)
    }
  }, [])

  useLayoutEffect(() => {
    if (!privateFolderOpen) {
      return
    }
    const target = pendingHashTargetRef.current
    const panel = document.getElementById(PRIVATE_FOLDER_PANEL_ID)
    if (target == null || panel == null) {
      return
    }

    let fallbackId = 0
    let cancelled = false

    const finishScroll = () => {
      if (cancelled) {
        return
      }
      cancelled = true
      pendingHashTargetRef.current = null
      window.clearTimeout(fallbackId)
      panel.removeEventListener('transitionend', handleTransitionEnd)
      target.scrollIntoView()
    }

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== panel || event.propertyName !== 'grid-template-rows') {
        return
      }
      finishScroll()
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      finishScroll()
      return
    }

    panel.addEventListener('transitionend', handleTransitionEnd)
    fallbackId = window.setTimeout(finishScroll, transitionDurationMs(panel) + 40)
    return () => {
      cancelled = true
      window.clearTimeout(fallbackId)
      panel.removeEventListener('transitionend', handleTransitionEnd)
    }
  }, [privateFolderOpen])

  useEffect(() => {
    if (!BREAK_UI_TOGGLE_ENABLED || previewMode !== 'worst') {
      return
    }
    const timer = window.setInterval(() => {
      setOfferBreakComboIndex((current) => (current + 1) % OFFER_BREAK_UI_COMBOS.length)
    }, 1200)
    return () => window.clearInterval(timer)
  }, [previewMode])

  const previewOfferCombo =
    BREAK_UI_TOGGLE_ENABLED && previewMode === 'worst'
      ? OFFER_BREAK_UI_COMBOS[offerBreakComboIndex]
      : BREAK_UI_TOGGLE_ENABLED && previewMode === 'one'
        ? OFFER_BREAK_UI_COMBOS[0]
        : null

  const selectedDetailId = previewOfferCombo?.detailId ?? detailId
  const selectedTurnaroundId = previewOfferCombo?.turnaroundId ?? turnaroundId
  const selectedDetail =
    PRIVATE_TEAM_OFFER_DETAIL_LEVELS.find((level) => level.id === selectedDetailId) ??
    PRIVATE_TEAM_OFFER_DETAIL_LEVELS[0]
  const selectedTurnaround = turnaroundForPrivateTeamOffer(selectedTurnaroundId)
  const selectedPriceClp = priceForPrivateTeamOffer(selectedDetailId, selectedTurnaroundId)
  const selectedPaymentUrl = paymentUrlForPrice(selectedPriceClp)
  const offerTogglesLocked = previewLocked

  function applyPreview(mode: PreviewMode) {
    const draft = previewDraft(mode)
    if (!draft) {
      setFields(EMPTY_FIELDS)
      setErrorMessage(null)
      setInvalidField(null)
      setProgressLabel(null)
      setSuccessTeamName(null)
      setSuccessEmail(null)
      return
    }
    setFields(draft.fields)
    setErrorMessage(draft.errorMessage)
    setInvalidField(draft.errorMessage ? 'form' : null)
    setProgressLabel(draft.progressLabel)
    setSuccessTeamName(draft.successTeamName)
    setSuccessEmail(draft.successEmail)
  }

  function selectPreviewMode(mode: PreviewMode) {
    writePreviewMode(mode)
    setPreviewMode(mode)
    applyPreview(mode)
  }

  function describedBy(
    field: TeamInboxField,
    hintId?: string,
    errorElementId = 'team-inbox-upload-error',
  ): string | undefined {
    const ids = [
      hintId,
      invalidField === field && errorMessage ? errorElementId : null,
    ].filter((id): id is string => id != null)
    return ids.length > 0 ? ids.join(' ') : undefined
  }

  useLayoutEffect(() => {
    const list = sendMethodTabListRef.current
    const selectedIndex = SEND_METHODS.findIndex((method) => method.id === sendMethod)
    const tab = sendMethodTabRefs.current[selectedIndex]
    if (list == null || tab == null) {
      return
    }
    const update = () => {
      setTabIndicator(measureTabIndicator(list, tab))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(list)
    observer.observe(tab)
    return () => observer.disconnect()
  }, [sendMethod])

  function chooseFiles(fileList: FileList | null) {
    if (previewLocked || submitting || fileList == null || fileList.length === 0) {
      return
    }
    const selected = Array.from(fileList).map((file) => ({
      name: file.name,
      sizeBytes: file.size,
      contentType: file.type,
      file,
    }))
    const validation = validateTeamInboxSubmission({
      teamName: 'Equipo',
      contactEmail: 'equipo@example.com',
      externalLink: null,
      files: selected.map((file) => ({
        fileName: file.name,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
      })),
    })
    if (!validation.ok) {
      setErrorMessage(validation.error)
      setInvalidField('files')
      return
    }
    setErrorMessage(null)
    setInvalidField(null)
    setSuccessTeamName(null)
    setSuccessEmail(null)
    setFields((current) => ({
      ...current,
      files: validation.value.files.map((file, index) => ({
        name: file.originalFileName,
        sizeBytes: file.sizeBytes,
        contentType: file.contentType,
        file: selected[index]?.file ?? null,
      })),
    }))
  }

  function removeFile(fileIndex: number) {
    if (submitting) {
      return
    }
    setFields((current) => ({
      ...current,
      files: current.files.filter((_, index) => index !== fileIndex),
    }))
  }

  function selectSendMethod(method: SendMethod) {
    if (submitting) {
      return
    }
    setAnimateSendMethodPanels(true)
    setSendMethod(method)
  }

  function moveSendMethod(index: number, key: string) {
    if (submitting) {
      return
    }
    const lastIndex = SEND_METHODS.length - 1
    let nextIndex = index
    if (key === 'ArrowRight') {
      nextIndex = index === lastIndex ? 0 : index + 1
    } else if (key === 'ArrowLeft') {
      nextIndex = index === 0 ? lastIndex : index - 1
    } else if (key === 'Home') {
      nextIndex = 0
    } else if (key === 'End') {
      nextIndex = lastIndex
    } else {
      return
    }
    const nextMethod = SEND_METHODS[nextIndex]
    if (nextMethod == null) {
      return
    }
    selectSendMethod(nextMethod.id)
    sendMethodTabRefs.current[nextIndex]?.focus({ preventScroll: true })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (previewLocked || submitting || sendMethod === 'email') {
      return
    }
    const submittingUpload = sendMethod === 'upload'
    const validation = validateTeamInboxSubmission({
      teamName: fields.teamName,
      contactEmail: fields.contactEmail,
      externalLink: submittingUpload ? null : fields.externalLink,
      files: submittingUpload
        ? fields.files.map((file) => ({
            fileName: file.name,
            contentType: file.contentType,
            sizeBytes: file.sizeBytes,
          }))
        : [],
    })
    if (!validation.ok) {
      setErrorMessage(validation.error)
      setInvalidField(validation.field)
      setSuccessTeamName(null)
      setSuccessEmail(null)
      toast.error(validation.error)
      return
    }

    const realFiles: File[] = []
    if (submittingUpload) {
      for (const file of fields.files) {
        if (file.file == null) {
          setErrorMessage(teamInboxMessages.uploadFailed)
          setInvalidField('files')
          toast.error(teamInboxMessages.uploadFailed)
          return
        }
        realFiles.push(file.file)
      }
    }

    setSubmitting(true)
    setErrorMessage(null)
    setInvalidField(null)
    setSuccessTeamName(null)
    setSuccessEmail(null)
    try {
      await submitTeamInbox({
        teamName: validation.value.teamName,
        contactEmail: validation.value.contactEmail,
        externalLink: validation.value.externalLink ?? '',
        files: realFiles,
        onProgress: setProgressLabel,
      })
      setFields(EMPTY_FIELDS)
      setProgressLabel(null)
      setSuccessTeamName(validation.value.teamName)
      setSuccessEmail(validation.value.contactEmail)
      toast.success('Quedó registrado. La carpeta se arma después del pago.')
    } catch (error) {
      setProgressLabel(null)
      const message =
        error instanceof Error && error.message.length > 0
          ? error.message
          : teamInboxMessages.uploadFailed
      setErrorMessage(message)
      setInvalidField('form')
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      ref={sectionRef}
      id="equipos"
      aria-labelledby="equipos-heading"
      className={`landing-enter min-w-0 scroll-mt-8${BREAK_UI_TOGGLE_ENABLED ? ' pb-20' : ''}`}
      style={{
        animationDelay: landingEntranceDelay(
          entranceStepStart,
          LANDING_ENTRANCE_STEP_MS,
        ),
      }}
    >
      <div aria-hidden="true" className="border-t border-border mb-28" />
      <h2
        id="equipos-heading"
        className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
      >
        <button
          type="button"
          aria-expanded={privateFolderOpen}
          aria-controls={PRIVATE_FOLDER_PANEL_ID}
          onClick={() => {
            setPrivateFolderOpen((open) => !open)
          }}
          className="flex w-full min-w-0 items-start gap-1.5 text-left text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-state focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            data-state={privateFolderOpen ? 'open' : 'closed'}
            className="equipos-disclosure-chevron mt-0.5 size-2.5 shrink-0"
          >
            <path fill="currentColor" d="M5.5 3.5 11 8 5.5 12.5Z" />
          </svg>
          <span className="min-w-0">Carpeta privada para equipos</span>
        </button>
      </h2>
      <div
        id={PRIVATE_FOLDER_PANEL_ID}
        data-state={privateFolderOpen ? 'open' : 'closed'}
        inert={!privateFolderOpen}
        className="equipos-disclosure"
      >
        <div className="equipos-disclosure-inner">
          <p className="min-w-0 text-base leading-relaxed text-foreground">
            Encarga tu propia carpeta con los recortes de los partidos que te interesen.
          </p>
          <ol className="mt-6 min-w-0 space-y-2 text-sm leading-relaxed text-foreground">
            {STEPS.map((step, stepIndex) => (
              <li key={step} className="flex min-w-0 items-start gap-3">
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {stepIndex + 1}
                </span>
                <span className="min-w-0">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 min-w-0 space-y-6 border-t border-border pt-8">
            <OfferSegmentGroup
              groupId={offerDetailGroupId}
              label="Nivel de detalle"
              options={PRIVATE_TEAM_OFFER_DETAIL_LEVELS.map((level) => ({
                id: level.id,
                label: level.label,
              }))}
              value={selectedDetailId}
              disabled={offerTogglesLocked}
              onChange={setDetailId}
            />
            <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">
              {selectedDetail.description}
            </p>
            <OfferSegmentGroup
              groupId={offerTurnaroundGroupId}
              label="Plazo"
              options={PRIVATE_TEAM_OFFER_TURNAROUNDS.map((turnaround) => ({
                id: turnaround.id,
                label: turnaround.label,
              }))}
              value={selectedTurnaroundId}
              disabled={offerTogglesLocked}
              onChange={setTurnaroundId}
            />
            <p className="flex min-w-0 flex-wrap gap-x-2 text-sm text-foreground">
              <span className="text-muted-foreground">Plazo</span>
              <span className="min-w-0">{selectedTurnaround.turnaround}</span>
            </p>
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm text-foreground">
              <span className="text-muted-foreground">Precio por partido</span>
              <OfferPrice amountLabel={formatPricePerMatchClp(selectedPriceClp)} />
            </p>
            <div>
              <Button variant="default" asChild>
                <a
                  href={selectedPaymentUrl}
                  aria-label={`Pagar ${selectedDetail.label} ${selectedTurnaround.label}`}
                >
                  Pagar
                </a>
              </Button>
            </div>
          </div>
          <p className="mt-8 min-w-0 text-sm leading-relaxed text-muted-foreground">
            El plazo empieza a correr cuando llega el pago y el video del partido.
          </p>

          <p
            id="equipos-send-label"
            className="mt-12 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
          >
            Cómo enviar los videos
          </p>
          <div
            ref={sendMethodTabListRef}
            role="tablist"
            aria-labelledby="equipos-send-label"
            className="relative mt-4 flex min-w-0 flex-wrap gap-x-6 border-b border-border"
          >
            {SEND_METHODS.map((method, index) => {
              const selected = sendMethod === method.id
              return (
                <button
                  key={method.id}
                  ref={(node) => {
                    sendMethodTabRefs.current[index] = node
                  }}
                  type="button"
                  role="tab"
                  id={`${sendMethodBaseId}-${method.id}-tab`}
                  aria-controls={`${sendMethodBaseId}-${method.id}-panel`}
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  className={sendMethodTabClassName(selected)}
                  onClick={() => selectSendMethod(method.id)}
                  onKeyDown={(event) => {
                    if (
                      event.key !== 'ArrowRight' &&
                      event.key !== 'ArrowLeft' &&
                      event.key !== 'Home' &&
                      event.key !== 'End'
                    ) {
                      return
                    }
                    event.preventDefault()
                    moveSendMethod(index, event.key)
                  }}
                >
                  {method.label}
                </button>
              )
            })}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute h-0.5 bg-foreground motion-safe:transition-[transform,width] motion-safe:duration-color motion-safe:ease-out-strong"
              style={{
                width: tabIndicator?.width ?? 0,
                transform:
                  tabIndicator == null
                    ? undefined
                    : `translate(${tabIndicator.left}px, ${tabIndicator.top}px)`,
                opacity: tabIndicator == null ? 0 : 1,
              }}
            />
          </div>
          <div
            className="relative overflow-hidden motion-safe:transition-[height] motion-safe:duration-color motion-safe:ease-out-strong"
            style={sendPanelHeight != null ? { height: sendPanelHeight } : undefined}
          >
            <div
              ref={setEmailPanel}
              role="tabpanel"
              id={`${sendMethodBaseId}-email-panel`}
              aria-labelledby={`${sendMethodBaseId}-email-tab`}
              inert={sendMethod !== 'email'}
              aria-hidden={sendMethod === 'email' ? undefined : true}
              data-state={
                animateSendMethodPanels && sendMethod === 'email' ? 'open' : undefined
              }
              className={sendMethodPanelClassName(
                sendMethod === 'email',
                animateSendMethodPanels,
              )}
            >
              <div className="min-w-0 py-8">
                <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">
                  Indicar nombre del equipo en el asunto.
                </p>
                <a
                  href={teamInboxMailtoHref(TEAM_INBOX_EMAIL)}
                  className="mt-4 block min-w-0 wrap-anywhere text-sm text-foreground underline underline-offset-4"
                >
                  {TEAM_INBOX_EMAIL}
                </a>
              </div>
            </div>
            <form
              ref={setUploadPanel}
              noValidate
              role="tabpanel"
              id={`${sendMethodBaseId}-upload-panel`}
              aria-labelledby={`${sendMethodBaseId}-upload-tab`}
              inert={sendMethod !== 'upload'}
              aria-hidden={sendMethod === 'upload' ? undefined : true}
              data-state={
                animateSendMethodPanels && sendMethod === 'upload' ? 'open' : undefined
              }
              className={sendMethodPanelClassName(
                sendMethod === 'upload',
                animateSendMethodPanels,
              )}
              onSubmit={handleSubmit}
            >
              <div className="min-w-0 pt-8">
                <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">
                  Carga el partido en este formulario. Quedará guardado para armar la carpeta.
                </p>
                <div className="mt-6 space-y-5">
                  <TeamContactFields
                    idPrefix="team-inbox-upload"
                    teamName={fields.teamName}
                    contactEmail={fields.contactEmail}
                    previewLocked={previewLocked}
                    submitting={submitting}
                    invalidField={invalidField}
                    describedBy={describedBy}
                    onTeamNameChange={(value) => {
                      setFields((current) => ({ ...current, teamName: value }))
                    }}
                    onContactEmailChange={(value) => {
                      setFields((current) => ({ ...current, contactEmail: value }))
                    }}
                  />
                  <div className="min-w-0 space-y-2">
                    <span id="team-inbox-files-label" className={labelClassName}>
                      Archivos
                    </span>
                    <input
                      ref={fileInputRef}
                      id={fileInputId}
                      type="file"
                      accept="video/*"
                      multiple
                      tabIndex={-1}
                      disabled={previewLocked || submitting}
                      aria-labelledby="team-inbox-files-label"
                      className="sr-only"
                      onChange={(event) => {
                        chooseFiles(event.target.files)
                        event.target.value = ''
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={previewLocked || submitting}
                      aria-describedby={describedBy(
                        'files',
                        'team-inbox-files-hint',
                        'team-inbox-upload-error',
                      )}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Elegir archivos
                    </Button>
                    <p
                      id="team-inbox-files-hint"
                      className="min-w-0 text-sm leading-relaxed text-muted-foreground"
                    >
                      {formatInboxLimitSummary()} Los archivos grandes se envían por partes. No
                      cierres la página hasta que termine.
                    </p>
                    <p className="min-w-0 text-sm text-muted-foreground">
                      {fields.files.length === 0
                        ? 'Ningún archivo elegido.'
                        : formatSelectedFileSummary(fields.files)}
                    </p>
                    {fields.files.length > 0 && (
                      <ul className="min-w-0 divide-y divide-border">
                        {fields.files.map((file, fileIndex) => (
                          <li
                            key={`${file.name}-${file.sizeBytes}-${fileIndex}`}
                            className="flex min-w-0 items-start gap-3 py-3"
                          >
                            <span
                              dir="auto"
                              title={file.name}
                              className="min-w-0 flex-1 wrap-anywhere text-sm text-foreground"
                            >
                              {file.name}
                            </span>
                            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                              {formatByteSize(file.sizeBytes)}
                            </span>
                            <button
                              type="button"
                              className="shrink-0 text-sm text-muted-foreground transition-colors duration-color ease-color hover:text-foreground"
                              onClick={() => removeFile(fileIndex)}
                              disabled={submitting}
                            >
                              Quitar
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <InboxSubmissionNotice
                  progressLabel={sendMethod === 'upload' ? progressLabel : null}
                  errorMessage={sendMethod === 'upload' ? errorMessage : null}
                  errorElementId="team-inbox-upload-error"
                  successTeamName={sendMethod === 'upload' ? successTeamName : null}
                  successEmail={sendMethod === 'upload' ? successEmail : null}
                  submitting={submitting}
                  previewLocked={previewLocked}
                />
              </div>
            </form>
            <form
              ref={setLinkPanel}
              noValidate
              role="tabpanel"
              id={`${sendMethodBaseId}-link-panel`}
              aria-labelledby={`${sendMethodBaseId}-link-tab`}
              inert={sendMethod !== 'link'}
              aria-hidden={sendMethod === 'link' ? undefined : true}
              data-state={
                animateSendMethodPanels && sendMethod === 'link' ? 'open' : undefined
              }
              className={sendMethodPanelClassName(
                sendMethod === 'link',
                animateSendMethodPanels,
              )}
              onSubmit={handleSubmit}
            >
              <div className="min-w-0 pt-8">
                <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">
                  Enlace de YouTube, Google Drive, WeTransfer u otro.
                </p>
                <div className="mt-6 space-y-5">
                  <TeamContactFields
                    idPrefix="team-inbox-link"
                    teamName={fields.teamName}
                    contactEmail={fields.contactEmail}
                    previewLocked={previewLocked}
                    submitting={submitting}
                    invalidField={invalidField}
                    describedBy={describedBy}
                    onTeamNameChange={(value) => {
                      setFields((current) => ({ ...current, teamName: value }))
                    }}
                    onContactEmailChange={(value) => {
                      setFields((current) => ({ ...current, contactEmail: value }))
                    }}
                  />
                  <div className="min-w-0 space-y-2">
                    <FieldLabel htmlFor="team-inbox-link">Enlace</FieldLabel>
                    <input
                      id="team-inbox-link"
                      name="externalLink"
                      type="url"
                      inputMode="url"
                      spellCheck={false}
                      maxLength={EXTERNAL_LINK_MAX_LENGTH}
                      value={fields.externalLink}
                      readOnly={previewLocked}
                      disabled={submitting}
                      aria-invalid={invalidField === 'externalLink'}
                      aria-describedby={describedBy(
                        'externalLink',
                        undefined,
                        'team-inbox-link-error',
                      )}
                      onChange={(event) => {
                        setFields((current) => ({
                          ...current,
                          externalLink: event.target.value,
                        }))
                      }}
                      className={fieldClassName}
                    />
                  </div>
                </div>
                <InboxSubmissionNotice
                  note="Esto envía el enlace. El correo no pasa por este formulario."
                  progressLabel={sendMethod === 'link' ? progressLabel : null}
                  errorMessage={sendMethod === 'link' ? errorMessage : null}
                  errorElementId="team-inbox-link-error"
                  successTeamName={sendMethod === 'link' ? successTeamName : null}
                  successEmail={sendMethod === 'link' ? successEmail : null}
                  submitting={submitting}
                  previewLocked={previewLocked}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
      {BREAK_UI_TOGGLE_ENABLED ? (
        <BreakUiDataToggle mode={previewMode} onModeChange={selectPreviewMode} />
      ) : null}
    </section>
  )
}
