import type { VideoClip } from '../types'

const shared: Pick<
  VideoClip,
  'gameConcept' | 'date' | 'homeTeam' | 'awayTeam' | 'uploadedAt' | 'rivalTeam'
> = {
  gameConcept: 'Salidas',
  date: '2026-10-25',
  homeTeam: 'UC Sub 16 A',
  awayTeam: 'Manquehue',
  rivalTeam: 'Manquehue',
  uploadedAt: '2026-10-25T18:00:00.000Z',
}

/** Typical card with a real YouTube id and no self-hosted thumb. */
export const demoThumbnailClip: VideoClip = {
  id: 'demo-youtube',
  youtubeId: 'J9UmilJC89Q',
  title: 'MQA salida desde el fondo',
  ...shared,
}

/** Self-hosted clip with pending youtube id — the production grey-box case. */
export const pendingYoutubeWithThumbClip: VideoClip = {
  id: '184',
  youtubeId: 'pending-2026-10-25-uc-s16a-mq-01',
  title: 'MQA salida corta recuperada',
  thumbKey: '2026-10-25--UC_Sub_16_A--Manquehue/184-mqa-salida.thumb.jpg',
  r2Key: '2026-10-25--UC_Sub_16_A--Manquehue/184-mqa-salida.720.mp4',
  ...shared,
}

export const pendingYoutubeNoThumbClip: VideoClip = {
  id: '185',
  youtubeId: 'pending-2026-10-25-uc-s16a-mq-02',
  title: 'MQA ingreso al área',
  r2Key: '2026-10-25--UC_Sub_16_A--Manquehue/185-mqa-ingreso.720.mp4',
  ...shared,
}

export const brokenThumbUrlClip: VideoClip = {
  id: '186',
  youtubeId: 'pending-2026-10-25-uc-s16a-mq-03',
  title: 'MQA pérdida en mediocampo',
  thumbKey: 'missing-folder/does-not-exist.thumb.jpg',
  ...shared,
}

export const restrictedThumbClip: VideoClip = {
  id: '187',
  youtubeId: 'pending-2026-10-25-uc-s16a-mq-04',
  title: 'Clip restringido (no debe mostrar thumb público)',
  thumbKey: 'restricted/187.thumb.jpg',
  visibility: 'restricted',
  ...shared,
}

export type VideoCardThumbnailFixtureMode = 'demo' | 'worst'

export function videoCardThumbnailClips(
  mode: VideoCardThumbnailFixtureMode,
): VideoClip[] {
  if (mode === 'demo') {
    return [demoThumbnailClip]
  }
  return [
    pendingYoutubeWithThumbClip,
    pendingYoutubeNoThumbClip,
    brokenThumbUrlClip,
    restrictedThumbClip,
    {
      ...demoThumbnailClip,
      id: 'demo-youtube-worst-row',
      title:
        'Aleksandra Wiśniewska-Kowalczyk Benachrichtigungseinstellungen en salida',
    },
  ]
}
