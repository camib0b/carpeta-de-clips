import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { DRAWING_DOCUMENT_VERSION, parsePlayId } from './clip-drawing-document'
import {
  LIBRARY_PUBLIC_NONEMPTY_DRAWING_PLAY_IDS_SQL,
  PUBLIC_NONEMPTY_DRAWING_PLAY_IDS_SQL,
  clipIdsFromDrawingPlayIds,
  listClipIdsWithPublicDrawings,
} from './clip-drawings'

const D1_MAX_BOUND_PARAMETERS = 100
const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations',
)
const TIMESTAMP = '2026-10-26T00:00:00.000Z'
const VERSION_ONE_STROKE = JSON.stringify({
  version: 1,
  strokes: [{ points: [{ x: 0.1, y: 0.2 }] }],
})
const EMPTY_DOCUMENT = JSON.stringify({ version: 1, strokes: [] })
const VERSION_TWO_STROKE = JSON.stringify({
  version: 2,
  strokes: [{ points: [{ x: 0.2, y: 0.3 }] }],
})

type PlayIdRow = { play_id: string }

function createCatalog(): DatabaseSync {
  const database = new DatabaseSync(':memory:')
  for (const name of ['0001_create_catalog.sql', '0008_clip_drawings.sql']) {
    database.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8'))
  }
  return database
}

function asD1Database(database: DatabaseSync): {
  database: D1Database
  boundParameters: unknown[][]
} {
  const boundParameters: unknown[][] = []
  const catalog = {
    prepare(sql: string) {
      const statement = database.prepare(sql)
      return {
        bind(...parameters: unknown[]) {
          boundParameters.push(parameters)
          return {
            async all() {
              if (parameters.length > D1_MAX_BOUND_PARAMETERS) {
                throw new Error(
                  `D1 allows at most ${D1_MAX_BOUND_PARAMETERS} bound parameters per query`,
                )
              }
              return { results: statement.all(...(parameters as never[])) }
            },
          }
        },
      }
    },
  }
  return { database: catalog as unknown as D1Database, boundParameters }
}

function sortedClipIds(clipIds: Set<string>): string[] {
  return [...clipIds].sort((left, right) => Number(left) - Number(right))
}

