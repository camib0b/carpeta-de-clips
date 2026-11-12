/**
 * Compare two read-only D1 statements through the Cloudflare REST API.
 *
 *   pnpm exec tsx scripts/bench-d1.ts \
 *     --old queries/before.sql --new queries/after.sql \
 *     --params-file queries/params.json
 *
 * Environment (never printed):
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_D1_DATABASE_ID
 *   CLOUDFLARE_API_TOKEN
 *
 * Warm-up runs are reported as cold. Measured runs alternate old, then new.
 * A statement that is not SELECT, WITH … SELECT, or EXPLAIN of one of those
 * is refused. A response with meta.rows_written > 0 aborts the run.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ACCOUNT_ID_ENV = 'CLOUDFLARE_ACCOUNT_ID'
const DATABASE_ID_ENV = 'CLOUDFLARE_D1_DATABASE_ID'
const API_TOKEN_ENV = 'CLOUDFLARE_API_TOKEN'

export const NO_MEANINGFUL_DIFFERENCE = 'no meaningful difference'

const WRITE_WORDS = new Set([
  'analyze',
  'attach',
  'alter',
  'begin',
  'commit',
  'create',
  'delete',
  'detach',
  'drop',
  'grant',
  'insert',
  'pragma',
  'reindex',
  'replace',
  'revoke',
  'rollback',
  'savepoint',
  'truncate',
  'update',
  'vacuum',
])

export class BenchmarkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BenchmarkError'
  }
}

export type NumberSummary = {
  min: number
  median: number
  max: number
}

export type ParamSet = {
  name: string
  params: unknown[]
}

export type PhaseSummary = {
  samples: number
  durationMs: NumberSummary
  roundTripMs: NumberSummary
  rowsRead: NumberSummary
}

export type VariantReport = {
  cold: PhaseSummary | null
  measured: PhaseSummary
}

export type ParamSetReport = {
  name: string
  params: unknown[]
  rowCount: number
  resultsMatch: true
  durationVerdict: string
  roundTripVerdict: string
  old: VariantReport
  new: VariantReport
}

export type BenchmarkReport = {
  warmupRuns: number
  measuredRuns: number
  thresholdMs: number
  sets: ParamSetReport[]
}

type SqlWord = {
  text: string
}

type QueryMeta = {
  duration: number
  rows_read: number
  rows_written: number
}

export type QueryObservation = {
  results: unknown[]
  durationMs: number
  roundTripMs: number
  rowsRead: number
  rowsWritten: number
}

export type BenchmarkFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>

export type BenchmarkRunInput = {
  fetchImpl: BenchmarkFetch
  accountId: string
  databaseId: string
  token: string
  oldSql: string
  newSql: string
  paramSets: readonly ParamSet[]
  warmupRuns: number
  measuredRuns: number
  thresholdMs: number
}

export function redactSecret(text: string, secret: string): string {
  if (secret.length === 0) return text
  return text.split(secret).join('[redacted]')
}

export function summarizeNumbers(values: readonly number[]): NumberSummary {
  if (values.length === 0) {
    throw new BenchmarkError('Cannot summarize an empty sample')
  }
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 1
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2
  return {
    min: sorted[0],
    median,
    max: sorted[sorted.length - 1],
  }
}

export function noiseVerdict(
  baseline: NumberSummary,
  candidate: NumberSummary,
  threshold: number,
): string {
  const rangesOverlap = baseline.min <= candidate.max && candidate.min <= baseline.max
  const medianDifference = Math.abs(candidate.median - baseline.median)
  if (rangesOverlap || medianDifference < threshold) {
    return NO_MEANINGFUL_DIFFERENCE
  }
  if (candidate.median < baseline.median) return 'new is faster'
  return 'old is faster'
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue)
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortJsonValue((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

export function canonicalRow(value: unknown): string {
  return JSON.stringify(sortJsonValue(value))
}

export function compareSortedRows(
  left: readonly unknown[],
  right: readonly unknown[],
): { equal: boolean; detail: string } {
  const leftSorted = left.map(canonicalRow).sort()
  const rightSorted = right.map(canonicalRow).sort()
  if (leftSorted.length !== rightSorted.length) {
    return {
      equal: false,
      detail: `Row count differs: old ${leftSorted.length}, new ${rightSorted.length}`,
    }
  }
  for (let index = 0; index < leftSorted.length; index += 1) {
    if (leftSorted[index] !== rightSorted[index]) {
      return {
        equal: false,
        detail: `Sorted row ${index} differs.\nOld: ${leftSorted[index]}\nNew: ${rightSorted[index]}`,
      }
    }
  }
  return { equal: true, detail: '' }
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/.test(char)
}

function isIdentifierChar(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char)
}

function scanSqlWords(sql: string): SqlWord[][] {
  const statements: SqlWord[][] = []
  let words: SqlWord[] = []
  let index = 0

  function pushStatement() {
    if (words.length > 0) {
      statements.push(words)
      words = []
    }
  }

  while (index < sql.length) {
    const char = sql[index]
    if (char === '-' && sql[index + 1] === '-') {
      index += 2
      while (index < sql.length && sql[index] !== '\n') index += 1
      continue
    }
    if (char === '/' && sql[index + 1] === '*') {
      const end = sql.indexOf('*/', index + 2)
      if (end === -1) throw new BenchmarkError('SQL has an unclosed block comment')
      index = end + 2
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      const quote = char
      index += 1
      let closed = false
      while (index < sql.length) {
        if (sql[index] === quote) {
          if (sql[index + 1] === quote) {
            index += 2
            continue
          }
          index += 1
          closed = true
          break
        }
        index += 1
      }
      if (!closed) throw new BenchmarkError('SQL has an unclosed quote')
      continue
    }
    if (char === ';') {
      pushStatement()
      index += 1
      continue
    }
    if (isIdentifierStart(char)) {
      const start = index
      index += 1
      while (index < sql.length && isIdentifierChar(sql[index])) index += 1
      const text = sql.slice(start, index)
      if (text.toLowerCase() === 'replace') {
        let lookAhead = index
        while (lookAhead < sql.length && /\s/.test(sql[lookAhead])) lookAhead += 1
        if (sql[lookAhead] === '(') continue
      }
      words.push({ text })
      continue
    }
    index += 1
  }
  pushStatement()
  return statements
}

