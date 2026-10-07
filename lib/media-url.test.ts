import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { mediaUrl } from './media-url'

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

describe('mediaUrl', () => {
  it('builds a public 1080p URL and encodes object-key segments', () => {
    assert.equal(
      mediaUrl({
        r2Key: 'matches/2026/UC B vs OR.mp4',
        visibility: 'public',
      }),
      'https://media.carpeta.cl/matches/2026/UC%20B%20vs%20OR.mp4',
    )
  })

  it('uses the 720p key only when preferLow is set and the low key exists', () => {
    const clip = {
      r2Key: 'full.mp4',
      r2KeyLow: 'low.mp4',
      visibility: 'public' as const,
    }
    assert.equal(
      mediaUrl(clip, { preferLow: true }),
      'https://media.carpeta.cl/low.mp4',
    )
    assert.equal(mediaUrl(clip), 'https://media.carpeta.cl/full.mp4')
    assert.equal(
      mediaUrl({ r2Key: 'full.mp4', visibility: 'public' }, { preferLow: true }),
      'https://media.carpeta.cl/full.mp4',
    )
  })

  it('returns null without an r2 key, even if a low key is present', () => {
    assert.equal(mediaUrl({ r2KeyLow: 'low.mp4', visibility: 'public' }), null)
    assert.equal(
      mediaUrl(
        { r2KeyLow: 'low.mp4', visibility: 'public' },
        { preferLow: true },
      ),
      null,
    )
    assert.equal(mediaUrl({ visibility: 'public' }), null)
    assert.equal(mediaUrl({ r2Key: '   ', visibility: 'public' }), null)
  })

  it('returns null for restricted clips and any non-public visibility', () => {
    assert.equal(
      mediaUrl({ r2Key: 'full.mp4', visibility: 'restricted' }),
      null,
    )
    assert.equal(
      mediaUrl(
        { r2Key: 'full.mp4', r2KeyLow: 'low.mp4', visibility: 'restricted' },
        { preferLow: true },
      ),
      null,
    )
    assert.equal(mediaUrl({ r2Key: 'full.mp4', visibility: 'private' }), null)
  })

  it('treats a missing visibility as public, matching the catalog default', () => {
    assert.equal(
      mediaUrl({ r2Key: 'full.mp4' }),
      'https://media.carpeta.cl/full.mp4',
    )
  })

  it('returns null when the media base URL is unset or not http(s)', () => {
    delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL
    assert.equal(mediaUrl({ r2Key: 'full.mp4', visibility: 'public' }), null)

    process.env.NEXT_PUBLIC_MEDIA_BASE_URL = ' '
    assert.equal(mediaUrl({ r2Key: 'full.mp4', visibility: 'public' }), null)

    process.env.NEXT_PUBLIC_MEDIA_BASE_URL = 'not a url'
    assert.equal(mediaUrl({ r2Key: 'full.mp4', visibility: 'public' }), null)
  })

  it('strips a trailing slash on the base URL and rejects parent segments', () => {
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL = 'https://media.carpeta.cl/'
    assert.equal(
      mediaUrl({ r2Key: '/clips/goal.mp4', visibility: 'public' }),
      'https://media.carpeta.cl/clips/goal.mp4',
    )
    assert.equal(
      mediaUrl({ r2Key: 'clips/../secret.mp4', visibility: 'public' }),
      null,
    )
  })
})
