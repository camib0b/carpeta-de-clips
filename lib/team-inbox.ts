/**
 * Shared rules for the unauthenticated team-inbox form.
 * Video bytes are stored later by the route; this module only checks the claim.
 */

export const TEAM_NAME_MAX_LENGTH = 120
export const CONTACT_EMAIL_MAX_LENGTH = 254
export const EXTERNAL_LINK_MAX_LENGTH = 2_000
export const FILE_NAME_MAX_LENGTH = 180
export const MAX_FILES_PER_SUBMISSION = 8
export const MAX_FILE_BYTES = 8 * 1024 * 1024 * 1024
export const MAX_SUBMISSION_BYTES = 24 * 1024 * 1024 * 1024

/**
 * One part is one Worker request. Free and Pro plans cap a request body at
 * 100 MB, so each part stays at 80 MiB. This repo has no R2 S3 credentials,
 * so the browser cannot upload with a presigned URL. Multipart still goes
 * through the Worker, which supports `createMultipartUpload`.
 * Non-final parts must be at least 5 MiB; 80 MiB clears that.
 */
export const UPLOAD_PART_BYTES = 80 * 1024 * 1024

export const MAX_SUBMISSIONS_PER_HOUR = 5
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mov',
  'm4v',
  'webm',
  'mkv',
  'avi',
  'mpeg',
  'mpg',
])

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
}

export const teamInboxMessages = {
  teamNameRequired: 'Indica el nombre del equipo.',
  teamNameInvalid: 'El nombre del equipo no es válido.',
  teamNameTooLong: 'El nombre del equipo es demasiado largo.',
  emailRequired: 'Indica un correo de contacto.',
  emailInvalid: 'El correo no es válido.',
  needFileOrLink: 'Indica un archivo de video o un enlace.',
  linkInvalid: 'El enlace tiene que empezar por http:// o https://.',
  linkTooLong: 'El enlace es demasiado largo.',
  tooManyFiles: 'Hay demasiados archivos.',
  fileTooLarge: 'Un archivo supera el tamaño máximo.',
  submissionTooLarge: 'El total de los archivos supera el máximo.',
  notVideo: 'Solo se aceptan archivos de video.',
  fileNameInvalid: 'El nombre de un archivo no es válido.',
  invalidForm: 'El formulario no es válido.',
  unreadable: 'No se pudo leer el formulario.',
  unknownAction: 'Acción desconocida.',
  rateLimited: 'Demasiadas cargas en poco tiempo. Prueba más tarde.',
  saveFailed: 'No se pudo guardar la carga.',
  uploadFailed: 'No se pudo subir un archivo. Prueba de nuevo.',
  partInvalid: 'La parte del archivo no coincide.',
  notFound: 'No se encontró la carga.',
  alreadyReceived: 'Esta carga ya quedó registrada.',
  abandoned: 'Esta carga ya se canceló.',
} as const

export type TeamInboxField =
  | 'teamName'
  | 'contactEmail'
  | 'externalLink'
  | 'files'
  | 'form'

export type TeamInboxFileInput = {
  fileName: string
  contentType: string
  sizeBytes: number
}

export type ValidTeamInboxFile = {
  originalFileName: string
  objectFileName: string
  contentType: string
  sizeBytes: number
  partCount: number
}

export type ValidTeamInboxSubmission = {
  teamName: string
  contactEmail: string
  externalLink: string | null
  files: ValidTeamInboxFile[]
}

export type TeamInboxValidation =
  | { ok: true; value: ValidTeamInboxSubmission }
  | { ok: false; error: string; field: TeamInboxField }

export type StoredInboxFile = {
  originalFileName: string
  objectKey: string
  sizeBytes: number
  contentType: string
  uploadId: string
  partCount: number
  completed: boolean
}

export type CompletedInboxPart = {
  partNumber: number
  etag: string
}

const SUBMISSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function withoutDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function hasControlCharacter(value: string): boolean {
  return /[\u0000-\u001F\u007F]/.test(value)
}

export function videoExtension(fileName: string): string | null {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
    return null
  }
  const extension = fileName.slice(dotIndex + 1).toLowerCase()
  return VIDEO_EXTENSIONS.has(extension) ? extension : null
}

export function clampDisplayedFileName(rawName: string): string {
  const baseName = rawName.split(/[/\\]/).pop() ?? ''
  const cleaned = baseName.replace(/[\u0000-\u001F\u007F]/g, '').trim()
  if (cleaned.length <= FILE_NAME_MAX_LENGTH) {
    return cleaned
  }
  const extension = videoExtension(cleaned)
  const extensionText = extension ? `.${extension}` : ''
  const stem = cleaned.slice(0, cleaned.length - extensionText.length)
  const stemMaxLength = Math.max(1, FILE_NAME_MAX_LENGTH - extensionText.length)
  return `${stem.slice(0, stemMaxLength).trim()}${extensionText}`
}

export function inboxObjectFileName(originalFileName: string): string | null {
  const displayName = clampDisplayedFileName(originalFileName)
  const extension = videoExtension(displayName)
  if (!extension) {
    return null
  }
  const stem = displayName.slice(0, displayName.length - extension.length - 1)
  if (stem.trim().length === 0) {
    return null
  }
  const asciiStem = withoutDiacritics(stem)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
  const safeStem = asciiStem.length > 0 ? asciiStem : 'video'
  return `${safeStem}.${extension}`
}

export function uniqueInboxObjectFileNames(fileNames: string[]): string[] | null {
  const usedNames = new Set<string>()
  const objectNames: string[] = []
  for (const fileName of fileNames) {
    const baseName = inboxObjectFileName(fileName)
    if (!baseName) {
      return null
    }
    const dotIndex = baseName.lastIndexOf('.')
    let candidate = baseName
    let copyIndex = 2
    while (usedNames.has(candidate)) {
      candidate = `${baseName.slice(0, dotIndex)}-${copyIndex}${baseName.slice(dotIndex)}`
      copyIndex += 1
    }
    usedNames.add(candidate)
    objectNames.push(candidate)
  }
  return objectNames
}

export function inboxCalendarDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  if (!year || !month || !day) {
    throw new Error('Could not format the inbox date.')
  }
  return `${year}-${month}-${day}`
}

export function inboxTeamSlug(teamName: string): string {
  const slug = withoutDiacritics(teamName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '')
  return slug.length > 0 ? slug : 'equipo'
}

export function buildInboxObjectPrefix(
  teamName: string,
  now: Date,
  suffix: string,
): string {
  const safeSuffix = suffix.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
  if (safeSuffix.length < 4) {
    throw new Error('Inbox suffix is too short.')
  }
  return `inbox/${inboxCalendarDate(now)}-${inboxTeamSlug(teamName)}-${safeSuffix}/`
}

export function isSafeInboxObjectKey(objectKey: string, objectPrefix: string): boolean {
  if (!objectPrefix.startsWith('inbox/') || !objectPrefix.endsWith('/')) {
    return false
  }
  if (!objectKey.startsWith(objectPrefix)) {
    return false
  }
  if (objectKey.includes('..') || objectKey.length > 1024) {
    return false
  }
  const fileName = objectKey.slice(objectPrefix.length)
  return fileName.length > 0 && !fileName.includes('/')
}

export function isSubmissionId(value: string): boolean {
  return SUBMISSION_ID_PATTERN.test(value)
}

export function teamInboxClientAddress(request: Request): string {
  const connectingIp = request.headers.get('cf-connecting-ip')?.trim() ?? ''
  if (connectingIp.length === 0) {
    return 'local'
  }
  return connectingIp.slice(0, 64)
}

export function uploadPartCount(sizeBytes: number): number {
  return Math.ceil(sizeBytes / UPLOAD_PART_BYTES)
}

