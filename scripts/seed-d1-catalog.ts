/**
 * One-shot catalog seed.
 *
 * Reads `lib/clip-catalog.ts` + `lib/match-xml-catalog.ts` when those still
 * export source data, then writes `migrations/0002_seed_catalog.sql`.
 *
 * After the clip array is removed, apply the committed migration instead:
 *   pnpm run db:migrate:local
 *   pnpm run db:migrate:remote
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { storageSlugFromClip } from '../lib/match-keys'
import type { VideoClip } from '../lib/types'

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, '..')
const CLIP_CATALOG_PATH = path.join(REPOSITORY_ROOT, 'lib', 'clip-catalog.ts')
const SEED_MIGRATION_PATH = path.join(
  REPOSITORY_ROOT,
  'migrations',
  '0002_seed_catalog.sql',
)

const LIBRARIES = [
  { id: 'uc-sub-16-a', name: 'UC Sub-16 A', sortOrder: 1 },
  { id: 'uc-primera-b', name: 'UC Primera B', sortOrder: 2 },
  { id: 'others', name: 'Others', sortOrder: 3 },
] as const

type SeedMatch = {
  id: string
  playedOn: string
  homeTeam: string
  awayTeam: string
  homeGoals: number | null
  awayGoals: number | null
  shootoutWinner: string | null
  place: string | null
  division: string | null
  libraryId: string
  rivalLabel: string
  youtubePlaylistId: string | null
  r2XmlObjectKey: string | null
}

type SeedClip = {
  youtubeId: string
  matchId: string
  title: string
  gameConcept: string
  uploadedAt: string
}

function sqlString(value: string | null): string {
  if (value == null) {
    return 'NULL'
  }
  return `'${value.replaceAll("'", "''")}'`
}

function sqlInteger(value: number | null): string {
  if (value == null) {
    return 'NULL'
  }
  return String(value)
}

function libraryIdFromClip(clip: VideoClip): string {
  if (clip.libraryName === 'Others') {
    return 'others'
  }
  if (clip.homeTeam === 'UC Primera B' || clip.awayTeam === 'UC Primera B') {
    return 'uc-primera-b'
  }
  if (clip.homeTeam === 'UC Sub-16 A' || clip.awayTeam === 'UC Sub-16 A') {
    return 'uc-sub-16-a'
  }
  return 'others'
}

function parsePlaylistIdsByYoutubeId(source: string): Map<string, string> {
  const playlistByYoutubeId = new Map<string, string>()
  let currentPlaylistId: string | null = null

  for (const line of source.split('\n')) {
    const playlistMatch = line.match(/Playlist:\s*(PL[A-Za-z0-9_-]+)/)
    if (playlistMatch) {
      currentPlaylistId = playlistMatch[1]
    }

    const youtubeMatch = line.match(/youtubeId:\s*'([^']+)'/)
    if (youtubeMatch && currentPlaylistId) {
      playlistByYoutubeId.set(youtubeMatch[1], currentPlaylistId)
    }
  }

  return playlistByYoutubeId
}

function nullableNumber(value: number | undefined): number | null {
  return value == null ? null : value
}

function nullableString(value: string | undefined): string | null {
  return value == null || value === '' ? null : value
}

function buildCatalog(
  clips: VideoClip[],
  sourceText: string,
  xmlObjectKeyByStorageSlug: Record<string, { objectKey: string }>,
) {
  const playlistByYoutubeId = parsePlaylistIdsByYoutubeId(sourceText)
  const matchesById = new Map<string, SeedMatch>()
  const seedClips: SeedClip[] = []
  const seenYoutubeIds = new Set<string>()
  let skippedDuplicateYoutubeIds = 0

  for (const clip of clips) {
    if (seenYoutubeIds.has(clip.youtubeId)) {
      skippedDuplicateYoutubeIds += 1
      continue
    }
    seenYoutubeIds.add(clip.youtubeId)

    const matchId = storageSlugFromClip(clip)
    const libraryId = libraryIdFromClip(clip)
    const catalogEntry = xmlObjectKeyByStorageSlug[matchId]

    if (!matchesById.has(matchId)) {
      matchesById.set(matchId, {
        id: matchId,
        playedOn: clip.date,
        homeTeam: clip.homeTeam,
        awayTeam: clip.awayTeam,
        homeGoals: nullableNumber(clip.homeGoals),
        awayGoals: nullableNumber(clip.awayGoals),
        shootoutWinner: nullableString(clip.shootoutWinner),
        place: nullableString(clip.place),
        division: nullableString(clip.division),
        libraryId,
        rivalLabel: clip.rivalTeam,
        youtubePlaylistId: playlistByYoutubeId.get(clip.youtubeId) ?? null,
        r2XmlObjectKey: catalogEntry?.objectKey ?? null,
      })
    }

    seedClips.push({
      youtubeId: clip.youtubeId,
      matchId,
      title: clip.title,
      gameConcept: clip.gameConcept,
      uploadedAt: clip.uploadedAt,
    })
  }

  return {
    matches: [...matchesById.values()],
    clips: seedClips,
    skippedDuplicateYoutubeIds,
  }
}

function renderSeedSql(matches: SeedMatch[], clips: SeedClip[]): string {
  const libraryRows = LIBRARIES.map(
    (library) =>
      `  (${sqlString(library.id)}, ${sqlString(library.name)}, ${library.sortOrder})`,
  ).join(',\n')

  const matchRows = matches
    .map(
      (match) =>
        `  (${sqlString(match.id)}, ${sqlString(match.playedOn)}, ${sqlString(match.homeTeam)}, ${sqlString(match.awayTeam)}, ${sqlInteger(match.homeGoals)}, ${sqlInteger(match.awayGoals)}, ${sqlString(match.shootoutWinner)}, ${sqlString(match.place)}, ${sqlString(match.division)}, ${sqlString(match.libraryId)}, ${sqlString(match.rivalLabel)}, ${sqlString(match.youtubePlaylistId)}, ${sqlString(match.r2XmlObjectKey)})`,
    )
    .join(',\n')

  const clipRows = clips
    .map(
      (clip) =>
        `  (${sqlString(clip.youtubeId)}, ${sqlString(clip.matchId)}, ${sqlString(clip.title)}, ${sqlString(clip.gameConcept)}, ${sqlString(clip.uploadedAt)})`,
    )
    .join(',\n')

  return `-- Generated by scripts/seed-d1-catalog.ts from lib/clip-catalog.ts + lib/match-xml-catalog.ts.
-- Scores, dates, and XML object keys are copied from the existing catalog; nothing is invented.
-- Idempotent: INSERT OR IGNORE so re-running the file does not duplicate youtube_id rows.

INSERT OR IGNORE INTO libraries (id, name, sort_order) VALUES
${libraryRows};

INSERT OR IGNORE INTO matches (
  id,
  played_on,
  home_team,
  away_team,
  home_goals,
  away_goals,
  shootout_winner,
  place,
  division,
  library_id,
  rival_label,
  youtube_playlist_id,
  r2_xml_object_key
) VALUES
${matchRows};

INSERT OR IGNORE INTO clips (
  youtube_id,
  match_id,
  title,
  game_concept,
  uploaded_at
) VALUES
${clipRows};
`
}

async function loadLegacyClips(): Promise<VideoClip[] | null> {
  try {
    const catalogModule = (await import('../lib/clip-catalog')) as {
      videoClips?: VideoClip[]
    }
    if (Array.isArray(catalogModule.videoClips) && catalogModule.videoClips.length > 0) {
      return catalogModule.videoClips
    }
  } catch {
    return null
  }
  return null
}

async function loadXmlObjectKeyCatalog(): Promise<
  Record<string, { objectKey: string }>
> {
  try {
    const catalogModule = (await import('../lib/match-xml-catalog')) as {
      MATCH_XML_R2_OBJECT_BY_STORAGE_SLUG?: Record<string, { objectKey: string }>
    }
    return catalogModule.MATCH_XML_R2_OBJECT_BY_STORAGE_SLUG ?? {}
  } catch {
    return {}
  }
}

async function main() {
  const legacyClips = await loadLegacyClips()
  if (!legacyClips) {
    console.log(
      'lib/clip-catalog.ts no longer exports videoClips. Apply the committed seed with:\n' +
        '  pnpm run db:migrate:local\n' +
        '  pnpm run db:migrate:remote',
    )
    return
  }

  const sourceText = fs.readFileSync(CLIP_CATALOG_PATH, 'utf8')
  const xmlObjectKeyByStorageSlug = await loadXmlObjectKeyCatalog()
  const { matches, clips, skippedDuplicateYoutubeIds } = buildCatalog(
    legacyClips,
    sourceText,
    xmlObjectKeyByStorageSlug,
  )
  const sql = renderSeedSql(matches, clips)
  fs.writeFileSync(SEED_MIGRATION_PATH, sql)

  const xmlMatchCount = matches.filter((match) => match.r2XmlObjectKey).length
  const playlistMatchCount = matches.filter((match) => match.youtubePlaylistId)
    .length

  console.log(`Wrote ${path.relative(REPOSITORY_ROOT, SEED_MIGRATION_PATH)}`)
  console.log(`libraries: ${LIBRARIES.length}`)
  console.log(`matches: ${matches.length}`)
  console.log(`clips: ${clips.length}`)
  console.log(`skipped duplicate youtube_id: ${skippedDuplicateYoutubeIds}`)
  console.log(`matches with playlist id: ${playlistMatchCount}`)
  console.log(`matches with r2_xml_object_key: ${xmlMatchCount}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
