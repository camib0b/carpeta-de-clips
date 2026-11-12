import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it } from 'node:test'

import {
  BenchmarkError,
  NO_MEANINGFUL_DIFFERENCE,
  assertReadOnlySql,
  canonicalRow,
  compareSortedRows,
  executeReadOnlyQuery,
  formatBenchmarkMarkdown,
  loadSqlSource,
  noiseVerdict,
  parseBenchmarkArgs,
  parseParamSets,
  redactSecret,
  runBenchmark,
  summarizeNumbers,
  type BenchmarkFetch,
  type QueryObservation,
} from './bench-d1'

const TOKEN = 'super-secret-token'

function d1Body(input: {
  results: unknown[]
  duration: number
  rowsRead: number
  rowsWritten?: number
}): string {
  return JSON.stringify({
    success: true,
    errors: [],
    result: [
      {
        success: true,
        results: input.results,
        meta: {
          duration: input.duration,
          rows_read: input.rowsRead,
          rows_written: input.rowsWritten ?? 0,
          changes: 0,
          changed_db: false,
          last_row_id: 0,
          size_after: 1,
        },
      },
    ],
  })
}

function scriptedFetch(
  responses: Array<{
    sqlIncludes: string
    results: unknown[]
    duration: number
    rowsRead: number
    rowsWritten?: number
    status?: number
    throwMessage?: string
  }>,
): { fetchImpl: BenchmarkFetch; calls: Array<{ url: string; body: string; authorization: string }> } {
  const calls: Array<{ url: string; body: string; authorization: string }> = []
  const fetchImpl: BenchmarkFetch = async (url, init) => {
    calls.push({ url, body: init.body, authorization: init.headers.Authorization })
    const next = responses.shift()
    if (!next) throw new Error('scripted fetch ran out of responses')
    if (next.throwMessage) throw new Error(next.throwMessage)
    const parsed = JSON.parse(init.body) as { sql: string }
    assert.equal(parsed.sql.includes(next.sqlIncludes), true)
    return {
      ok: (next.status ?? 200) < 400,
      status: next.status ?? 200,
      text: async () =>
        d1Body({
          results: next.results,
          duration: next.duration,
          rowsRead: next.rowsRead,
          rowsWritten: next.rowsWritten,
        }),
    }
  }
  return { fetchImpl, calls }
}

describe('benchmark stats and verdict', () => {
  it('summarizes min, median, and max', () => {
    assert.deepEqual(summarizeNumbers([3, 1, 2]), { min: 1, median: 2, max: 3 })
    assert.deepEqual(summarizeNumbers([1, 4]), { min: 1, median: 2.5, max: 4 })
    assert.throws(() => summarizeNumbers([]), /empty sample/)
  })

  it('calls overlapping ranges or a small median gap noise', () => {
    assert.equal(
      noiseVerdict({ min: 1, median: 2, max: 5 }, { min: 4, median: 6, max: 8 }, 0.1),
      NO_MEANINGFUL_DIFFERENCE,
    )
    assert.equal(
      noiseVerdict({ min: 10, median: 10, max: 10 }, { min: 10.2, median: 10.2, max: 10.2 }, 1),
      NO_MEANINGFUL_DIFFERENCE,
    )
    assert.equal(
      noiseVerdict({ min: 1, median: 1, max: 2 }, { min: 2, median: 3, max: 4 }, 0.1),
      NO_MEANINGFUL_DIFFERENCE,
    )
    assert.equal(
      noiseVerdict({ min: 10, median: 10, max: 10 }, { min: 1, median: 1, max: 1 }, 0.5),
      'new is faster',
    )
    assert.equal(
      noiseVerdict({ min: 1, median: 1, max: 1 }, { min: 10, median: 10, max: 10 }, 0.5),
      'old is faster',
    )
  })
})