function isReadStatement(words: readonly SqlWord[]): boolean {
  const lower = words.map((word) => word.text.toLowerCase())
  let index = 0
  if (lower[index] === 'explain') {
    index += 1
    if (lower[index] === 'query' && lower[index + 1] === 'plan') index += 2
  }
  if (lower[index] === 'select') return true
  if (lower[index] === 'with') return lower.includes('select')
  return false
}

export function assertReadOnlySql(sql: string): void {
  const statements = scanSqlWords(sql)
  if (statements.length === 0) {
    throw new BenchmarkError('SQL is empty. Only a single SELECT, WITH … SELECT, or EXPLAIN is allowed.')
  }
  if (statements.length > 1) {
    throw new BenchmarkError('SQL contains more than one statement. Refusing to run it.')
  }
  const words = statements[0]
  const forbidden = words.find((word) => WRITE_WORDS.has(word.text.toLowerCase()))
  if (forbidden) {
    throw new BenchmarkError(
      `SQL contains ${forbidden.text.toUpperCase()}. Only a single SELECT, WITH … SELECT, or EXPLAIN of one of those is allowed.`,
    )
  }
  if (!isReadStatement(words)) {
    throw new BenchmarkError(
      'SQL must be a single SELECT, WITH … SELECT, or EXPLAIN of one of those.',
    )
  }
}

export function parseParamSets(value: unknown): ParamSet[] {
  if (value == null) return [{ name: 'default', params: [] }]
  if (!Array.isArray(value)) {
    throw new BenchmarkError('Params JSON must be an array')
  }
  if (value.length === 0) return [{ name: 'default', params: [] }]

  const namedSets = value.every(
    (item) => item && typeof item === 'object' && !Array.isArray(item) && 'params' in item,
  )
  if (namedSets) {
    return value.map((item, index) => {
      const record = item as { name?: unknown; params?: unknown }
      if (!Array.isArray(record.params)) {
        throw new BenchmarkError(`Param set ${index + 1} is missing a params array`)
      }
      const name =
        typeof record.name === 'string' && record.name.trim().length > 0
          ? record.name
          : `set ${index + 1}`
      return { name, params: record.params }
    })
  }

  if (value.every(Array.isArray)) {
    return value.map((params, index) => ({
      name: `set ${index + 1}`,
      params: params as unknown[],
    }))
  }

  return [{ name: 'default', params: value }]
}

