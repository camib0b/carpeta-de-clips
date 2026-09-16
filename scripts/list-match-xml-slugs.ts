/**
 * List match ids and R2 XML object keys from local D1.
 *
 *   pnpm exec tsx scripts/list-match-xml-slugs.ts
 *   pnpm run db:list-xml
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

type D1ExecuteResult = {
  results?: Array<{ id?: string; r2_xml_object_key?: string | null }>
}

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
    'SELECT id, r2_xml_object_key FROM matches ORDER BY played_on, id',
  ],
  { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
)

const jsonStart = output.search(/[\[{]/)
if (jsonStart < 0) {
  throw new Error(`wrangler d1 execute did not return JSON:\n${output}`)
}

const parsed = JSON.parse(output.slice(jsonStart)) as D1ExecuteResult[]
const rows = parsed.flatMap((batch) => batch.results ?? [])

for (const row of rows) {
  const objectKey = row.r2_xml_object_key ?? '(no R2 key)'
  console.log(`${row.id}  ←  ${objectKey}`)
}
