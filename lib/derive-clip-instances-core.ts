import type { ClipInstanceInsert } from './clip-instances'
import type { MatchXmlInstance } from './match-xml-parse'
import { quarterAtTime } from './match-xml-parse'

export function roundDurationUpToFrame(durationS: number, fps: number): number {
  const frameCount = Math.ceil(durationS * fps - 1e-9)
  return frameCount / fps
}

export function isNearFrame(
  timeS: number,
  targetS: number,
  fps: number,
  frameSlack = 1,
): boolean {
  const frameS = 1 / fps
  return Math.abs(timeS - targetS) <= frameSlack * frameS + 1e-9
}

export function durationsMatchWithinFrames(
  durationAS: number,
  durationBS: number,
  fps: number,
  slackFrames = 1,
): boolean {
  const framesA = Math.ceil(durationAS * fps - 1e-9)
  const framesB = Math.ceil(durationBS * fps - 1e-9)
  return Math.abs(framesA - framesB) <= slackFrames
}

export function nearestKeyframe(
  timeS: number,
  keyframesS: number[],
  fps: number,
  frameSlack = 1,
): number | null {
  for (const keyframe of keyframesS) {
    if (isNearFrame(timeS, keyframe, fps, frameSlack)) {
      return keyframe
    }
  }
  return null
}

export type XmlInstancePick = {
  xmlInstance: MatchXmlInstance
  frameRoundedDurationS: number
}

export type DerivedClipCandidate = {
  xmlPicks: XmlInstancePick[]
  boundaryTimesS: number[]
}

function describeCandidate(candidate: DerivedClipCandidate): string {
  const ids = candidate.xmlPicks.map((pick) => pick.xmlInstance.id).join(',')
  const boundaries = candidate.boundaryTimesS
    .map((time) => time.toFixed(3))
    .join(' → ')
  return `XML IDs [${ids}] boundaries ${boundaries}`
}

function boundarySignature(candidate: DerivedClipCandidate): string {
  return candidate.boundaryTimesS.map((time) => time.toFixed(4)).join('|')
}

function xmlIdSignature(candidate: DerivedClipCandidate): string {
  return candidate.xmlPicks.map((pick) => String(pick.xmlInstance.id)).join(',')
}

export function findDerivedClipCandidates(
  xmlInstances: MatchXmlInstance[],
  keyframesS: number[],
  videoDurationS: number,
  fps: number,
): DerivedClipCandidate[] {
  const rawSolutions: DerivedClipCandidate[] = []

  function dfs(
    xmlIndex: number,
    cumulativeS: number,
    picks: XmlInstancePick[],
    boundaries: number[],
  ): void {
    if (
      picks.length > 0 &&
      isNearFrame(cumulativeS, videoDurationS, fps, picks.length)
    ) {
      rawSolutions.push({
        xmlPicks: picks,
        boundaryTimesS: boundaries,
      })
      return
    }

    if (xmlIndex >= xmlInstances.length || cumulativeS > videoDurationS + 1) {
      return
    }

    dfs(xmlIndex + 1, cumulativeS, picks, boundaries)

    const xmlInstance = xmlInstances[xmlIndex]
    const sourceDurationS = xmlInstance.endS - xmlInstance.startS
    const frameRoundedDurationS = roundDurationUpToFrame(sourceDurationS, fps)
    const nextCumulativeS = cumulativeS + frameRoundedDurationS
    const landingSlackFrames = picks.length + 1
    if (
      nearestKeyframe(
        nextCumulativeS,
        keyframesS,
        fps,
        landingSlackFrames,
      ) == null
    ) {
      return
    }

    dfs(
      xmlIndex + 1,
      nextCumulativeS,
      [...picks, { xmlInstance, frameRoundedDurationS }],
      [...boundaries, nextCumulativeS],
    )
  }

  dfs(0, 0, [], [])

  const byXmlIds = new Map<string, DerivedClipCandidate>()
  for (const candidate of rawSolutions) {
    byXmlIds.set(xmlIdSignature(candidate), candidate)
  }
  const uniqueByXml = [...byXmlIds.values()]

  const byBoundaries = new Map<string, DerivedClipCandidate[]>()
  for (const candidate of uniqueByXml) {
    const signature = boundarySignature(candidate)
    const group = byBoundaries.get(signature) ?? []
    group.push(candidate)
    byBoundaries.set(signature, group)
  }

  if (byBoundaries.size !== 1) {
    return uniqueByXml
  }

  const soleBoundaryGroup = [...byBoundaries.values()][0]
  return soleBoundaryGroup
}

