/**
 * Map AVA compiled-mp4 filenames to XML `<code>` values (local import scripts).
 */

const TEAM_TOKEN_TO_XML_PREFIX: Record<string, string> = {
  OR: 'OR',
  'UC B': 'UCB',
  UCB: 'UCB',
}

const OVERLAY_TO_CODE_SUFFIX: Record<string, string> = {
  '16-yd': '16YD+',
  'Corto': 'SPC+',
  Gol: 'GOAL+',
  'Ingreso área': 'ENTRY+',
  'Ingreso area': 'ENTRY+',
}

export function parseCompiledMp4Stem(filename: string): {
  overlayLabel: string
  teamToken: string
} {
  const stem = filename.replace(/\.mp4$/i, '')
  const separatorIndex = stem.lastIndexOf(' - ')
  if (separatorIndex === -1) {
    throw new Error(`Cannot parse AVA filename (missing " - "): ${filename}`)
  }

  const suffix = stem.slice(separatorIndex + 3).trim()
  const teamTokens = Object.keys(TEAM_TOKEN_TO_XML_PREFIX).sort(
    (left, right) => right.length - left.length,
  )

  for (const teamToken of teamTokens) {
    if (suffix === teamToken) {
      throw new Error(`Missing overlay label before team in filename: ${filename}`)
    }
    const teamSuffix = ` ${teamToken}`
    if (suffix.endsWith(teamSuffix)) {
      const overlayLabel = suffix.slice(0, -teamSuffix.length).trim()
      if (!overlayLabel) {
        throw new Error(`Cannot parse overlay from filename: ${filename}`)
      }
      return { overlayLabel, teamToken }
    }
  }

  throw new Error(
    `Cannot parse team token from filename: ${filename}; extend TEAM_TOKEN_TO_XML_PREFIX`,
  )
}

export function teamCodeFromCompiledFilename(filename: string): string {
  const { overlayLabel, teamToken } = parseCompiledMp4Stem(filename)
  const xmlTeam = TEAM_TOKEN_TO_XML_PREFIX[teamToken]
  if (!xmlTeam) {
    throw new Error(
      `Unknown team token "${teamToken}" in ${filename}; extend TEAM_TOKEN_TO_XML_PREFIX`,
    )
  }

  const normalizedOverlay = overlayLabel.normalize('NFC')
  const codeSuffix =
    OVERLAY_TO_CODE_SUFFIX[normalizedOverlay] ??
    OVERLAY_TO_CODE_SUFFIX[overlayLabel]
  if (!codeSuffix) {
    throw new Error(
      `Unknown overlay "${overlayLabel}" in ${filename}; extend OVERLAY_TO_CODE_SUFFIX`,
    )
  }

  return `${xmlTeam} ${codeSuffix}`
}
