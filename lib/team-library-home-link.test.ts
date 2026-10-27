import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  TEAM_LIBRARY_HOME_HREF,
  pointerHitsRectangle,
  teamLibraryHomeOverlayAction,
  type TeamLibraryHomePointer,
} from './team-library-home-link'

const linkRectangle = { left: 24, top: 32, right: 180, bottom: 52 }

function pointer(overrides: Partial<TeamLibraryHomePointer> = {}): TeamLibraryHomePointer {
  return {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    clientX: 40,
    clientY: 40,
    ...overrides,
  }
}

test('a plain press on the dialog overlay inside the home link loads /', () => {
  assert.equal(
    teamLibraryHomeOverlayAction({
      pointer: pointer(),
      linkRectangle,
      targetIsHomeLink: false,
    }),
    'assign',
  )
  assert.equal(TEAM_LIBRARY_HOME_HREF, '/')
})

test('the home link box includes its edges and excludes the surrounding header', () => {
  assert.equal(
    pointerHitsRectangle(pointer({ clientX: 24, clientY: 32 }), linkRectangle),
    true,
  )
  assert.equal(
    pointerHitsRectangle(pointer({ clientX: 180, clientY: 52 }), linkRectangle),
    true,
  )
  assert.equal(
    pointerHitsRectangle(pointer({ clientX: 181, clientY: 40 }), linkRectangle),
    false,
  )
  assert.equal(
    teamLibraryHomeOverlayAction({
      pointer: pointer({ clientX: 10, clientY: 10 }),
      linkRectangle,
      targetIsHomeLink: false,
    }),
    'none',
  )
})

test('modified presses and a press on the anchor itself are left to the browser', () => {
  assert.equal(
    teamLibraryHomeOverlayAction({
      pointer: pointer({ metaKey: true }),
      linkRectangle,
      targetIsHomeLink: false,
    }),
    'none',
  )
  assert.equal(
    teamLibraryHomeOverlayAction({
      pointer: pointer({ ctrlKey: true }),
      linkRectangle,
      targetIsHomeLink: false,
    }),
    'none',
  )
  assert.equal(
    teamLibraryHomeOverlayAction({
      pointer: pointer({ button: 1 }),
      linkRectangle,
      targetIsHomeLink: false,
    }),
    'none',
  )
  assert.equal(
    teamLibraryHomeOverlayAction({
      pointer: pointer(),
      linkRectangle,
      targetIsHomeLink: true,
    }),
    'none',
  )
  assert.equal(
    teamLibraryHomeOverlayAction({
      pointer: pointer(),
      linkRectangle: null,
      targetIsHomeLink: false,
    }),
    'none',
  )
})

test('the page is not wrapped in a stacking context under the dialog overlay', () => {
  const layout = readFileSync(path.join(import.meta.dirname, '../app/layout.tsx'), 'utf8')
  assert.equal(layout.includes('relative z-10'), false)
  assert.match(layout, /-z-10/)
  assert.match(layout, /z-0/)
})

test('the team header is a document link to / and does not cancel that navigation', () => {
  const header = readFileSync(
    path.join(import.meta.dirname, '../components/team-header.tsx'),
    'utf8',
  )
  const code = header.replace(/\/\*[\s\S]*?\*\//g, '')
  assert.match(code, /<a\s/)
  assert.match(code, /href=\{TEAM_LIBRARY_HOME_HREF\}/)
  assert.match(code, /data-team-library-home/)
  assert.equal(code.includes('preventDefault'), false)
  assert.equal(code.includes('router.push'), false)
  assert.equal(code.includes("from 'next/link'"), false)
  assert.equal(code.includes("from 'next/navigation'"), false)
})
