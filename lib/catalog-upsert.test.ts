import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  INSERT_CLIP_SQL,
  bindInsertClip,
  renderClipUpsertSql,
  type CatalogClipInsert,
} from './catalog-upsert'

const MIGRATION_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../migrations/0005_clip_self_hosted_media.sql',
)

type ClipRow = {
  title: string
  r2_key: string | null
  r2_key_low: string | null
  fps: number | null
  duration_s: number | null
  visibility: string
}

function createCatalogDatabase(): DatabaseSync {
  const database = new DatabaseSync(':memory:')
  database.exec(`
    CREATE TABLE clips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      youtube_id TEXT NOT NULL UNIQUE,
      match_id TEXT NOT NULL,
      title TEXT NOT NULL,
      game_concept TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    );
  `)
  return database
}

function applySelfHostedMediaMigration(database: DatabaseSync) {
  database.exec(fs.readFileSync(MIGRATION_PATH, 'utf8'))
}

function readClip(database: DatabaseSync, youtubeId: string): ClipRow {
  const row = database
    .prepare(
      `SELECT title, r2_key, r2_key_low, fps, duration_s, visibility
       FROM clips WHERE youtube_id = ?`,
    )
    .get(youtubeId) as ClipRow | undefined
  assert.ok(row)
  return row
}

function insertLegacyClip(database: DatabaseSync, youtubeId: string, title: string) {
  database
    .prepare(
      `INSERT INTO clips (youtube_id, match_id, title, game_concept, uploaded_at)
       VALUES (?, 'match-1', ?, 'Goles', '2024-01-01T00:00:00Z')`,
    )
    .run(youtubeId, title)
}

const baseClip = {
  youtubeId: 'abc',
  matchId: 'match-1',
  title: 'Imported title',
  gameConcept: 'Salidas',
  uploadedAt: '2026-01-01T00:00:00Z',
} satisfies Omit<CatalogClipInsert, 'r2Key' | 'visibility'>

describe('clips self-hosted media migration', () => {
  it('keeps existing rows null for media fields and public for visibility', () => {
    const database = createCatalogDatabase()
    insertLegacyClip(database, 'legacy', 'Existing clip')
    applySelfHostedMediaMigration(database)

    const row = readClip(database, 'legacy')
    assert.equal(row.title, 'Existing clip')
    assert.equal(row.r2_key, null)
    assert.equal(row.r2_key_low, null)
    assert.equal(row.fps, null)
    assert.equal(row.duration_s, null)
    assert.equal(row.visibility, 'public')
  })

  it('rejects a visibility outside public and restricted', () => {
    const database = createCatalogDatabase()
    insertLegacyClip(database, 'legacy', 'Existing clip')
    applySelfHostedMediaMigration(database)

    assert.throws(
      () => {
        database.prepare(`UPDATE clips SET visibility = 'private'`).run()
      },
      /CHECK constraint failed/,
    )
  })

  it('still accepts an insert that only sets the original clip columns', () => {
    const database = createCatalogDatabase()
    applySelfHostedMediaMigration(database)
    insertLegacyClip(database, 'seeded', 'Seed style')

    const row = readClip(database, 'seeded')
    assert.equal(row.visibility, 'public')
    assert.equal(row.r2_key, null)
  })
})

describe('clip upsert media fields', () => {
  it('binds one parameter per placeholder', () => {
    const placeholders = INSERT_CLIP_SQL.match(/\?/g) ?? []
    assert.equal(placeholders.length, bindInsertClip(baseClip).length)
    assert.equal(INSERT_CLIP_SQL.includes('__RAW_VISIBILITY__'), false)
    assert.match(INSERT_CLIP_SQL, /COALESCE\(excluded\.r2_key, clips\.r2_key\)/)
  })

  it('does not clear an existing key or restricted visibility when media fields are omitted', () => {
    const database = createCatalogDatabase()
    insertLegacyClip(database, 'abc', 'Original title')
    applySelfHostedMediaMigration(database)
    database
      .prepare(
        `UPDATE clips
         SET r2_key = 'keep.mp4', r2_key_low = 'keep-720.mp4', fps = 25,
             duration_s = 40, visibility = 'restricted'`,
      )
      .run()

    const changes = database
      .prepare(INSERT_CLIP_SQL)
      .run(...bindInsertClip(baseClip))
    assert.equal(Number(changes.changes), 0)

    const row = readClip(database, 'abc')
    assert.equal(row.title, 'Original title')
    assert.equal(row.r2_key, 'keep.mp4')
    assert.equal(row.r2_key_low, 'keep-720.mp4')
    assert.equal(row.fps, 25)
    assert.equal(row.duration_s, 40)
    assert.equal(row.visibility, 'restricted')
  })

  it('sets media fields on conflict without rewriting the title', () => {
    const database = createCatalogDatabase()
    insertLegacyClip(database, 'abc', "O'Higgins gol")
    applySelfHostedMediaMigration(database)

    database.prepare(INSERT_CLIP_SQL).run(
      ...bindInsertClip({
        ...baseClip,
        title: 'Should not replace',
        r2Key: 'matches/goal.mp4',
        r2KeyLow: ' ',
        fps: 30,
        durationS: 12.5,
        visibility: 'public',
      }),
    )

    const row = readClip(database, 'abc')
    assert.equal(row.title, "O'Higgins gol")
    assert.equal(row.r2_key, 'matches/goal.mp4')
    assert.equal(row.r2_key_low, null)
    assert.equal(row.fps, 30)
    assert.equal(row.duration_s, 12.5)
    assert.equal(row.visibility, 'public')
  })

  it('renders SQL that preserves stored media when the payload omits it', () => {
    const database = createCatalogDatabase()
    insertLegacyClip(database, 'abc', 'Original title')
    applySelfHostedMediaMigration(database)
    database
      .prepare(`UPDATE clips SET r2_key = 'keep.mp4', visibility = 'restricted'`)
      .run()

    database.exec(
      renderClipUpsertSql('match-1', {
        ...baseClip,
        title: "Should stay O'Higgins",
      }),
    )
    const kept = readClip(database, 'abc')
    assert.equal(kept.title, 'Original title')
    assert.equal(kept.r2_key, 'keep.mp4')
    assert.equal(kept.visibility, 'restricted')

    database.exec(
      renderClipUpsertSql('match-1', {
        ...baseClip,
        youtubeId: 'new-clip',
        title: "O'Higgins salida",
        r2Key: 'folder/new clip.mp4',
        visibility: 'restricted',
      }),
    )
    const created = readClip(database, 'new-clip')
    assert.equal(created.title, "O'Higgins salida")
    assert.equal(created.r2_key, 'folder/new clip.mp4')
    assert.equal(created.visibility, 'restricted')
  })
})
