import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

import { LIBRARY_CLIP_INSTANCES_SQL, loadTeamLibraryClipsFromDatabase } from './catalog'

type QueryKind = 'team' | 'clips' | 'instances' | 'drawings' | 'other'

type PreparedQuery = {
  kind: QueryKind
  sql: string
  parameterCount: number
}

/** D1 rejects a query with more bound parameters than this. */
const D1_MAX_BOUND_PARAMETERS = 100

const LIBRARY_OVER_PARAMETER_LIMIT = 101

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
): {
  database: D1Database
  overlaps: Set<string>
  preparedQueries: PreparedQuery[]
  boundParameterCounts: number[]
} {
  const inFlight = new Set<QueryKind>()
  const overlaps = new Set<string>()
  const preparedQueries: PreparedQuery[] = []
  const boundParameterCounts: number[] = []

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
          preparedQueries.push({
            kind,
            sql,
            parameterCount: parameters.length,
          })
          boundParameterCounts.push(parameters.length)
          return {
            async all() {
              enter(kind)
              try {
                await delay(25)
                if (parameters.length > D1_MAX_BOUND_PARAMETERS) {
                  throw new Error(
                    `D1 allows at most ${D1_MAX_BOUND_PARAMETERS} bound parameters per query`,
                  )
                }
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
                if (parameters.length > D1_MAX_BOUND_PARAMETERS) {
                  throw new Error(
                    `D1 allows at most ${D1_MAX_BOUND_PARAMETERS} bound parameters per query`,
                  )
                }
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

  return {
    database: catalog as unknown as D1Database,
    overlaps,
    preparedQueries,
    boundParameterCounts,
  }
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

function seedLibraryPastParameterLimit(database: DatabaseSync, clipCount: number): void {
  database
    .prepare(
      `INSERT INTO libraries (id, name, sort_order) VALUES
         ('big-library', 'Big Library', 1),
         ('other-library', 'Other Library', 2)`,
    )
    .run()
  database
    .prepare(
      `INSERT INTO matches (
         id, played_on, home_team, away_team, home_goals, away_goals,
         library_id, rival_label
       ) VALUES
         ('match-big', '2026-05-01', 'Big Library', 'Rival FC', 1, 0, 'big-library', 'Rival FC'),
         ('match-other', '2026-05-01', 'Other Library', 'Rival FC', 0, 1, 'other-library', 'Rival FC')`,
    )
    .run()

  const insertClip = database.prepare(
    `INSERT INTO clips (id, youtube_id, match_id, title, game_concept, uploaded_at, visibility)
     VALUES (?, ?, ?, ?, 'Goles', ?, 'public')`,
  )
  const insertInstance = database.prepare(
    `INSERT INTO clip_instances (clip_id, ord, offset_s, duration_s, quarter, score_label, xml_instance_id)
     VALUES (?, 1, ?, 6, '1T', '1-0', ?)`,
  )
  for (let clipId = 1; clipId <= clipCount; clipId += 1) {
    const uploadedAt = new Date(Date.UTC(2026, 4, 2, 0, 0, clipId)).toISOString()
    insertClip.run(clipId, `clip-${clipId}`, 'match-big', `Jugada ${clipId}`, uploadedAt)
    insertInstance.run(clipId, clipId, clipId)
  }

  const otherClipId = clipCount + 1
  insertClip.run(
    otherClipId,
    'clip-other',
    'match-other',
    'Jugada ajena',
    '2026-05-04T00:00:00.000Z',
  )
  insertInstance.run(otherClipId, otherClipId, otherClipId)
}

test('a library with more than 100 clips still returns every play', async () => {
  const sqlite = createSqliteCatalog()
  seedLibraryPastParameterLimit(sqlite, LIBRARY_OVER_PARAMETER_LIMIT)
  const { database, preparedQueries } = asCatalogDatabase(sqlite)

  const clips = await loadTeamLibraryClipsFromDatabase(database, 'big-library')

  assert.equal(clips.length, LIBRARY_OVER_PARAMETER_LIMIT)
  for (const clip of clips) {
    assert.equal(clip.instances?.length, 1)
    assert.equal(clip.instances?.[0]?.ord, 1)
    assert.equal(clip.instances?.[0]?.offsetS, Number(clip.id))
    assert.equal(clip.instances?.[0]?.durationS, 6)
  }
  assert.equal(
    clips.some((clip) => clip.id === String(LIBRARY_OVER_PARAMETER_LIMIT + 1)),
    false,
  )

  const instanceQueries = preparedQueries.filter((query) => query.kind === 'instances')
  assert.equal(instanceQueries.length, 1)
  assert.equal(instanceQueries[0]?.parameterCount, 1)
  assert.equal(instanceQueries[0]?.sql, LIBRARY_CLIP_INSTANCES_SQL)
  assert.equal((LIBRARY_CLIP_INSTANCES_SQL.match(/\?/g) ?? []).length, 1)
  assert.match(LIBRARY_CLIP_INSTANCES_SQL, /matches\.library_id = \?/)

  const libraryRows = sqlite
    .prepare(LIBRARY_CLIP_INSTANCES_SQL)
    .all('big-library') as Array<Record<string, unknown>>
  assert.equal(libraryRows.length, LIBRARY_OVER_PARAMETER_LIMIT)
  assert.deepEqual(Object.keys(libraryRows[0] ?? {}).sort(), [
    'clip_id',
    'duration_s',
    'offset_s',
    'ord',
    'quarter',
    'score_label',
    'xml_instance_id',
  ])
  const otherRows = sqlite
    .prepare(LIBRARY_CLIP_INSTANCES_SQL)
    .all('other-library') as Array<{ clip_id: number }>
  assert.deepEqual(
    otherRows.map((row) => row.clip_id),
    [LIBRARY_OVER_PARAMETER_LIMIT + 1],
  )
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

test('play segments load for a library with more than 100 clips', async () => {
  const sqlite = createSqliteCatalog()
  const clipIds = seedLargeLibrary(sqlite)
  const previousPlaceholders = clipIds.map(() => '?').join(', ')
  const previousRows = sqlite
    .prepare(
      `SELECT
         clip_id,
         ord,
         offset_s,
         duration_s,
         quarter,
         score_label,
         xml_instance_id
       FROM clip_instances
       WHERE clip_id IN (${previousPlaceholders})
       ORDER BY clip_id ASC, ord ASC`,
    )
    .all(...clipIds)
  const libraryRows = sqlite.prepare(LIBRARY_CLIP_INSTANCES_SQL).all('bulk')

  assert.equal(clipIds.length, 250)
  assert.deepEqual(libraryRows, previousRows)
  assert.equal(
    libraryRows.some((row) => (row as { clip_id: number }).clip_id === 1000),
    false,
  )

  const { database, boundParameterCounts } = asCatalogDatabase(sqlite)
  const clips = await loadTeamLibraryClipsFromDatabase(database, 'bulk')

  assert.equal(clips.length, 250)
  assert.ok(boundParameterCounts.length > 0)
  assert.ok(
    boundParameterCounts.every((count) => count <= D1_MAX_BOUND_PARAMETERS),
  )

  for (const clip of clips) {
    const clipId = Number(clip.id)
    if (clipId === 7) {
      assert.equal(clip.instances, undefined)
      assert.equal(clip.hasDrawings, undefined)
      continue
    }

    assert.equal(clip.instances?.[0]?.ord, 1)
    assert.equal(clip.instances?.[0]?.offsetS, clipId)
    assert.equal(clip.instances?.[0]?.quarter, '1T')
    if (clipId === 250) {
      assert.deepEqual(
        clip.instances?.map((instance) => instance.ord),
        [1, 2],
      )
      assert.equal(clip.instances?.[1]?.offsetS, 20)
      assert.equal(clip.instances?.[1]?.scoreLabel, '2-2')
    } else {
      assert.equal(clip.instances?.length, 1)
    }
  }

  assert.equal(clips.find((clip) => clip.id === '4')?.hasDrawings, true)
  assert.equal(clips.find((clip) => clip.id === '5')?.hasDrawings, undefined)
  assert.equal(
    clips.some((clip) => clip.id === '1000'),
    false,
  )
})

function seedLargeLibrary(database: DatabaseSync): number[] {
  database
    .prepare(
      `INSERT INTO libraries (id, name, sort_order)
       VALUES ('bulk', 'Bulk', 1), ('other', 'Other', 2)`,
    )
    .run()
  database
    .prepare(
      `INSERT INTO matches (
         id, played_on, home_team, away_team, home_goals, away_goals,
         library_id, rival_label
       ) VALUES
         ('bulk-a', '2026-06-01', 'Bulk', 'Other', 1, 0, 'bulk', 'Other'),
         ('bulk-b', '2026-06-08', 'Other', 'Bulk', 0, 1, 'bulk', 'Other'),
         ('other-match', '2026-06-01', 'Other', 'Bulk', 3, 1, 'other', 'Bulk')`,
    )
    .run()

  const insertClip = database.prepare(
    `INSERT INTO clips (id, youtube_id, match_id, title, game_concept, uploaded_at, visibility)
     VALUES (?, ?, ?, ?, 'Goles', ?, 'public')`,
  )
  const insertInstance = database.prepare(
    `INSERT INTO clip_instances (
       clip_id, ord, offset_s, duration_s, quarter, score_label, xml_instance_id
     ) VALUES (?, ?, ?, 5, ?, ?, ?)`,
  )
  const clipIds: number[] = []
  for (let clipId = 1; clipId <= 250; clipId += 1) {
    clipIds.push(clipId)
    const matchId = clipId <= 200 ? 'bulk-a' : 'bulk-b'
    insertClip.run(
      clipId,
      `bulk-${clipId}`,
      matchId,
      `Play ${clipId}`,
      `2026-06-01T00:00:${String(clipId).padStart(3, '0')}Z`,
    )
    if (clipId === 7) continue
    if (clipId === 250) {
      insertInstance.run(clipId, 2, 20, '2T', '2-2', 2502)
      insertInstance.run(clipId, 1, clipId, '1T', '1-1', 2501)
      continue
    }
    insertInstance.run(clipId, 1, clipId, '1T', '0-0', clipId * 10)
  }

  insertClip.run(1000, 'other-1000', 'other-match', 'Other play', '2026-01-01T00:00:00Z')
  insertInstance.run(1000, 1, 999, '1T', '3-1', 10000)
  database
    .prepare(
      `INSERT INTO clip_drawings (id, play_id, owner_id, strokes_json, created_at, updated_at)
       VALUES
         (
           'bulk-mark',
           'clip:4:play:1',
           NULL,
           '{"version":1,"strokes":[{"points":[{"x":0.1,"y":0.2}]}]}',
           '2026-06-01T00:00:00Z',
           '2026-06-01T00:00:00Z'
         ),
         (
           'other-mark',
           'clip:1000:play:1',
           NULL,
           '{"version":1,"strokes":[{"points":[{"x":0.3,"y":0.4}]}]}',
           '2026-06-01T00:00:00Z',
           '2026-06-01T00:00:00Z'
         )`,
    )
    .run()

  return clipIds
}
