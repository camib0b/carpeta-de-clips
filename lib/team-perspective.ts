import type { VideoClip } from './types'

const UC_PRIMERA_B = 'UC Primera B'

/** Opponent-titled actions remapped to the analyzing team's filter concept. */
const RIVAL_ACTION_TO_TEAM_PERSPECTIVE_CONCEPT: Record<string, string> = {
  'Ingresos al área': 'Defensa de área',
  Salidas: 'Presiones',
  'Juego 50-yds': 'Presiones',
  'Juego 75-yds': 'Presiones',
}

/** Title prefixes that identify the same opponent as `homeTeam`/`awayTeam`. */
const OPPONENT_TITLE_ALIASES: Record<string, string[]> = {
  Manquehue: ['Manquehue', 'MQA'],
  'Old Reds': ['Old Reds', 'OR'],
}

const UC_SUBJECT_TITLE_PATTERNS = [
  /^(UC B|UCB|UC)\b/i,
  /^Ingresos al área$/i,
  /^Salidas$/i,
  /^Defensa de área$/i,
  /^Gol a favor$/i,
  /^Goles en contra$/i,
  /^Cortos ofensivos$/i,
  /^Juego \d+-yds$/i,
  /^Presión sobre/i,
  /^Partido completo/i,
]

function getOpponentTeamName(
  clip: VideoClip,
  teamName: string
): string | null {
  if (clip.homeTeam === teamName) {
    return clip.awayTeam
  }

  if (clip.awayTeam === teamName) {
    return clip.homeTeam
  }

  return null
}

function titleStartsWithOpponent(title: string, opponent: string): boolean {
  const aliases = OPPONENT_TITLE_ALIASES[opponent] ?? [opponent]
  const normalizedTitle = title.toLowerCase()

  return aliases.some((alias) =>
    normalizedTitle.startsWith(alias.toLowerCase())
  )
}

function clipTitleDescribesRivalAction(clip: VideoClip, teamName: string): boolean {
  const opponent = getOpponentTeamName(clip, teamName)

  if (!opponent) {
    return false
  }

  const title = clip.title.trim()

  if (UC_SUBJECT_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
    return false
  }

  return titleStartsWithOpponent(title, opponent)
}

export function remapGameConceptToTeamPerspective(
  clip: VideoClip,
  teamName: string
): VideoClip {
  if (teamName !== UC_PRIMERA_B || !clipTitleDescribesRivalAction(clip, teamName)) {
    return clip
  }

  const remappedConcept = RIVAL_ACTION_TO_TEAM_PERSPECTIVE_CONCEPT[clip.gameConcept]

  if (!remappedConcept) {
    return clip
  }

  return {
    ...clip,
    gameConcept: remappedConcept,
  }
}
