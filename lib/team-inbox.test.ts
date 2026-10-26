import assert from 'node:assert/strict'
import test from 'node:test'

import { NARROW_CONTENT_PX, estimatedLineWidthPx } from './break-ui/worst-case-fixtures'
import {
  ONE_TEAM_INBOX_EMAIL,
  ONE_TEAM_INBOX_FILE,
  ONE_TEAM_INBOX_NAME,
  TEAM_INBOX_ERROR_MESSAGE,
  WORST_EXTERNAL_LINK,
  WORST_TEAM_INBOX_EMAIL,
  WORST_TEAM_INBOX_FILES,
  WORST_TEAM_INBOX_NAME,
} from './break-ui/team-inbox-form-fixtures'
import { PRICE_PER_MATCH_CLP, formatPricePerMatchClp } from './private-team-offer'
import {
  CONTACT_EMAIL_MAX_LENGTH,
  EXTERNAL_LINK_MAX_LENGTH,
  FILE_NAME_MAX_LENGTH,
  MAX_FILE_BYTES,
  MAX_FILES_PER_SUBMISSION,
  MAX_SUBMISSION_BYTES,
  TEAM_NAME_MAX_LENGTH,
  UPLOAD_PART_BYTES,
  buildInboxObjectPrefix,
  clampDisplayedFileName,
  expectedUploadPartSize,
  formatByteSize,
  formatInboxLimitSummary,
  formatSelectedFileSummary,
  inboxCalendarDate,
  inboxObjectFileName,
  teamInboxClientAddress,
  teamInboxMessages,
  uploadPartCount,
  validateCompletedParts,
  validateTeamInboxSubmission,
  type StoredInboxFile,
} from './team-inbox'

const VALID_EMAIL = 'equipo@example.com'

function submission(overrides: {
  teamName?: unknown
  contactEmail?: unknown
  externalLink?: unknown
  files?: unknown
}) {
  return validateTeamInboxSubmission({
    teamName: 'Universidad Católica',
    contactEmail: VALID_EMAIL,
    externalLink: null,
    files: [],
    ...overrides,
  })
}

test('price placeholder is grouped as CLP without cents', () => {
  const formatted = formatPricePerMatchClp(PRICE_PER_MATCH_CLP)
  assert.match(formatted, /999\.999\.999/)
  assert.equal(formatted.includes(',00'), false)
  assert.equal(formatted.includes('.00'), false)

  const ordinary = formatPricePerMatchClp(45_000)
  assert.match(ordinary, /45\.000/)
})

test('inbox prefix uses the Santiago calendar date and a slug', () => {
  const previousEvening = inboxCalendarDate(new Date('2026-06-15T02:00:00.000Z'))
  const sameDay = inboxCalendarDate(new Date('2026-06-15T18:00:00.000Z'))
  assert.equal(previousEvening, '2026-06-14')
  assert.equal(sameDay, '2026-06-15')

  const prefix = buildInboxObjectPrefix(
    'Universidad Católica',
    new Date('2026-06-15T18:00:00.000Z'),
    'ab12cd34',
  )
  assert.equal(prefix, 'inbox/2026-06-15-universidad-catolica-ab12cd34/')
  assert.equal(buildInboxObjectPrefix('王秀英', new Date('2026-06-15T18:00:00.000Z'), 'abcd'), 'inbox/2026-06-15-equipo-abcd/')
})

test('validation accepts a link, a video, or both, and rejects the empty form', () => {
  const empty = submission({})
  assert.equal(empty.ok, false)
  if (!empty.ok) {
    assert.equal(empty.error, teamInboxMessages.needFileOrLink)
    assert.equal(empty.field, 'form')
  }

  const linkOnly = submission({ externalLink: 'https://example.com/drive/partido' })
  assert.equal(linkOnly.ok, true)
  if (linkOnly.ok) {
    assert.equal(linkOnly.value.files.length, 0)
    assert.equal(linkOnly.value.externalLink, 'https://example.com/drive/partido')
  }

  const video = submission({
    files: [{ fileName: 'partido.mp4', contentType: 'video/mp4', sizeBytes: 12 }],
  })
  assert.equal(video.ok, true)
  if (video.ok) {
    assert.equal(video.value.files[0]?.objectFileName, 'partido.mp4')
    assert.equal(video.value.files[0]?.partCount, 1)
  }
})

