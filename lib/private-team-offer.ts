/**
 * Private team folder offer on the home page.
 *
 * Prices and the Fintoc base URL are real. The inbox address is real.
 * The home section and `/api/team-inbox` stay closed in production until
 * `TEAM_INBOX_ENABLED` is the string `true`. See `isPrivateTeamOfferReady`.
 */

export type PrivateTeamOfferDetailId = 'basic' | 'exhaustive'

export type PrivateTeamOfferTurnaroundId = 'standard' | 'express'

export type PrivateTeamOfferDetailLevel = {
  id: PrivateTeamOfferDetailId
  label: string
  /** Short line under the detail toggle when this level is selected. */
  description: string
}

export type PrivateTeamOfferTurnaround = {
  id: PrivateTeamOfferTurnaroundId
  label: string
  turnaround: string
}

export const PRIVATE_TEAM_OFFER_DETAIL_LEVELS: readonly PrivateTeamOfferDetailLevel[] = [
  {
    id: 'basic',
    label: 'Básico',
    // TODO(camila): Replace with the real Básico detail description.
    description: 'Análisis esencial de las jugadas del partido.',
  },
  {
    id: 'exhaustive',
    label: 'Exhaustivo',
    // TODO(camila): Replace with the real Exhaustivo detail description.
    description: 'Análisis ampliado con mayor cobertura del partido.',
  },
]

export const PRIVATE_TEAM_OFFER_TURNAROUNDS: readonly PrivateTeamOfferTurnaround[] = [
  {
    id: 'standard',
    label: 'Estándar',
    turnaround: '3 días',
  },
  {
    id: 'express',
    label: 'Express',
    turnaround: '24 horas',
  },
]

/** CLP per match: [detail][turnaround]. */
export const PRIVATE_TEAM_OFFER_PRICE_MATRIX: Readonly<
  Record<PrivateTeamOfferDetailId, Readonly<Record<PrivateTeamOfferTurnaroundId, number>>>
> = {
  basic: {
    standard: 21_000,
    express: 32_000,
  },
  exhaustive: {
    standard: 30_000,
    express: 39_990,
  },
}

export const FINTOC_PAYMENT_BASE_URL = 'https://fintoc.me/cami-escu'

/** Address that receives match files by email. */
export const TEAM_INBOX_EMAIL = 'video@camilaescudero.cl'

/** Sentinel price. A real quote must be a different positive CLP amount. */
export const PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP = 999_999_999

export type PrivateTeamOfferConfig = {
  detailLevels: readonly PrivateTeamOfferDetailLevel[]
  turnarounds: readonly PrivateTeamOfferTurnaround[]
  priceMatrix: Readonly<
    Record<PrivateTeamOfferDetailId, Readonly<Record<PrivateTeamOfferTurnaroundId, number>>>
  >
  paymentBaseUrl: string
  inboxEmail: string
  enabled: string | undefined
}

export function readPrivateTeamOfferConfig(): PrivateTeamOfferConfig {
  return {
    detailLevels: PRIVATE_TEAM_OFFER_DETAIL_LEVELS,
    turnarounds: PRIVATE_TEAM_OFFER_TURNAROUNDS,
    priceMatrix: PRIVATE_TEAM_OFFER_PRICE_MATRIX,
    paymentBaseUrl: FINTOC_PAYMENT_BASE_URL,
    inboxEmail: TEAM_INBOX_EMAIL,
    enabled: process.env.TEAM_INBOX_ENABLED,
  }
}

export function paymentUrlForPrice(priceClp: number): string {
  return `${FINTOC_PAYMENT_BASE_URL}/${priceClp}`
}

export function priceForPrivateTeamOffer(
  detailId: PrivateTeamOfferDetailId,
  turnaroundId: PrivateTeamOfferTurnaroundId,
  matrix: Readonly<
    Record<PrivateTeamOfferDetailId, Readonly<Record<PrivateTeamOfferTurnaroundId, number>>>
  > = PRIVATE_TEAM_OFFER_PRICE_MATRIX,
): number {
  return matrix[detailId][turnaroundId]
}

export function turnaroundForPrivateTeamOffer(
  turnaroundId: PrivateTeamOfferTurnaroundId,
  turnarounds: readonly PrivateTeamOfferTurnaround[] = PRIVATE_TEAM_OFFER_TURNAROUNDS,
): PrivateTeamOfferTurnaround {
  const turnaround = turnarounds.find((entry) => entry.id === turnaroundId)
  if (turnaround == null) {
    throw new Error(`Unknown turnaround: ${turnaroundId}`)
  }
  return turnaround
}

export function listPrivateTeamOfferPrices(
  matrix: Readonly<
    Record<PrivateTeamOfferDetailId, Readonly<Record<PrivateTeamOfferTurnaroundId, number>>>
  > = PRIVATE_TEAM_OFFER_PRICE_MATRIX,
  detailLevels: readonly PrivateTeamOfferDetailLevel[] = PRIVATE_TEAM_OFFER_DETAIL_LEVELS,
  turnarounds: readonly PrivateTeamOfferTurnaround[] = PRIVATE_TEAM_OFFER_TURNAROUNDS,
): number[] {
  const prices: number[] = []
  for (const detail of detailLevels) {
    for (const turnaround of turnarounds) {
      prices.push(matrix[detail.id][turnaround.id])
    }
  }
  return prices
}

/** Widest shipped price in the matrix (for stable price display width). */
export const PRIVATE_TEAM_OFFER_WIDEST_PRICE_CLP = Math.max(
  ...listPrivateTeamOfferPrices(),
)

function isPlaceholderText(value: string): boolean {
  return value.toLowerCase().includes('placeholder')
}

function isRealPaymentBaseUrl(paymentBaseUrl: string): boolean {
  const trimmed = paymentBaseUrl.trim()
  return trimmed.length > 0 && !isPlaceholderText(trimmed)
}

function isRealPrice(priceClp: number): boolean {
  return (
    Number.isSafeInteger(priceClp) &&
    priceClp > 0 &&
    priceClp !== PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP
  )
}

function matrixIsComplete(config: PrivateTeamOfferConfig): boolean {
  for (const detail of config.detailLevels) {
    for (const turnaround of config.turnarounds) {
      const price = config.priceMatrix[detail.id]?.[turnaround.id]
      if (price === undefined || !isRealPrice(price)) {
        return false
      }
    }
  }
  return true
}

/**
 * True only when every matrix cell has a real price, the Fintoc base URL is
 * real, the inbox email is no longer a placeholder, and `TEAM_INBOX_ENABLED`
 * is exactly `true`.
 */
export function isPrivateTeamOfferReady(
  config: PrivateTeamOfferConfig = readPrivateTeamOfferConfig(),
): boolean {
  if (config.enabled !== 'true') {
    return false
  }
  if (config.detailLevels.length === 0 || config.turnarounds.length === 0) {
    return false
  }
  if (!isRealPaymentBaseUrl(config.paymentBaseUrl)) {
    return false
  }
  if (!matrixIsComplete(config)) {
    return false
  }
  if (config.inboxEmail.trim().length === 0 || isPlaceholderText(config.inboxEmail)) {
    return false
  }
  return true
}

const priceFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

export function formatPricePerMatchClp(priceClp: number): string {
  return priceFormatter.format(priceClp)
}

export function teamInboxMailtoHref(emailAddress: string): string {
  const subject = encodeURIComponent('Carpeta privada — videos de partido')
  return `mailto:${emailAddress}?subject=${subject}`
}
