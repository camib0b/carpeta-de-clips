/**
 * Video clip data structure for the hockey video library
 */
export interface VideoClip {
  id: string
  youtubeId: string
  title: string
  gameConcept: string
  rivalTeam: string
  date: string // ISO string
  time: string
  place: string
  homeTeam: string
  awayTeam: string
  homeGoals: number
  awayGoals: number
  shootoutWinner?: string
  playerRoster: string[]
  uploadedAt: string // ISO string for sorting by upload date
}

/**
 * Note/comment attached to a video clip
 * Anonymous by default, optional author name
 * Future: will be associated with authenticated user
 */
export interface VideoNote {
  id: string
  videoId: string
  content: string
  authorName?: string // Optional - anonymous if not provided
  // Future: userId?: string // Will be added when auth is enabled
  createdAt: string // ISO string
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
 */
export const GAME_CONCEPTS = [
  'Todos los Conceptos',
  'Tiros al Arco',
  'Corners Cortos',
  'Juego de Construccion',
  'Estructura Defensiva',
  'Contraataque',
  'Jugadas de Balon Parado',
  'Atajadas del Arquero',
] as const

export type GameConcept = (typeof GAME_CONCEPTS)[number]
