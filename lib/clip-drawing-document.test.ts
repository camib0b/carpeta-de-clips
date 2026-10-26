import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  WHOLE_CLIP_PLAY_ORD,
  buildPlayId,
  emptyDrawingDocument,
  parseDrawingDocument,
  parsePlayId,
  parsePlayOrd,
  readDrawingResponse,
} from './clip-drawing-document'

const MIGRATION_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations/0007_clip_drawings.sql',
)

const versionOneStroke = {
  version: 1,
  strokes: [{ points: [{ x: 0.1, y: 0.2 }, { x: 0.4, y: 0.5 }] }],
}

describe('drawing document', () => {
  it('keeps a version 1 marker stroke and drops extra fields', () => {
    const document = parseDrawingDocument({
      version: 1,
      strokes: [{ points: [{ x: 0, y: 1, pressure: 0.4 }], color: 'blue' }],
      layers: [],
    })
    assert.deepEqual(document, {
      version: 1,
      strokes: [{ points: [{ x: 0, y: 1 }] }],
    })
  })

  it('rejects a later version so an old client cannot rewrite it', () => {
    assert.equal(parseDrawingDocument({ version: 2, strokes: [] }), null)
    assert.equal(parseDrawingDocument({ version: 1, strokes: [{ points: [] }] }), null)
    assert.equal(
      parseDrawingDocument({ version: 1, strokes: [{ points: [{ x: 1.1, y: 0 }] }] }),
      null,
    )
  })

  it('builds a stable play id and keeps ord 0 for a clip with no plays', () => {
    assert.equal(WHOLE_CLIP_PLAY_ORD, 0)
    assert.equal(buildPlayId('12', 0), 'clip:12:play:0')
    assert.deepEqual(parsePlayId('clip:12:play:0'), { clipId: '12', playOrd: 0 })
    assert.equal(parsePlayOrd('0'), 0)
    assert.equal(parsePlayOrd('3'), 3)
    assert.equal(buildPlayId('0', 1), null)
    assert.equal(parsePlayId('12:1'), null)
  })

  it('locks the pen when the only stored drawing is not version 1', () => {
    assert.deepEqual(readDrawingResponse({ drawings: [] }), {
      state: 'ready',
      document: emptyDrawingDocument(),
    })
    assert.deepEqual(readDrawingResponse({ drawings: [{ strokes: versionOneStroke }] }), {
      state: 'ready',
      document: versionOneStroke,
    })
    assert.deepEqual(
      readDrawingResponse({
        drawings: [{ editable: false, strokes: { version: 2, strokes: [] } }],
      }),
      { state: 'unsupported' },
    )
  })
})

describe('clip_drawings migration', () => {
  it('stores one public drawing per play and a separate row per owner', () => {
    const database = new DatabaseSync(':memory:')
    database.exec(fs.readFileSync(MIGRATION_PATH, 'utf8'))

    const insert = database.prepare(
      `INSERT INTO clip_drawings (
         id, play_id, owner_id, strokes_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    insert.run(
      'public-1',
      'clip:4:play:1',
      null,
      JSON.stringify(versionOneStroke),
      '2026-10-26T00:00:00.000Z',
      '2026-10-26T00:00:00.000Z',
    )

    assert.throws(() => {
      insert.run(
        'public-2',
        'clip:4:play:1',
        null,
        JSON.stringify(emptyDrawingDocument()),
        '2026-10-26T00:00:01.000Z',
        '2026-10-26T00:00:01.000Z',
      )
    })

    insert.run(
      'coach-1',
      'clip:4:play:1',
      'account-camila',
      JSON.stringify(versionOneStroke),
      '2026-10-26T00:00:02.000Z',
      '2026-10-26T00:00:02.000Z',
    )
    assert.throws(() => {
      insert.run(
        'coach-2',
        'clip:4:play:1',
        'account-camila',
        JSON.stringify(versionOneStroke),
        '2026-10-26T00:00:03.000Z',
        '2026-10-26T00:00:03.000Z',
      )
    })

    const rows = database
      .prepare(
        `SELECT id, owner_id
         FROM clip_drawings
         WHERE play_id = ?
         ORDER BY id ASC`,
      )
      .all('clip:4:play:1') as Array<{ id: string; owner_id: string | null }>

    assert.deepEqual(
      rows.map((row) => ({ id: row.id, owner_id: row.owner_id })),
      [
        { id: 'coach-1', owner_id: 'account-camila' },
        { id: 'public-1', owner_id: null },
      ],
    )
  })
})
