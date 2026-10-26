import { getCloudflareContext } from '@opennextjs/cloudflare'

import { getCatalogDatabase } from '@/lib/d1'
import {
  MAX_SUBMISSIONS_PER_HOUR,
  RATE_LIMIT_WINDOW_MS,
  UPLOAD_PART_BYTES,
  buildInboxObjectPrefix,
  expectedUploadPartSize,
  isSafeInboxObjectKey,
  isSubmissionId,
  parseStoredInboxFiles,
  teamInboxClientAddress,
  teamInboxMessages,
  validateCompletedParts,
  validateTeamInboxSubmission,
  type CompletedInboxPart,
  type StoredInboxFile,
  type ValidTeamInboxSubmission,
} from '@/lib/team-inbox'

export class TeamInboxRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'TeamInboxRequestError'
    this.status = status
  }
}

type SubmissionRow = {
  id: string
  status: string
  object_prefix: string | null
  file_manifest_json: string
}

export type TeamInboxUploadPlan = {
  submissionId: string
  uploads: {
    originalFileName: string
    objectKey: string
    uploadId: string
    partSizeBytes: number
    partCount: number
  }[]
}

async function getMediaBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true })
  if (!env.MEDIA) {
    throw new Error(
      'R2 binding MEDIA is missing. Add it to wrangler.jsonc for the carpeta-clips bucket.',
    )
  }
  return env.MEDIA
}

async function assertWithinRateLimit(
  database: D1Database,
  clientAddress: string,
  now: Date,
): Promise<void> {
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS).toISOString()
  const countRow = await database
    .prepare(
      `SELECT COUNT(*) AS submission_count
       FROM team_inbox_submissions
       WHERE client_address = ?1
         AND created_at >= ?2`,
    )
    .bind(clientAddress, windowStart)
    .first<{ submission_count: number }>()
  const submissionCount = Number(countRow?.submission_count ?? 0)
  if (!Number.isFinite(submissionCount) || submissionCount >= MAX_SUBMISSIONS_PER_HOUR) {
    throw new TeamInboxRequestError(teamInboxMessages.rateLimited, 429)
  }
}

async function loadSubmission(
  database: D1Database,
  submissionId: unknown,
): Promise<SubmissionRow> {
  if (typeof submissionId !== 'string' || !isSubmissionId(submissionId)) {
    throw new TeamInboxRequestError(teamInboxMessages.notFound, 404)
  }
  const row = await database
    .prepare(
      `SELECT id, status, object_prefix, file_manifest_json
       FROM team_inbox_submissions
       WHERE id = ?1`,
    )
    .bind(submissionId)
    .first<SubmissionRow>()
  if (!row) {
    throw new TeamInboxRequestError(teamInboxMessages.notFound, 404)
  }
  return row
}

async function saveManifest(
  database: D1Database,
  submissionId: string,
  files: StoredInboxFile[],
  status: string,
): Promise<void> {
  await database
    .prepare(
      `UPDATE team_inbox_submissions
       SET file_manifest_json = ?1, status = ?2
       WHERE id = ?3`,
    )
    .bind(JSON.stringify(files), status, submissionId)
    .run()
}

function readStoredFiles(row: SubmissionRow): StoredInboxFile[] {
  const files = parseStoredInboxFiles(row.file_manifest_json)
  if (!files) {
    throw new TeamInboxRequestError(teamInboxMessages.saveFailed, 500)
  }
  if (row.object_prefix != null) {
    for (const file of files) {
      if (!isSafeInboxObjectKey(file.objectKey, row.object_prefix)) {
        throw new TeamInboxRequestError(teamInboxMessages.saveFailed, 500)
      }
    }
  }
  return files
}

async function abortMultipartUploads(
  bucket: R2Bucket,
  files: StoredInboxFile[],
  objectPrefix: string | null,
): Promise<void> {
  for (const file of files) {
    if (objectPrefix == null || !isSafeInboxObjectKey(file.objectKey, objectPrefix)) {
      continue
    }
    if (file.completed) {
      try {
        await bucket.delete(file.objectKey)
      } catch (error) {
        console.error('team inbox delete failed', file.objectKey, error)
      }
      continue
    }
    if (file.uploadId.length === 0) {
      continue
    }
    try {
      const upload = bucket.resumeMultipartUpload(file.objectKey, file.uploadId)
      await upload.abort()
    } catch (error) {
      console.error('team inbox abort failed', file.objectKey, error)
    }
  }
}

