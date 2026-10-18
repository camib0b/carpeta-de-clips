import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

import { mediaUrl } from './media-url'
import {
  LATEST_UPLOADED_MATCH_POSTER_COUNT,
  LATEST_UPLOADED_MATCH_PREVIEW_SQL,
  LATEST_UPLOADED_MATCH_SQL,
  selectLatestUploadedMatchPreviews,
  toLatestUploadedMatch,
  type LatestUploadedMatchPreviewRow,
  type LatestUploadedMatchRow,
} from './latest-uploaded-match'

function createCatalogDatabase(): DatabaseSync {
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      youtube_id TEXT NOT NULL UNIQUE,
      match_id TEXT NOT NULL,
      title TEXT NOT NULL,
      game_concept TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      r2_key TEXT,
      r2_key_low TEXT,
      visibility TEXT NOT NULL DEFAULT 'public'
    );
  `)
  return database
}

function insertMatch(
  database: DatabaseSync,
  match: {
    id: string
    playedOn: string
    homeTeam: string
    awayTeam: string
    libraryId: string
    libraryName: string
    rivalLabel: string
  },
): void {
  database
    .prepare(
      `INSERT INTO libraries (id, name, sort_order) VALUES (?, ?, 1)
       ON CONFLICT (id) DO NOTHING`,
    )
    .run(match.libraryId, match.libraryName)
  database
    .prepare(
      `INSERT INTO matches (
         id, played_on, home_team, away_team, library_id, rival_label
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      match.id,
      match.playedOn,
      match.homeTeam,
      match.awayTeam,
      match.libraryId,
      match.rivalLabel,
    )
}

test('latest uploaded match follows clip upload time, not the day it was played', () => {
  const database = createCatalogDatabase()
  insertMatch(database, {
    id: 'played-later',
    playedOn: '2026-08-22',
    homeTeam: 'PWCC',
    awayTeam: 'COGS',
    libraryId: 'others',
    libraryName: 'Otros',
    rivalLabel: 'PWCC vs COGS',
  })
  insertMatch(database, {
    id: 'uploaded-later',
    playedOn: '2026-05-16',
    homeTeam: 'COGS',
    awayTeam: 'UC Primera B',
    libraryId: 'uc-primera-b',
    libraryName: 'UC Primera B',
    rivalLabel: 'COGS',
  })

  database
    .prepare(
      `INSERT INTO clips (youtube_id, match_id, title, game_concept, uploaded_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run('played-later-clip', 'played-later', 'Corto', 'Corner Cortos', '2026-08-22T07:00:00Z')
  database
    .prepare(
      `INSERT INTO clips (youtube_id, match_id, title, game_concept, uploaded_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      'uploaded-later-old',
      'uploaded-later',
      'Salidas',
      'Salidas',
      '2026-05-20T08:00:00Z',
    )
  database
    .prepare(
      `INSERT INTO clips (youtube_id, match_id, title, game_concept, uploaded_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      'uploaded-later-new',
      'uploaded-later',
      'Goles',
      'Goles',
      '2026-09-02T15:00:00Z',
    )

  const row = database.prepare(LATEST_UPLOADED_MATCH_SQL).get() as LatestUploadedMatchRow
  const match = toLatestUploadedMatch(row, row.library_name, [])

  assert.equal(match.matchId, 'uploaded-later')
  assert.equal(match.uploadedAt, '2026-09-02T15:00:00Z')
  assert.equal(match.playedOn, '2026-05-16')
  assert.equal(match.librarySlug, 'uc-primera-b')
  assert.equal(match.rivalLabel, 'COGS')
})

test('poster query keeps public self-hosted clips and prefers the newest upload', () => {
  const database = createCatalogDatabase()
  insertMatch(database, {
    id: 'match',
    playedOn: '2026-05-16',
    homeTeam: 'COGS',
    awayTeam: 'UC Primera B',
    libraryId: 'uc-primera-b',
    libraryName: 'UC Primera B',
    rivalLabel: 'COGS',
  })

  const insertClip = database.prepare(
    `INSERT INTO clips (
       youtube_id, match_id, title, game_concept, uploaded_at, r2_key, r2_key_low, visibility
     ) VALUES (?, 'match', ?, 'Salidas', ?, ?, ?, ?)`,
  )
  insertClip.run('no-media', 'Sin archivo', '2026-09-03T00:00:00Z', null, null, 'public')
  insertClip.run('blank-key', 'Clave vacía', '2026-09-03T01:00:00Z', '   ', null, 'public')
  insertClip.run(
    'restricted',
    'Restringido',
    '2026-09-03T02:00:00Z',
    'restricted.mp4',
    null,
    'restricted',
  )
  insertClip.run('older', 'Anterior', '2026-09-01T00:00:00Z', 'older.mp4', 'older-low.mp4', 'public')
  insertClip.run('newer', 'Reciente', '2026-09-02T00:00:00Z', 'newer.mp4', null, 'public')

  const rows = database
    .prepare(LATEST_UPLOADED_MATCH_PREVIEW_SQL)
    .all('match') as LatestUploadedMatchPreviewRow[]

  assert.deepEqual(
    rows.map((row) => row.title),
    ['Reciente', 'Anterior'],
  )
  assert.equal(rows[0]?.r2_key, 'newer.mp4')
  assert.equal(rows[1]?.r2_key_low, 'older-low.mp4')
})

test('poster selection stops at four and skips urls that cannot be shown', () => {
  const previousMediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL = 'https://media.carpeta.cl'

  const rows: LatestUploadedMatchPreviewRow[] = [
    { clip_id: 1, title: 'Uno', r2_key: 'one.mp4', r2_key_low: 'one-low.mp4', visibility: 'public' },
    { clip_id: 2, title: 'Dos', r2_key: 'two.mp4', r2_key_low: null, visibility: 'restricted' },
    { clip_id: 3, title: 'Tres', r2_key: 'three.mp4', r2_key_low: null, visibility: 'public' },
    { clip_id: 4, title: 'Cuatro', r2_key: 'four.mp4', r2_key_low: null, visibility: 'public' },
    { clip_id: 5, title: 'Cinco', r2_key: 'five.mp4', r2_key_low: null, visibility: 'public' },
    { clip_id: 6, title: 'Seis', r2_key: 'six.mp4', r2_key_low: null, visibility: 'public' },
  ]

  try {
    const previews = selectLatestUploadedMatchPreviews(rows, (clip) =>
      mediaUrl(clip, { preferLow: true }),
    )

    assert.equal(previews.length, LATEST_UPLOADED_MATCH_POSTER_COUNT)
    assert.deepEqual(
      previews.map((preview) => preview.title),
      ['Uno', 'Tres', 'Cuatro', 'Cinco'],
    )
    assert.equal(previews[0]?.mediaUrl, 'https://media.carpeta.cl/one-low.mp4')
    assert.equal(previews[1]?.mediaUrl, 'https://media.carpeta.cl/three.mp4')
  } finally {
    if (previousMediaBaseUrl == null) {
      delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_MEDIA_BASE_URL = previousMediaBaseUrl
    }
  }
})
