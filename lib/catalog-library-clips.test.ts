import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

import { loadTeamLibraryClipsFromDatabase } from './catalog'

type QueryKind = 'team' | 'clips' | 'instances' | 'drawings' | 'other'

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function queryKind(sql: string): QueryKind {
  if (sql.includes('FROM clip_instances')) return 'instances'
  if (sql.includes('clip_drawings')) return 'drawings'
  if (sql.includes('FROM clips')) return 'clips'
  if (sql.includes('FROM libraries')) return 'team'
  return 'other'
}

function createSqliteCatalog(): DatabaseSync {
  const database = new DatabaseSync(':memory:')
  database.exec(`
    CREATE TABLE libraries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE matches (
      id TEXT PRIMARY KEY,
      played_on TEXT NOT NULL,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_goals INTEGER,
      away_goals INTEGER,
      shootout_winner TEXT,
      place TEXT,
      division TEXT,
      library_id TEXT NOT NULL,
      rival_label TEXT NOT NULL,
      youtube_playlist_id TEXT,
      r2_xml_object_key TEXT
    );
    CREATE TABLE clips (
      id INTEGER PRIMARY KEY,
      youtube_id TEXT NOT NULL UNIQUE,
      match_id TEXT NOT NULL,
      title TEXT NOT NULL,
      game_concept TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      r2_key TEXT,
      r2_key_low TEXT,
      thumb_key TEXT,
      fps REAL,
      duration_s REAL,
      visibility TEXT NOT NULL DEFAULT 'public'
    );
    CREATE TABLE clip_instances (
      clip_id INTEGER NOT NULL,
      ord INTEGER NOT NULL,
      offset_s REAL NOT NULL,
      duration_s REAL NOT NULL,
      quarter TEXT,
      score_label TEXT,
      xml_instance_id INTEGER,
      PRIMARY KEY (clip_id, ord)
    );
    CREATE TABLE clip_drawings (
      id TEXT PRIMARY KEY,
      play_id TEXT NOT NULL,
      owner_id TEXT,
      strokes_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
  return database
}

function seedLibrary(database: DatabaseSync): void {
  database
    .prepare(`INSERT INTO libraries (id, name, sort_order) VALUES ('old-boys', 'Old Boys', 1)`)
    .run()
  database
    .prepare(
      `INSERT INTO matches (
         id, played_on, home_team, away_team, home_goals, away_goals,
         library_id, rival_label
       ) VALUES ('match-1', '2026-05-01', 'Old Boys', 'Universidad Católica', 2, 1, 'old-boys', 'Universidad Católica')`,
    )
    .run()
  database
    .prepare(
      `INSERT INTO clips (id, youtube_id, match_id, title, game_concept, uploaded_at, visibility)
       VALUES (1, 'clip-older', 'match-1', 'Salida corta', 'Salidas', '2026-05-02T00:00:00Z', 'public')`,
    )
    .run()
  database
    .prepare(
      `INSERT INTO clips (id, youtube_id, match_id, title, game_concept, uploaded_at, visibility)
       VALUES (2, 'clip-newer', 'match-1', 'Gol de visita', 'Goles', '2026-05-03T00:00:00Z', 'public')`,
    )
    .run()
  database
    .prepare(
      `INSERT INTO clip_instances (clip_id, ord, offset_s, duration_s, quarter, score_label, xml_instance_id)
       VALUES (2, 2, 40, 8, '2T', '1-1', 20), (2, 1, 12, 6, '1T', '0-1', 10)`,
    )
    .run()
  database
    .prepare(
      `INSERT INTO clip_drawings (id, play_id, owner_id, strokes_json, created_at, updated_at)
       VALUES
         ('empty-public', 'clip:1:play:1', NULL, '{"version":1,"strokes":[]}', '2026-05-02T00:00:00Z', '2026-05-02T00:00:00Z'),
         ('owned', 'clip:1:play:1', 'coach-1', '{"version":1,"strokes":[{"points":[{"x":0.2,"y":0.3}]}]}', '2026-05-02T00:00:00Z', '2026-05-02T00:00:00Z'),
         ('public-mark', 'clip:2:play:1', NULL, '{"version":1,"strokes":[{"points":[{"x":0.1,"y":0.2}]}]}', '2026-05-03T00:00:00Z', '2026-05-03T00:00:00Z')`,
    )
    .run()
}

function asCatalogDatabase(
  database: DatabaseSync,
  failingKinds: ReadonlySet<QueryKind> = new Set(),
): { database: D1Database; overlaps: Set<string> } {
  const inFlight = new Set<QueryKind>()
  const overlaps = new Set<string>()

  function enter(kind: QueryKind): void {
    inFlight.add(kind)
    if (inFlight.has('team') && inFlight.has('clips')) overlaps.add('team+clips')
    if (inFlight.has('instances') && inFlight.has('drawings')) {
      overlaps.add('instances+drawings')
    }
  }

  function leave(kind: QueryKind): void {
    inFlight.delete(kind)
  }

  const catalog = {
    prepare(sql: string) {
      const statement = database.prepare(sql)
      const kind = queryKind(sql)
      return {
        bind(...parameters: unknown[]) {
          return {
            async all() {
              enter(kind)
              try {
                await delay(25)
                if (failingKinds.has(kind)) {
                  throw new Error(`forced ${kind} failure`)
                }
                const rows = statement.all(...(parameters as never[]))
                return { results: rows }
              } finally {
                leave(kind)
              }
            },
            async first() {
              enter(kind)
              try {
                await delay(25)
                if (failingKinds.has(kind)) {
                  throw new Error(`forced ${kind} failure`)
                }
                return statement.get(...(parameters as never[])) ?? null
              } finally {
                leave(kind)
              }
            },
          }
        },
      }
    },
  }

  return { database: catalog as unknown as D1Database, overlaps }
}

test('library clips load the team row with the clip rows, then plays with drawings', async () => {
  const sqlite = createSqliteCatalog()
  seedLibrary(sqlite)
  const { database, overlaps } = asCatalogDatabase(sqlite)

  const clips = await loadTeamLibraryClipsFromDatabase(database, 'old-boys')

  assert.deepEqual(
    clips.map((clip) => clip.id),
    ['2', '1'],
  )
  assert.equal(clips[0]?.title, 'Gol de visita')
  assert.equal(clips[0]?.gameConcept, 'Goles')
  assert.equal(clips[0]?.hasDrawings, true)
  assert.deepEqual(
    clips[0]?.instances?.map((instance) => instance.ord),
    [1, 2],
  )
  assert.equal(clips[0]?.instances?.[0]?.offsetS, 12)
  assert.equal(clips[0]?.instances?.[1]?.scoreLabel, '1-1')
  assert.equal(clips[1]?.hasDrawings, undefined)
  assert.equal(clips[1]?.instances, undefined)
  assert.equal(overlaps.has('team+clips'), true)
  assert.equal(overlaps.has('instances+drawings'), true)
})

test('a missing play or drawing table does not drop the other read', async () => {
  const sqlite = createSqliteCatalog()
  seedLibrary(sqlite)

  const withoutInstances = asCatalogDatabase(sqlite, new Set(['instances']))
  const clipsWithoutInstances = await loadTeamLibraryClipsFromDatabase(
    withoutInstances.database,
    'old-boys',
  )
  assert.equal(clipsWithoutInstances[0]?.instances, undefined)
  assert.equal(clipsWithoutInstances[0]?.hasDrawings, true)

  const withoutDrawings = asCatalogDatabase(sqlite, new Set(['drawings']))
  const clipsWithoutDrawings = await loadTeamLibraryClipsFromDatabase(
    withoutDrawings.database,
    'old-boys',
  )
  assert.deepEqual(
    clipsWithoutDrawings[0]?.instances?.map((instance) => instance.ord),
    [1, 2],
  )
  assert.equal(clipsWithoutDrawings[0]?.hasDrawings, undefined)
})

test('an unknown library returns no clips even when the clip query fails', async () => {
  const sqlite = createSqliteCatalog()
  const { database, overlaps } = asCatalogDatabase(sqlite, new Set(['clips']))

  const clips = await loadTeamLibraryClipsFromDatabase(database, 'missing-team')

  assert.deepEqual(clips, [])
  assert.equal(overlaps.has('team+clips'), true)
})

test('a clip query failure for a real library still rejects', async () => {
  const sqlite = createSqliteCatalog()
  seedLibrary(sqlite)
  const { database } = asCatalogDatabase(sqlite, new Set(['clips']))

  await assert.rejects(
    () => loadTeamLibraryClipsFromDatabase(database, 'old-boys'),
    /forced clips failure/,
  )
})
