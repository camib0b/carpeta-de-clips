import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildClipShareHref,
  parseClipId,
  parseJugadaOrd,
  withLibraryFilters,
  withoutLibraryFilters,
} from './clip-params'

test('parseClipId accepts a positive integer catalog id', () => {
  assert.equal(parseClipId('42'), '42')
  assert.equal(parseClipId('0'), undefined)
  assert.equal(parseClipId('01'), undefined)
  assert.equal(parseClipId('42abc'), undefined)
  assert.equal(parseClipId(null), undefined)
  assert.equal(parseClipId(''), undefined)
})

test('parseJugadaOrd keeps the legacy positive-integer rule', () => {
  assert.equal(parseJugadaOrd('7'), 7)
  assert.equal(parseJugadaOrd('0'), undefined)
  assert.equal(parseJugadaOrd('nope'), undefined)
  assert.equal(parseJugadaOrd(null), undefined)
})

test('withLibraryFilters writes filters and preserves clip and jugada', () => {
  const current = new URLSearchParams('clip=42&jugada=7&concept=salidas&extra=1')
  const next = withLibraryFilters(current, {
    concepts: ['Goles'],
    rivals: ['Old Reds'],
  })

  assert.equal(next.get('concept'), 'goles')
  assert.equal(next.get('rival'), 'old-reds')
  assert.equal(next.get('clip'), '42')
  assert.equal(next.get('jugada'), '7')
  assert.equal(next.get('extra'), '1')
})

test('withoutLibraryFilters drops only concept and rival', () => {
  const current = new URLSearchParams(
    'concept=goles&rival=old-reds&clip=42&jugada=7',
  )
  const next = withoutLibraryFilters(current)

  assert.equal(next.get('concept'), null)
  assert.equal(next.get('rival'), null)
  assert.equal(next.get('clip'), '42')
  assert.equal(next.get('jugada'), '7')
})

test('legacy jugada without a clip id still parses', () => {
  const current = new URLSearchParams('rival=old-reds&jugada=7')
  assert.equal(parseClipId(current.get('clip')), undefined)
  assert.equal(parseJugadaOrd(current.get('jugada')), 7)
})

test('buildClipShareHref sets the clip and the selected jugada', () => {
  const href = buildClipShareHref({
    pathname: '/uc-primera-b',
    currentSearch: new URLSearchParams('rival=old-reds&concept=goles&jugada=3'),
    clipId: '42',
    jugadaOrd: 7,
  })

  const params = new URL(href, 'https://carpeta.cl').searchParams
  assert.equal(params.get('clip'), '42')
  assert.equal(params.get('jugada'), '7')
  assert.equal(params.get('rival'), 'old-reds')
  assert.equal(params.get('concept'), 'goles')
  assert.equal(href.startsWith('/uc-primera-b?'), true)
  assert.equal(href.includes('youtube.com'), false)
})

test('buildClipShareHref omits jugada when the whole clip is shared', () => {
  const href = buildClipShareHref({
    pathname: '/uc-primera-b',
    currentSearch: new URLSearchParams('clip=42&jugada=7'),
    clipId: '42',
  })

  const params = new URL(href, 'https://carpeta.cl').searchParams
  assert.equal(params.get('clip'), '42')
  assert.equal(params.get('jugada'), null)
})
