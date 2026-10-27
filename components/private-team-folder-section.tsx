'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'

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
  PRIVATE_TEAM_OFFER_TIERS,
  TEAM_INBOX_EMAIL,
  formatPricePerMatchClp,
  teamInboxMailtoHref,
  type PrivateTeamOfferTier,
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
  'El equipo envía los archivos de video del partido.',
  'Realiza el pago según el nivel de detalle requerido y el plazo aceptado.',
  'Recibe su carpeta en carpeta.cl, armada y con los videos etiquetados en el mismo formato de clips, XML y jugadas.',
]

/**
 * Dev-only prices and labels for the tier list. The first row is a long name
 * and a nine-digit CLP amount; the second is a one-letter name, $1, and a
 * turnaround long enough to wrap inside one column.
 */
const WORST_PRIVATE_TEAM_OFFER_TIERS: readonly PrivateTeamOfferTier[] = [
  {
    id: 'standard',
    label: 'Estándar para el plantel completo de la categoría sub-16 visitante',
    priceClp: 999_999_999,
    paymentUrl: 'https://fintoc.me/cami-escu/25000',
    turnaround: '3 días',
  },
  {
    id: 'express',
    label: 'E',
    priceClp: 1,
    paymentUrl: 'https://fintoc.me/cami-escu/40000',
    turnaround:
      '24 horas desde que llegan el pago y el archivo de video del partido completo',
  },
]

function offerTiersForPreview(mode: PreviewMode): readonly PrivateTeamOfferTier[] {
  if (process.env.NODE_ENV !== 'development' || mode === 'demo' || mode === 'error') {
    return PRIVATE_TEAM_OFFER_TIERS
  }
  if (mode === 'one') {
    return PRIVATE_TEAM_OFFER_TIERS.slice(0, 1)
  }
  return WORST_PRIVATE_TEAM_OFFER_TIERS
}

const fieldClassName =
  'h-9 w-full min-w-0 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors duration-200 focus-visible:border-state focus-visible:ring-2 focus-visible:ring-state focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50'

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
    '-mb-px shrink-0 whitespace-nowrap border-b-2 pb-3 text-sm transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    selected
      ? 'border-foreground text-foreground'
      : 'border-transparent text-muted-foreground hover:text-foreground',
  ].join(' ')
}

