import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { landingTeamRowLabel } from './landing-team-row-label'
import { FEHOCH_ICON_PATH, getTeamIconPath, PLACEHOLDER_ICON_PATH } from './team-icons'

const repoRoot = path.resolve(import.meta.dirname, '..')

function source(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

const torneoNacionalSub16 = {
  id: 'catalog-sub-16',
  slug: 'catalog-sub-16',
  name: 'Otros - Torneo Sub-16 A',
}

const torneoNacionalPrimeraA = {
  id: 'catalog-primera-a',
  slug: 'catalog-primera-a',
  name: 'Otros - Torneo Primera A',
}

const plainOthers = {
  id: 'others',
  slug: 'others',
  name: 'Otros',
}

const ucPrimeraB = {
  id: 'uc-primera-b',
  slug: 'uc-primera-b',
  name: 'UC Primera B',
}

const ucSub16 = {
  id: 'uc-sub-16-a',
  slug: 'uc-sub-16-a',
  name: 'UC Sub-16 A',
}

const unknownClub = {
  id: 'old-boys',
  slug: 'old-boys',
  name: 'Old Boys',
}

test('landing and team page resolve the same insignia for one library', () => {
  const landingPage = source('app/page.tsx')
  const teamHeader = source('components/team-header.tsx')
  const teamIcon = source('components/team-icon.tsx')
  const resolver = source('lib/team-icons.ts')

  assert.match(landingPage, /<TeamIcon\s+team=\{team\}/)
  assert.match(teamHeader, /<TeamIcon\s+team=\{team\}/)
  assert.match(teamIcon, /getTeamIconPath\(team\)/)
  assert.equal(landingPage.includes('landingFolderUsesFehochMark'), false)
  assert.equal(landingPage.includes('/teams/'), false)
  assert.equal(teamHeader.includes('/teams/'), false)
  assert.equal(teamHeader.includes('getTeamIconPath'), false)
  assert.equal(resolver.includes('others-sub-16'), false)
  assert.equal(resolver.includes('others-primera-a'), false)
  assert.equal(resolver.includes('catalog-sub-16'), false)
  assert.equal(resolver.includes('catalog-primera-a'), false)

  const libraries = [
    torneoNacionalSub16,
    torneoNacionalPrimeraA,
    plainOthers,
    ucPrimeraB,
    ucSub16,
    unknownClub,
  ]

  for (const team of libraries) {
    const landingInsignia = getTeamIconPath(team)
    const teamPageInsignia = getTeamIconPath({
      id: team.id,
      name: team.name,
      slug: team.slug,
    })
    assert.equal(landingInsignia, teamPageInsignia)
  }

  assert.equal(landingTeamRowLabel(torneoNacionalSub16), 'Torneo Nacional Sub-16')
  assert.equal(getTeamIconPath(torneoNacionalSub16), FEHOCH_ICON_PATH)
  assert.equal(landingTeamRowLabel(torneoNacionalPrimeraA), 'Torneo Nacional Primera A')
  assert.equal(getTeamIconPath(torneoNacionalPrimeraA), FEHOCH_ICON_PATH)
  assert.equal(landingTeamRowLabel(plainOthers), 'Torneo Nacional Primera A')
  assert.equal(getTeamIconPath(plainOthers), FEHOCH_ICON_PATH)
  assert.notEqual(getTeamIconPath(torneoNacionalSub16), PLACEHOLDER_ICON_PATH)
  assert.notEqual(getTeamIconPath(torneoNacionalPrimeraA), PLACEHOLDER_ICON_PATH)

  assert.equal(landingTeamRowLabel(ucPrimeraB), 'UC Primera B')
  assert.equal(getTeamIconPath(ucPrimeraB), '/teams/uc-primera-b.png')
  assert.equal(getTeamIconPath(ucSub16), '/teams/uc-sub-16-a.png')
  assert.notEqual(getTeamIconPath(ucPrimeraB), FEHOCH_ICON_PATH)

  assert.equal(getTeamIconPath(unknownClub), PLACEHOLDER_ICON_PATH)
  assert.equal(
    getTeamIconPath({ id: 'otro-club', slug: 'otro-club', name: 'Otros' }),
    PLACEHOLDER_ICON_PATH,
  )
})
