import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  formatPlayedOnCaption,
  homePreviewPlayback,
  latestMatchCardHref,
  matchupLabel,
  selectBestPlayPreview,
} from './home-latest-match'

test('formatPlayedOnCaption uses the compact day and month', () => {
  assert.equal(formatPlayedOnCaption('2026-10-25'), 'jugado el 25-oct')
  assert.equal(formatPlayedOnCaption('2026-09-02T15:00:00Z'), 'jugado el 2-sept')
})

test('formatPlayedOnCaption omits a date that is not a calendar day', () => {
  assert.equal(formatPlayedOnCaption('not-a-date'), null)
  assert.equal(formatPlayedOnCaption(''), null)
})

test('selectBestPlayPreview prefers a goal over a full match and keeps order on a tie', () => {
  const previews = [
    { title: 'Partido Completo', clipId: 'full' },
    { title: 'Salidas', clipId: 'press' },
    { title: 'Goles', clipId: 'goals' },
    { title: 'Gol de visita', clipId: 'later-goal' },
  ]
  assert.equal(selectBestPlayPreview(previews)?.clipId, 'goals')
  assert.equal(selectBestPlayPreview([]) , null)
  assert.equal(
    selectBestPlayPreview([
      { title: 'Salidas', clipId: 'first' },
      { title: 'Presiones', clipId: 'second' },
    ])?.clipId,
    'first',
  )
})

test('matchupLabel keeps both sides and collapses broken whitespace', () => {
  assert.equal(matchupLabel('UC', 'COGS'), 'UC vs COGS')
  assert.equal(matchupLabel('Line one\nLine two', '  Sam   Lee '), 'Line one Line two vs Sam Lee')
  assert.equal(matchupLabel('   ', 'COGS'), 'COGS')
  assert.equal(matchupLabel('  ', '  '), 'Partido')
})

test('the home page leads with the latest match, the audience, and no section canyon', () => {
  const repoRoot = path.resolve(import.meta.dirname, '..')
  const page = readFileSync(path.join(repoRoot, 'app/page.tsx'), 'utf8')
  const latest = readFileSync(
    path.join(repoRoot, 'components/latest-uploaded-match-section.tsx'),
    'utf8',
  )
  const privateFolder = readFileSync(
    path.join(repoRoot, 'components/private-team-folder-section.tsx'),
    'utf8',
  )

  const matchUse = page.indexOf('<LatestUploadedMatchSection')
  const folders = page.indexOf('Carpetas públicas')
  assert.ok(matchUse !== -1 && folders !== -1 && matchUse < folders)
  assert.match(page, /para jugadoras y cuerpos técnicos\./)
  assert.match(page, /cursor-pointer/)
  assert.equal(page.includes('mb-28'), false)
  assert.equal(latest.includes('mb-28'), false)
  assert.equal(privateFolder.includes('mb-28'), false)
  assert.match(latest, /formatPlayedOnCaption/)
  assert.match(latest, /cursor-pointer/)
  const teamIcon = readFileSync(path.join(repoRoot, 'components/team-icon.tsx'), 'utf8')
  const teamIcons = readFileSync(path.join(repoRoot, 'lib/team-icons.ts'), 'utf8')
  assert.match(page, /<TeamIcon/)
  assert.match(teamIcons, /\/teams\/fehoch\.webp/)
  assert.match(teamIcon, /rounded-full bg-white/)
  assert.equal(page.includes('/teams/fehoch.webp'), false)
  assert.equal(page.includes('FehochPlaceholderMark'), false)

  const preview = readFileSync(
    path.join(repoRoot, 'components/latest-match-play-preview.tsx'),
    'utf8',
  )
  const section = readFileSync(
    path.join(repoRoot, 'components/latest-uploaded-match-section.tsx'),
    'utf8',
  )
  assert.match(preview, /<video/)
  assert.match(preview, /\bmuted\b/)
  assert.match(preview, /playsInline/)
  assert.match(preview, /\bloop\b/)
  assert.match(preview, /autoPlay/)
  assert.match(preview, /poster=/)
  assert.match(preview, /homePreviewPlayback/)
  assert.match(section, /latestMatchCardHref/)
  assert.equal(section.includes('youtube.com'), false)
  assert.equal(section.includes('youtu.be'), false)
  assert.equal(preview.includes('youtube.com'), false)
  assert.equal(preview.includes('youtu.be'), false)
})

test('the home preview plays the self-hosted file and keeps YouTube as a last resort', () => {
  const previousMediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL = 'https://media.carpeta.cl'
  const hosted = {
    youtubeId: 'J9UmilJC89Q',
    r2Key: '2026-10-25--UC_Sub_16_A--Manquehue/goles.720.mp4',
    r2KeyLow: '2026-10-25--UC_Sub_16_A--Manquehue/goles.480.mp4',
    thumbKey: '2026-10-25--UC_Sub_16_A--Manquehue/goles.thumb.abc.480.webp',
    visibility: 'public' as const,
  }

  try {
    const playing = homePreviewPlayback(hosted, true)
    assert.equal(playing.kind, 'hosted')
    if (playing.kind === 'hosted') {
      assert.equal(
        playing.src,
        'https://media.carpeta.cl/2026-10-25--UC_Sub_16_A--Manquehue/goles.720.mp4',
      )
      assert.equal(
        playing.poster,
        'https://media.carpeta.cl/2026-10-25--UC_Sub_16_A--Manquehue/goles.thumb.abc.480.webp',
      )
    }
    assert.deepEqual(homePreviewPlayback(hosted, false), { kind: 'still' })

    assert.deepEqual(
      homePreviewPlayback(
        { youtubeId: 'J9UmilJC89Q', visibility: 'public' },
        true,
      ),
      { kind: 'youtube', youtubeId: 'J9UmilJC89Q' },
    )
    assert.deepEqual(
      homePreviewPlayback(
        { youtubeId: 'pending-2026-10-25', visibility: 'public' },
        true,
      ),
      { kind: 'still' },
    )
    assert.deepEqual(
      homePreviewPlayback({ ...hosted, visibility: 'restricted' }, true),
      { kind: 'still' },
    )

    delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL
    assert.deepEqual(homePreviewPlayback(hosted, true), { kind: 'still' })
  } finally {
    if (previousMediaBaseUrl == null) {
      delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_MEDIA_BASE_URL = previousMediaBaseUrl
    }
  }
})

test('the latest-match card opens the carpeta clip page', () => {
  const href = latestMatchCardHref({
    librarySlug: 'others',
    rivalLabel: 'PWCC vs COGS',
    clipId: '42',
  })
  assert.equal(href, '/others?rival=pwcc-vs-cogs&clip=42')
  assert.equal(href.includes('youtube.com'), false)
  assert.equal(href.includes('youtu.be'), false)
  assert.equal(
    latestMatchCardHref({
      librarySlug: 'uc-primera-b',
      rivalLabel: 'COGS',
      clipId: 'one-goal',
    }),
    '/uc-primera-b?rival=cogs',
  )
})