export function requireUniqueDerivedCandidate(
  candidates: DerivedClipCandidate[],
  context: string,
): DerivedClipCandidate {
  if (candidates.length === 0) {
    throw new Error(`${context}: no valid XML instance subset matches keyframes`)
  }

  const boundaryGroups = new Map<string, DerivedClipCandidate[]>()
  for (const candidate of candidates) {
    const signature = boundarySignature(candidate)
    const group = boundaryGroups.get(signature) ?? []
    group.push(candidate)
    boundaryGroups.set(signature, group)
  }

  if (boundaryGroups.size > 1) {
    const listing = candidates.map(describeCandidate).join('\n')
    throw new Error(
      `${context}: ${boundaryGroups.size} distinct timelines; refusing to guess:\n${listing}`,
    )
  }

  return candidates[0]
}

/**
 * Resolves a unique timeline; when several XML ID paths share identical boundaries,
 * picks the lexicographically smallest ID sequence and reports ambiguity.
 */
export function resolveDerivedClipCandidate(
  candidates: DerivedClipCandidate[],
  context: string,
  warn: (message: string) => void = () => {},
): DerivedClipCandidate {
  if (candidates.length === 0) {
    throw new Error(`${context}: no valid XML instance subset matches keyframes`)
  }

  const boundaryGroups = new Map<string, DerivedClipCandidate[]>()
  for (const candidate of candidates) {
    const signature = boundarySignature(candidate)
    const group = boundaryGroups.get(signature) ?? []
    group.push(candidate)
    boundaryGroups.set(signature, group)
  }

  if (boundaryGroups.size > 1) {
    const listing = candidates.map(describeCandidate).join('\n')
    throw new Error(
      `${context}: ${boundaryGroups.size} distinct timelines; refusing to guess:\n${listing}`,
    )
  }

  const timelineGroup = [...boundaryGroups.values()][0]
  const sorted = [...timelineGroup].sort((left, right) =>
    xmlIdSignature(left).localeCompare(xmlIdSignature(right)),
  )

  if (sorted.length > 1) {
    warn(
      `${context}: ${sorted.length} XML subsets match the same timeline; using IDs [${sorted[0].xmlPicks.map((p) => p.xmlInstance.id).join(', ')}]`,
    )
  }

  return sorted[0]
}

export function derivedCandidateToInstances(
  candidate: DerivedClipCandidate,
  allXmlInstances: MatchXmlInstance[],
): ClipInstanceInsert[] {
  let offsetS = 0
  const instances: ClipInstanceInsert[] = []

  for (let index = 0; index < candidate.xmlPicks.length; index += 1) {
    const pick = candidate.xmlPicks[index]
    const xmlInstance = pick.xmlInstance
    const durationS = pick.frameRoundedDurationS
    const quarter =
      xmlInstance.labels.QUARTOS ??
      quarterAtTime(allXmlInstances, xmlInstance.startS) ??
      null

    instances.push({
      ord: index + 1,
      offsetS,
      durationS,
      quarter,
      scoreLabel: xmlInstance.labels.RESULTADO ?? null,
      xmlInstanceId: xmlInstance.id,
    })

    offsetS += durationS
  }

  return instances
}
