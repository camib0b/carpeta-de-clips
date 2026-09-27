import { execFileSync } from 'node:child_process'

export type VideoProbe = {
  durationS: number
  fps: number
  keyframeTimesS: number[]
}

function parseFrameRate(rate: string): number {
  if (rate.includes('/')) {
    const [numerator, denominator] = rate.split('/').map(Number)
    if (!denominator) {
      throw new Error(`Invalid frame rate: ${rate}`)
    }
    return numerator / denominator
  }
  return Number(rate)
}

export function probeVideoWithFfprobe(filePath: string): VideoProbe {
  const json = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=r_frame_rate',
      '-show_entries',
      'format=duration',
      '-of',
      'json',
      filePath,
    ],
    { encoding: 'utf8' },
  )

  const parsed = JSON.parse(json) as {
    streams?: Array<{ r_frame_rate?: string }>
    format?: { duration?: string }
  }
  const stream = parsed.streams?.[0]
  const durationRaw = parsed.format?.duration
  if (!stream?.r_frame_rate || durationRaw == null) {
    throw new Error(`ffprobe could not read video stream for ${filePath}`)
  }

  const fps = parseFrameRate(stream.r_frame_rate)
  const durationS = Number(durationRaw)

  const keyframeCsv = execFileSync(
    'ffprobe',
    [
      '-v',
      'quiet',
      '-select_streams',
      'v:0',
      '-skip_frame',
      'nokey',
      '-show_entries',
      'frame=best_effort_timestamp_time',
      '-of',
      'csv=p=0',
      filePath,
    ],
    { encoding: 'utf8' },
  )

  const keyframeTimesS = keyframeCsv
    .split('\n')
    .map((line) => line.replace(/,$/, '').trim())
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isFinite(value))

  const keyframeSet = new Set<number>([0, durationS, ...keyframeTimesS])
  const sortedKeyframes = [...keyframeSet].sort((a, b) => a - b)

  return {
    durationS,
    fps,
    keyframeTimesS: sortedKeyframes,
  }
}
