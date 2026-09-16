/**
 * Smoke-check the local D1 catalog after migrations.
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

type D1ExecuteResult = {
  results?: Array<Record<string, unknown>>
}

function queryLocalD1(sql: string): Array<Record<string, unknown>> {
  const output = execFileSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'd1',
      'execute',
      'carpeta-de-clips',
      '--local',
      '--json',
      '--command',
      sql,
    ],
    { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
  )

  const jsonStart = output.search(/[\[{]/)
  if (jsonStart < 0) {
    throw new Error(`wrangler d1 execute did not return JSON:\n${output}`)
  }

  const parsed = JSON.parse(output.slice(jsonStart)) as
    | D1ExecuteResult[]
    | D1ExecuteResult
  const batches = Array.isArray(parsed) ? parsed : [parsed]
  return batches.flatMap((batch) => batch.results ?? [])
}

function requiredCount(sql: string): number {
  return Number(queryLocalD1(sql)[0]?.count ?? 0)
}

async function main() {
  const libraryCount = requiredCount('SELECT COUNT(*) AS count FROM libraries')
  const matchCount = requiredCount('SELECT COUNT(*) AS count FROM matches')
  const clipCount = requiredCount('SELECT COUNT(*) AS count FROM clips')
  const xmlCount = requiredCount(
    'SELECT COUNT(*) AS count FROM matches WHERE r2_xml_object_key IS NOT NULL',
  )
  const playlistCount = requiredCount(
    'SELECT COUNT(*) AS count FROM matches WHERE youtube_playlist_id IS NOT NULL',
  )
  const divisionCount = requiredCount(
    'SELECT COUNT(*) AS count FROM matches WHERE division IS NOT NULL',
  )

  if (libraryCount !== 3) {
    throw new Error(`Expected 3 libraries, found ${libraryCount}`)
  }
  if (matchCount < 17) {
    throw new Error(`Expected at least 17 matches, found ${matchCount}`)
  }
  if (clipCount < 129) {
    throw new Error(`Expected at least 129 clips, found ${clipCount}`)
  }
  if (xmlCount < 9) {
    throw new Error(`Expected at least 9 XML object keys, found ${xmlCount}`)
  }
  if (playlistCount < 17) {
    throw new Error(`Expected at least 17 playlist ids, found ${playlistCount}`)
  }
  if (divisionCount < 1) {
    throw new Error(`Expected seeded division values on matches, found ${divisionCount}`)
  }

  const libraryIds = queryLocalD1(
    'SELECT id FROM libraries ORDER BY sort_order',
  ).map((row) => String(row.id))
  const expectedLibraryIds = ['uc-sub-16-a', 'uc-primera-b', 'others']
  if (libraryIds.join(',') !== expectedLibraryIds.join(',')) {
    throw new Error(
      `Library ids/order mismatch: ${libraryIds.join(',')} vs ${expectedLibraryIds.join(',')}`,
    )
  }

  const categoryColumn = queryLocalD1(
    `SELECT name FROM pragma_table_info('matches') WHERE name = 'category'`,
  )
  if (categoryColumn.length > 0) {
    throw new Error('matches.category must not exist; use matches.division')
  }

  console.log('D1 catalog smoke check OK')
  console.log(`libraries: ${libraryCount}`)
  console.log(`matches: ${matchCount}`)
  console.log(`clips: ${clipCount}`)
  console.log(`xml matches: ${xmlCount}`)
  console.log(`playlists: ${playlistCount}`)
  console.log(`matches with division: ${divisionCount}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
