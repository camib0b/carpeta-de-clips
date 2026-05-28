import { videoClips } from '../lib/data'
import { buildMatchKeyFromClip, matchKeyToStorageSlug } from '../lib/match-keys'

const slugs = new Map<string, string>()

for (const clip of videoClips) {
  const matchKey = buildMatchKeyFromClip(clip)
  const slug = matchKeyToStorageSlug(matchKey)
  if (!slugs.has(slug)) {
    slugs.set(slug, matchKey)
  }
}

for (const [slug, matchKey] of [...slugs.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`${slug}.xml  ←  ${matchKey}`)
}
