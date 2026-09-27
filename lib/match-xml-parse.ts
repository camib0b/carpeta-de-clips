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

export function parseMatchXmlInstances(xmlText: string): MatchXmlInstance[] {
  const instances: MatchXmlInstance[] = []
  const instancePattern = /<instance>([\s\S]*?)<\/instance>/g

  for (const match of xmlText.matchAll(instancePattern)) {
    const block = match[1]
    const id = readTag(block, 'ID')
    const start = readTag(block, 'start')
    const end = readTag(block, 'end')
    const code = readTag(block, 'code')
    if (id == null || start == null || end == null || code == null) {
      continue
    }

    const labels: Record<string, string> = {}
    const labelPattern =
      /<label>\s*<group>([^<]*)<\/group>\s*<text>([^<]*)<\/text>\s*<\/label>/g
    for (const labelMatch of block.matchAll(labelPattern)) {
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

function readTag(block: string, tag: string): string | null {
  const pattern = new RegExp(`<${tag}>([^<]*)</${tag}>`)
  const found = block.match(pattern)
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
