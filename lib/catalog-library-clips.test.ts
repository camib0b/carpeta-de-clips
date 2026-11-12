import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

import { loadTeamLibraryClipsFromDatabase } from './catalog'

type QueryKind = 'team' | 'clips' | 'instances' | 'drawings' | 'other'

/** D1 rejects a statement with more bound parameters than this. */
const D1_MAX_BOUND_PARAMETERS = 100
/** Stay under the D1 cap. A library-scoped play query binds one parameter. */
const SAFE_BOUND_PARAMETER_LIMIT = 90

type PreparedQuery = {
  kind: QueryKind
  sql: string
  parameterCount: number
}

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
): { database: D1Database; overlaps: Set<string>; queries: PreparedQuery[] } {
  const inFlight = new Set<QueryKind>()
  const overlaps = new Set<string>()
  const queries: PreparedQuery[] = []

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

  function assertBoundParameterCount(parameterCount: number): void {
    if (parameterCount > D1_MAX_BOUND_PARAMETERS) {
      throw new Error(
        `D1 bound parameter limit exceeded: ${parameterCount}`,
      )
    }
  }

  const catalog = {
    prepare(sql: string) {
      const statement = database.prepare(sql)
      const kind = queryKind(sql)
      return {
        bind(...parameters: unknown[]) {
          queries.push({ kind, sql, parameterCount: parameters.length })
          return {
            async all() {
              assertBoundParameterCount(parameters.length)
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
              assertBoundParameterCount(parameters.length)
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

  return { database: catalog as unknown as D1Database, overlaps, queries }
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

test('a missing drawing table does not drop plays', async () => {
  const sqlite = createSqliteCatalog()
  seedLibrary(sqlite)

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

test('a play query failure rejects instead of hiding every jugada', async () => {
  const sqlite = createSqliteCatalog()
  seedLibrary(sqlite)
  const { database } = asCatalogDatabase(sqlite, new Set(['instances']))

  await assert.rejects(
    () => loadTeamLibraryClipsFromDatabase(database, 'old-boys'),
    /forced instances failure/,
  )
})

function seedLibraryWithClipIds(database: DatabaseSync, clipCount: number): void {
  database
    .prepare(`INSERT INTO libraries (id, name, sort_order) VALUES ('many', 'Many', 1)`)
    .run()
  database
    .prepare(
      `INSERT INTO matches (
         id, played_on, home_team, away_team, home_goals, away_goals,
         library_id, rival_label
       ) VALUES ('match-many', '2026-05-01', 'Many', 'Rival', 1, 0, 'many', 'Rival')`,
    )
    .run()
  const insertClip = database.prepare(
    `INSERT INTO clips (id, youtube_id, match_id, title, game_concept, uploaded_at, visibility)
     VALUES (?, ?, 'match-many', ?, 'Salidas', ?, 'public')`,
  )
  const insertInstance = database.prepare(
    `INSERT INTO clip_instances (clip_id, ord, offset_s, duration_s, quarter, score_label, xml_instance_id)
     VALUES (?, ?, ?, 6, '1T', '0-0', ?)`,
  )
  for (let clipId = 1; clipId <= clipCount; clipId += 1) {
    const uploadedAt = new Date(Date.UTC(2026, 0, 1) + clipId * 1000).toISOString()
    insertClip.run(clipId, `yt-${clipId}`, `Clip ${clipId}`, uploadedAt)
    insertInstance.run(clipId, 1, clipId * 10, clipId)
    if (clipId === 1) {
      insertInstance.run(clipId, 2, 99, clipId)
    }
  }
}

test('a library with more than 100 clip ids still returns every play', async () => {
  const clipCount = 101
  const sqlite = createSqliteCatalog()
  seedLibraryWithClipIds(sqlite, clipCount)
  const { database, queries } = asCatalogDatabase(sqlite)

  const clips = await loadTeamLibraryClipsFromDatabase(database, 'many')

  assert.equal(clips.length, clipCount)
  assert.equal(clips[0]?.id, String(clipCount))
  for (const clip of clips) {
    const clipId = Number(clip.id)
    assert.equal(clip.instances?.[0]?.ord, 1)
    assert.equal(clip.instances?.[0]?.offsetS, clipId * 10)
    if (clipId === 1) {
      assert.deepEqual(
        clip.instances?.map((instance) => instance.ord),
        [1, 2],
      )
      assert.equal(clip.instances?.[1]?.offsetS, 99)
    } else {
      assert.equal(clip.instances?.length, 1)
    }
  }

  const instanceQueries = queries.filter((query) => query.kind === 'instances')
  assert.ok(instanceQueries.length >= 1)
  for (const query of instanceQueries) {
    assert.ok(query.parameterCount <= SAFE_BOUND_PARAMETER_LIMIT)
    assert.equal((query.sql.match(/\?/g) ?? []).length, query.parameterCount)
    assert.match(query.sql, /matches\.library_id = \?/)
  }
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