export async function loadSqlSource(spec: string): Promise<string> {
  const hash = spec.lastIndexOf('#')
  if (hash === -1) {
    const text = await fs.promises.readFile(spec, 'utf8')
    if (text.trim().length === 0) throw new BenchmarkError(`SQL file is empty: ${spec}`)
    return text
  }
  const modulePath = path.resolve(spec.slice(0, hash))
  const exportName = spec.slice(hash + 1)
  if (exportName.length === 0) throw new BenchmarkError(`Missing export name in ${spec}`)
  const loaded = (await import(pathToFileURL(modulePath).href)) as Record<string, unknown>
  const value = loaded[exportName]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BenchmarkError(`Export ${exportName} from ${modulePath} is not a SQL string`)
  }
  return value
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BenchmarkError(`D1 response did not include a numeric meta.${label}`)
  }
  return value
}

function formatApiErrors(body: unknown): string {
  if (!body || typeof body !== 'object') return 'D1 returned an error'
  const record = body as { errors?: Array<{ message?: string }>; messages?: string[] }
  const messages = [
    ...(record.errors ?? []).map((error) => error.message ?? ''),
    ...(record.messages ?? []),
  ].filter((message) => message.length > 0)
  return messages.length > 0 ? messages.join('; ') : 'D1 returned an error'
}

function readQueryPayload(body: unknown): { results: unknown[]; meta: QueryMeta } {
  if (!body || typeof body !== 'object') {
    throw new BenchmarkError('D1 response was not an object')
  }
  const record = body as { success?: boolean; errors?: Array<{ message?: string }>; result?: unknown }
  if (record.success === false) {
    throw new BenchmarkError(formatApiErrors(body))
  }
  const entry = Array.isArray(record.result) ? record.result[0] : record.result
  if (!entry || typeof entry !== 'object') {
    throw new BenchmarkError('D1 response did not include a query result')
  }
  const result = entry as { success?: boolean; results?: unknown; meta?: unknown }
  if (result.success === false) throw new BenchmarkError(formatApiErrors(body))
  if (!Array.isArray(result.results)) {
    throw new BenchmarkError('D1 response did not include a results array')
  }
  if (!result.meta || typeof result.meta !== 'object') {
    throw new BenchmarkError('D1 response did not include meta')
  }
  const meta = result.meta as Record<string, unknown>
  return {
    results: result.results,
    meta: {
      duration: finiteNumber(meta.duration, 'duration'),
      rows_read: finiteNumber(meta.rows_read, 'rows_read'),
      rows_written: finiteNumber(meta.rows_written, 'rows_written'),
    },
  }
}

