import assert from 'node:assert/strict'
import test from 'node:test'

import {
  TeamInboxRequestError,
  abortMultipartUploads,
  openInboxMultipartUploads,
  teamInboxBucketFromEnv,
} from './team-inbox.server'
import { teamInboxMessages, type StoredInboxFile, type ValidTeamInboxFile } from './team-inbox'

const OBJECT_PREFIX = 'inbox/2026-06-15-equipo-abcd/'

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function inboxFile(objectFileName: string): ValidTeamInboxFile {
  return {
    originalFileName: objectFileName,
    objectFileName,
    contentType: 'video/mp4',
    sizeBytes: 12,
    partCount: 1,
  }
}

function storedFile(
  objectFileName: string,
  completed: boolean,
): StoredInboxFile {
  return {
    originalFileName: objectFileName,
    objectKey: objectFileName.includes('/')
      ? objectFileName
      : `${OBJECT_PREFIX}${objectFileName}`,
    sizeBytes: 12,
    contentType: 'video/mp4',
    uploadId: `upload-${objectFileName}`,
    partCount: 1,
    completed,
  }
}

type FakeBucket = {
  bucket: R2Bucket
  maxInFlight: () => number
  aborted: string[]
  deleted: string[]
  deleteAttempts: string[]
  abortAttempts: string[]
}

function createFakeBucket(failCreateFor: (objectKey: string) => Promise<void> | void): FakeBucket {
  let inFlight = 0
  let highestInFlight = 0
  const aborted: string[] = []
  const deleted: string[] = []
  const deleteAttempts: string[] = []
  const abortAttempts: string[] = []

  function enter(): void {
    inFlight += 1
    highestInFlight = Math.max(highestInFlight, inFlight)
  }

  function leave(): void {
    inFlight -= 1
  }

  const bucket = {
    async createMultipartUpload(
      objectKey: string,
      options: { httpMetadata?: { contentType?: string } },
    ) {
      enter()
      try {
        await delay(objectKey.endsWith('slow.mp4') ? 40 : 10)
        await failCreateFor(objectKey)
        return {
          uploadId: `upload-${objectKey}`,
          httpMetadata: options.httpMetadata,
        }
      } finally {
        leave()
      }
    },
    async delete(objectKey: string) {
      enter()
      try {
        deleteAttempts.push(objectKey)
        await delay(15)
        if (objectKey.endsWith('done.mp4')) {
          throw new Error('delete failed')
        }
        deleted.push(objectKey)
      } finally {
        leave()
      }
    },
    resumeMultipartUpload(objectKey: string, uploadId: string) {
      return {
        async abort() {
          enter()
          try {
            abortAttempts.push(`${objectKey}:${uploadId}`)
            await delay(15)
            if (objectKey.endsWith('stuck.mp4')) {
              throw new Error('abort failed')
            }
            aborted.push(`${objectKey}:${uploadId}`)
          } finally {
            leave()
          }
        },
      }
    },
  }

  return {
    bucket: bucket as unknown as R2Bucket,
    maxInFlight: () => highestInFlight,
    aborted,
    deleted,
    deleteAttempts,
    abortAttempts,
  }
}

test('inbox storage uses the private TEAM_INBOX binding and ignores MEDIA', () => {
  const privateBucket = { binding: 'TEAM_INBOX' }
  const publicBucket = { binding: 'MEDIA' }
  const env = {
    TEAM_INBOX: privateBucket as unknown as R2Bucket,
    MEDIA: publicBucket as unknown as R2Bucket,
  }

  assert.equal(teamInboxBucketFromEnv(env), privateBucket)
})

test('inbox storage fails closed when the private binding is missing', () => {
  const envWithPublicBucketOnly = {
    MEDIA: {} as R2Bucket,
    TEAM_INBOX: undefined,
  }

  assert.throws(
    () => teamInboxBucketFromEnv(envWithPublicBucketOnly),
    /R2 binding TEAM_INBOX is missing/,
  )
  assert.throws(() => teamInboxBucketFromEnv({}), /carpeta-inbox/)
})

test('multipart uploads open together and keep file order', async () => {
  const fakeBucket = createFakeBucket(() => undefined)
  const opened = await openInboxMultipartUploads(fakeBucket.bucket, OBJECT_PREFIX, [
    inboxFile('slow.mp4'),
    inboxFile('fast.mp4'),
  ])

  assert.deepEqual(
    opened.map((file) => file.objectKey),
    [`${OBJECT_PREFIX}slow.mp4`, `${OBJECT_PREFIX}fast.mp4`],
  )
  assert.deepEqual(
    opened.map((file) => file.uploadId),
    [`upload-${OBJECT_PREFIX}slow.mp4`, `upload-${OBJECT_PREFIX}fast.mp4`],
  )
  assert.equal(opened[0]?.partCount, 1)
  assert.equal(opened[0]?.completed, false)
  assert.equal(fakeBucket.maxInFlight() >= 2, true)
  assert.deepEqual(fakeBucket.aborted, [])
})

test('a failed open aborts uploads that already started and keeps the earliest file error', async () => {
  const fakeBucket = createFakeBucket(async (objectKey) => {
    if (objectKey.endsWith('first.mp4')) {
      await delay(30)
      throw new Error('first failed')
    }
    if (objectKey.endsWith('second.mp4')) {
      throw new Error('second failed')
    }
  })

  await assert.rejects(
    () =>
      openInboxMultipartUploads(fakeBucket.bucket, OBJECT_PREFIX, [
        inboxFile('first.mp4'),
        inboxFile('second.mp4'),
        inboxFile('third.mp4'),
      ]),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, 'first failed')
      return true
    },
  )
  assert.deepEqual(fakeBucket.aborted, [`${OBJECT_PREFIX}third.mp4:upload-${OBJECT_PREFIX}third.mp4`])
})

test('an unsafe object key aborts sibling uploads that already opened', async () => {
  const fakeBucket = createFakeBucket(() => undefined)

  await assert.rejects(
    () =>
      openInboxMultipartUploads(fakeBucket.bucket, OBJECT_PREFIX, [
        inboxFile('partido.mp4'),
        inboxFile('nested/secret.mp4'),
      ]),
    (error: unknown) => {
      assert.ok(error instanceof TeamInboxRequestError)
      assert.equal(error.message, teamInboxMessages.fileNameInvalid)
      assert.equal(error.status, 400)
      return true
    },
  )
  assert.deepEqual(fakeBucket.aborted, [
    `${OBJECT_PREFIX}partido.mp4:upload-${OBJECT_PREFIX}partido.mp4`,
  ])
})

test('abort cleanup runs deletes and upload aborts together and keeps going after one failure', async () => {
  const fakeBucket = createFakeBucket(() => undefined)

  await abortMultipartUploads(
    fakeBucket.bucket,
    [
      storedFile('done.mp4', true),
      storedFile('open.mp4', false),
      storedFile('stuck.mp4', false),
      storedFile('elsewhere/skip.mp4', true),
    ],
    OBJECT_PREFIX,
  )

  assert.deepEqual(fakeBucket.deleteAttempts, [`${OBJECT_PREFIX}done.mp4`])
  assert.deepEqual(fakeBucket.deleted, [])
  assert.deepEqual(fakeBucket.abortAttempts, [
    `${OBJECT_PREFIX}open.mp4:upload-open.mp4`,
    `${OBJECT_PREFIX}stuck.mp4:upload-stuck.mp4`,
  ])
  assert.deepEqual(fakeBucket.aborted, [`${OBJECT_PREFIX}open.mp4:upload-open.mp4`])
  assert.equal(fakeBucket.maxInFlight() >= 2, true)
})
