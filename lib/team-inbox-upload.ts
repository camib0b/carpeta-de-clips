import {
  UPLOAD_PART_BYTES,
  expectedUploadPartSize,
  teamInboxMessages,
  uploadPartCount,
  type CompletedInboxPart,
  type TeamInboxFileInput,
} from '@/lib/team-inbox'

export type TeamInboxUploadPlanResponse = {
  submissionId: string
  uploads: {
    originalFileName: string
    objectKey: string
    uploadId: string
    partSizeBytes: number
    partCount: number
  }[]
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown }
    if (typeof body.error === 'string' && body.error.length > 0 && body.error.length <= 300) {
      return body.error
    }
  } catch {
    return fallback
  }
  return fallback
}

async function abortSubmission(submissionId: string): Promise<void> {
  try {
    await fetch('/api/team-inbox?action=abort', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ submissionId }),
    })
  } catch (error) {
    console.error('team inbox abort request failed', error)
  }
}

export async function submitTeamInbox(input: {
  teamName: string
  contactEmail: string
  externalLink: string
  files: File[]
  onProgress: (label: string | null) => void
}): Promise<void> {
  const fileInputs: TeamInboxFileInput[] = input.files.map((file) => ({
    fileName: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  }))

  let submissionId: string | null = null
  try {
    const createResponse = await fetch('/api/team-inbox', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        teamName: input.teamName,
        contactEmail: input.contactEmail,
        externalLink: input.externalLink,
        files: fileInputs,
      }),
    })
    if (!createResponse.ok) {
      throw new Error(await readErrorMessage(createResponse, teamInboxMessages.saveFailed))
    }

    const plan = (await createResponse.json()) as TeamInboxUploadPlanResponse
    if (typeof plan.submissionId !== 'string' || !Array.isArray(plan.uploads)) {
      throw new Error(teamInboxMessages.saveFailed)
    }
    submissionId = plan.submissionId
    if (plan.uploads.length !== input.files.length) {
      throw new Error(teamInboxMessages.uploadFailed)
    }
    if (input.files.length === 0) {
      return
    }

    const completedFiles: {
      uploadId: string
      parts: CompletedInboxPart[]
    }[] = []

    for (let fileIndex = 0; fileIndex < input.files.length; fileIndex += 1) {
      const file = input.files[fileIndex]
      const upload = plan.uploads[fileIndex]
      if (!file || !upload) {
        throw new Error(teamInboxMessages.uploadFailed)
      }
      if (
        upload.partSizeBytes !== UPLOAD_PART_BYTES ||
        upload.partCount !== uploadPartCount(file.size)
      ) {
        throw new Error(teamInboxMessages.uploadFailed)
      }

      const parts: CompletedInboxPart[] = []
      for (let partNumber = 1; partNumber <= upload.partCount; partNumber += 1) {
        const partSize = expectedUploadPartSize(file.size, partNumber)
        if (partSize == null) {
          throw new Error(teamInboxMessages.uploadFailed)
        }
        const start = (partNumber - 1) * UPLOAD_PART_BYTES
        input.onProgress(`Subiendo ${file.name} · parte ${partNumber} de ${upload.partCount}`)
        const partResponse = await fetch(
          `/api/team-inbox?submissionId=${encodeURIComponent(plan.submissionId)}&uploadId=${encodeURIComponent(upload.uploadId)}&partNumber=${partNumber}`,
          {
            method: 'PUT',
            headers: { 'content-type': 'application/octet-stream' },
            body: file.slice(start, start + partSize),
          },
        )
        if (!partResponse.ok) {
          throw new Error(await readErrorMessage(partResponse, teamInboxMessages.uploadFailed))
        }
        const uploadedPart = (await partResponse.json()) as {
          partNumber?: unknown
          etag?: unknown
        }
        if (
          typeof uploadedPart.partNumber !== 'number' ||
          typeof uploadedPart.etag !== 'string'
        ) {
          throw new Error(teamInboxMessages.uploadFailed)
        }
        parts.push({
          partNumber: uploadedPart.partNumber,
          etag: uploadedPart.etag,
        })
      }
      completedFiles.push({ uploadId: upload.uploadId, parts })
    }

    input.onProgress(null)
    const completeResponse = await fetch('/api/team-inbox?action=complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        submissionId: plan.submissionId,
        files: completedFiles,
      }),
    })
    if (!completeResponse.ok) {
      throw new Error(await readErrorMessage(completeResponse, teamInboxMessages.uploadFailed))
    }
  } catch (error) {
    if (submissionId) {
      await abortSubmission(submissionId)
    }
    input.onProgress(null)
    if (error instanceof Error && error.message.length > 0) {
      throw error
    }
    throw new Error(teamInboxMessages.uploadFailed)
  }
}
