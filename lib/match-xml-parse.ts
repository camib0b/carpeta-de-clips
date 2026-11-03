/**
 * Parse AVA match XML `<instance>` rows (local scripts only).
 */

export type MatchXmlInstance = {
  id: number
  startS: number
  endS: number
  code: string
  labels: Record<string, string>
}

const INSTANCE_BLOCK_PATTERN = /<instance>([\s\S]*?)<\/instance>/g
const LABEL_BLOCK_PATTERN =
  /<label>\s*<group>([^<]*)<\/group>\s*<text>([^<]*)<\/text>\s*<\/label>/g

const TAG_VALUE_PATTERNS = {
  ID: /<ID>([^<]*)<\/ID>/,
  start: /<start>([^<]*)<\/start>/,
  end: /<end>([^<]*)<\/end>/,
  code: /<code>([^<]*)<\/code>/,
} as const

type MatchXmlTag = keyof typeof TAG_VALUE_PATTERNS

function matchesFromStart(
  text: string,
  pattern: RegExp,
): RegExpStringIterator<RegExpExecArray> {
  pattern.lastIndex = 0
  return text.matchAll(pattern)
}

export function parseMatchXmlInstances(xmlText: string): MatchXmlInstance[] {
  const instances: MatchXmlInstance[] = []

  for (const match of matchesFromStart(xmlText, INSTANCE_BLOCK_PATTERN)) {
    const block = match[1]
    const id = readTag(block, 'ID')
    const start = readTag(block, 'start')
    const end = readTag(block, 'end')
    const code = readTag(block, 'code')
    if (id == null || start == null || end == null || code == null) {
      continue
    }

    const labels: Record<string, string> = {}
    for (const labelMatch of matchesFromStart(block, LABEL_BLOCK_PATTERN)) {
      labels[labelMatch[1].trim()] = labelMatch[2].trim()
    }

    instances.push({
      id: Number(id),
      startS: Number(start),
      endS: Number(end),
      code,
      labels,
    })
  }

  return instances
}

function readTag(block: string, tag: MatchXmlTag): string | null {
  const found = block.match(TAG_VALUE_PATTERNS[tag])
  return found ? found[1].trim() : null
}

export function instancesForCode(
  instances: MatchXmlInstance[],
  teamCode: string,
): MatchXmlInstance[] {
  return instances.filter((instance) => instance.code === teamCode)
}

const QUARTER_CODES = new Set(['Q1', 'Q2', 'Q3', 'Q4'])

export function quarterAtTime(
  instances: MatchXmlInstance[],
  timeS: number,
): string | null {
  for (const instance of instances) {
    if (!QUARTER_CODES.has(instance.code)) {
      continue
    }
    if (timeS >= instance.startS && timeS < instance.endS) {
      return instance.code
    }
  }
  return null
}