describe('read-only SQL guard', () => {
  it('allows one select, a with-select, and explain', () => {
    assert.doesNotThrow(() => assertReadOnlySql('SELECT 1'))
    assert.doesNotThrow(() => assertReadOnlySql('  select\n  * from clips;  '))
    assert.doesNotThrow(() => assertReadOnlySql('-- note\nSELECT 1'))
    assert.doesNotThrow(() => assertReadOnlySql('/* INSERT */ SELECT 1'))
    assert.doesNotThrow(() => assertReadOnlySql("SELECT 'DELETE' AS verb"))
    assert.doesNotThrow(() => assertReadOnlySql('SELECT replace(name, \'a\', \'b\') FROM clips'))
    assert.doesNotThrow(() =>
      assertReadOnlySql('WITH cte AS (SELECT 1 AS id) SELECT * FROM cte'),
    )
    assert.doesNotThrow(() => assertReadOnlySql('EXPLAIN SELECT 1'))
    assert.doesNotThrow(() => assertReadOnlySql('EXPLAIN QUERY PLAN SELECT id FROM clips WHERE id = ?'))
    assert.doesNotThrow(() =>
      assertReadOnlySql('EXPLAIN QUERY PLAN WITH cte AS (SELECT 1) SELECT * FROM cte'),
    )
  })

  it('refuses writes, extra statements, and other commands', () => {
    assert.throws(() => assertReadOnlySql('INSERT INTO clips (id) VALUES (1)'), /INSERT/)
    assert.throws(() => assertReadOnlySql('UPDATE clips SET title = title'), /UPDATE/)
    assert.throws(() => assertReadOnlySql('DELETE FROM clips'), /DELETE/)
    assert.throws(() => assertReadOnlySql('REPLACE INTO clips (id) VALUES (1)'), /REPLACE/)
    assert.throws(() => assertReadOnlySql('PRAGMA table_info(clips)'), /PRAGMA/)
    assert.throws(() => assertReadOnlySql('SELECT 1; DROP TABLE clips'), /more than one statement/)
    assert.throws(() => assertReadOnlySql('WITH cte AS (INSERT INTO clips (id) VALUES (1) RETURNING id) SELECT * FROM cte'), /INSERT/)
    assert.throws(() => assertReadOnlySql('EXPLAIN INSERT INTO clips (id) VALUES (1)'), /INSERT/)
    assert.throws(() => assertReadOnlySql(''), /empty/)
    assert.throws(() => assertReadOnlySql('-- only a comment'), /empty/)
  })
})

describe('result comparison', () => {
  it('treats key order and row order as the same result', () => {
    const left = [
      { id: 2, name: 'b' },
      { name: 'a', id: 1 },
    ]
    const right = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]
    assert.equal(compareSortedRows(left, right).equal, true)
    assert.equal(canonicalRow({ b: 1, a: { d: 1, c: 2 } }), canonicalRow({ a: { c: 2, d: 1 }, b: 1 }))
  })

  it('fails with the differing row', () => {
    const comparison = compareSortedRows([{ id: 1 }], [{ id: 2 }])
    assert.equal(comparison.equal, false)
    assert.match(comparison.detail, /Sorted row 0 differs/)
    assert.match(compareSortedRows([{ id: 1 }], []).detail, /Row count differs/)
  })
})

describe('parameter sets and SQL sources', () => {
  it('accepts one list, many lists, or named sets', () => {
    assert.deepEqual(parseParamSets(['uc-primera-b', 1]), [
      { name: 'default', params: ['uc-primera-b', 1] },
    ])
    assert.deepEqual(parseParamSets([['others'], ['uc-primera-b']]), [
      { name: 'set 1', params: ['others'] },
      { name: 'set 2', params: ['uc-primera-b'] },
    ])
    assert.deepEqual(
      parseParamSets([{ name: 'Otros', params: ['others'] }]),
      [{ name: 'Otros', params: ['others'] }],
    )
    assert.deepEqual(parseParamSets(null), [{ name: 'default', params: [] }])
  })

  it('reads SQL from a file or a module export', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-d1-'))
    const sqlPath = path.join(directory, 'old.sql')
    const modulePath = path.join(directory, 'query.mjs')
    fs.writeFileSync(sqlPath, 'SELECT 1\n')
    fs.writeFileSync(modulePath, 'export const sampleSql = "SELECT 2"\n')
    assert.equal(await loadSqlSource(sqlPath), 'SELECT 1\n')
    assert.equal(await loadSqlSource(`${modulePath}#sampleSql`), 'SELECT 2')
  })

  it('parses defaults and rejects an unknown flag', () => {
    const cli = parseBenchmarkArgs([
      '--old',
      'before.sql',
      '--new=after.sql',
      '--warmup',
      '1',
      '--runs',
      '4',
      '--threshold',
      '0.5',
      '--format',
      'both',
    ])
    assert.equal(cli.oldSpec, 'before.sql')
    assert.equal(cli.newSpec, 'after.sql')
    assert.equal(cli.warmupRuns, 1)
    assert.equal(cli.measuredRuns, 4)
    assert.equal(cli.thresholdMs, 0.5)
    assert.equal(cli.format, 'both')
    assert.throws(() => parseBenchmarkArgs(['--nope']), /Unknown argument/)
  })
})