export function d1QueryUrl(accountId: string, databaseId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/d1/database/${encodeURIComponent(databaseId)}/query`
}

export async function executeReadOnlyQuery(input: {
  fetchImpl: BenchmarkFetch
  accountId: string
  databaseId: string
  token: string
  sql: string
  params: readonly unknown[]
}): Promise<QueryObservation> {
  assertReadOnlySql(input.sql)
  const started = performance.now()
  let response: { ok: boolean; status: number; text: () => Promise<string> }
  try {
    response = await input.fetchImpl(d1QueryUrl(input.accountId, input.databaseId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: input.sql, params: [...input.params] }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new BenchmarkError(redactSecret(`D1 request failed: ${message}`, input.token))
  }
  const roundTripMs = performance.now() - started
  const text = await response.text()
  let body: unknown
  try {
    body = JSON.parse(text) as unknown
  } catch {
    throw new BenchmarkError(
      redactSecret(`D1 response was not JSON (HTTP ${response.status})`, input.token),
    )
  }
  if (!response.ok) {
    throw new BenchmarkError(
      redactSecret(`D1 query failed (HTTP ${response.status}): ${formatApiErrors(body)}`, input.token),
    )
  }
  let payload: { results: unknown[]; meta: QueryMeta }
  try {
    payload = readQueryPayload(body)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new BenchmarkError(redactSecret(message, input.token))
  }
  if (payload.meta.rows_written > 0) {
    throw new BenchmarkError(
      `D1 reported rows_written=${payload.meta.rows_written}. Aborting. This benchmark only runs reads.`,
    )
  }
  return {
    results: payload.results,
    durationMs: payload.meta.duration,
    roundTripMs,
    rowsRead: payload.meta.rows_read,
    rowsWritten: payload.meta.rows_written,
  }
}

function summarizePhase(observations: readonly QueryObservation[]): PhaseSummary {
  return {
    samples: observations.length,
    durationMs: summarizeNumbers(observations.map((observation) => observation.durationMs)),
    roundTripMs: summarizeNumbers(observations.map((observation) => observation.roundTripMs)),
    rowsRead: summarizeNumbers(observations.map((observation) => observation.rowsRead)),
  }
}

function assertSameResults(
  oldRows: readonly unknown[],
  newRows: readonly unknown[],
  paramSetName: string,
  phase: string,
  runNumber: number,
): void {
  const comparison = compareSortedRows(oldRows, newRows)
  if (!comparison.equal) {
    throw new BenchmarkError(
      `Result rows differ for ${paramSetName} (${phase} run ${runNumber}).\n${comparison.detail}`,
    )
  }
}

export async function runBenchmark(input: BenchmarkRunInput): Promise<BenchmarkReport> {
  if (!Number.isInteger(input.warmupRuns) || input.warmupRuns < 0) {
    throw new BenchmarkError('Warm-up runs must be an integer of 0 or more')
  }
  if (!Number.isInteger(input.measuredRuns) || input.measuredRuns < 1) {
    throw new BenchmarkError('Measured runs must be an integer of 1 or more')
  }
  if (!Number.isFinite(input.thresholdMs) || input.thresholdMs < 0) {
    throw new BenchmarkError('Threshold must be a number of milliseconds, 0 or more')
  }
  assertReadOnlySql(input.oldSql)
  assertReadOnlySql(input.newSql)

  const sets: ParamSetReport[] = []
  for (const paramSet of input.paramSets) {
    const coldOld: QueryObservation[] = []
    const coldNew: QueryObservation[] = []
    for (let run = 0; run < input.warmupRuns; run += 1) {
      coldOld.push(
        await executeReadOnlyQuery({ ...input, sql: input.oldSql, params: paramSet.params }),
      )
      coldNew.push(
        await executeReadOnlyQuery({ ...input, sql: input.newSql, params: paramSet.params }),
      )
      assertSameResults(coldOld[run].results, coldNew[run].results, paramSet.name, 'cold', run + 1)
    }

    const measuredOld: QueryObservation[] = []
    const measuredNew: QueryObservation[] = []
    for (let run = 0; run < input.measuredRuns; run += 1) {
      measuredOld.push(
        await executeReadOnlyQuery({ ...input, sql: input.oldSql, params: paramSet.params }),
      )
      measuredNew.push(
        await executeReadOnlyQuery({ ...input, sql: input.newSql, params: paramSet.params }),
      )
      assertSameResults(
        measuredOld[run].results,
        measuredNew[run].results,
        paramSet.name,
        'measured',
        run + 1,
      )
    }

    const oldMeasured = summarizePhase(measuredOld)
    const newMeasured = summarizePhase(measuredNew)
    sets.push({
      name: paramSet.name,
      params: paramSet.params,
      rowCount: measuredOld[0]?.results.length ?? 0,
      resultsMatch: true,
      durationVerdict: noiseVerdict(oldMeasured.durationMs, newMeasured.durationMs, input.thresholdMs),
      roundTripVerdict: noiseVerdict(
        oldMeasured.roundTripMs,
        newMeasured.roundTripMs,
        input.thresholdMs,
      ),
      old: {
        cold: input.warmupRuns > 0 ? summarizePhase(coldOld) : null,
        measured: oldMeasured,
      },
      new: {
        cold: input.warmupRuns > 0 ? summarizePhase(coldNew) : null,
        measured: newMeasured,
      },
    })
  }

  return {
    warmupRuns: input.warmupRuns,
    measuredRuns: input.measuredRuns,
    thresholdMs: input.thresholdMs,
    sets,
  }
}

function formatMilliseconds(value: number): string {
  return String(Math.round(value * 1000) / 1000)
}

function formatRowsRead(summary: NumberSummary): string {
  if (summary.min === summary.max) return formatMilliseconds(summary.median)
  return `${formatMilliseconds(summary.median)} (${formatMilliseconds(summary.min)}–${formatMilliseconds(summary.max)})`
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function phaseRows(
  variant: 'old' | 'new',
  phase: 'cold' | 'measured',
  summary: PhaseSummary,
): string {
  return `| ${variant} | ${phase} | ${formatMilliseconds(summary.durationMs.median)} | ${formatMilliseconds(summary.durationMs.min)} | ${formatMilliseconds(summary.durationMs.max)} | ${formatMilliseconds(summary.roundTripMs.median)} | ${formatMilliseconds(summary.roundTripMs.min)} | ${formatMilliseconds(summary.roundTripMs.max)} | ${formatRowsRead(summary.rowsRead)} |`
}

export function formatBenchmarkMarkdown(report: BenchmarkReport): string {
  const lines = [
    '# D1 query benchmark',
    '',
    `Warm-up runs (reported as cold): ${report.warmupRuns}. Measured runs: ${report.measuredRuns}. Each round runs old, then new. Noise threshold: ${formatMilliseconds(report.thresholdMs)} ms on the median.`,
    '',
    'A verdict of `no meaningful difference` means the min–max ranges overlap, or the median gap is under the threshold.',
    '',
  ]
  for (const set of report.sets) {
    lines.push(`## ${escapeTableCell(set.name)}`, '')
    lines.push(
      '| Variant | Phase | Duration median (ms) | Duration min | Duration max | Round trip median (ms) | Round trip min | Round trip max | Rows read |',
    )
    lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
    if (set.old.cold && set.new.cold) {
      lines.push(phaseRows('old', 'cold', set.old.cold))
      lines.push(phaseRows('new', 'cold', set.new.cold))
    }
    lines.push(phaseRows('old', 'measured', set.old.measured))
    lines.push(phaseRows('new', 'measured', set.new.measured))
    lines.push('')
    lines.push(`Verdict (D1 \`meta.duration\`): ${set.durationVerdict}`)
    lines.push(`Verdict (client round trip): ${set.roundTripVerdict}`)
    lines.push(`Result rows: match (${set.rowCount})`)
    lines.push('')
  }
  return lines.join('\n')
}

