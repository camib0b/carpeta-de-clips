import { getCatalogDatabase } from '@/lib/d1'
import {
  DRAWING_DOCUMENT_VERSION,
  WHOLE_CLIP_PLAY_ORD,
  emptyDrawingDocument,
  parseDrawingDocument,
  parsePlayId,
  type DrawingDocument,
} from '@/lib/clip-drawing-document'

/**
 * D1 access for telestration. UI code must call the drawings API, not this module.
 *
 * Drawings are public for now: anyone who can view a team library can read and
 * edit them. Libraries are not access-controlled, so a clip that belongs to a
 * library is viewable. `clips.visibility` only gates the media file, not the library.
 *
 * There is no account session yet. `resolveAuthor` returns null, and null means
 * the anonymous public drawing (`owner_id` NULL).
 *
 * When login exists, change this file only:
 * 1. `resolveAuthor` reads the session and returns that account id.
 * 2. `getDrawings` keeps the owner filter and also returns drawings shared with
 *    that account. Put the owner's row first.
 * 3. `saveDrawing` writes `owner_id` from the session and rejects a caller who
 *    does not own the row.
 */

export class DrawingPlayNotFoundError extends Error {
  constructor() {
    super('Play is not in a viewable team library')
    this.name = 'DrawingPlayNotFoundError'
  }
}

export class DrawingStoreUnavailableError extends Error {
  constructor() {
    super('clip_drawings is not available. Apply migration 0008_clip_drawings.sql.')
    this.name = 'DrawingStoreUnavailableError'
  }
}

export class DrawingVersionConflictError extends Error {
  constructor() {
    super('Stored drawing version cannot be rewritten by this client')
    this.name = 'DrawingVersionConflictError'
  }
}

export interface ClipDrawing {
  id: string
  playId: string
  ownerId: string | null
  strokes: DrawingDocument
  editable: boolean
  createdAt: string
  updatedAt: string
}

type DrawingRow = {
  id: string
  play_id: string
  owner_id: string | null
  strokes_json: string
  created_at: string
  updated_at: string
}

/**
 * Account id of the caller, or null when nobody is logged in.
 * Always null until a session exists.
 */
export async function resolveAuthor(_request: Request): Promise<string | null> {
  return null
}

/**
 * Drawings on this play that `viewer` may see.
 * Null viewer: the anonymous public row only.
 * An account id: that owner's rows. Shared rows are not selected yet.
 */
/**
 * Play ords on this clip that have a non-empty drawing for `viewer`.
 * Does not return stroke payloads.
 */
export async function listPlayOrdsWithDrawings(
  clipId: string,
  viewer: string | null,
): Promise<number[]> {
  const parsedClipId = parseClipId(clipId)
  if (!parsedClipId) {
    throw new DrawingPlayNotFoundError()
  }

  const database = await getCatalogDatabase()
  await assertViewableClip(database, parsedClipId)

  const playIdPrefix = `clip:${parsedClipId}:play:`

  try {
    const statement =
      viewer == null
        ? database
            .prepare(
              `SELECT play_id
               FROM clip_drawings
               WHERE play_id LIKE ? || '%'
                 AND owner_id IS NULL
                 AND json_extract(strokes_json, '$.version') = ?
                 AND json_array_length(json_extract(strokes_json, '$.strokes')) > 0`,
            )
            .bind(playIdPrefix, DRAWING_DOCUMENT_VERSION)
        : database
            .prepare(
              `SELECT play_id
               FROM clip_drawings
               WHERE play_id LIKE ? || '%'
                 AND owner_id = ?
                 AND json_extract(strokes_json, '$.version') = ?
                 AND json_array_length(json_extract(strokes_json, '$.strokes')) > 0`,
            )
            .bind(playIdPrefix, viewer, DRAWING_DOCUMENT_VERSION)

    const result = await statement.all<{ play_id: string }>()
    const playOrds: number[] = []
    for (const row of result.results ?? []) {
      const parsed = parsePlayId(row.play_id)
      if (parsed && parsed.clipId === parsedClipId) {
        playOrds.push(parsed.playOrd)
      }
    }
    playOrds.sort((left, right) => left - right)
    return playOrds
  } catch (error) {
    rethrowDrawingStoreError(error)
  }
}

