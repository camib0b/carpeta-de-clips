/**
 * Clip instance rows (compiled-mp4 timeline) for D1 import and sidecar validation.
 */

export type ClipInstanceInsert = {
  ord: number
  offsetS: number
  durationS: number
  quarter?: string | null
  scoreLabel?: string | null
  xmlInstanceId?: number | null
}

export type ClipsSidecarClip = {
  ord: number
  offsetS: number
  durationS: number
  sourceStartS?: number
  sourceEndS?: number
  xmlInstanceId?: number
  labels?: {
    QUARTOS?: string
    RESULTADO?: string
  }
}

export type ClipsSidecar = {
  schemaVersion: number
  video: string
  fps?: number
  durationS: number
  team?: string
  code?: string
  overlayLabel?: string
  verified?: boolean
  clips: ClipsSidecarClip[]
}

const DURATION_TOLERANCE_S = 0.1

export function basenameFromVideoPath(videoPath: string): string {
  const normalized = videoPath.replaceAll('\\', '/')
  const segments = normalized.split('/')
  return segments[segments.length - 1] ?? videoPath
}

export function sidecarClipToInstanceInsert(
  clip: ClipsSidecarClip,
): ClipInstanceInsert {
  return {
    ord: clip.ord,
    offsetS: clip.offsetS,
    durationS: clip.durationS,
    quarter: clip.labels?.QUARTOS ?? null,
    scoreLabel: clip.labels?.RESULTADO ?? null,
    xmlInstanceId: clip.xmlInstanceId ?? null,
  }
}

export function validateClipsSidecar(
  sidecar: ClipsSidecar,
  options?: { allowUnverified?: boolean },
): void {
  if (sidecar.schemaVersion !== 1) {
    throw new Error(
      `Unsupported schemaVersion ${sidecar.schemaVersion} (expected 1) for ${sidecar.video}`,
    )
  }

  if (sidecar.verified === false && !options?.allowUnverified) {
    throw new Error(
      `Sidecar ${sidecar.video} is not verified; pass --allow-unverified to import`,
    )
  }

  const segments = sidecar.clips ?? []
  if (segments.length === 0) {
    throw new Error(`Sidecar ${sidecar.video} has no clips[] entries`)
  }

  for (let index = 0; index < segments.length; index += 1) {
    const expectedOrd = index + 1
    const segment = segments[index]
    if (segment.ord !== expectedOrd) {
      throw new Error(
        `Sidecar ${sidecar.video}: expected ord ${expectedOrd}, got ${segment.ord}`,
      )
    }
    if (index > 0 && segment.offsetS <= segments[index - 1].offsetS) {
      throw new Error(
        `Sidecar ${sidecar.video}: offsetS must be strictly increasing (ord ${segment.ord})`,
      )
    }
  }

  const last = segments[segments.length - 1]
  const compiledEndS = last.offsetS + last.durationS
  if (Math.abs(compiledEndS - sidecar.durationS) > DURATION_TOLERANCE_S) {
    throw new Error(
      `Sidecar ${sidecar.video}: last segment ends at ${compiledEndS}s but durationS is ${sidecar.durationS}s`,
    )
  }
}

export function instancesFromSidecar(sidecar: ClipsSidecar): ClipInstanceInsert[] {
  validateClipsSidecar(sidecar)
  return sidecar.clips.map(sidecarClipToInstanceInsert)
}
