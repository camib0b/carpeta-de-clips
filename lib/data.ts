import { Team, VideoClip, VideoNote } from './types'

/**
 * Sample teams data
 * Easy to extend or replace with database fetch later
 */
export const teams: Team[] = [
  {
    id: '1',
    name: 'Santiago HC',
    slug: 'santiago-hc',
    country: 'CL',
  },
  {
    id: '2',
    name: 'Buenos Aires FC',
    slug: 'buenos-aires-fc',
    country: 'AR',
  },
  {
    id: '3',
    name: 'Amsterdam HC',
    slug: 'amsterdam-hc',
    country: 'NL',
  },
  {
    id: '4',
    name: 'Sydney Strikers',
    slug: 'sydney-strikers',
    country: 'AU',
  },
]

/**
 * Sample video clips data
 * Using real YouTube video IDs from hockey content
 * Titles and concepts in Spanish
 */
export const videoClips: VideoClip[] = [
  // Santiago HC videos (12 videos)
  {
    id: '1',
    youtubeId: 'dQw4w9WgXcQ',
    title: 'Clase Magistral de Corners Cortos vs River Plate',
    gameConcept: 'Corners Cortos',
    rivalTeam: 'River Plate HC',
    date: '2024-03-15',
    time: '16:00',
    place: 'Estadio Nacional, Santiago',
    homeTeam: 'Santiago HC',
    awayTeam: 'River Plate HC',
    homeGoals: 3,
    awayGoals: 1,
    playerRoster: ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Sanchez'],
    uploadedAt: '2024-03-20T10:00:00Z',
  },
  {
    id: '2',
    youtubeId: 'jNQXAC9IVRw',
    title: 'Analisis de Estructura Defensiva - Final Copa Chile',
    gameConcept: 'Estructura Defensiva',
    rivalTeam: 'Vina del Mar HC',
    date: '2024-03-10',
    time: '18:30',
    place: 'Estadio Nacional, Santiago',
    homeTeam: 'Santiago HC',
    awayTeam: 'Vina del Mar HC',
    homeGoals: 2,
    awayGoals: 2,
    shootoutWinner: 'Santiago HC',
    playerRoster: ['Garcia', 'Rodriguez', 'Fernandez', 'Lopez', 'Torres'],
    uploadedAt: '2024-03-18T14:30:00Z',
  },
  {
    id: '3',
    youtubeId: '9bZkp7q19f0',
    title: 'Compilacion de Goles en Contraataque',
    gameConcept: 'Contraataque',
    rivalTeam: 'Concepcion HC',
    date: '2024-03-05',
    time: '15:00',
    place: 'Estadio Biobio, Concepcion',
    homeTeam: 'Concepcion HC',
    awayTeam: 'Santiago HC',
    homeGoals: 1,
    awayGoals: 4,
    playerRoster: ['Garcia', 'Munoz', 'Martinez', 'Lopez', 'Diaz'],
    uploadedAt: '2024-03-16T09:00:00Z',
  },
  {
    id: '4',
    youtubeId: 'kJQP7kiw5Fk',
    title: 'Sesion de Entrenamiento - Juego de Construccion',
    gameConcept: 'Juego de Construccion',
    rivalTeam: 'Entrenamiento',
    date: '2024-02-28',
    time: '10:00',
    place: 'Centro de Entrenamiento, Santiago',
    homeTeam: 'Santiago HC',
    awayTeam: 'Entrenamiento',
    homeGoals: 0,
    awayGoals: 0,
    playerRoster: ['Plantel Completo'],
    uploadedAt: '2024-03-14T11:00:00Z',
  },
  {
    id: '5',
    youtubeId: 'RgKAFK5djSk',
    title: 'Tiros al Arco vs Valparaiso',
    gameConcept: 'Tiros al Arco',
    rivalTeam: 'Valparaiso HC',
    date: '2024-02-20',
    time: '17:00',
    place: 'Estadio Playa Ancha, Valparaiso',
    homeTeam: 'Valparaiso HC',
    awayTeam: 'Santiago HC',
    homeGoals: 0,
    awayGoals: 2,
    playerRoster: ['Garcia', 'Rodriguez', 'Martinez', 'Herrera', 'Sanchez'],
    uploadedAt: '2024-03-12T16:00:00Z',
  },
  {
    id: '6',
    youtubeId: 'OPf0YbXqDm0',
    title: 'Estrategia de Balon Parado - Partido de Liga',
    gameConcept: 'Jugadas de Balon Parado',
    rivalTeam: 'Temuco HC',
    date: '2024-02-15',
    time: '16:30',
    place: 'Estadio Nacional, Santiago',
    homeTeam: 'Santiago HC',
    awayTeam: 'Temuco HC',
    homeGoals: 5,
    awayGoals: 0,
    playerRoster: ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Sanchez'],
    uploadedAt: '2024-03-10T08:00:00Z',
  },
  {
    id: '7',
    youtubeId: 'fJ9rUzIMcZQ',
    title: 'Destacados de Atajadas del Arquero',
    gameConcept: 'Atajadas del Arquero',
    rivalTeam: 'River Plate HC',
    date: '2024-02-10',
    time: '14:00',
    place: 'Buenos Aires, Argentina',
    homeTeam: 'River Plate HC',
    awayTeam: 'Santiago HC',
    homeGoals: 2,
    awayGoals: 3,
    playerRoster: ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Castillo'],
    uploadedAt: '2024-03-08T12:00:00Z',
  },
  {
    id: '8',
    youtubeId: 'JGwWNGJdvx8',
    title: 'Corners Cortos vs Antofagasta',
    gameConcept: 'Corners Cortos',
    rivalTeam: 'Antofagasta HC',
    date: '2024-02-05',
    time: '18:00',
    place: 'Estadio Nacional, Santiago',
    homeTeam: 'Santiago HC',
    awayTeam: 'Antofagasta HC',
    homeGoals: 4,
    awayGoals: 1,
    playerRoster: ['Garcia', 'Munoz', 'Martinez', 'Lopez', 'Sanchez'],
    uploadedAt: '2024-03-06T10:30:00Z',
  },
  {
    id: '9',
    youtubeId: 'CevxZvSJLk8',
    title: 'Taller de Estructura Defensiva',
    gameConcept: 'Estructura Defensiva',
    rivalTeam: 'Entrenamiento',
    date: '2024-01-30',
    time: '09:00',
    place: 'Centro de Entrenamiento, Santiago',
    homeTeam: 'Santiago HC',
    awayTeam: 'Entrenamiento',
    homeGoals: 0,
    awayGoals: 0,
    playerRoster: ['Unidad Defensiva'],
    uploadedAt: '2024-03-04T14:00:00Z',
  },
  {
    id: '10',
    youtubeId: 'hT_nvWreIhg',
    title: 'Analisis de Ejercicio de Contraataque',
    gameConcept: 'Contraataque',
    rivalTeam: 'Vina del Mar HC',
    date: '2024-01-25',
    time: '16:00',
    place: 'Vina del Mar',
    homeTeam: 'Vina del Mar HC',
    awayTeam: 'Santiago HC',
    homeGoals: 1,
    awayGoals: 3,
    playerRoster: ['Garcia', 'Rodriguez', 'Fernandez', 'Lopez', 'Torres'],
    uploadedAt: '2024-03-02T09:00:00Z',
  },
  {
    id: '11',
    youtubeId: 'YQHsXMglC9A',
    title: 'Juego de Construccion vs Concepcion',
    gameConcept: 'Juego de Construccion',
    rivalTeam: 'Concepcion HC',
    date: '2024-01-20',
    time: '15:30',
    place: 'Estadio Nacional, Santiago',
    homeTeam: 'Santiago HC',
    awayTeam: 'Concepcion HC',
    homeGoals: 2,
    awayGoals: 1,
    playerRoster: ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Sanchez'],
    uploadedAt: '2024-02-28T11:00:00Z',
  },
  {
    id: '12',
    youtubeId: 'DK_0jXPuIr0',
    title: 'Tiros al Arco - Apertura de Temporada',
    gameConcept: 'Tiros al Arco',
    rivalTeam: 'Valparaiso HC',
    date: '2024-01-15',
    time: '17:30',
    place: 'Estadio Nacional, Santiago',
    homeTeam: 'Santiago HC',
    awayTeam: 'Valparaiso HC',
    homeGoals: 3,
    awayGoals: 2,
    playerRoster: ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Diaz'],
    uploadedAt: '2024-02-25T15:00:00Z',
  },

  // Buenos Aires FC videos (4 videos)
  {
    id: '13',
    youtubeId: 'L_jWHffIx5E',
    title: 'Corners Cortos vs San Isidro',
    gameConcept: 'Corners Cortos',
    rivalTeam: 'San Isidro Club',
    date: '2024-03-12',
    time: '16:00',
    place: 'Club Atletico, Buenos Aires',
    homeTeam: 'Buenos Aires FC',
    awayTeam: 'San Isidro Club',
    homeGoals: 2,
    awayGoals: 2,
    playerRoster: ['Fernandez', 'Gonzalez', 'Silva', 'Romero', 'Alvarez'],
    uploadedAt: '2024-03-19T10:00:00Z',
  },
  {
    id: '14',
    youtubeId: 'Zi_XLOBDo_Y',
    title: 'Analisis de Estructura Defensiva',
    gameConcept: 'Estructura Defensiva',
    rivalTeam: 'GEBA',
    date: '2024-03-08',
    time: '18:00',
    place: 'Estadio GEBA, Buenos Aires',
    homeTeam: 'GEBA',
    awayTeam: 'Buenos Aires FC',
    homeGoals: 1,
    awayGoals: 2,
    playerRoster: ['Fernandez', 'Gonzalez', 'Silva', 'Perez', 'Alvarez'],
    uploadedAt: '2024-03-17T14:00:00Z',
  },
  {
    id: '15',
    youtubeId: 'e-ORhEE9VVg',
    title: 'Goles en Contraataque',
    gameConcept: 'Contraataque',
    rivalTeam: 'Belgrano Athletic',
    date: '2024-03-01',
    time: '15:00',
    place: 'Club Atletico, Buenos Aires',
    homeTeam: 'Buenos Aires FC',
    awayTeam: 'Belgrano Athletic',
    homeGoals: 4,
    awayGoals: 0,
    playerRoster: ['Fernandez', 'Gonzalez', 'Silva', 'Romero', 'Castro'],
    uploadedAt: '2024-03-15T09:00:00Z',
  },
  {
    id: '16',
    youtubeId: 'bo_efYhYU2A',
    title: 'Patrones de Juego de Construccion',
    gameConcept: 'Juego de Construccion',
    rivalTeam: 'Club Ciudad',
    date: '2024-02-25',
    time: '17:00',
    place: 'Estadio Club Ciudad',
    homeTeam: 'Club Ciudad',
    awayTeam: 'Buenos Aires FC',
    homeGoals: 0,
    awayGoals: 3,
    playerRoster: ['Fernandez', 'Gonzalez', 'Silva', 'Romero', 'Alvarez'],
    uploadedAt: '2024-03-13T11:00:00Z',
  },

  // Amsterdam HC videos (3 videos)
  {
    id: '17',
    youtubeId: '2Vv-BfVoq4g',
    title: 'Corners Cortos vs Bloemendaal',
    gameConcept: 'Corners Cortos',
    rivalTeam: 'Bloemendaal',
    date: '2024-03-14',
    time: '14:00',
    place: 'Wagener Stadium, Amsterdam',
    homeTeam: 'Amsterdam HC',
    awayTeam: 'Bloemendaal',
    homeGoals: 3,
    awayGoals: 3,
    shootoutWinner: 'Amsterdam HC',
    playerRoster: ['van der Berg', 'de Jong', 'Bakker', 'Visser', 'Smit'],
    uploadedAt: '2024-03-21T10:00:00Z',
  },
  {
    id: '18',
    youtubeId: 'FTQbiNvZqaY',
    title: 'Tiros al Arco - Partido EHL',
    gameConcept: 'Tiros al Arco',
    rivalTeam: 'Rot-Weiss Koln',
    date: '2024-03-10',
    time: '16:00',
    place: 'Colonia, Alemania',
    homeTeam: 'Rot-Weiss Koln',
    awayTeam: 'Amsterdam HC',
    homeGoals: 1,
    awayGoals: 4,
    playerRoster: ['van der Berg', 'de Jong', 'Bakker', 'Visser', 'Jansen'],
    uploadedAt: '2024-03-18T14:00:00Z',
  },
  {
    id: '19',
    youtubeId: 'kXYiU_JCYtU',
    title: 'Estructura Defensiva vs Kampong',
    gameConcept: 'Estructura Defensiva',
    rivalTeam: 'Kampong',
    date: '2024-03-05',
    time: '15:00',
    place: 'Wagener Stadium, Amsterdam',
    homeTeam: 'Amsterdam HC',
    awayTeam: 'Kampong',
    homeGoals: 2,
    awayGoals: 0,
    playerRoster: ['van der Berg', 'de Jong', 'Bakker', 'Visser', 'Smit'],
    uploadedAt: '2024-03-16T09:00:00Z',
  },

  // Sydney Strikers videos (3 videos)
  {
    id: '20',
    youtubeId: 'PT2_F-1esPk',
    title: 'Contraataque vs Brisbane',
    gameConcept: 'Contraataque',
    rivalTeam: 'Brisbane Blaze',
    date: '2024-03-13',
    time: '19:00',
    place: 'Sydney Olympic Park',
    homeTeam: 'Sydney Strikers',
    awayTeam: 'Brisbane Blaze',
    homeGoals: 5,
    awayGoals: 2,
    playerRoster: ['Smith', 'Johnson', 'Williams', 'Brown', 'Taylor'],
    uploadedAt: '2024-03-20T08:00:00Z',
  },
  {
    id: '21',
    youtubeId: 'LsoLEjrDogU',
    title: 'Ejecucion de Jugadas de Balon Parado',
    gameConcept: 'Jugadas de Balon Parado',
    rivalTeam: 'Melbourne HC',
    date: '2024-03-08',
    time: '20:00',
    place: 'Melbourne Arena',
    homeTeam: 'Melbourne HC',
    awayTeam: 'Sydney Strikers',
    homeGoals: 2,
    awayGoals: 3,
    playerRoster: ['Smith', 'Johnson', 'Williams', 'Brown', 'Anderson'],
    uploadedAt: '2024-03-17T12:00:00Z',
  },
  {
    id: '22',
    youtubeId: 'Eo-KmOd3i7s',
    title: 'Compilacion de Atajadas del Arquero',
    gameConcept: 'Atajadas del Arquero',
    rivalTeam: 'Perth Thunder',
    date: '2024-03-01',
    time: '18:00',
    place: 'Sydney Olympic Park',
    homeTeam: 'Sydney Strikers',
    awayTeam: 'Perth Thunder',
    homeGoals: 1,
    awayGoals: 0,
    playerRoster: ['Smith', 'Johnson', 'Williams', 'Brown', 'Taylor'],
    uploadedAt: '2024-03-14T10:00:00Z',
  },
]

