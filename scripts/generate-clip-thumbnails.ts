/**
 * Extract a poster frame from each self-hosted clip MP4, upload versioned WebP
 * assets to R2, and emit UPDATE statements for `clips.thumb_key`.
 *
 * Requires `ffmpeg` and `ffprobe` on PATH and Wrangler auth for `--remote`.
 *
 *   pnpm exec tsx scripts/generate-clip-thumbnails.ts --remote --all-missing
 *   pnpm exec tsx scripts/generate-clip-thumbnails.ts --local --match MATCH_ID --execute-sql
 *   pnpm exec tsx scripts/generate-clip-thumbnails.ts --sql-only --match MATCH_ID
 *
 * `--sql-only` prints UPDATE SQL without downloading, encoding, or uploading.
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  thumbKeyForWidth,
  thumbKeyFromR2KeyAndHash,
} from '../lib/clip-thumbnail'

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const R2_BUCKET = 'carpeta-clips'
const FRAME_OFFSET_SECONDS = 1
const THUMB_WIDTH_480 = 480
const THUMB_WIDTH_640 = 640
const WEBP_QUALITY = 70
const R2_CACHE_CONTROL = 'public, max-age=31536000, immutable'

type ClipRow = {
  id: number
  match_id: string
  r2_key: string
  thumb_key: string | null
}

type CliOptions = {
  wranglerTarget: '--local' | '--remote'
  matchId: string | null
  allMissing: boolean
  executeSql: boolean
  sqlOnly: boolean
}

function parseArgs(argv: string[]): CliOptions {
  const wranglerTarget = argv.includes('--remote') ? '--remote' : '--local'
  const matchFlagIndex = argv.indexOf('--match')
  const matchId =
    matchFlagIndex !== -1 && matchFlagIndex < argv.length - 1
      ? argv[matchFlagIndex + 1]
      : null
  const allMissing = argv.includes('--all-missing')
  const executeSql = argv.includes('--execute-sql')
  const sqlOnly = argv.includes('--sql-only')

  if (!allMissing && matchId == null) {
    throw new Error(
      'Pass --all-missing or --match <matches.id> (storage slug).',
    )
  }
  if (allMissing && matchId != null) {
    throw new Error('Use either --all-missing or --match, not both.')
  }

  return {
    wranglerTarget,
    matchId,
    allMissing,
    executeSql,
    sqlOnly,
  }
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function runWranglerD1Json(
  wranglerTarget: '--local' | '--remote',
  sql: string,
): unknown {
  const output = execFileSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'd1',
      'execute',
      'carpeta-de-clips',
      wranglerTarget,
      '--json',
      '--command',
      sql,
    ],
    { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
  )
  return JSON.parse(output)
}

function fetchClipsToProcess(options: CliOptions): ClipRow[] {
  const matchFilter = options.matchId
    ? `AND clips.match_id = ${sqlString(options.matchId)}`
    : ''

  const sql = `SELECT clips.id, clips.match_id, clips.r2_key, clips.thumb_key
FROM clips
WHERE clips.r2_key IS NOT NULL
  AND TRIM(clips.r2_key) != ''
  AND (clips.thumb_key IS NULL OR TRIM(clips.thumb_key) = '')
  ${matchFilter}
ORDER BY clips.match_id ASC, clips.id ASC`

  const parsed = runWranglerD1Json(options.wranglerTarget, sql) as Array<{
    results: ClipRow[]
  }>
  const results = parsed[0]?.results ?? []
  return results
}

function renderUpdateSql(clipId: number, thumbKey: string): string {
  return `UPDATE clips SET thumb_key = ${sqlString(thumbKey)} WHERE id = ${clipId};`
}

function downloadR2Object(
  wranglerTarget: '--local' | '--remote',
  objectKey: string,
  destinationPath: string,
): void {
  execFileSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'r2',
      'object',
      'get',
      `${R2_BUCKET}/${objectKey}`,
      '--file',
      destinationPath,
      wranglerTarget,
    ],
    { cwd: REPOSITORY_ROOT, stdio: 'inherit' },
  )
}

function uploadR2Object(
  wranglerTarget: '--local' | '--remote',
  objectKey: string,
  filePath: string,
  contentType: string,
): void {
  execFileSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'r2',
      'object',
      'put',
      `${R2_BUCKET}/${objectKey}`,
      '--file',
      filePath,
      '--content-type',
      contentType,
      '--cache-control',
      R2_CACHE_CONTROL,
      wranglerTarget,
    ],
    { cwd: REPOSITORY_ROOT, stdio: 'inherit' },
  )
}

function extractWebpThumbnail(
  sourceVideoPath: string,
  outputPath: string,
  widthPx: number,
): void {
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      String(FRAME_OFFSET_SECONDS),
      '-i',
      sourceVideoPath,
      '-frames:v',
      '1',
      '-vf',
      `scale=${widthPx}:-2`,
      '-c:v',
      'libwebp',
      '-quality',
      String(WEBP_QUALITY),
      '-y',
      outputPath,
    ],
    { stdio: 'inherit' },
  )
}

function sha256HexFile(filePath: string): string {
  const bytes = fs.readFileSync(filePath)
  return createHash('sha256').update(bytes).digest('hex')
}

function applySql(
  wranglerTarget: '--local' | '--remote',
  statements: string[],
): void {
  if (statements.length === 0) {
    return
  }
  const tempFile = path.join(
    os.tmpdir(),
    `carpeta-thumb-updates-${Date.now()}.sql`,
  )
  fs.writeFileSync(tempFile, statements.join('\n\n'))
  execFileSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'd1',
      'execute',
      'carpeta-de-clips',
      wranglerTarget,
      '--file',
      tempFile,
    ],
    { cwd: REPOSITORY_ROOT, stdio: 'inherit' },
  )
  fs.unlinkSync(tempFile)
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const clips = fetchClipsToProcess(options)

  if (clips.length === 0) {
    console.error('No clips with r2_key and missing thumb_key matched the filter.')
    return
  }

  const updateStatements: string[] = []

  for (const clip of clips) {
    if (options.sqlOnly) {
      const placeholderKey = thumbKeyFromR2KeyAndHash(
        clip.r2_key,
        '0000000000000000000000000000000000000000000000000000000000000000',
      )
      const updateSql = renderUpdateSql(clip.id, placeholderKey)
      console.log(`-- clip ${clip.id} (${clip.match_id})`)
      console.log(updateSql)
      updateStatements.push(updateSql)
      continue
    }

    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carpeta-thumb-'))
    const videoPath = path.join(workDir, 'source.mp4')
    const thumb480Path = path.join(workDir, 'thumb-480.webp')
    const thumb640Path = path.join(workDir, 'thumb-640.webp')

    try {
      downloadR2Object(options.wranglerTarget, clip.r2_key, videoPath)
      extractWebpThumbnail(videoPath, thumb480Path, THUMB_WIDTH_480)
      extractWebpThumbnail(videoPath, thumb640Path, THUMB_WIDTH_640)

      const contentHash = sha256HexFile(thumb480Path)
      const thumbKey480 = thumbKeyFromR2KeyAndHash(clip.r2_key, contentHash)
      const thumbKey640 = thumbKeyForWidth(thumbKey480, 640)
      const updateSql = renderUpdateSql(clip.id, thumbKey480)
      updateStatements.push(updateSql)

      console.error(
        `Processing clip ${clip.id}: ${clip.r2_key} → ${thumbKey480} (+640)`,
      )
      uploadR2Object(
        options.wranglerTarget,
        thumbKey480,
        thumb480Path,
        'image/webp',
      )
      uploadR2Object(
        options.wranglerTarget,
        thumbKey640,
        thumb640Path,
        'image/webp',
      )
      console.log(updateSql)
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true })
    }
  }

  if (options.executeSql) {
    applySql(options.wranglerTarget, updateStatements)
  } else if (!options.sqlOnly) {
    console.error(
      '\nSQL was printed above. Re-run with --execute-sql to apply, or pipe the output to wrangler d1 execute --file.',
    )
  }
}

main()