function parseClipId(raw: string): string | null {
  if (!/^[1-9]\d*$/.test(raw)) return null
  return raw
}

export async function getDrawings(
  playId: string,
  viewer: string | null,
): Promise<ClipDrawing[]> {
  const database = await getCatalogDatabase()
  await assertViewablePlay(database, playId)

  try {
    const statement =
      viewer == null
        ? database
            .prepare(
              `SELECT id, play_id, owner_id, strokes_json, created_at, updated_at
               FROM clip_drawings
               WHERE play_id = ? AND owner_id IS NULL`,
            )
            .bind(playId)
        : database
            .prepare(
              `SELECT id, play_id, owner_id, strokes_json, created_at, updated_at
               FROM clip_drawings
               WHERE play_id = ? AND owner_id = ?
               ORDER BY updated_at DESC`,
            )
            .bind(playId, viewer)

    const result = await statement.all<DrawingRow>()
    return (result.results ?? []).map(rowToDrawing)
  } catch (error) {
    rethrowDrawingStoreError(error)
  }
}

/**
 * Create or replace the author's drawing for this play.
 * `strokes` is the versioned document (`{ version, strokes }`), not a bare list.
 * An empty stroke list deletes that author's row. Returns null when deleted.
 * `author` null reads and writes the anonymous public row.
 */