/**
 * Sample notes data
 * In production, this would come from a database
 */
export const videoNotes: VideoNote[] = [
  {
    id: 'note-1',
    videoId: '1',
    content: 'Excelente ejecucion del corner corto en el minuto 23. Notar la posicion del flicker.',
    authorName: 'Entrenador Martinez',
    createdAt: '2024-03-21T14:30:00Z',
  },
  {
    id: 'note-2',
    videoId: '1',
    content: 'La defensa rival deja mucho espacio en el segundo poste.',
    createdAt: '2024-03-22T09:15:00Z',
  },
  {
    id: 'note-3',
    videoId: '2',
    content: 'Revisar la transicion defensiva despues del minuto 35.',
    authorName: 'Carlos',
    createdAt: '2024-03-19T16:00:00Z',
  },
]

/**
 * Helper function to get videos for a specific team
 */
export function getTeamVideos(teamSlug: string): VideoClip[] {
  const team = teams.find((t) => t.slug === teamSlug)
  if (!team) return []

  return videoClips
    .filter(
      (clip) =>
        clip.homeTeam === team.name ||
        clip.awayTeam === team.name ||
        clip.homeTeam.includes(team.name.split(' ')[0])
    )
    .sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
}

/**
 * Helper function to get unique rival teams for a team
 */
export function getTeamRivals(teamSlug: string): string[] {
  const videos = getTeamVideos(teamSlug)
  const rivals = [...new Set(videos.map((v) => v.rivalTeam))]
  return ['Todos los Rivales', ...rivals.filter((r) => r !== 'Entrenamiento')]
}

/**
 * Helper function to get a team by slug
 */
export function getTeamBySlug(slug: string): Team | undefined {
  return teams.find((t) => t.slug === slug)
}

/**
 * Helper function to get notes for a specific video
 */
export function getVideoNotes(videoId: string): VideoNote[] {
  return videoNotes
    .filter((note) => note.videoId === videoId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
}
