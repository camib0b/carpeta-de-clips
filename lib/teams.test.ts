import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  LIST_TEAMS_WITH_KITS_SQL,
  RESOLVE_TEAM_BY_ALIAS_SQL,
  normalizeTeamAlias,
} from './teams'

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations')

function applyMigrations(database: DatabaseSync, names: string[]) {
  for (const name of names) {
    database.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8'))
  }
}

function resolveTeamSync(database: DatabaseSync, alias: string) {
  return database.prepare(RESOLVE_TEAM_BY_ALIAS_SQL).get(normalizeTeamAlias(alias)) as
    | {
        canonical_name: string
        confidence?: string
      }
    | undefined
}

describe('teams catalog', () => {
  it('normalizes aliases for case-insensitive lookup', () => {
    assert.equal(normalizeTeamAlias('  Old Reds '), 'old reds')
    assert.equal(normalizeTeamAlias('UCB'), 'ucb')
  })

  it('resolves aliases and marks OG / O.G as low-confidence rows in seed data', () => {
    const database = new DatabaseSync(':memory:')
    applyMigrations(database, ['0009_teams.sql', '0010_seed_teams.sql'])

    const oldReds = resolveTeamSync(database, 'old reds')
    assert.equal(oldReds?.canonical_name, 'Old Reds')

    const ucb = resolveTeamSync(database, 'UCB')
    assert.equal(ucb?.canonical_name, 'UC Primera B')

    const ogRow = database
      .prepare(
        `SELECT confidence FROM team_aliases WHERE alias_normalized = 'og'`,
      )
      .get() as { confidence: string }
    assert.equal(ogRow.confidence, 'low')

    const ogResolved = resolveTeamSync(database, 'OG')
    assert.equal(ogResolved?.canonical_name, 'Old Girls')

    const teams = database.prepare(LIST_TEAMS_WITH_KITS_SQL).all() as Array<{
      canonical_name: string
      home_kit: string | null
    }>
    assert.equal(teams.length, 12)
    const dunners = teams.find((team) => team.canonical_name === 'Dunners')
    assert.equal(dunners?.home_kit, 'light blue')
  })
})
