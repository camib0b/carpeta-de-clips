import assert from 'node:assert/strict'
import test from 'node:test'

import {
  FEHOCH_TOURNAMENT_NAME_PLACEHOLDER,
  landingFolderUsesFehochMark,
  landingTeamRowLabel,
} from './landing-team-row-label'

test('Otros - Torneo folders show the tournament name', () => {
  const team = { id: 'metro', name: 'Otros - Torneo Metropolitano' }
  assert.equal(landingTeamRowLabel(team), 'Torneo Metropolitano')
  assert.equal(landingFolderUsesFehochMark(team), true)
})

test('a long tournament name is kept in full', () => {
  const name =
    'Otros - Torneo Metropolitano Femenino de Hockey Césped Benachrichtigungseinstellungen'
  assert.equal(
    landingTeamRowLabel({ id: 'metro', name }),
    'Torneo Metropolitano Femenino de Hockey Césped Benachrichtigungseinstellungen',
  )
})

test('the others library without a tournament name uses the marked placeholder', () => {
  const team = { id: 'others', name: 'Otros' }
  assert.equal(landingTeamRowLabel(team), FEHOCH_TOURNAMENT_NAME_PLACEHOLDER)
  assert.equal(landingFolderUsesFehochMark(team), true)
  assert.match(FEHOCH_TOURNAMENT_NAME_PLACEHOLDER, /pendiente/)
})

test('other libraries keep their catalog name and shield', () => {
  const team = { id: 'uc-primera-b', name: 'UC Primera B' }
  assert.equal(landingTeamRowLabel(team), 'UC Primera B')
  assert.equal(landingFolderUsesFehochMark(team), false)
})