export function formatBenchmarkJson(report: BenchmarkReport): string {
  return `${JSON.stringify(report, null, 2)}\n`
}

export type BenchmarkCli = {
  help: boolean
  oldSpec?: string
  newSpec?: string
  paramsInline?: string
  paramsFile?: string
  warmupRuns: number
  measuredRuns: number
  thresholdMs: number
  format: 'markdown' | 'json' | 'both'
}

function readOption(argv: readonly string[], index: number, name: string): { value: string; next: number } {
  const token = argv[index] ?? ''
  const withEquals = `${name}=`
  if (token.startsWith(withEquals)) {
    return { value: token.slice(withEquals.length), next: index + 1 }
  }
  const value = argv[index + 1]
  if (value == null || value.startsWith('--')) {
    throw new BenchmarkError(`${name} needs a value`)
  }
  return { value, next: index + 2 }
}

function readNumber(value: string, name: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new BenchmarkError(`${name} must be a number`)
  return parsed
}

export function parseBenchmarkArgs(argv: readonly string[]): BenchmarkCli {
  const cli: BenchmarkCli = {
    help: false,
    warmupRuns: 3,
    measuredRuns: 10,
    thresholdMs: 1,
    format: 'markdown',
  }
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--help' || token === '-h') {
      cli.help = true
      continue
    }
    if (token === '--old' || token.startsWith('--old=')) {
      const option = readOption(argv, index, '--old')
      cli.oldSpec = option.value
      index = option.next - 1
      continue
    }
    if (token === '--new' || token.startsWith('--new=')) {
      const option = readOption(argv, index, '--new')
      cli.newSpec = option.value
      index = option.next - 1
      continue
    }
    if (token === '--params' || token.startsWith('--params=')) {
      const option = readOption(argv, index, '--params')
      cli.paramsInline = option.value
      index = option.next - 1
      continue
    }
    if (token === '--params-file' || token.startsWith('--params-file=')) {
      const option = readOption(argv, index, '--params-file')
      cli.paramsFile = option.value
      index = option.next - 1
      continue
    }
    if (token === '--warmup' || token.startsWith('--warmup=')) {
      const option = readOption(argv, index, '--warmup')
      cli.warmupRuns = readNumber(option.value, '--warmup')
      index = option.next - 1
      continue
    }
    if (token === '--runs' || token.startsWith('--runs=')) {
      const option = readOption(argv, index, '--runs')
      cli.measuredRuns = readNumber(option.value, '--runs')
      index = option.next - 1
      continue
    }
    if (token === '--threshold' || token.startsWith('--threshold=')) {
      const option = readOption(argv, index, '--threshold')
      cli.thresholdMs = readNumber(option.value, '--threshold')
      index = option.next - 1
      continue
    }
    if (token === '--format' || token.startsWith('--format=')) {
      const option = readOption(argv, index, '--format')
      if (option.value !== 'markdown' && option.value !== 'json' && option.value !== 'both') {
        throw new BenchmarkError('--format must be markdown, json, or both')
      }
      cli.format = option.value
      index = option.next - 1
      continue
    }
    throw new BenchmarkError(`Unknown argument ${token}`)
  }
  return cli
}

