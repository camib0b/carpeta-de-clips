import {
  FILE_NAME_MAX_LENGTH,
  MAX_FILE_BYTES,
  TEAM_NAME_MAX_LENGTH,
} from '../team-inbox'

/**
 * Local stress data for the team inbox form. Dev toggle only.
 * Values follow the break-ui catalog or the validation limits in team-inbox.ts.
 * Never submitted, and never written to D1.
 */

const TEAM_NAME_SEED =
  'Club Deportivo Universidad Católica de Chile, rama femenina de hockey césped, Primera División B'

export const WORST_TEAM_INBOX_NAME = (
  `${TEAM_NAME_SEED}, sede San Carlos de Apoquindo`.repeat(2)
).slice(0, TEAM_NAME_MAX_LENGTH)

export const WORST_TEAM_INBOX_EMAIL =
  'bartholomew.fitzgerald@northwind-industries-holdings.example.com'

export const WORST_EXTERNAL_LINK =
  'https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved'

export const ONE_TEAM_INBOX_NAME = 'J'

export const ONE_TEAM_INBOX_EMAIL = 'a@b.co'

export type TeamInboxFileFixture = {
  name: string
  sizeBytes: number
  contentType: string
}

function fileNameAtLimit(): string {
  const extension = '.mp4'
  const stem = 'Universidad-Catolica-vs-Universidad-de-Chile-camara-principal-'.repeat(6)
  return `${stem.slice(0, FILE_NAME_MAX_LENGTH - extension.length)}${extension}`
}

export const WORST_TEAM_INBOX_FILES: TeamInboxFileFixture[] = [
  {
    name: fileNameAtLimit(),
    sizeBytes: MAX_FILE_BYTES,
    contentType: 'video/mp4',
  },
  {
    name: 'IMG_20250914_183022_HDR_portrait_edited_edited.mp4',
    sizeBytes: 1_284_000_000,
    contentType: 'video/mp4',
  },
  {
    name: 'Aleksandra Wiśniewska-Kowalczyk — cámara 2.mp4',
    sizeBytes: 860_000_000,
    contentType: 'video/mp4',
  },
  {
    name: '🦊 partido.mp4',
    sizeBytes: 42_000_000,
    contentType: 'video/mp4',
  },
  {
    name: '王秀英.mp4',
    sizeBytes: 12_000_000,
    contentType: 'video/mp4',
  },
  {
    name: 'نور الهدى.mp4',
    sizeBytes: 3_500_000,
    contentType: 'video/mp4',
  },
  {
    name: 'Partido (cámara 2) v12.mp4',
    sizeBytes: 900_000,
    contentType: 'video/quicktime',
  },
  {
    name: 'a.mp4',
    sizeBytes: 1,
    contentType: 'video/mp4',
  },
]

export const ONE_TEAM_INBOX_FILE: TeamInboxFileFixture = {
  name: 'a.mp4',
  sizeBytes: 1,
  contentType: 'video/mp4',
}

export const TEAM_INBOX_PROGRESS_LABEL = `Subiendo ${fileNameAtLimit()} · parte 102 de 103`

export const TEAM_INBOX_ERROR_MESSAGE = `No se pudo guardar la carga para ${WORST_TEAM_INBOX_EMAIL}. Revisa el enlace ${WORST_EXTERNAL_LINK}.`