function insertDrawing(
  database: DatabaseSync,
  id: string,
  playId: string,
  ownerId: string | null,
  strokesJson: string,
): void {
  database
    .prepare(
      `INSERT INTO clip_drawings (
         id, play_id, owner_id, strokes_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, playId, ownerId, strokesJson, TIMESTAMP, TIMESTAMP)
}

describe('library drawing query', () => {
  it('matches the unscoped public-drawing filter for one library and skips the other', async () => {
    const database = createCatalog()
    database
      .prepare(
        `INSERT INTO libraries (id, name, sort_order)
         VALUES ('lions', 'Lions', 1), ('tigers', 'Tigers', 2)`,
      )
      .run()
    database
      .prepare(
        `INSERT INTO matches (
           id, played_on, home_team, away_team, library_id, rival_label
         ) VALUES
           ('lions-match', '2026-05-01', 'Lions', 'Tigers', 'lions', 'Tigers'),
           ('tigers-match', '2026-05-08', 'Tigers', 'Lions', 'tigers', 'Lions')`,
      )
      .run()

    const insertClip = database.prepare(
      `INSERT INTO clips (id, youtube_id, match_id, title, game_concept, uploaded_at)
       VALUES (?, ?, ?, ?, 'Goles', '2026-05-01T00:00:00Z')`,
    )
    const lionClipIds = [4, 5, 6, 7, 8, 12, 15, 130]
    for (let offset = 0; offset < 250; offset += 1) {
      lionClipIds.push(10001 + offset)
    }
    for (const clipId of lionClipIds) {
      insertClip.run(clipId, `lions-${clipId}`, 'lions-match', `Lions ${clipId}`)
    }
    for (const clipId of [40, 1300, 4000]) {
      insertClip.run(clipId, `tigers-${clipId}`, 'tigers-match', `Tigers ${clipId}`)
    }

    insertDrawing(database, 'lions-4-whole', 'clip:4:play:0', null, VERSION_ONE_STROKE)
    insertDrawing(database, 'lions-4-play', 'clip:4:play:1', null, VERSION_ONE_STROKE)
    insertDrawing(database, 'lions-4-extra', 'clip:4:play:1:extra', null, VERSION_ONE_STROKE)
    insertDrawing(database, 'lions-12', 'clip:12:play:2', null, VERSION_ONE_STROKE)
    insertDrawing(database, 'lions-130', 'clip:130:play:10', null, VERSION_ONE_STROKE)
    insertDrawing(database, 'lions-8', 'clip:8:play:1', null, VERSION_ONE_STROKE)
    insertDrawing(database, 'lions-10001', 'clip:10001:play:1', null, VERSION_ONE_STROKE)
    insertDrawing(database, 'lions-10250', 'clip:10250:play:3', null, VERSION_ONE_STROKE)
    insertDrawing(database, 'lions-5-empty', 'clip:5:play:1', null, EMPTY_DOCUMENT)
    insertDrawing(database, 'lions-6-version', 'clip:6:play:1', null, VERSION_TWO_STROKE)
    insertDrawing(database, 'lions-7-owner', 'clip:7:play:1', 'coach-1', VERSION_ONE_STROKE)
    insertDrawing(database, 'lions-15-extra', 'clip:15:play:1:extra', null, VERSION_ONE_STROKE)
    insertDrawing(database, 'lions-15-padded', 'clip:15:play:01', null, VERSION_ONE_STROKE)
    insertDrawing(database, 'orphan-99', 'clip:99:play:1', null, VERSION_ONE_STROKE)
    insertDrawing(database, 'tigers-40', 'clip:40:play:1', null, VERSION_ONE_STROKE)
    insertDrawing(database, 'tigers-1300', 'clip:1300:play:1', null, VERSION_ONE_STROKE)
    insertDrawing(database, 'tigers-4000', 'clip:4000:play:1', null, VERSION_ONE_STROKE)

    const requestedClipIds = [...lionClipIds.map(String), 'demo-youtube']
    const everyPublicPlayId = (
      database.prepare(PUBLIC_NONEMPTY_DRAWING_PLAY_IDS_SQL).all(DRAWING_DOCUMENT_VERSION) as PlayIdRow[]
    ).map((row) => row.play_id)
    const expected = clipIdsFromDrawingPlayIds(everyPublicPlayId, requestedClipIds)

    const scopedPlayIds = (
      database
        .prepare(LIBRARY_PUBLIC_NONEMPTY_DRAWING_PLAY_IDS_SQL)
        .all('lions', DRAWING_DOCUMENT_VERSION) as PlayIdRow[]
    ).map((row) => row.play_id)
    const lionClipIdSet = new Set(lionClipIds.map(String))
    for (const playId of scopedPlayIds) {
      const parsed = parsePlayId(playId)
      if (parsed) assert.equal(lionClipIdSet.has(parsed.clipId), true)
    }
    assert.ok(scopedPlayIds.includes('clip:4:play:0'))
    assert.ok(scopedPlayIds.includes('clip:4:play:1'))
    assert.ok(scopedPlayIds.includes('clip:4:play:1:extra'))
    assert.ok(scopedPlayIds.includes('clip:130:play:10'))
    assert.ok(scopedPlayIds.includes('clip:10001:play:1'))
    assert.ok(scopedPlayIds.includes('clip:10250:play:3'))
    assert.equal(scopedPlayIds.includes('clip:40:play:1'), false)
    assert.equal(scopedPlayIds.includes('clip:1300:play:1'), false)
    assert.equal(scopedPlayIds.includes('clip:4000:play:1'), false)
    assert.equal(scopedPlayIds.includes('clip:5:play:1'), false)
    assert.equal(scopedPlayIds.includes('clip:6:play:1'), false)
    assert.equal(scopedPlayIds.includes('clip:7:play:1'), false)
    assert.equal(scopedPlayIds.includes('clip:99:play:1'), false)
    assert.ok(everyPublicPlayId.includes('clip:40:play:1'))
    assert.ok(everyPublicPlayId.includes('clip:1300:play:1'))
    assert.ok(scopedPlayIds.length < everyPublicPlayId.length)

    const { database: catalog, boundParameters } = asD1Database(database)
    const actual = await listClipIdsWithPublicDrawings(
      catalog,
      'lions',
      requestedClipIds,
    )

    assert.deepEqual(sortedClipIds(actual), sortedClipIds(expected))
    assert.deepEqual(sortedClipIds(actual), [
      '4',
      '8',
      '12',
      '130',
      '10001',
      '10250',
    ])
    assert.equal(boundParameters.length, 1)
    assert.deepEqual(boundParameters[0], ['lions', DRAWING_DOCUMENT_VERSION])
    assert.ok((boundParameters[0]?.length ?? 0) <= D1_MAX_BOUND_PARAMETERS)
  })
})