describe('benchmark run with a mocked fetch', () => {
  const base = {
    accountId: 'account-1',
    databaseId: 'database-1',
    token: TOKEN,
    oldSql: 'SELECT id FROM clips WHERE library_id = ?',
    newSql: 'SELECT clips.id FROM clips WHERE clips.library_id = ?',
    thresholdMs: 0.5,
  }

  it('alternates old and new, reports cold separately, and hides the token', async () => {
    const rows = [{ id: 1 }, { id: 2 }]
    const script = scriptedFetch([
      { sqlIncludes: 'SELECT id FROM', results: rows, duration: 5, rowsRead: 8 },
      { sqlIncludes: 'clips.id', results: [{ id: 2 }, { id: 1 }], duration: 1, rowsRead: 3 },
      { sqlIncludes: 'SELECT id FROM', results: rows, duration: 10, rowsRead: 8 },
      { sqlIncludes: 'clips.id', results: rows, duration: 1, rowsRead: 3 },
      { sqlIncludes: 'SELECT id FROM', results: [{ id: 1 }], duration: 4, rowsRead: 4 },
      { sqlIncludes: 'clips.id', results: [{ id: 1 }], duration: 1, rowsRead: 2 },
      { sqlIncludes: 'SELECT id FROM', results: [{ id: 1 }], duration: 4, rowsRead: 4 },
      { sqlIncludes: 'clips.id', results: [{ id: 1 }], duration: 1, rowsRead: 2 },
    ])
    const report = await runBenchmark({
      ...base,
      fetchImpl: script.fetchImpl,
      paramSets: [
        { name: 'Otros', params: ['others'] },
        { name: 'UC Primera B', params: ['uc-primera-b'] },
      ],
      warmupRuns: 1,
      measuredRuns: 1,
    })

    assert.equal(script.calls.length, 8)
    assert.deepEqual(
      script.calls.map((call) => JSON.parse(call.body).params),
      [
        ['others'],
        ['others'],
        ['others'],
        ['others'],
        ['uc-primera-b'],
        ['uc-primera-b'],
        ['uc-primera-b'],
        ['uc-primera-b'],
      ],
    )
    assert.equal(script.calls[0]?.authorization, `Bearer ${TOKEN}`)
    assert.equal(report.sets[0]?.durationVerdict, 'new is faster')
    assert.equal(report.sets[0]?.old.cold?.durationMs.median, 5)
    assert.equal(report.sets[0]?.new.measured.rowsRead.median, 3)
    assert.equal(report.sets[1]?.rowCount, 1)

    const markdown = formatBenchmarkMarkdown(report)
    assert.match(markdown, /Otros/)
    assert.match(markdown, /cold/)
    assert.match(markdown, /new is faster/)
    assert.equal(markdown.includes(TOKEN), false)
    assert.equal(JSON.stringify(report).includes(TOKEN), false)
  })

  it('aborts when rows_written is greater than zero and does not send another query', async () => {
    const script = scriptedFetch([
      { sqlIncludes: 'SELECT id FROM', results: [], duration: 1, rowsRead: 0, rowsWritten: 2 },
      { sqlIncludes: 'clips.id', results: [], duration: 1, rowsRead: 0 },
    ])
    await assert.rejects(
      () =>
        runBenchmark({
          ...base,
          fetchImpl: script.fetchImpl,
          paramSets: [{ name: 'default', params: ['others'] }],
          warmupRuns: 0,
          measuredRuns: 1,
        }),
      /rows_written=2/,
    )
    assert.equal(script.calls.length, 1)
    assert.equal(JSON.stringify(script.calls).includes(TOKEN), true)
  })

  it('fails loudly when sorted rows differ and redacts the token from transport errors', async () => {
    const mismatch = scriptedFetch([
      { sqlIncludes: 'SELECT id FROM', results: [{ id: 1 }], duration: 1, rowsRead: 1 },
      { sqlIncludes: 'clips.id', results: [{ id: 9 }], duration: 1, rowsRead: 1 },
    ])
    await assert.rejects(
      () =>
        runBenchmark({
          ...base,
          fetchImpl: mismatch.fetchImpl,
          paramSets: [{ name: 'Otros', params: ['others'] }],
          warmupRuns: 0,
          measuredRuns: 1,
        }),
      /Result rows differ for Otros/,
    )

    const transport = scriptedFetch([
      {
        sqlIncludes: 'SELECT 1',
        results: [],
        duration: 1,
        rowsRead: 0,
        throwMessage: `network down ${TOKEN}`,
      },
    ])
    await assert.rejects(
      () =>
        executeReadOnlyQuery({
          fetchImpl: transport.fetchImpl,
          accountId: 'account-1',
          databaseId: 'database-1',
          token: TOKEN,
          sql: 'SELECT 1',
          params: [],
        }),
      (error: unknown) => {
        assert.ok(error instanceof BenchmarkError)
        assert.match(error.message, /\[redacted\]/)
        assert.equal(error.message.includes(TOKEN), false)
        return true
      },
    )
  })

  it('does not call fetch for a write, and reports noise when durations overlap', async () => {
    let calls = 0
    const fetchImpl: BenchmarkFetch = async () => {
      calls += 1
      const observation: QueryObservation = {
        results: [{ id: 1 }],
        durationMs: 1,
        roundTripMs: 1,
        rowsRead: 1,
        rowsWritten: 0,
      }
      return { ok: true, status: 200, text: async () => JSON.stringify(observation) }
    }
    await assert.rejects(
      () =>
        runBenchmark({
          ...base,
          oldSql: 'DELETE FROM clips',
          fetchImpl,
          paramSets: [{ name: 'default', params: [] }],
          warmupRuns: 0,
          measuredRuns: 1,
        }),
      /DELETE/,
    )
    assert.equal(calls, 0)

    const noisy = scriptedFetch([
      { sqlIncludes: 'SELECT id FROM', results: [{ id: 1 }], duration: 1.4, rowsRead: 5 },
      { sqlIncludes: 'clips.id', results: [{ id: 1 }], duration: 0.6, rowsRead: 25 },
      { sqlIncludes: 'SELECT id FROM', results: [{ id: 1 }], duration: 0.6, rowsRead: 5 },
      { sqlIncludes: 'clips.id', results: [{ id: 1 }], duration: 1.4, rowsRead: 25 },
    ])
    const report = await runBenchmark({
      ...base,
      fetchImpl: noisy.fetchImpl,
      paramSets: [{ name: 'UC Primera B', params: ['uc-primera-b'] }],
      warmupRuns: 0,
      measuredRuns: 2,
      thresholdMs: 1,
    })
    assert.equal(report.sets[0]?.durationVerdict, NO_MEANINGFUL_DIFFERENCE)
    assert.match(formatBenchmarkMarkdown(report), /no meaningful difference/)
  })
})

describe('secret redaction', () => {
  it('replaces every copy of the token', () => {
    assert.equal(redactSecret(`token ${TOKEN} and ${TOKEN}`, TOKEN), 'token [redacted] and [redacted]')
    assert.equal(redactSecret('plain', ''), 'plain')
  })
})