export async function saveDrawing(
  playId: string,
  strokes: DrawingDocument,
  author: string | null,
): Promise<ClipDrawing | null> {
  const document = parseDrawingDocument(strokes)
  if (!document) {
    throw new DrawingVersionConflictError()
  }

  const database = await getCatalogDatabase()
  await assertViewablePlay(database, playId)

  try {
    const existing = await findAuthorDrawing(database, playId, author)
    if (existing && !storedDocumentIsCurrentVersion(existing.strokes_json)) {
      throw new DrawingVersionConflictError()
    }

    if (document.strokes.length === 0) {
      await deleteAuthorDrawing(database, playId, author)
      return null
    }

    const now = new Date().toISOString()
    const strokesJson = JSON.stringify(document)

    if (existing) {
      await database
        .prepare(
          `UPDATE clip_drawings
           SET strokes_json = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(strokesJson, now, existing.id)
        .run()

      return rowToDrawing({
        ...existing,
        strokes_json: strokesJson,
        updated_at: now,
      })
    }

    const id = crypto.randomUUID()
    try {
      await database
        .prepare(
          `INSERT INTO clip_drawings (
             id, play_id, owner_id, strokes_json, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(id, playId, author, strokesJson, now, now)
        .run()
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        rethrowDrawingStoreError(error)
      }
      const raced = await findAuthorDrawing(database, playId, author)
      if (!raced) throw error
      if (!storedDocumentIsCurrentVersion(raced.strokes_json)) {
        throw new DrawingVersionConflictError()
      }
      await database
        .prepare(
          `UPDATE clip_drawings
           SET strokes_json = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(strokesJson, now, raced.id)
        .run()
      return rowToDrawing({
        ...raced,
        strokes_json: strokesJson,
        updated_at: now,
      })
    }

    return {
      id,
      playId,
      ownerId: author,
      strokes: document,
      editable: true,
      createdAt: now,
      updatedAt: now,
    }
  } catch (error) {
    if (
      error instanceof DrawingVersionConflictError ||
      error instanceof DrawingPlayNotFoundError ||
      error instanceof DrawingStoreUnavailableError
    ) {
      throw error
    }
    rethrowDrawingStoreError(error)
  }
}

async function assertViewableClip(database: D1Database, clipId: string): Promise<number> {
  const clip = await database
    .prepare(
      `SELECT clips.id AS clip_id
       FROM clips
       INNER JOIN matches ON matches.id = clips.match_id
       INNER JOIN libraries ON libraries.id = matches.library_id
       WHERE clips.id = ?
       LIMIT 1`,
    )
    .bind(Number(clipId))
    .first<{ clip_id: number }>()

  if (!clip) {
    throw new DrawingPlayNotFoundError()
  }

  return clip.clip_id
}

async function assertViewablePlay(database: D1Database, playId: string): Promise<void> {
  const parsed = parsePlayId(playId)
  if (!parsed) {
    throw new DrawingPlayNotFoundError()
  }

  const clipId = await assertViewableClip(database, parsed.clipId)

  let playOrds: number[] = []
  try {
    const result = await database
      .prepare(
        `SELECT ord
         FROM clip_instances
         WHERE clip_id = ?`,
      )
      .bind(clipId)
      .all<{ ord: number }>()
    playOrds = (result.results ?? []).map((row) => row.ord)
  } catch (error) {
    console.error(
      'clip_instances lookup failed while checking a drawing play; treating the clip as one play',
      error,
    )
    if (parsed.playOrd !== WHOLE_CLIP_PLAY_ORD) {
      throw new DrawingPlayNotFoundError()
    }
    return
  }

  if (playOrds.length === 0) {
    if (parsed.playOrd !== WHOLE_CLIP_PLAY_ORD) {
      throw new DrawingPlayNotFoundError()
    }
    return
  }

  if (!playOrds.includes(parsed.playOrd)) {
    throw new DrawingPlayNotFoundError()
  }
}

async function findAuthorDrawing(
  database: D1Database,
  playId: string,
  author: string | null,
): Promise<DrawingRow | null> {
  const statement =
    author == null
      ? database
          .prepare(
            `SELECT id, play_id, owner_id, strokes_json, created_at, updated_at
             FROM clip_drawings
             WHERE play_id = ? AND owner_id IS NULL
             LIMIT 1`,
          )
          .bind(playId)
      : database
          .prepare(
            `SELECT id, play_id, owner_id, strokes_json, created_at, updated_at
             FROM clip_drawings
             WHERE play_id = ? AND owner_id = ?
             LIMIT 1`,
          )
          .bind(playId, author)

  return (await statement.first<DrawingRow>()) ?? null
}

async function deleteAuthorDrawing(
  database: D1Database,
  playId: string,
  author: string | null,
): Promise<void> {
  if (author == null) {
    await database
      .prepare(
        `DELETE FROM clip_drawings
         WHERE play_id = ? AND owner_id IS NULL`,
      )
      .bind(playId)
      .run()
    return
  }

  await database
    .prepare(
      `DELETE FROM clip_drawings
       WHERE play_id = ? AND owner_id = ?`,
    )
    .bind(playId, author)
    .run()
}

function storedDocumentIsCurrentVersion(strokesJson: string): boolean {
  try {
    const parsed = JSON.parse(strokesJson) as { version?: unknown }
    return parsed.version === DRAWING_DOCUMENT_VERSION
  } catch {
    return false
  }
}

function rowToDrawing(row: DrawingRow): ClipDrawing {
  let stored: unknown
  try {
    stored = JSON.parse(row.strokes_json)
  } catch {
    stored = null
  }
  const document = parseDrawingDocument(stored)
  if (!document) {
    return {
      id: row.id,
      playId: row.play_id,
      ownerId: row.owner_id,
      strokes: emptyDrawingDocument(),
      editable: false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  return {
    id: row.id,
    playId: row.play_id,
    ownerId: row.owner_id,
    strokes: document,
    editable: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return ''
  const cause = error.cause instanceof Error ? error.cause.message : ''
  return `${error.message} ${cause}`
}

function isMissingDrawingsTable(error: unknown): boolean {
  return /no such table:\s*clip_drawings/i.test(errorText(error))
}

function isUniqueConstraintError(error: unknown): boolean {
  return /UNIQUE constraint failed/i.test(errorText(error))
}

function rethrowDrawingStoreError(error: unknown): never {
  if (isMissingDrawingsTable(error)) {
    throw new DrawingStoreUnavailableError()
  }
  throw error
}
