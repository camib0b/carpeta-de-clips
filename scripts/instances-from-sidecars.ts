/**
 * Merge AVA `*.clips.json` sidecars into a playlist upsert payload.
 *
 *   pnpm exec tsx scripts/instances-from-sidecars.ts <match-folder> payload.json
 *   pnpm exec tsx scripts/instances-from-sidecars.ts --allow-unverified <folder> payload.json
 *
 * Writes the updated payload to stdout; use shell redirection to save in place.
 */
import fs from 'node:fs'
import path from 'node:path'

import type { CatalogClipInsert } from '../lib/catalog-upsert'
import {
  basenameFromVideoPath,
  instancesFromSidecar,
  type ClipsSidecar,
  validateClipsSidecar,
} from '../lib/clip-instances'

type UpsertPayload = {
  match: { id: string }
  clips: CatalogClipInsert[]
}

function parseArgs(argv: string[]) {
  const allowUnverified = argv.includes('--allow-unverified')
  const positional = argv.filter((arg) => !arg.startsWith('--'))
  if (positional.length < 2) {
    throw new Error(
      'Usage: tsx scripts/instances-from-sidecars.ts [--allow-unverified] <match-folder> payload.json',
    )
  }
  return {
    allowUnverified,
    matchFolder: path.resolve(positional[0]),
    payloadPath: path.resolve(positional[1]),
  }
}

function readSidecars(folder: string): ClipsSidecar[] {
  const entries = fs.readdirSync(folder, { withFileTypes: true })
  const sidecarPaths = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.clips.json'))
    .map((entry) => path.join(folder, entry.name))
    .sort()

  return sidecarPaths.map((filePath) => {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ClipsSidecar
    if (raw.video == null || raw.video === '') {
      const stem = path.basename(filePath).replace(/\.clips\.json$/i, '')
      raw.video = `${stem}.mp4`
    }
    return raw
  })
}

function sourceVideoBasename(clip: CatalogClipInsert): string | null {
  if (!clip.sourceVideo) {
    return null
  }
  return basenameFromVideoPath(clip.sourceVideo)
}

function findClipForSidecar(
  clips: CatalogClipInsert[],
  sidecar: ClipsSidecar,
): CatalogClipInsert | undefined {
  const sidecarBasename = basenameFromVideoPath(sidecar.video)
  const sidecarStem = sidecarBasename.replace(/\.mp4$/i, '')

  const bySourceVideo = clips.find((clip) => {
    const clipBasename = sourceVideoBasename(clip)
    return clipBasename != null && clipBasename === sidecarBasename
  })
  if (bySourceVideo) {
    return bySourceVideo
  }

  return clips.find(
    (clip) => clip.title.trim() === sidecarStem || clip.title.trim() === sidecarBasename,
  )
}

function main() {
  const { allowUnverified, matchFolder, payloadPath } = parseArgs(
    process.argv.slice(2),
  )

  if (!fs.statSync(matchFolder).isDirectory()) {
    throw new Error(`Not a directory: ${matchFolder}`)
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8')) as UpsertPayload
  if (!Array.isArray(payload.clips)) {
    throw new Error('payload.json must include clips[]')
  }

  const sidecars = readSidecars(matchFolder)
  if (sidecars.length === 0) {
    throw new Error(`No *.clips.json files in ${matchFolder}`)
  }

  for (const sidecar of sidecars) {
    validateClipsSidecar(sidecar, { allowUnverified })
    const clip = findClipForSidecar(payload.clips, sidecar)
    if (!clip) {
      throw new Error(
        `No payload clip matches sidecar video ${sidecar.video} (set clips[].sourceVideo or align title)`,
      )
    }

    clip.instances = instancesFromSidecar(sidecar)

    const segmentCount = clip.instances.length
    const finalDurationS = sidecar.durationS
    process.stderr.write(
      `${clip.title}\t${segmentCount} plays\t${finalDurationS.toFixed(3)}s\n`,
    )
  }

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
}

main()