export function expectedUploadPartSize(
  sizeBytes: number,
  partNumber: number,
): number | null {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1) {
    return null
  }
  const partCount = uploadPartCount(sizeBytes)
  if (!Number.isSafeInteger(partNumber) || partNumber < 1 || partNumber > partCount) {
    return null
  }
  if (partNumber < partCount) {
    return UPLOAD_PART_BYTES
  }
  const remainder = sizeBytes % UPLOAD_PART_BYTES
  return remainder === 0 ? UPLOAD_PART_BYTES : remainder
}

function normalizedContentType(extension: string, contentType: string): string | null {
  const type = contentType.trim().toLowerCase()
  if (type.length > 100 || hasControlCharacter(type)) {
    return null
  }
  const extensionType = EXTENSION_CONTENT_TYPES[extension]
  if (!extensionType) {
    return null
  }
  if (type === '' || type === 'application/octet-stream') {
    return extensionType
  }
  if (!type.startsWith('video/')) {
    return null
  }
  return type
}

function parseExternalLink(
  rawLink: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (rawLink == null) {
    return { ok: true, value: null }
  }
  if (typeof rawLink !== 'string') {
    return { ok: false, error: teamInboxMessages.linkInvalid }
  }
  const trimmed = rawLink.trim()
  if (trimmed.length === 0) {
    return { ok: true, value: null }
  }
  if (trimmed.length > EXTERNAL_LINK_MAX_LENGTH) {
    return { ok: false, error: teamInboxMessages.linkTooLong }
  }
  if (/\s/.test(trimmed) || hasControlCharacter(trimmed)) {
    return { ok: false, error: teamInboxMessages.linkInvalid }
  }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { ok: false, error: teamInboxMessages.linkInvalid }
    }
  } catch {
    return { ok: false, error: teamInboxMessages.linkInvalid }
  }
  return { ok: true, value: trimmed }
}

