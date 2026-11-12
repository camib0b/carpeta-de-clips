import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

import { clipsMissingThumbnailSql } from './generate-clip-thumbnails'

function selectList(sql: string): string {
  const fromIndex = sql.indexOf('FROM')
  return sql.slice(0, fromIndex)
}

function createClips(): DatabaseSync {
  const database = new DatabaseSync(':memory:')
  database.exec(`
    CREATE TABLE clips (
      id INTEGER PRIMARY KEY,
      match_id TEXT NOT NULL,
      title TEXT NOT NULL,
      r2_key TEXT,
      thumb_key TEXT
    );
  `)
  const insert = database.prepare(
    `INSERT INTO clips (id, match_id, title, r2_key, thumb_key)
     VALUES (?, ?, ?, ?, ?)`,
  )
  insert.run(1, 'match-a', 'Missing still', 'a.mp4', null)
  insert.run(2, 'match-a', 'Blank still', 'b.mp4', '')
  insert.run(3, 'match-a', 'Whitespace still', 'c.mp4', '   ')
  insert.run(4, 'match-a', 'Has still', 'd.mp4', 'has.webp')
  insert.run(5, 'match-a', 'No video', null, null)
  insert.run(6, 'match-a', 'Blank video', '   ', null)
  insert.run(7, 'match-b', 'Other match', 'e.mp4', null)
  return database
}

test('missing-thumbnail query reads id, match, and video key only', () => {
  const sql = clipsMissingThumbnailSql(null)
  assert.equal(selectList(sql).includes('thumb_key'), false)
  assert.equal(selectList(sql).includes('title'), false)
  assert.match(sql, /thumb_key IS NULL/)

  const rows = createClips().prepare(sql).all() as Array<Record<string, unknown>>
  assert.deepEqual(
    rows.map((row) => row.id),
    [1, 2, 3, 7],
  )
  assert.deepEqual(Object.keys(rows[0] ?? {}), ['id', 'match_id', 'r2_key'])
  assert.equal(rows[0]?.r2_key, 'a.mp4')
  assert.equal(rows[3]?.match_id, 'match-b')
})

test('missing-thumbnail query can limit to one match id', () => {
  const sql = clipsMissingThumbnailSql('match-b')
  const rows = createClips().prepare(sql).all() as Array<{ id: number }>
  assert.deepEqual(
    rows.map((row) => row.id),
    [7],
  )

  const quoted = clipsMissingThumbnailSql("O'Brien")
  assert.match(quoted, /AND clips\.match_id = 'O''Brien'/)
})
