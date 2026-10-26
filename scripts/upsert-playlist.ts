/**
 * Upsert one match and insert clips into D1.
 * Existing clips keep their title, concept, and upload time. Omitted media
 * fields do not clear a stored r2_key or a restricted visibility (COALESCE).
 *
 *   pnpm exec tsx scripts/upsert-playlist.ts --local path/to/payload.json
 *   pnpm exec tsx scripts/upsert-playlist.ts --remote path/to/payload.json
 *   pnpm exec tsx scripts/upsert-playlist.ts --sql-only path/to/payload.json
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ClipInstanceInsert } from '../lib/clip-instances'
import {
  renderClipUpsertSql,
  type CatalogClipInsert,
  type CatalogMatchUpsert,
} from '../lib/catalog-upsert'

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

type UpsertPayload = {
  match: CatalogMatchUpsert
  clips: Omit<CatalogClipInsert, 'matchId'>[]
}

function sqlString(value: string | null | undefined): string {
  if (value == null) {
    return 'NULL'
  }
  return `'${String(value).replaceAll("'", "''")}'`
}

function sqlInteger(value: number | null | undefined): string {
  if (value == null) {
    return 'NULL'
  }
  return String(value)
}

function sqlReal(value: number): string {
  return String(value)
}

function renderClipInstancesSql(
  youtubeId: string,
  instances: ClipInstanceInsert[],
): string {
  const deleteSql = `DELETE FROM clip_instances WHERE clip_id = (SELECT id FROM clips WHERE youtube_id = ${sqlString(youtubeId)});`

  const insertStatements = instances
    .map(
      (instance) =>
        `INSERT INTO clip_instances (clip_id, ord, offset_s, duration_s, quarter, score_label, xml_instance_id)
SELECT clips.id, ${sqlInteger(instance.ord)}, ${sqlReal(instance.offsetS)}, ${sqlReal(instance.durationS)}, ${sqlString(instance.quarter)}, ${sqlString(instance.scoreLabel)}, ${sqlInteger(instance.xmlInstanceId)}
FROM clips
WHERE clips.youtube_id = ${sqlString(youtubeId)};`,
    )
    .join('\n\n')

  const insertSql = insertStatements

  return `${deleteSql}

${insertSql}`
}

function renderSql(payload: UpsertPayload): string {
  const match = payload.match
  const clipInsert =
    payload.clips.length === 0
      ? '-- no clips'
      : payload.clips
          .map((clip) => renderClipUpsertSql(match.id, clip))
          .join('\n\n')

  const instanceBlocks = payload.clips
    .filter((clip) => Array.isArray(clip.instances) && clip.instances.length > 0)
    .map((clip) =>
      renderClipInstancesSql(clip.youtubeId, clip.instances as ClipInstanceInsert[]),
    )
    .join('\n\n')

  const instanceSql =
    instanceBlocks.length === 0 ? '-- no clip instances' : instanceBlocks

  return `-- Upsert match ${match.id}
INSERT INTO matches (
  id, played_on, home_team, away_team, home_goals, away_goals,
  shootout_winner, place, division, library_id, rival_label,
  youtube_playlist_id, r2_xml_object_key
) VALUES (
  ${sqlString(match.id)},
  ${sqlString(match.playedOn)},
  ${sqlString(match.homeTeam)},
  ${sqlString(match.awayTeam)},
  ${sqlInteger(match.homeGoals)},
  ${sqlInteger(match.awayGoals)},
  ${sqlString(match.shootoutWinner)},
  ${sqlString(match.place)},
  ${sqlString(match.division)},
  ${sqlString(match.libraryId)},
  ${sqlString(match.rivalLabel)},
  ${sqlString(match.youtubePlaylistId)},
  ${sqlString(match.r2XmlObjectKey)}
)
ON CONFLICT (id) DO UPDATE SET
  played_on = excluded.played_on,
  home_team = excluded.home_team,
  away_team = excluded.away_team,
  home_goals = COALESCE(excluded.home_goals, matches.home_goals),
  away_goals = COALESCE(excluded.away_goals, matches.away_goals),
  shootout_winner = COALESCE(excluded.shootout_winner, matches.shootout_winner),
  place = COALESCE(excluded.place, matches.place),
  division = COALESCE(excluded.division, matches.division),
  library_id = excluded.library_id,
  rival_label = excluded.rival_label,
  youtube_playlist_id = COALESCE(excluded.youtube_playlist_id, matches.youtube_playlist_id),
  r2_xml_object_key = COALESCE(excluded.r2_xml_object_key, matches.r2_xml_object_key);

${clipInsert}

${instanceSql}
`
}

function parseArgs(argv: string[]) {
  const applyRemote = argv.includes('--remote')
  const jsonPath = argv.find((arg) => !arg.startsWith('--'))
  if (!jsonPath) {
    throw new Error(
      'Usage: tsx scripts/upsert-playlist.ts [--local|--remote|--sql-only] [--skip-thumbnails] payload.json',
    )
  }
  return {
    jsonPath: path.resolve(jsonPath),
    wranglerTarget: applyRemote ? '--remote' : '--local',
    dryRun: argv.includes('--sql-only'),
    skipThumbnails: argv.includes('--skip-thumbnails'),
  }
}

function payloadHasSelfHostedVideo(
  clips: UpsertPayload['clips'],
): boolean {
  return clips.some(
    (clip) =>
      typeof clip.r2Key === 'string' && clip.r2Key.trim().length > 0,
  )
}

function generateThumbnailsForMatch(
  matchId: string,
  wranglerTarget: '--local' | '--remote',
): void {
  execFileSync(
    'pnpm',
    [
      'exec',
      'tsx',
      'scripts/generate-clip-thumbnails.ts',
      wranglerTarget,
      '--match',
      matchId,
      '--execute-sql',
    ],
    { cwd: REPOSITORY_ROOT, stdio: 'inherit' },
  )
}

function main() {
  const { jsonPath, wranglerTarget, dryRun, skipThumbnails } = parseArgs(
    process.argv.slice(2),
  )
  const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as UpsertPayload
  if (!payload.match?.id || !Array.isArray(payload.clips)) {
    throw new Error('payload.json must include match.id and clips[]')
  }

  const sql = renderSql(payload)
  if (dryRun) {
    process.stdout.write(sql)
    return
  }

  const tempFile = path.join(os.tmpdir(), `carpeta-upsert-${Date.now()}.sql`)
  fs.writeFileSync(tempFile, sql)
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

  if (
    !skipThumbnails &&
    payloadHasSelfHostedVideo(payload.clips)
  ) {
    generateThumbnailsForMatch(payload.match.id, wranglerTarget)
  }
}

main()
