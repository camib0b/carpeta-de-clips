/**
 * Video clip data structure for the hockey video library
 */
export interface VideoClip {
  id: string
  youtubeId: string
  title: string
  gameConcept: string
  collection?: string
  category?: string
  rivalTeam: string
  date: string // ISO string
  time?: string
  place?: string
  homeTeam: string
  awayTeam: string
  homeGoals?: number
  awayGoals?: number
  shootoutWinner?: string
  playerRoster?: string[]
  uploadedAt: string // ISO string for sorting by upload date
}

/**
 * Team data structure
 */
export interface Team {
  id: string
  name: string
  slug: string
  country: string // ISO country code for flag
  logo?: string // Optional logo URL
}

/**
 * Available game concepts for filtering (Spanish)
 * Based on real video categories from UC hockey playlists
 */
export const GAME_CONCEPTS = [
  'Todos los Conceptos',
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