test('validation rejects bad links, non-video types, and sizes past the cap', () => {
  const scriptLink = submission({ externalLink: 'javascript:alert(1)' })
  assert.equal(scriptLink.ok, false)

  const tooLongLink = submission({
    externalLink: `https://example.com/${'a'.repeat(EXTERNAL_LINK_MAX_LENGTH)}`,
  })
  assert.equal(tooLongLink.ok, false)
  if (!tooLongLink.ok) {
    assert.equal(tooLongLink.error, teamInboxMessages.linkTooLong)
  }

  const png = submission({
    files: [{ fileName: 'partido.mp4', contentType: 'image/png', sizeBytes: 12 }],
  })
  assert.equal(png.ok, false)
  if (!png.ok) {
    assert.equal(png.error, teamInboxMessages.notVideo)
  }

  const octetStream = submission({
    files: [{ fileName: 'partido.mov', contentType: 'application/octet-stream', sizeBytes: 12 }],
  })
  assert.equal(octetStream.ok, true)
  if (octetStream.ok) {
    assert.equal(octetStream.value.files[0]?.contentType, 'video/quicktime')
  }

  const pathName = submission({
    files: [{ fileName: '../../etc/passwd.mp4', contentType: 'video/mp4', sizeBytes: 4 }],
  })
  assert.equal(pathName.ok, true)
  if (pathName.ok) {
    assert.equal(pathName.value.files[0]?.originalFileName, 'passwd.mp4')
    assert.equal(pathName.value.files[0]?.objectFileName, 'passwd.mp4')
  }

  const tooBig = submission({
    files: [{ fileName: 'partido.mp4', contentType: 'video/mp4', sizeBytes: MAX_FILE_BYTES + 1 }],
  })
  assert.equal(tooBig.ok, false)

  const tooMany = submission({
    files: Array.from({ length: MAX_FILES_PER_SUBMISSION + 1 }, (_, index) => ({
      fileName: `partido-${index}.mp4`,
      contentType: 'video/mp4',
      sizeBytes: 1,
    })),
  })
  assert.equal(tooMany.ok, false)
  if (!tooMany.ok) {
    assert.equal(tooMany.error, teamInboxMessages.tooManyFiles)
  }

  const totalTooBig = submission({
    files: [
      { fileName: 'uno.mp4', contentType: 'video/mp4', sizeBytes: MAX_FILE_BYTES },
      { fileName: 'dos.mp4', contentType: 'video/mp4', sizeBytes: MAX_FILE_BYTES },
      { fileName: 'tres.mp4', contentType: 'video/mp4', sizeBytes: MAX_FILE_BYTES },
      { fileName: 'cuatro.mp4', contentType: 'video/mp4', sizeBytes: MAX_SUBMISSION_BYTES },
    ],
  })
  assert.equal(totalTooBig.ok, false)
})

test('duplicate videos get distinct object names and long names keep the extension', () => {
  const longName = `${'partido-completo-'.repeat(40)}.mp4`
  const clamped = clampDisplayedFileName(longName)
  assert.equal(clamped.length, FILE_NAME_MAX_LENGTH)
  assert.equal(clamped.endsWith('.mp4'), true)

  const validated = submission({
    files: [
      { fileName: 'Partido Final.mp4', contentType: 'video/mp4', sizeBytes: 10 },
      { fileName: 'partido final.mp4', contentType: '', sizeBytes: 10 },
    ],
  })
  assert.equal(validated.ok, true)
  if (validated.ok) {
    assert.deepEqual(
      validated.value.files.map((file) => file.objectFileName),
      ['partido-final.mp4', 'partido-final-2.mp4'],
    )
    assert.equal(validated.value.files[1]?.contentType, 'video/mp4')
  }

  assert.equal(inboxObjectFileName('.mp4'), null)
  assert.equal(inboxObjectFileName('🦊 partido.mp4'), 'partido.mp4')
})

test('team name and email stop at their limits', () => {
  const tooLongName = submission({ teamName: 'A'.repeat(TEAM_NAME_MAX_LENGTH + 1) })
  assert.equal(tooLongName.ok, false)

  const exactName = submission({
    teamName: 'A'.repeat(TEAM_NAME_MAX_LENGTH),
    externalLink: 'https://example.com/partido',
  })
  assert.equal(exactName.ok, true)

  const tooLongEmail = submission({
    contactEmail: `${'a'.repeat(CONTACT_EMAIL_MAX_LENGTH)}@example.com`,
  })
  assert.equal(tooLongEmail.ok, false)

  const blank = submission({ teamName: '   ', contactEmail: '   ' })
  assert.equal(blank.ok, false)
  if (!blank.ok) {
    assert.equal(blank.field, 'teamName')
  }
})

