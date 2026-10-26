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
  FINTOC_PAYMENT_URL,
  PRICE_PER_MATCH_CLP,
  TEAM_INBOX_EMAIL,
  formatPricePerMatchClp,
  teamInboxMailtoHref,
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
  'Paga un precio fijo por partido.',
  'Recibe su carpeta en carpeta.cl, armada y con los videos etiquetados en el mismo formato de clips, XML y jugadas.',
]

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

export function PrivateTeamFolderSection({
  entranceStepStart = 0,
}: {
  entranceStepStart?: number
}) {
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewMode, setPreviewMode] = useState<PreviewMode>('demo')
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (previewLocked || submitting) {
      return
    }
    const validation = validateTeamInboxSubmission({
      teamName: fields.teamName,
      contactEmail: fields.contactEmail,
      externalLink: fields.externalLink,
      files: fields.files.map((file) => ({
        fileName: file.name,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
      })),
    })
    if (!validation.ok) {
      setErrorMessage(validation.error)
      setInvalidField(validation.field)
      setSuccessTeamName(null)
      setSuccessEmail(null)
      return
    }

    const realFiles: File[] = []
    for (const file of fields.files) {
      if (file.file == null) {
        setErrorMessage(teamInboxMessages.uploadFailed)
        setInvalidField('files')
        return
      }
      realFiles.push(file.file)
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
      className={`landing-enter min-w-0 scroll-mt-8 border-t border-border pt-12${BREAK_UI_TOGGLE_ENABLED ? ' pb-20' : ''}`}
      style={{
        animationDelay: landingEntranceDelay(
          entranceStepStart,
          LANDING_ENTRANCE_STEP_MS,
        ),
      }}
    >
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
      <p className="mt-8 flex min-w-0 flex-wrap gap-x-2 text-sm text-foreground">
        <span className="text-muted-foreground">Precio por partido</span>
        <span className="whitespace-nowrap tabular-nums">
          {formatPricePerMatchClp(PRICE_PER_MATCH_CLP)}
        </span>
      </p>
      <div className="mt-4">
        <Button variant="outline" asChild>
          <a href={FINTOC_PAYMENT_URL}>Pagar</a>
        </Button>
      </div>

      <p className="mt-12 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Cómo enviar los videos
      </p>
      <form noValidate className="min-w-0" onSubmit={handleSubmit}>
        <div className="mt-4 min-w-0 divide-y divide-border border-t border-border">
          <div className="min-w-0 py-8">
            <h3 className="text-base font-medium text-foreground">Carga directa</h3>
            <p className="mt-2 min-w-0 text-sm leading-relaxed text-muted-foreground">
              Sube los archivos a esta página. Quedan guardados para armar la carpeta.
            </p>
            <div className="mt-6 space-y-5">
              <div className="min-w-0 space-y-2">
                <FieldLabel htmlFor="team-inbox-team-name">Nombre del equipo</FieldLabel>
                <input
                  id="team-inbox-team-name"
                  name="teamName"
                  type="text"
                  autoComplete="organization"
                  maxLength={TEAM_NAME_MAX_LENGTH}
                  value={fields.teamName}
                  readOnly={previewLocked}
                  disabled={submitting}
                  aria-invalid={invalidField === 'teamName'}
                  aria-describedby={describedBy('teamName')}
                  onChange={(event) => {
                    setFields((current) => ({ ...current, teamName: event.target.value }))
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
                  value={fields.contactEmail}
                  readOnly={previewLocked}
                  disabled={submitting}
                  aria-invalid={invalidField === 'contactEmail'}
                  aria-describedby={describedBy('contactEmail')}
                  onChange={(event) => {
                    setFields((current) => ({
                      ...current,
                      contactEmail: event.target.value,
                    }))
                  }}
                  className={fieldClassName}
                />
              </div>
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
          </div>

          <div className="min-w-0 py-8">
            <h3 className="text-base font-medium text-foreground">Enlace</h3>
            <p className="mt-2 min-w-0 text-sm leading-relaxed text-muted-foreground">
              Pega un enlace de Google Drive, WeTransfer u otro servicio.
            </p>
            <div className="mt-6 min-w-0 space-y-2">
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

          <div className="min-w-0 py-8">
            <h3 className="text-base font-medium text-foreground">Correo</h3>
            <p className="mt-2 min-w-0 text-sm leading-relaxed text-muted-foreground">
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
        </div>

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
          <p className="mt-3 min-w-0 text-sm leading-relaxed text-muted-foreground">
            Esto envía la carga directa y el enlace. El correo no pasa por este formulario.
          </p>
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
              Quedó registrado para {successTeamName}. El correo de contacto es {successEmail}.
              La carpeta se arma después del pago.
            </p>
          )}
        </div>
      </form>
      {BREAK_UI_TOGGLE_ENABLED ? (
        <BreakUiDataToggle mode={previewMode} onModeChange={selectPreviewMode} />
      ) : null}
    </section>
  )
}
