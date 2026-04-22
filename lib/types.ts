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
 * Available game concepts for filtering
 */
export const GAME_CONCEPTS = [
  'All Concepts',
  'Shots on Target',
  'Penalty Corners',
  'Build-up Play',
  'Defensive Structure',
  'Counter Attack',
  'Set Pieces',
  'Goalkeeper Saves',
] as const

export type GameConcept = (typeof GAME_CONCEPTS)[number]
