import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  isRealYouTubeVideoId,
  resolveClipThumbnail,
  selfHostedThumbnailImage,
  thumbKeyFromR2KeyAndHash,
  thumbKeyForWidth,
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
        thumbKey: 'uc-s16a/184-salidas.thumb.abc123def456.480.webp',
      }),
      {
        source: 'self-hosted',
        url: 'https://media.carpeta.cl/uc-s16a/184-salidas.thumb.abc123def456.480.webp',
      },
    )
  })

  it('falls back to YouTube when there is no thumb and the id is real', () => {
    assert.deepEqual(
      resolveClipThumbnail({ youtubeId: 'J9UmilJC89Q' }),
      {
        source: 'youtube',
        url: youtubeThumbnailUrl('J9UmilJC89Q'),
      },
    )
  })

  it('uses fallback for pending ids without a thumb', () => {
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

describe('selfHostedThumbnailImage', () => {
  it('builds a 480w/640w srcset for versioned webp keys', () => {
    const image = selfHostedThumbnailImage(
      'match/184-salidas.thumb.deadbeefcafe.480.webp',
    )
    assert.ok(image)
    assert.equal(image?.width, 480)
    assert.equal(image?.height, 270)
    assert.match(
      image?.srcSet ?? '',
      /184-salidas\.thumb\.deadbeefcafe\.480\.webp 480w/,
    )
    assert.match(
      image?.srcSet ?? '',
      /184-salidas\.thumb\.deadbeefcafe\.640\.webp 640w/,
    )
  })
})

describe('thumbKeyFromR2KeyAndHash', () => {
  it('embeds a content hash and 480w suffix', () => {
    assert.equal(
      thumbKeyFromR2KeyAndHash(
        '2026-10-25--UC_Sub_16_A--Manquehue/184-salidas.720.mp4',
        'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      ),
      '2026-10-25--UC_Sub_16_A--Manquehue/184-salidas.thumb.abcdef012345.480.webp',
    )
    assert.equal(
      thumbKeyForWidth(
        '2026-10-25--UC_Sub_16_A--Manquehue/184-salidas.thumb.abcdef012345.480.webp',
        640,
      ),
      '2026-10-25--UC_Sub_16_A--Manquehue/184-salidas.thumb.abcdef012345.640.webp',
    )
  })
})