function TeamContactFields({
  teamName,
  contactEmail,
  previewLocked,
  submitting,
  invalidField,
  describedBy,
  onTeamNameChange,
  onContactEmailChange,
}: {
  teamName: string
  contactEmail: string
  previewLocked: boolean
  submitting: boolean
  invalidField: TeamInboxField | null
  describedBy: (field: TeamInboxField, hintId?: string) => string | undefined
  onTeamNameChange: (value: string) => void
  onContactEmailChange: (value: string) => void
}) {
  return (
    <>
      <div className="min-w-0 space-y-2">
        <FieldLabel htmlFor="team-inbox-team-name">Nombre del equipo</FieldLabel>
        <input
          id="team-inbox-team-name"
          name="teamName"
          type="text"
          autoComplete="organization"
          maxLength={TEAM_NAME_MAX_LENGTH}
          value={teamName}
          readOnly={previewLocked}
          disabled={submitting}
          aria-invalid={invalidField === 'teamName'}
          aria-describedby={describedBy('teamName')}
          onChange={(event) => {
            onTeamNameChange(event.target.value)
          }}
          className={fieldClassName}
        />
      </div>
      <div className="min-w-0 space-y-2">
        <FieldLabel htmlFor="team-inbox-email">Correo de contacto</FieldLabel>
        <input
          id="team-inbox-email"
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
          aria-describedby={describedBy('contactEmail')}
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
  successTeamName,
  successEmail,
  submitting,
  previewLocked,
}: {
  note: string
  progressLabel: string | null
  errorMessage: string | null
  successTeamName: string | null
  successEmail: string | null
  submitting: boolean
  previewLocked: boolean
}) {
  return (
    <div className="min-w-0 py-8">
      {progressLabel && (
        <p
          aria-live="polite"
          className="mb-4 min-w-0 wrap-anywhere text-sm tabular-nums text-muted-foreground"
        >
          {progressLabel}
        </p>
      )}
      <Button type="submit" variant="outline" disabled={previewLocked || submitting}>
        {submitting ? 'Enviando' : 'Enviar'}
      </Button>
      <p className="mt-3 min-w-0 text-sm leading-relaxed text-muted-foreground">{note}</p>
      {errorMessage && (
        <p
          id="team-inbox-error"
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

export function PrivateTeamFolderSection({
  entranceStepStart = 0,
}: {
  entranceStepStart?: number
}) {
  const fileInputId = useId()
  const sendMethodBaseId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendMethodTabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [previewMode, setPreviewMode] = useState<PreviewMode>('demo')
  const [sendMethod, setSendMethod] = useState<SendMethod>('upload')
  const offerTiers = offerTiersForPreview(previewMode)
  const [fields, setFields] = useState<InboxFields>(EMPTY_FIELDS)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [invalidField, setInvalidField] = useState<TeamInboxField | null>(null)
  const [progressLabel, setProgressLabel] = useState<string | null>(null)
  const [successTeamName, setSuccessTeamName] = useState<string | null>(null)
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const previewLocked = BREAK_UI_TOGGLE_ENABLED && previewMode !== 'demo'

  useEffect(() => {
    if (!BREAK_UI_TOGGLE_ENABLED) {
      return
    }
    const mode = readPreviewMode()
    setPreviewMode(mode)
    applyPreview(mode)
  }, [])

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

  function describedBy(field: TeamInboxField, hintId?: string): string | undefined {
    const ids = [
      hintId,
      invalidField === field && errorMessage ? 'team-inbox-error' : null,
    ].filter((id): id is string => id != null)
    return ids.length > 0 ? ids.join(' ') : undefined
  }

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
      return
    }

    const realFiles: File[] = []
    if (submittingUpload) {
      for (const file of fields.files) {
        if (file.file == null) {
          setErrorMessage(teamInboxMessages.uploadFailed)
          setInvalidField('files')
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
    } catch (error) {
      setProgressLabel(null)
      setErrorMessage(
        error instanceof Error && error.message.length > 0
          ? error.message
          : teamInboxMessages.uploadFailed,
      )
      setInvalidField('form')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
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
        Carpeta privada para equipos
      </h2>
      <p className="min-w-0 text-base leading-relaxed text-foreground">
        Un equipo puede encargar su propia carpeta en carpeta.cl.
      </p>
      <ol className="mt-8 min-w-0 space-y-3 text-sm leading-relaxed text-foreground">
        {STEPS.map((step, stepIndex) => (
          <li key={step} className="flex min-w-0 items-start gap-3">
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {stepIndex + 1}
            </span>
            <span className="min-w-0">{step}</span>
          </li>
        ))}
      </ol>
      <p className="mt-8 min-w-0 text-sm leading-relaxed text-foreground">
        El plazo empieza cuando llegan el pago y el archivo de video.
      </p>
      <ul className="mt-8 grid min-w-0 grid-cols-1 gap-8 sm:grid-cols-2">
        {offerTiers.map((tier) => (
          <li key={tier.id} className="min-w-0 border-t border-border pt-4">
            <h3 className="min-w-0 text-base font-medium wrap-anywhere text-foreground">
              {tier.label}
            </h3>
            <p className="mt-2 flex min-w-0 flex-wrap gap-x-2 text-sm text-foreground">
              <span className="text-muted-foreground">Precio por partido</span>
              <span className="whitespace-nowrap tabular-nums">
                {formatPricePerMatchClp(tier.priceClp)}
              </span>
            </p>
            <p className="mt-2 flex min-w-0 flex-wrap gap-x-2 text-sm text-foreground">
              <span className="text-muted-foreground">Plazo</span>
              <span className="min-w-0 wrap-anywhere">{tier.turnaround}</span>
            </p>
            <div className="mt-4">
              <Button variant="outline" asChild>
                <a href={tier.paymentUrl} aria-label={`Pagar ${tier.label}`}>
                  Pagar
                </a>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <p
        id="equipos-send-label"
        className="mt-12 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
      >
        Cómo enviar los videos
      </p>
      <div
        role="tablist"
        aria-labelledby="equipos-send-label"
        className="mt-4 flex min-w-0 flex-wrap gap-x-6 border-b border-border"
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
      </div>
      {sendMethod === 'email' ? (
        <div
          role="tabpanel"
          id={`${sendMethodBaseId}-email-panel`}
          aria-labelledby={`${sendMethodBaseId}-email-tab`}
          className="min-w-0 py-8"
        >
          <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">
            Escribe a este correo con el nombre del equipo. Si el archivo es grande, el
            correo puede rechazar el adjunto.
          </p>
          <a
            href={teamInboxMailtoHref(TEAM_INBOX_EMAIL)}
            className="mt-4 block min-w-0 wrap-anywhere text-sm text-foreground underline underline-offset-4"
          >
            {TEAM_INBOX_EMAIL}
          </a>
        </div>
      ) : (
        <form noValidate className="min-w-0" onSubmit={handleSubmit}>
          {sendMethod === 'upload' ? (
            <div
              role="tabpanel"
              id={`${sendMethodBaseId}-upload-panel`}
              aria-labelledby={`${sendMethodBaseId}-upload-tab`}
              className="min-w-0 pt-8"
            >
              <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">
                Sube los archivos a esta página. Quedan guardados para armar la carpeta.
              </p>
              <div className="mt-6 space-y-5">
                <TeamContactFields
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
                    aria-describedby={describedBy('files', 'team-inbox-files-hint')}
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
                            className="shrink-0 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
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
                note="Esto envía la carga directa. El correo no pasa por este formulario."
                progressLabel={progressLabel}
                errorMessage={errorMessage}
                successTeamName={successTeamName}
                successEmail={successEmail}
                submitting={submitting}
                previewLocked={previewLocked}
              />
            </div>
          ) : (
            <div
              role="tabpanel"
              id={`${sendMethodBaseId}-link-panel`}
              aria-labelledby={`${sendMethodBaseId}-link-tab`}
              className="min-w-0 pt-8"
            >
              <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">
                Pega un enlace de Google Drive, WeTransfer u otro servicio.
              </p>
              <div className="mt-6 space-y-5">
                <TeamContactFields
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
                    aria-describedby={describedBy('externalLink')}
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
                progressLabel={progressLabel}
                errorMessage={errorMessage}
                successTeamName={successTeamName}
                successEmail={successEmail}
                submitting={submitting}
                previewLocked={previewLocked}
              />
            </div>
          )}
        </form>
      )}
      {BREAK_UI_TOGGLE_ENABLED ? (
        <BreakUiDataToggle mode={previewMode} onModeChange={selectPreviewMode} />
      ) : null}
    </section>
  )
}