export function benchmarkHelp(): string {
  return [
    'Compare two read-only D1 queries.',
    '',
    'Usage:',
    '  pnpm exec tsx scripts/bench-d1.ts --old <sql> --new <sql> [options]',
    '',
    'SQL sources are a file path, or module.ts#EXPORT_NAME.',
    'Params are a JSON array, an array of arrays, or [{ "name", "params" }].',
    '',
    'Options:',
    '  --params <json>         Bound parameters (one set, or several)',
    '  --params-file <path>    JSON file of bound parameters',
    '  --warmup <n>            Cold runs per variant (default 3)',
    '  --runs <n>              Measured runs per variant (default 10)',
    '  --threshold <ms>        Median gap treated as noise (default 1)',
    '  --format markdown|json|both',
    '',
    `Reads ${ACCOUNT_ID_ENV}, ${DATABASE_ID_ENV}, and ${API_TOKEN_ENV}.`,
    'The token is not printed.',
  ].join('\n')
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (value == null || value.trim().length === 0) {
    throw new BenchmarkError(`Missing ${name}`)
  }
  return value
}

async function readParams(cli: BenchmarkCli): Promise<unknown> {
  if (cli.paramsInline != null && cli.paramsFile != null) {
    throw new BenchmarkError('Pass --params or --params-file, not both')
  }
  if (cli.paramsFile != null) {
    const text = await fs.promises.readFile(cli.paramsFile, 'utf8')
    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new BenchmarkError(`Params file is not JSON: ${cli.paramsFile}`)
    }
  }
  if (cli.paramsInline != null) {
    try {
      return JSON.parse(cli.paramsInline) as unknown
    } catch {
      throw new BenchmarkError('--params is not JSON')
    }
  }
  return null
}

export async function main(argv: readonly string[]): Promise<number> {
  const cli = parseBenchmarkArgs(argv)
  if (cli.help) {
    process.stdout.write(`${benchmarkHelp()}\n`)
    return 0
  }
  if (!cli.oldSpec || !cli.newSpec) {
    throw new BenchmarkError('Both --old and --new are required')
  }
  const [oldSql, newSql, paramsJson] = await Promise.all([
    loadSqlSource(cli.oldSpec),
    loadSqlSource(cli.newSpec),
    readParams(cli),
  ])
  const report = await runBenchmark({
    fetchImpl: async (url, init) => {
      const response = await fetch(url, { ...init, redirect: 'error' })
      return { ok: response.ok, status: response.status, text: () => response.text() }
    },
    accountId: requireEnv(ACCOUNT_ID_ENV),
    databaseId: requireEnv(DATABASE_ID_ENV),
    token: requireEnv(API_TOKEN_ENV),
    oldSql,
    newSql,
    paramSets: parseParamSets(paramsJson),
    warmupRuns: cli.warmupRuns,
    measuredRuns: cli.measuredRuns,
    thresholdMs: cli.thresholdMs,
  })
  const markdown = formatBenchmarkMarkdown(report)
  const json = formatBenchmarkJson(report)
  if (cli.format === 'json') process.stdout.write(json)
  else if (cli.format === 'both') process.stdout.write(`${markdown}\n${json}`)
  else process.stdout.write(`${markdown}\n`)
  return 0
}

const invokedPath = process.argv[1]
if (invokedPath && path.resolve(invokedPath) === path.resolve(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      process.stderr.write(`${message}\n`)
      process.exitCode = 1
    })
}