export function validateTeamInboxSubmission(input: {
  teamName: unknown
  contactEmail: unknown
  externalLink: unknown
  files: unknown
}): TeamInboxValidation {
  if (typeof input.teamName !== 'string') {
    return { ok: false, error: teamInboxMessages.teamNameRequired, field: 'teamName' }
  }
  const teamName = input.teamName.trim().replace(/\s+/g, ' ')
  if (teamName.length === 0) {
    return { ok: false, error: teamInboxMessages.teamNameRequired, field: 'teamName' }
  }
  if (hasControlCharacter(teamName)) {
    return { ok: false, error: teamInboxMessages.teamNameInvalid, field: 'teamName' }
  }
  if (teamName.length > TEAM_NAME_MAX_LENGTH) {
    return { ok: false, error: teamInboxMessages.teamNameTooLong, field: 'teamName' }
  }

  if (typeof input.contactEmail !== 'string') {
    return { ok: false, error: teamInboxMessages.emailRequired, field: 'contactEmail' }
  }
  const contactEmail = input.contactEmail.trim()
  if (contactEmail.length === 0) {
    return { ok: false, error: teamInboxMessages.emailRequired, field: 'contactEmail' }
  }
  if (
    contactEmail.length > CONTACT_EMAIL_MAX_LENGTH ||
    hasControlCharacter(contactEmail) ||
    !EMAIL_PATTERN.test(contactEmail)
  ) {
    return { ok: false, error: teamInboxMessages.emailInvalid, field: 'contactEmail' }
  }

  const externalLink = parseExternalLink(input.externalLink)
  if (!externalLink.ok) {
    return { ok: false, error: externalLink.error, field: 'externalLink' }
  }

  if (!Array.isArray(input.files)) {
    return { ok: false, error: teamInboxMessages.invalidForm, field: 'files' }
  }
  if (input.files.length > MAX_FILES_PER_SUBMISSION) {
    return { ok: false, error: teamInboxMessages.tooManyFiles, field: 'files' }
  }

  const parsedFiles: TeamInboxFileInput[] = []
  for (const entry of input.files) {
    if (entry == null || typeof entry !== 'object') {
      return { ok: false, error: teamInboxMessages.invalidForm, field: 'files' }
    }
    const candidate = entry as {
      fileName?: unknown
      contentType?: unknown
      sizeBytes?: unknown
    }
    if (typeof candidate.fileName !== 'string') {
      return { ok: false, error: teamInboxMessages.fileNameInvalid, field: 'files' }
    }
    if (typeof candidate.contentType !== 'string') {
      return { ok: false, error: teamInboxMessages.notVideo, field: 'files' }
    }
    if (typeof candidate.sizeBytes !== 'number' || !Number.isSafeInteger(candidate.sizeBytes)) {
      return { ok: false, error: teamInboxMessages.invalidForm, field: 'files' }
    }
    parsedFiles.push({
      fileName: candidate.fileName,
      contentType: candidate.contentType,
      sizeBytes: candidate.sizeBytes,
    })
  }

  if (parsedFiles.length === 0 && externalLink.value == null) {
    return { ok: false, error: teamInboxMessages.needFileOrLink, field: 'form' }
  }

  let totalBytes = 0
  const originalFileNames: string[] = []
  const contentTypes: string[] = []
  const sizes: number[] = []
  for (const file of parsedFiles) {
    const originalFileName = clampDisplayedFileName(file.fileName)
    const extension = videoExtension(originalFileName)
    if (!extension || inboxObjectFileName(originalFileName) == null) {
      return { ok: false, error: teamInboxMessages.fileNameInvalid, field: 'files' }
    }
    const contentType = normalizedContentType(extension, file.contentType)
    if (!contentType) {
      return { ok: false, error: teamInboxMessages.notVideo, field: 'files' }
    }
    if (file.sizeBytes < 1) {
      return { ok: false, error: teamInboxMessages.fileNameInvalid, field: 'files' }
    }
    if (file.sizeBytes > MAX_FILE_BYTES) {
      return {
        ok: false,
        error: `${originalFileName} supera el tamaño máximo.`,
        field: 'files',
      }
    }
    totalBytes += file.sizeBytes
    if (totalBytes > MAX_SUBMISSION_BYTES) {
      return { ok: false, error: teamInboxMessages.submissionTooLarge, field: 'files' }
    }
    originalFileNames.push(originalFileName)
    contentTypes.push(contentType)
    sizes.push(file.sizeBytes)
  }

  const objectFileNames = uniqueInboxObjectFileNames(originalFileNames)
  if (!objectFileNames) {
    return { ok: false, error: teamInboxMessages.fileNameInvalid, field: 'files' }
  }

  return {
    ok: true,
    value: {
      teamName,
      contactEmail,
      externalLink: externalLink.value,
      files: originalFileNames.map((originalFileName, index) => ({
        originalFileName,
        objectFileName: objectFileNames[index] ?? '',
        contentType: contentTypes[index] ?? '',
        sizeBytes: sizes[index] ?? 0,
        partCount: uploadPartCount(sizes[index] ?? 0),
      })),
    },
  }
}

export function isSafeInboxPrefix(objectPrefix: string): boolean {
  return /^inbox\/\d{4}-\d{2}-\d{2}-[a-z0-9-]{1,48}-[a-z0-9]{4,8}\/$/.test(objectPrefix)
}

