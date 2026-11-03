import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

import {
  LIST_TEAM_LIBRARIES_SQL,
  LIST_TEAM_LIBRARIES_WITH_CLIP_COUNTS_SQL,
  TEAM_BY_SLUG_SQL,
  TEAM_LIBRARY_CLIPS_SQL,
  loadTeamLibraryClipsFromDatabase,
} from './catalog'

function selectList(sql: string): string {
  const fromIndex = sql.indexOf('FROM')
  return sql.slice(0, fromIndex)
}

function createCatalog(): DatabaseSync {
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
  database
    .prepare(`INSERT INTO libraries (id, name, sort_order) VALUES ('zulu', 'Zulu', 2), ('alpha', 'Alpha', 1), ('others', 'Otros', 3)`)
    .run()
  database
    .prepare(
      `INSERT INTO matches (
         id, played_on, home_team, away_team, library_id, rival_label, division, place
       ) VALUES
         ('match-alpha', '2026-05-01', 'Alpha', 'Away', 'alpha', 'Away', 'Primera', 'Santiago'),
         ('match-others', '2026-06-01', 'Home', 'Away', 'others', 'Home vs Away', NULL, NULL)`,
    )
    .run()
  database
    .prepare(
      `INSERT INTO clips (
         id, youtube_id, match_id, title, game_concept, uploaded_at, visibility
       ) VALUES
         (1, 'yt-alpha', 'match-alpha', 'Salida', 'Salidas', '2026-05-02T00:00:00Z', 'public'),
         (2, 'yt-others', 'match-others', 'Terceros', 'Goles', '2026-06-02T00:00:00Z', 'public')`,
    )
    .run()
  return database
}

function asDatabase(database: DatabaseSync): D1Database {
  return {
    prepare(sql: string) {
      const statement = database.prepare(sql)
      return {
        bind(...parameters: unknown[]) {
          return {
            async all() {
              return { results: statement.all(...(parameters as never[])) }
            },
            async first() {
              return statement.get(...(parameters as never[])) ?? null
            },
          }
        },
      }
    },
  } as unknown as D1Database
}

test('library lists order by sort_order without returning that column', () => {
  const database = createCatalog()
  const libraries = database.prepare(LIST_TEAM_LIBRARIES_SQL).all() as Array<Record<string, unknown>>
  assert.deepEqual(
    libraries.map((row) => row.id),
    ['alpha', 'zulu', 'others'],
  )
  assert.deepEqual(Object.keys(libraries[0] ?? {}), ['id', 'name'])

  const withCounts = database
    .prepare(LIST_TEAM_LIBRARIES_WITH_CLIP_COUNTS_SQL)
    .all() as Array<Record<string, unknown>>
  assert.deepEqual(
    withCounts.map((row) => row.id),
    ['alpha', 'zulu', 'others'],
  )
  assert.equal(withCounts[0]?.clip_count, 1)
  assert.equal(withCounts[1]?.clip_count, 0)
  assert.deepEqual(Object.keys(withCounts[0] ?? {}), ['id', 'name', 'clip_count'])

  const team = database.prepare(TEAM_BY_SLUG_SQL).get('alpha') as Record<string, unknown>
  assert.equal(team.id, 'alpha')
  assert.equal(team.name, 'Alpha')
  assert.deepEqual(Object.keys(team), ['id', 'name'])
})

test('team clip rows omit libraries.name and still label the others library', async () => {
  const database = createCatalog()
  const row = database.prepare(`${TEAM_LIBRARY_CLIPS_SQL}`).get('alpha') as Record<string, unknown>
  assert.equal(Object.hasOwn(row, 'library_name'), false)
  assert.equal(row.library_id, 'alpha')
  assert.equal(row.title, 'Salida')
  assert.match(TEAM_LIBRARY_CLIPS_SQL, /INNER JOIN libraries/)
  assert.equal(TEAM_LIBRARY_CLIPS_SQL.includes('libraries.name'), false)
  assert.match(LIST_TEAM_LIBRARIES_SQL, /ORDER BY sort_order ASC, name ASC/)
  assert.equal(selectList(LIST_TEAM_LIBRARIES_SQL).includes('sort_order'), false)
  assert.equal(selectList(TEAM_BY_SLUG_SQL).includes('sort_order'), false)
  assert.match(TEAM_BY_SLUG_SQL, /SELECT id, name/)

  const clips = await loadTeamLibraryClipsFromDatabase(asDatabase(database), 'others')
  assert.equal(clips.length, 1)
  assert.equal(clips[0]?.libraryName, 'Others')
  assert.equal(clips[0]?.rivalTeam, 'Home vs Away')
})