function planFromFiles(submissionId: string, files: StoredInboxFile[]): TeamInboxUploadPlan {
  return {
    submissionId,
    uploads: files.map((file) => ({
      originalFileName: file.originalFileName,
      objectKey: file.objectKey,
      uploadId: file.uploadId,
      partSizeBytes: UPLOAD_PART_BYTES,
      partCount: file.partCount,
    })),
  }
}

async function insertSubmission(
  database: D1Database,
  submission: ValidTeamInboxSubmission,
  submissionId: string,
  createdAt: string,
  clientAddress: string,
  objectPrefix: string | null,
  files: StoredInboxFile[],
  status: 'pending' | 'received',
): Promise<void> {
  await database
    .prepare(
      `INSERT INTO team_inbox_submissions (
         id,
         created_at,
         team_name,
         contact_email,
         external_link,
         object_prefix,
         status,
         client_address,
         file_manifest_json
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
    .bind(
      submissionId,
      createdAt,
      submission.teamName,
      submission.contactEmail,
      submission.externalLink,
      objectPrefix,
      status,
      clientAddress,
      JSON.stringify(files),
    )
    .run()
}

export async function createTeamInboxSubmission(
  request: Request,
  body: unknown,
): Promise<TeamInboxUploadPlan> {
  if (body == null || typeof body !== 'object') {
    throw new TeamInboxRequestError(teamInboxMessages.invalidForm, 400)
  }
  const candidate = body as {
    teamName?: unknown
    contactEmail?: unknown
    externalLink?: unknown
    files?: unknown
  }
  const validation = validateTeamInboxSubmission({
    teamName: candidate.teamName,
    contactEmail: candidate.contactEmail,
    externalLink: candidate.externalLink,
    files: candidate.files ?? [],
  })
  if (!validation.ok) {
    throw new TeamInboxRequestError(validation.error, 400)
  }

  const now = new Date()
  const database = await getCatalogDatabase()
  const clientAddress = teamInboxClientAddress(request)
  await assertWithinRateLimit(database, clientAddress, now)

  const submission = validation.value
  const submissionId = crypto.randomUUID()
  const createdAt = now.toISOString()

  if (submission.files.length === 0) {
    await insertSubmission(
      database,
      submission,
      submissionId,
      createdAt,
      clientAddress,
      null,
      [],
      'received',
    )
    return { submissionId, uploads: [] }
  }

  const objectPrefix = buildInboxObjectPrefix(
    submission.teamName,
    now,
    submissionId.replace(/-/g, '').slice(0, 8),
  )
  const bucket = await getMediaBucket()
  const storedFiles: StoredInboxFile[] = []
  try {
    for (const file of submission.files) {
      const objectKey = `${objectPrefix}${file.objectFileName}`
      if (!isSafeInboxObjectKey(objectKey, objectPrefix)) {
        throw new TeamInboxRequestError(teamInboxMessages.fileNameInvalid, 400)
      }
      const multipartUpload = await bucket.createMultipartUpload(objectKey, {
        httpMetadata: { contentType: file.contentType },
      })
      storedFiles.push({
        originalFileName: file.originalFileName,
        objectKey,
        sizeBytes: file.sizeBytes,
        contentType: file.contentType,
        uploadId: multipartUpload.uploadId,
        partCount: file.partCount,
        completed: false,
      })
    }
    await insertSubmission(
      database,
      submission,
      submissionId,
      createdAt,
      clientAddress,
      objectPrefix,
      storedFiles,
      'pending',
    )
  } catch (error) {
    await abortMultipartUploads(bucket, storedFiles, objectPrefix)
    throw error
  }

  return planFromFiles(submissionId, storedFiles)
}

export async function uploadTeamInboxPart(
  request: Request,
): Promise<CompletedInboxPart> {
  const url = new URL(request.url)
  const submissionId = url.searchParams.get('submissionId')
  const uploadId = url.searchParams.get('uploadId')
  const partNumber = Number(url.searchParams.get('partNumber'))
  if (!uploadId || !Number.isSafeInteger(partNumber)) {
    throw new TeamInboxRequestError(teamInboxMessages.partInvalid, 400)
  }

  const database = await getCatalogDatabase()
  const row = await loadSubmission(database, submissionId)
  if (row.status !== 'pending') {
    throw new TeamInboxRequestError(teamInboxMessages.partInvalid, 409)
  }
  const storedFiles = readStoredFiles(row)
  const storedFile = storedFiles.find((file) => file.uploadId === uploadId)
  if (!storedFile || storedFile.completed || row.object_prefix == null) {
    throw new TeamInboxRequestError(teamInboxMessages.partInvalid, 400)
  }

  const expectedSize = expectedUploadPartSize(storedFile.sizeBytes, partNumber)
  const contentLength = Number(request.headers.get('content-length'))
  if (
    expectedSize == null ||
    !Number.isSafeInteger(contentLength) ||
    contentLength !== expectedSize ||
    contentLength > UPLOAD_PART_BYTES
  ) {
    throw new TeamInboxRequestError(teamInboxMessages.partInvalid, 400)
  }
  if (!request.body) {
    throw new TeamInboxRequestError(teamInboxMessages.partInvalid, 400)
  }

  const bucket = await getMediaBucket()
  const upload = bucket.resumeMultipartUpload(storedFile.objectKey, storedFile.uploadId)
  const uploadedPart = await upload.uploadPart(partNumber, request.body)
  return {
    partNumber: uploadedPart.partNumber,
    etag: uploadedPart.etag,
  }
}

function readCompleteBody(body: unknown): {
  submissionId: unknown
  files: { uploadId: string; parts: unknown }[]
} {
  if (body == null || typeof body !== 'object') {
    throw new TeamInboxRequestError(teamInboxMessages.invalidForm, 400)
  }
  const candidate = body as { submissionId?: unknown; files?: unknown }
  if (!Array.isArray(candidate.files)) {
    throw new TeamInboxRequestError(teamInboxMessages.invalidForm, 400)
  }
  const files = candidate.files.map((entry) => {
    if (entry == null || typeof entry !== 'object') {
      throw new TeamInboxRequestError(teamInboxMessages.invalidForm, 400)
    }
    const file = entry as { uploadId?: unknown; parts?: unknown }
    if (typeof file.uploadId !== 'string') {
      throw new TeamInboxRequestError(teamInboxMessages.partInvalid, 400)
    }
    return { uploadId: file.uploadId, parts: file.parts }
  })
  return { submissionId: candidate.submissionId, files }
}

export async function completeTeamInboxSubmission(
  request: Request,
  body: unknown,
): Promise<void> {
  void request
  const completeBody = readCompleteBody(body)
  const database = await getCatalogDatabase()
  const row = await loadSubmission(database, completeBody.submissionId)
  if (row.status === 'received') {
    return
  }
  if (row.status !== 'pending') {
    throw new TeamInboxRequestError(teamInboxMessages.abandoned, 409)
  }

  const storedFiles = readStoredFiles(row)
  const incomingByUploadId = new Map(completeBody.files.map((file) => [file.uploadId, file]))
  if (incomingByUploadId.size !== storedFiles.length) {
    throw new TeamInboxRequestError(teamInboxMessages.partInvalid, 400)
  }

  const bucket = await getMediaBucket()
  for (const storedFile of storedFiles) {
    if (storedFile.completed) {
      continue
    }
    const incoming = incomingByUploadId.get(storedFile.uploadId)
    if (!incoming) {
      throw new TeamInboxRequestError(teamInboxMessages.partInvalid, 400)
    }
    const parts = validateCompletedParts(storedFile, incoming.parts)
    if (!parts.ok) {
      throw new TeamInboxRequestError(parts.error, 400)
    }
    const upload = bucket.resumeMultipartUpload(storedFile.objectKey, storedFile.uploadId)
    try {
      await upload.complete(parts.parts)
    } catch (error) {
      const existing = await bucket.head(storedFile.objectKey)
      if (!existing || existing.size !== storedFile.sizeBytes) {
        throw error
      }
    }
    storedFile.completed = true
    await saveManifest(database, row.id, storedFiles, 'pending')
  }

  await saveManifest(database, row.id, storedFiles, 'received')
}

export async function abortTeamInboxSubmission(
  request: Request,
  body: unknown,
): Promise<void> {
  void request
  if (body == null || typeof body !== 'object') {
    throw new TeamInboxRequestError(teamInboxMessages.invalidForm, 400)
  }
  const submissionId = (body as { submissionId?: unknown }).submissionId
  const database = await getCatalogDatabase()
  const row = await loadSubmission(database, submissionId)
  if (row.status === 'received') {
    throw new TeamInboxRequestError(teamInboxMessages.alreadyReceived, 409)
  }
  if (row.status === 'abandoned') {
    return
  }
  const storedFiles = readStoredFiles(row)
  const bucket = await getMediaBucket()
  await abortMultipartUploads(bucket, storedFiles, row.object_prefix)
  await saveManifest(database, row.id, storedFiles, 'abandoned')
}
