import assert from 'node:assert/strict'
import test from 'node:test'

import {
  landingFolderUsesFehochMark,
  landingTeamRowLabel,
} from './landing-team-row-label'

test('Otros - Torneo Sub-16 A is Torneo Nacional Sub-16', () => {
  const team = { id: 'others-sub-16', name: 'Otros - Torneo Sub-16 A' }
  assert.equal(landingTeamRowLabel(team), 'Torneo Nacional Sub-16')
  assert.equal(landingFolderUsesFehochMark(team), true)
})

test('Otros - Torneo Primera A is Torneo Nacional Primera A', () => {
  const team = { id: 'others-primera-a', name: 'Otros - Torneo Primera A' }
  assert.equal(landingTeamRowLabel(team), 'Torneo Nacional Primera A')
  assert.equal(landingFolderUsesFehochMark(team), true)
})

test('extra spaces still match the two tournament folders', () => {
  assert.equal(
    landingTeamRowLabel({ id: 'others', name: '  Otros -  Torneo   Sub-16 A  ' }),
    'Torneo Nacional Sub-16',
  )
  assert.equal(
    landingTeamRowLabel({ id: 'others', name: 'otros - torneo primera a' }),
    'Torneo Nacional Primera A',
  )
})

test('the others library stored as plain Otros is Torneo Nacional Primera A', () => {
  const team = { id: 'others', slug: 'others', name: 'Otros' }
  assert.equal(landingTeamRowLabel(team), 'Torneo Nacional Primera A')
  assert.equal(landingFolderUsesFehochMark(team), true)
  assert.equal(landingTeamRowLabel(team).includes('pendiente'), false)
})

test('plain Otros still maps with extra spaces or only the others slug', () => {
  assert.equal(
    landingTeamRowLabel({ id: 'others', name: '  Otros  ' }),
    'Torneo Nacional Primera A',
  )
  assert.equal(
    landingTeamRowLabel({ id: 'library-row', slug: 'others', name: 'otros' }),
    'Torneo Nacional Primera A',
  )
  assert.equal(
    landingFolderUsesFehochMark({ id: 'library-row', slug: 'others', name: 'otros' }),
    true,
  )
})

test('a different library named Otros keeps its catalog name', () => {
  const team = { id: 'otro-club', slug: 'otro-club', name: 'Otros' }
  assert.equal(landingTeamRowLabel(team), 'Otros')
  assert.equal(landingFolderUsesFehochMark(team), false)
})

test('an unmapped Otros title is left unchanged', () => {
  const name =
    'Otros - Torneo Metropolitano Femenino de Hockey Césped Benachrichtigungseinstellungen'
  const team = { id: 'metro', name }
  assert.equal(landingTeamRowLabel(team), name)
  assert.equal(landingFolderUsesFehochMark(team), false)
})

test('other libraries keep their catalog name and shield', () => {
  const team = { id: 'uc-primera-b', name: 'UC Primera B' }
  assert.equal(landingTeamRowLabel(team), 'UC Primera B')
  assert.equal(landingFolderUsesFehochMark(team), false)
})
