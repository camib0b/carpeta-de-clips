import type { MatchSummary } from '../match-display'
import type { Team, VideoClip } from '../types'

/**
 * Local stress data for the break-ui skill.
 * These values stay in tests and fixtures. Do not write them to production D1.
 *
 * Names and the unbreakable label come from Emil Kowalski's worst-case catalog
 * (skills/break-ui/CATALOG.md): plausible compounds, not repeated letters.
 */

/** Layout viewport the skill asks us to check. */
export const NARROW_VIEWPORT_PX = 320

/** `px-6` on both sides of the page shells. */
export const PAGE_PADDING_X_PX = 48

/** Content width inside a 320px page with the existing gutters. */
export const NARROW_CONTENT_PX = NARROW_VIEWPORT_PX - PAGE_PADDING_X_PX

/**
 * Conservative average advance for the UI font, in em.
 * Used to show that a fixture value cannot sit on one line in the narrow column.
 */
const AVERAGE_GLYPH_EM = 0.56

export const LONG_TEAM_NAME =
  'Club Deportivo Universidad Católica de Chile Primera División B Femenina'

export const LONG_PLAYER_NAME = 'Aleksandra Wiśniewska-Kowalczyk'

export const LONG_OPPONENT_NAME = 'Konstantin Oberhauser-Wettstein'

/** 30-character compound with no break opportunity. Catalog row for labels. */
export const UNBREAKABLE_LABEL = 'Benachrichtigungseinstellungen'

export const SHORT_PLAYER_NAME = 'Jo'

export const ONE_LETTER_NAME = 'J'

export const LARGE_HOME_GOALS = 1284

export const LARGE_AWAY_GOALS = 1_000_000

export const MANY_MATCH_COUNT = 12

export const LONG_CLIP_LIST_COUNT = 24

export function estimatedLineWidthPx(text: string, fontSizePx: number): number {
  return Math.ceil(text.length * fontSizePx * AVERAGE_GLYPH_EM)
}

export function longestToken(text: string): string {
  const tokens = text.split(/\s+/).filter((token) => token.length > 0)
  return tokens.reduce(
    (longest, token) => (token.length > longest.length ? token : longest),
    '',
  )
}

export const worstCaseTeam: Team = {
  id: 'worst-case-library',
  name: LONG_TEAM_NAME,
  slug: 'worst-case-library',
  country: 'CL',
}

export function worstCaseScoreLabel(): string {
  return `${LARGE_HOME_GOALS}–${LARGE_AWAY_GOALS} (${LONG_OPPONENT_NAME} S.O.)`
}

function clip(partial: Pick<VideoClip, 'id' | 'title' | 'rivalTeam'> & Partial<VideoClip>): VideoClip {
  return {
    youtubeId: 'worstcase01',
    gameConcept: 'Salidas',
    date: '2026-09-26',
    homeTeam: LONG_TEAM_NAME,
    awayTeam: LONG_OPPONENT_NAME,
    homeGoals: LARGE_HOME_GOALS,
    awayGoals: LARGE_AWAY_GOALS,
    shootoutWinner: LONG_OPPONENT_NAME,
    division: 'Primera División B Femenina — Torneo Largo',
    uploadedAt: '2026-09-26T15:00:00.000Z',
    ...partial,
  }
}

/** One row per failure, spread across the list the way real data arrives. */
export function worstCaseClips(): VideoClip[] {
  const clips: VideoClip[] = [
    clip({
      id: 'worst-long-title',
      title: `${LONG_PLAYER_NAME} ${UNBREAKABLE_LABEL} ingreso al área tras una salida de 22 metros`,
      rivalTeam: LONG_OPPONENT_NAME,
    }),
    clip({
      id: 'worst-short-player',
      title: `${SHORT_PLAYER_NAME} gol de corner corto`,
      rivalTeam: SHORT_PLAYER_NAME,
      homeGoals: 1,
      awayGoals: 0,
      shootoutWinner: undefined,
    }),
    clip({
      id: 'worst-one-letter',
      title: `${ONE_LETTER_NAME} presión`,
      rivalTeam: ONE_LETTER_NAME,
      homeGoals: 0,
      awayGoals: 1,
      shootoutWinner: undefined,
    }),
  ]

  for (let index = clips.length; index < LONG_CLIP_LIST_COUNT; index += 1) {
    const matchIndex = index % MANY_MATCH_COUNT
    clips.push(
      clip({
        id: `worst-clip-${index}`,
        title: `Clip ${index + 1} de ${LONG_PLAYER_NAME}`,
        rivalTeam: matchIndex === 0 ? LONG_OPPONENT_NAME : `Rival ${matchIndex}`,
        date: `2026-03-${String((matchIndex % 28) + 1).padStart(2, '0')}`,
        awayTeam: matchIndex === 0 ? LONG_OPPONENT_NAME : `Club Rival Número ${matchIndex}`,
        homeGoals: index,
        awayGoals: LARGE_AWAY_GOALS,
      }),
    )
  }

  return clips
}

export function worstCaseMatches(): MatchSummary[] {
  return Array.from({ length: MANY_MATCH_COUNT }, (_, index) => ({
    date: `2026-03-${String(index + 1).padStart(2, '0')}`,
    division: index === 0 ? 'Primera División B Femenina — Torneo Largo' : 'Primera B',
    homeTeam: LONG_TEAM_NAME,
    awayTeam: index === 0 ? LONG_OPPONENT_NAME : `Club Rival Número ${index}`,
    homeGoals: LARGE_HOME_GOALS,
    awayGoals: LARGE_AWAY_GOALS,
    shootoutWinner: index === 0 ? LONG_OPPONENT_NAME : undefined,
    storageSlug: `worst-match-${index}`,
  }))
}

export const emptyClipList: VideoClip[] = []