test('multipart part sizes stay under the Worker body cap', () => {
  assert.ok(UPLOAD_PART_BYTES < 100 * 1024 * 1024)
  assert.ok(UPLOAD_PART_BYTES >= 5 * 1024 * 1024)
  assert.equal(expectedUploadPartSize(1, 1), 1)
  assert.equal(uploadPartCount(UPLOAD_PART_BYTES), 1)
  assert.equal(expectedUploadPartSize(UPLOAD_PART_BYTES + 1, 1), UPLOAD_PART_BYTES)
  assert.equal(expectedUploadPartSize(UPLOAD_PART_BYTES + 1, 2), 1)
  assert.equal(uploadPartCount(MAX_FILE_BYTES), 103)
  assert.equal(expectedUploadPartSize(MAX_FILE_BYTES, 103), 32 * 1024 * 1024)
  assert.equal(expectedUploadPartSize(MAX_FILE_BYTES, 104), null)
})

test('completed parts must cover every part number once', () => {
  const stored: StoredInboxFile = {
    originalFileName: 'partido.mp4',
    objectKey: 'inbox/2026-06-15-equipo-abcd/partido.mp4',
    sizeBytes: 10,
    contentType: 'video/mp4',
    uploadId: 'upload-1',
    partCount: 2,
    completed: false,
  }
  const quoted = validateCompletedParts(stored, [
    { partNumber: 2, etag: '"0123456789abcdef0123456789abcdef"' },
    { partNumber: 1, etag: 'abcdef0123456789abcdef0123456789' },
  ])
  assert.equal(quoted.ok, true)
  if (quoted.ok) {
    assert.deepEqual(
      quoted.parts.map((part) => part.partNumber),
      [1, 2],
    )
  }

  const missing = validateCompletedParts(stored, [
    { partNumber: 1, etag: 'abcdef0123456789abcdef0123456789' },
  ])
  assert.equal(missing.ok, false)

  const badEtag = validateCompletedParts(stored, [
    { partNumber: 1, etag: '<script>' },
    { partNumber: 2, etag: 'abcdef0123456789abcdef0123456789' },
  ])
  assert.equal(badEtag.ok, false)
})

test('file summary uses one singular and a grouped size', () => {
  assert.equal(formatSelectedFileSummary([{ sizeBytes: 1 }]), '1 archivo · 1 B')
  assert.match(formatSelectedFileSummary(WORST_TEAM_INBOX_FILES), /^8 archivos · /)
  assert.match(formatByteSize(MAX_FILE_BYTES), /^8 GB$/)
  assert.match(formatInboxLimitSummary(), /8 archivos/)
  assert.match(formatInboxLimitSummary(), /8 GB/)
  assert.match(formatInboxLimitSummary(), /24 GB/)
})

test('worst-case inbox values hit the limits that the form actually renders', () => {
  assert.equal(WORST_TEAM_INBOX_NAME.length, TEAM_NAME_MAX_LENGTH)
  assert.ok(estimatedLineWidthPx(WORST_TEAM_INBOX_NAME, 16) > NARROW_CONTENT_PX)
  assert.ok(WORST_TEAM_INBOX_EMAIL.length <= CONTACT_EMAIL_MAX_LENGTH)
  assert.ok(estimatedLineWidthPx(WORST_TEAM_INBOX_EMAIL, 14) > NARROW_CONTENT_PX)
  assert.ok(estimatedLineWidthPx(WORST_EXTERNAL_LINK, 14) > NARROW_CONTENT_PX)
  assert.equal(WORST_TEAM_INBOX_FILES.length, MAX_FILES_PER_SUBMISSION)
  assert.equal(WORST_TEAM_INBOX_FILES[0]?.sizeBytes, MAX_FILE_BYTES)
  assert.equal(WORST_TEAM_INBOX_FILES[0]?.name.length, FILE_NAME_MAX_LENGTH)
  assert.equal(WORST_TEAM_INBOX_FILES[7]?.name, 'a.mp4')
  assert.equal(ONE_TEAM_INBOX_NAME, 'J')
  assert.equal(ONE_TEAM_INBOX_EMAIL, 'a@b.co')
  assert.equal(ONE_TEAM_INBOX_FILE.sizeBytes, 1)
  assert.match(TEAM_INBOX_ERROR_MESSAGE, /bartholomew\.fitzgerald@/)
  assert.ok(estimatedLineWidthPx(TEAM_INBOX_ERROR_MESSAGE, 14) > NARROW_CONTENT_PX)
})

test('client address for the rate limit comes from Cloudflare and ignores a spoofed forward', () => {
  const withCloudflare = new Request('https://carpeta.cl/api/team-inbox', {
    headers: {
      'cf-connecting-ip': '2001:db8::1',
      'x-forwarded-for': '1.2.3.4',
    },
  })
  assert.equal(teamInboxClientAddress(withCloudflare), '2001:db8::1')

  const local = new Request('https://carpeta.cl/api/team-inbox', {
    headers: { 'x-forwarded-for': '1.2.3.4' },
  })
  assert.equal(teamInboxClientAddress(local), 'local')
})
