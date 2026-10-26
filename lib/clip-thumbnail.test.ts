import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  isRealYouTubeVideoId,
  resolveClipThumbnail,
  thumbKeyFromR2Key,
  youtubeThumbnailUrl,
} from './clip-thumbnail'

const ORIGINAL_MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_BASE_URL

beforeEach(() => {
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL = 'https://media.carpeta.cl'
})

afterEach(() => {
  if (ORIGINAL_MEDIA_BASE_URL == null) {
    delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL
  } else {
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL = ORIGINAL_MEDIA_BASE_URL
  }
})

describe('isRealYouTubeVideoId', () => {
  it('accepts canonical 11-character ids', () => {
    assert.equal(isRealYouTubeVideoId('J9UmilJC89Q'), true)
    assert.equal(isRealYouTubeVideoId('dQw4w9WgXcQ'), true)
  })

  it('rejects pending and other placeholder ids', () => {
    assert.equal(
      isRealYouTubeVideoId('pending-2026-10-25-uc-s16a-mq-01'),
      false,
    )
    assert.equal(isRealYouTubeVideoId('placeholder-id'), false)
    assert.equal(isRealYouTubeVideoId(''), false)
  })
})

describe('resolveClipThumbnail', () => {
  it('prefers a self-hosted thumb when present', () => {
    assert.deepEqual(
      resolveClipThumbnail({
        youtubeId: 'J9UmilJC89Q',
        thumbKey: 'uc-s16a/184-salidas.thumb.jpg',
      }),
      {
        source: 'self-hosted',
        url: 'https://media.carpeta.cl/uc-s16a/184-salidas.thumb.jpg',
      },
    )
  })

  it('uses an R2 video poster before YouTube when thumb_key is missing', () => {
    assert.deepEqual(
      resolveClipThumbnail({
        youtubeId: 'J9UmilJC89Q',
        r2Key: 'match/clip.720.mp4',
      }),
      {
        source: 'video-poster',
        url: 'https://media.carpeta.cl/match/clip.720.mp4',
      },
    )
  })

  it('falls back to YouTube when there is no thumb or r2 key and the id is real', () => {
    assert.deepEqual(
      resolveClipThumbnail({ youtubeId: 'J9UmilJC89Q' }),
      {
        source: 'youtube',
        url: youtubeThumbnailUrl('J9UmilJC89Q'),
      },
    )
  })

  it('uses a video poster for pending youtube ids with r2_key', () => {
    assert.deepEqual(
      resolveClipThumbnail({
        youtubeId: 'pending-2026-10-25-uc-s16a-mq-01',
        r2Key: 'uc-s16a/184.720.mp4',
      }),
      {
        source: 'video-poster',
        url: 'https://media.carpeta.cl/uc-s16a/184.720.mp4',
      },
    )
  })

  it('uses fallback for pending youtube ids without media', () => {
    assert.deepEqual(
      resolveClipThumbnail({
        youtubeId: 'pending-2026-10-25-uc-s16a-mq-01',
      }),
      { source: 'fallback', url: null },
    )
  })

  it('does not expose thumbs for restricted clips', () => {
    assert.deepEqual(
      resolveClipThumbnail({
        youtubeId: 'pending-2026-10-25-uc-s16a-mq-01',
        thumbKey: 'uc-s16a/184.thumb.jpg',
        visibility: 'restricted',
      }),
      { source: 'fallback', url: null },
    )
  })
})

describe('thumbKeyFromR2Key', () => {
  it('replaces the video extension with .thumb.jpg', () => {
    assert.equal(
      thumbKeyFromR2Key('2026-10-25--UC_Sub_16_A--Manquehue/184-salidas.720.mp4'),
      '2026-10-25--UC_Sub_16_A--Manquehue/184-salidas.thumb.jpg',
    )
  })
})
