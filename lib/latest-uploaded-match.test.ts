import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

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
      thumb_key TEXT,
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
    .run(
      'played-later-clip',
      'played-later',
      'Goles',
      'Goles',
      '2026-09-01T12:00:00Z',
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

test('poster query lists clips for the match by newest upload', () => {
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
       youtube_id, match_id, title, game_concept, uploaded_at, thumb_key, visibility
     ) VALUES (?, 'match', ?, 'Salidas', ?, ?, ?)`,
  )
  insertClip.run('pending-01', 'Sin poster', '2026-09-03T00:00:00Z', null, 'public')
  insertClip.run(
    'restricted01',
    'Restringido',
    '2026-09-03T02:00:00Z',
    'restricted.thumb.jpg',
    'restricted',
  )
  insertClip.run('J9UmilJC89Q', 'Anterior', '2026-09-01T00:00:00Z', null, 'public')
  insertClip.run(
    '4Xndr1EF0fk',
    'Reciente',
    '2026-09-02T00:00:00Z',
    'newer.thumb.abc.480.webp',
    'public',
  )

  const rows = database
    .prepare(LATEST_UPLOADED_MATCH_PREVIEW_SQL)
    .all('match') as LatestUploadedMatchPreviewRow[]

  assert.deepEqual(
    rows.map((row) => row.title),
    ['Restringido', 'Sin poster', 'Reciente', 'Anterior'],
  )
  assert.equal(rows[2]?.thumb_key, 'newer.thumb.abc.480.webp')
})

test('poster selection stops at four and skips posters that cannot be shown', () => {
  const previousMediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL = 'https://media.carpeta.cl'

  const rows: LatestUploadedMatchPreviewRow[] = [
    {
      clip_id: 1,
      title: 'Uno',
      youtube_id: 'J9UmilJC89Q',
      thumb_key: null,
      visibility: 'public',
    },
    {
      clip_id: 2,
      title: 'Dos',
      youtube_id: '4Xndr1EF0fk',
      thumb_key: 'two.thumb.jpg',
      visibility: 'restricted',
    },
    {
      clip_id: 3,
      title: 'Tres',
      youtube_id: 'Mu_kV47bhpA',
      thumb_key: 'three.thumb.abc.480.webp',
      visibility: 'public',
    },
    {
      clip_id: 4,
      title: 'Cuatro',
      youtube_id: 'KMw-aUzQO-8',
      thumb_key: null,
      visibility: 'public',
    },
    {
      clip_id: 5,
      title: 'Cinco',
      youtube_id: 'pending-2026-10-25',
      thumb_key: null,
      visibility: 'public',
    },
    {
      clip_id: 6,
      title: 'Seis',
      youtube_id: 'dQw4w9WgXcQ',
      thumb_key: null,
      visibility: 'public',
    },
  ]

  try {
    const previews = selectLatestUploadedMatchPreviews(rows)

    assert.equal(previews.length, LATEST_UPLOADED_MATCH_POSTER_COUNT)
    assert.deepEqual(
      previews.map((preview) => preview.title),
      ['Uno', 'Tres', 'Cuatro', 'Seis'],
    )
    assert.equal(previews[0]?.youtubeId, 'J9UmilJC89Q')
    assert.equal(previews[1]?.thumbKey, 'three.thumb.abc.480.webp')
  } finally {
    if (previousMediaBaseUrl == null) {
      delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_MEDIA_BASE_URL = previousMediaBaseUrl
    }
  }
})
