/**
 * Build upsert payload for UCB vs OR (2026-09-26) with derived instances.
 *
 *   pnpm exec tsx scripts/build-ucb-or-import-payload.ts > /tmp/ucb-or.payload.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ClipInstanceInsert } from '../lib/clip-instances'
import type { DerivedInstancesFile } from './derive-clip-instances'

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

const DEFAULT_DERIVE_PATH = path.join(
  REPOSITORY_ROOT,
  'scripts',
  'fixtures',
  'ucb-vs-or-derived.json',
)

const MATCH_ID = '2026-09-26--UC_Primera_B--Old_Reds--Old_Reds'

const BASE_CLIPS = [
  {
    youtubeId: 'J9UmilJC89Q',
    title: 'OR 16-yd',
    gameConcept: 'Salidas',
    uploadedAt: '2026-09-26T20:00:00Z',
    sourceVideo: 'UC B vs OR - 16-yd OR.mp4',
  },
  {
    youtubeId: '4Xndr1EF0fk',
    title: 'UCB 16-yd',
    gameConcept: 'Salidas',
    uploadedAt: '2026-09-26T19:55:00Z',
    sourceVideo: 'UC B vs OR - 16-yd UC B.mp4',
  },
  {
    youtubeId: 'Mu_kV47bhpA',
    title: 'OR Corto',
    gameConcept: 'Corner Cortos',
    uploadedAt: '2026-09-26T19:50:00Z',
    sourceVideo: 'UC B vs OR - Corto OR.mp4',
  },
  {
    youtubeId: 'KMw-aUzQO-8',
    title: 'UCB Corto',
    gameConcept: 'Corner Cortos',
    uploadedAt: '2026-09-26T19:45:00Z',
    sourceVideo: 'UC B vs OR - Corto UC B.mp4',
  },
  {
    youtubeId: 'ALZh5G1i-2w',
    title: 'OR Gol',
    gameConcept: 'Goles',
    uploadedAt: '2026-09-26T19:40:00Z',
    sourceVideo: 'UC B vs OR - Gol OR.mp4',
  },
  {
    youtubeId: 'iccoVHY6Zeo',
    title: 'UCB Gol',
    gameConcept: 'Goles',
    uploadedAt: '2026-09-26T19:35:00Z',
    sourceVideo: 'UC B vs OR - Gol UC B.mp4',
  },
  {
    youtubeId: 'cGeuCG478Nk',
    title: 'OR Ingreso área',
    gameConcept: 'Ingresos al área',
    uploadedAt: '2026-09-26T19:30:00Z',
    sourceVideo: 'UC B vs OR - Ingreso área OR.mp4',
  },
  {
    youtubeId: 'Z109md2eY-E',
    title: 'UCB Ingreso área',
    gameConcept: 'Ingresos al área',
    uploadedAt: '2026-09-26T19:25:00Z',
    sourceVideo: 'UC B vs OR - Ingreso área UC B.mp4',
  },
] as const

function roundInstance(instance: ClipInstanceInsert): ClipInstanceInsert {
  return {
    ...instance,
    offsetS: Math.round(instance.offsetS * 1000) / 1000,
    durationS: Math.round(instance.durationS * 1000) / 1000,
  }
}

function main() {
  const derivePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_DERIVE_PATH

  if (!fs.existsSync(derivePath)) {
    throw new Error(
      `Missing derive JSON at ${derivePath}. Run derive-clip-instances.ts first or commit scripts/fixtures/ucb-vs-or-derived.json`,
    )
  }

  const derived = JSON.parse(
    fs.readFileSync(derivePath, 'utf8'),
  ) as DerivedInstancesFile

  const instancesBySource = new Map<string, ClipInstanceInsert[]>()
  for (const video of derived.videos) {
    instancesBySource.set(
      video.sourceVideo,
      video.instances.map(roundInstance),
    )
  }

  const clips = BASE_CLIPS.map((clip) => {
    const instances = instancesBySource.get(clip.sourceVideo)
    return instances ? { ...clip, instances } : { ...clip }
  })

  const payload = {
    match: {
      id: MATCH_ID,
      playedOn: '2026-09-26',
      homeTeam: 'UC Primera B',
      awayTeam: 'Old Reds',
      homeGoals: 1,
      awayGoals: 3,
      shootoutWinner: null,
      place: null,
      division: 'Primera A',
      libraryId: 'uc-primera-b',
      rivalLabel: 'Old Reds',
      youtubePlaylistId: null,
      r2XmlObjectKey: 'UCB vs OR.xml',
    },
    clips,
  }

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
}

main()
