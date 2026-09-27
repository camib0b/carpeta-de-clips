/**
 * One play inside a compiled YouTube clip (timeline offset from AVA sidecar / import).
 */
export interface ClipInstance {
  ord: number
  offsetS: number
  durationS: number
  quarter?: string
  scoreLabel?: string
  xmlInstanceId?: number
}

/**
 * A YouTube clip filed in a team library, with match and filter metadata.
 */
export interface VideoClip {
  id: string
  youtubeId: string
  title: string
  gameConcept: string
  /**
   * Team library this clip is filed under when that is not inferred from
   * home/away (currently `'Others'`).
   */
  libraryName?: string
  /**
   * League division of the match (e.g. `'Primera A'`). Shown as "Categoría" in the UI.
   */
  division?: string
  /**
   * Opponent club on a team-library clip, or a `'Home vs Away'` matchup label
   * for third-party (Others) matches. Filter query param remains `rival`.
   */
  rivalTeam: string
  date: string // ISO date
  time?: string
  place?: string
  homeTeam: string
  awayTeam: string
  homeGoals?: number
  awayGoals?: number
  shootoutWinner?: string
  playerRoster?: string[]
  /** ISO timestamp used only to sort clips in the library grid. */
  uploadedAt: string
  /** R2 object key in the clipped-xml bucket when this match has XML. */
  r2XmlObjectKey?: string
  /** Per-play segments inside this compiled upload, when cataloged in D1. */
  instances?: ClipInstance[]
}

/**
 * A team library shown on the home list and at `/{slug}`.
 */
export interface Team {
  id: string
  name: string
  slug: string
  country: string
  logo?: string
}

/**
 * Label for the unfiltered "all concepts" dropdown state. Not a stored `gameConcept`.
 */
export const ALL_CONCEPTS_FILTER_LABEL = 'Todos los Conceptos'

/**
 * Label for the unfiltered "all rivals" dropdown state. Not a stored `rivalTeam`.
 */
export const ALL_RIVALS_FILTER_LABEL = 'Todos los Rivales'

/**
 * Stored game-concept values for filtering (Spanish).
 * Based on real video categories from UC hockey playlists.
 * Does not include the "all concepts" UI label.
 */
export const GAME_CONCEPTS = [
  'Salidas',
  'Goles',
  'Corner Cortos',
  'Shoot Outs',
  'Pérdidas',
  'Ingresos al área',
  'Defensa de área',
  'Presiones',
  'Flicks',
  'Juego 50-yds',
  'Juego 75-yds',
  'Partido Completo',
] as const

export type GameConcept = (typeof GAME_CONCEPTS)[number]
