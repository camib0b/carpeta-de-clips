/**
 * Derive clip instance timelines from compiled mp4 keyframes + match XML (local only).
 *
 *   pnpm exec tsx scripts/derive-clip-instances.ts <folder> <xml> --out instances.json
 *
 * Not bundled into the Worker.
 */
import fs from 'node:fs'
import path from 'node:path'

import { teamCodeFromCompiledFilename } from '../lib/ava-clip-filename'
import {
  derivedCandidateToInstances,
  findDerivedClipCandidates,
  resolveDerivedClipCandidate,
} from '../lib/derive-clip-instances-core'
import type { ClipInstanceInsert } from '../lib/clip-instances'
import { probeVideoWithFfprobe } from '../lib/ffprobe-media'
import {
  instancesForCode,
  parseMatchXmlInstances,
} from '../lib/match-xml-parse'

export type DerivedVideoInstances = {
  sourceVideo: string
  teamCode: string
  durationS: number
  fps: number
  instances: ClipInstanceInsert[]
}

export type DerivedInstancesError = {
  sourceVideo: string
  message: string
}

export type DerivedInstancesFile = {
  schemaVersion: 1
  folder: string
  xmlPath: string
  videos: DerivedVideoInstances[]
  errors: DerivedInstancesError[]
}

function parseArgs(argv: string[]) {
  const outFlagIndex = argv.indexOf('--out')
  if (outFlagIndex === -1 || outFlagIndex === argv.length - 1) {
    throw new Error(
      'Usage: tsx scripts/derive-clip-instances.ts <folder> <xml> --out instances.json',
    )
  }

  const outPath = path.resolve(argv[outFlagIndex + 1])
  const positional = argv.filter(
    (arg, index) => !arg.startsWith('--') && index !== outFlagIndex + 1,
  )
  if (positional.length < 2) {
    throw new Error(
      'Usage: tsx scripts/derive-clip-instances.ts <folder> <xml> --out instances.json',
    )
  }

  return {
    folder: path.resolve(positional[0]),
    xmlPath: path.resolve(positional[1]),
    outPath,
  }
}

function listCompiledMp4Files(folder: string): string[] {
  return fs
    .readdirSync(folder, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase().endsWith('.mp4') &&
        !entry.name.toLowerCase().includes('partido completo'),
    )
    .map((entry) => entry.name)
    .sort()
}

function deriveForFile(
  folder: string,
  filename: string,
  allXmlInstances: ReturnType<typeof parseMatchXmlInstances>,
): DerivedVideoInstances {
  const filePath = path.join(folder, filename)
  const teamCode = teamCodeFromCompiledFilename(filename)
  const probe = probeVideoWithFfprobe(filePath)
  const codeInstances = instancesForCode(allXmlInstances, teamCode)

  if (codeInstances.length === 0) {
    throw new Error(`${filename}: no XML instances with code ${teamCode}`)
  }

  const candidates = findDerivedClipCandidates(
    codeInstances,
    probe.keyframeTimesS,
    probe.durationS,
    probe.fps,
  )
  const chosen = resolveDerivedClipCandidate(
    candidates,
    `${filename} (${teamCode})`,
    (message) => process.stderr.write(`${message}\n`),
  )
  const instances = derivedCandidateToInstances(chosen, allXmlInstances)

  return {
    sourceVideo: filename,
    teamCode,
    durationS: probe.durationS,
    fps: probe.fps,
    instances,
  }
}

function main() {
  const { folder, xmlPath, outPath } = parseArgs(process.argv.slice(2))

  if (!fs.statSync(folder).isDirectory()) {
    throw new Error(`Not a directory: ${folder}`)
  }
  if (!fs.existsSync(xmlPath)) {
    throw new Error(`XML not found: ${xmlPath}`)
  }

  const xmlText = fs.readFileSync(xmlPath, 'utf8')
  const allXmlInstances = parseMatchXmlInstances(xmlText)
  const mp4Files = listCompiledMp4Files(folder)

  if (mp4Files.length === 0) {
    throw new Error(`No compiled mp4 files in ${folder}`)
  }

  const videos: DerivedVideoInstances[] = []
  const errors: DerivedInstancesError[] = []

  for (const filename of mp4Files) {
    try {
      const derived = deriveForFile(folder, filename, allXmlInstances)
      videos.push(derived)
      process.stderr.write(
        `${derived.sourceVideo}\t${derived.instances.length} plays\t${derived.durationS.toFixed(3)}s (${derived.teamCode})\n`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push({ sourceVideo: filename, message })
      process.stderr.write(`${filename}\tFAILED\t${message}\n`)
    }
  }

  const output: DerivedInstancesFile = {
    schemaVersion: 1,
    folder,
    xmlPath,
    videos,
    errors,
  }

  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`)

  if (errors.length > 0) {
    process.exitCode = 1
  }
}

main()