export function parseStoredInboxFiles(json: string): StoredInboxFile[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) {
    return null
  }
  const files: StoredInboxFile[] = []
  for (const entry of parsed) {
    if (entry == null || typeof entry !== 'object') {
      return null
    }
    const candidate = entry as Partial<StoredInboxFile>
    if (
      typeof candidate.originalFileName !== 'string' ||
      typeof candidate.objectKey !== 'string' ||
      typeof candidate.contentType !== 'string' ||
      typeof candidate.uploadId !== 'string' ||
      typeof candidate.completed !== 'boolean' ||
      typeof candidate.sizeBytes !== 'number' ||
      typeof candidate.partCount !== 'number' ||
      !Number.isSafeInteger(candidate.sizeBytes) ||
      !Number.isSafeInteger(candidate.partCount)
    ) {
      return null
    }
    files.push({
      originalFileName: candidate.originalFileName,
      objectKey: candidate.objectKey,
      sizeBytes: candidate.sizeBytes,
      contentType: candidate.contentType,
      uploadId: candidate.uploadId,
      partCount: candidate.partCount,
      completed: candidate.completed,
    })
  }
  return files
}

function normalizePartEtag(rawEtag: string): string | null {
  const trimmed = rawEtag.trim()
  if (
    !/^"?[A-Fa-f0-9]{16,64}"?$/.test(trimmed) &&
    !/^"?[A-Fa-f0-9]{16,64}-\d{1,5}"?$/.test(trimmed)
  ) {
    return null
  }
  return trimmed
}

export function validateCompletedParts(
  storedFile: StoredInboxFile,
  parts: unknown,
): { ok: true; parts: CompletedInboxPart[] } | { ok: false; error: string } {
  if (!Array.isArray(parts) || parts.length !== storedFile.partCount) {
    return { ok: false, error: teamInboxMessages.partInvalid }
  }
  const byPartNumber = new Map<number, string>()
  for (const entry of parts) {
    if (entry == null || typeof entry !== 'object') {
      return { ok: false, error: teamInboxMessages.partInvalid }
    }
    const candidate = entry as { partNumber?: unknown; etag?: unknown }
    if (
      typeof candidate.partNumber !== 'number' ||
      typeof candidate.etag !== 'string' ||
      !Number.isSafeInteger(candidate.partNumber)
    ) {
      return { ok: false, error: teamInboxMessages.partInvalid }
    }
    const etag = normalizePartEtag(candidate.etag)
    if (!etag || byPartNumber.has(candidate.partNumber)) {
      return { ok: false, error: teamInboxMessages.partInvalid }
    }
    byPartNumber.set(candidate.partNumber, etag)
  }
  const completed: CompletedInboxPart[] = []
  for (let partNumber = 1; partNumber <= storedFile.partCount; partNumber += 1) {
    const etag = byPartNumber.get(partNumber)
    if (!etag) {
      return { ok: false, error: teamInboxMessages.partInvalid }
    }
    completed.push({ partNumber, etag })
  }
  return { ok: true, parts: completed }
}

const byteFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 1,
})
const countFormatter = new Intl.NumberFormat('es-CL')

export function formatByteSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return '0 B'
  }
  const units = [
    { limit: 1024, suffix: 'B', divisor: 1 },
    { limit: 1024 ** 2, suffix: 'KB', divisor: 1024 },
    { limit: 1024 ** 3, suffix: 'MB', divisor: 1024 ** 2 },
    { limit: Number.POSITIVE_INFINITY, suffix: 'GB', divisor: 1024 ** 3 },
  ]
  const unit = units.find((candidate) => sizeBytes < candidate.limit) ?? units[3]
  const amount = sizeBytes / unit.divisor
  const formatted = byteFormatter.format(amount)
  return `${formatted} ${unit.suffix}`
}

export function formatSelectedFileSummary(files: { sizeBytes: number }[]): string {
  const totalBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0)
  const countLabel =
    files.length === 1
      ? '1 archivo'
      : `${countFormatter.format(files.length)} archivos`
  return `${countLabel} · ${formatByteSize(totalBytes)}`
}

export function formatInboxLimitSummary(): string {
  return `Hasta ${countFormatter.format(MAX_FILES_PER_SUBMISSION)} archivos de video, ${formatByteSize(MAX_FILE_BYTES)} cada uno y ${formatByteSize(MAX_SUBMISSION_BYTES)} en total.`
}
