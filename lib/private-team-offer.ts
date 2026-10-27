/**
 * Private team folder offer on the home page.
 *
 * The Fintoc links, the prices, and the inbox address are real.
 * The home section and `/api/team-inbox` stay closed in production until
 * `TEAM_INBOX_ENABLED` is the string `true`. See `isPrivateTeamOfferReady`.
 */

export type PrivateTeamOfferTier = {
  id: string
  label: string
  priceClp: number
  paymentUrl: string
  turnaround: string
}

/** One match, analyzed and uploaded to a private folder on carpeta.cl. */
export const PRIVATE_TEAM_OFFER_TIERS: readonly PrivateTeamOfferTier[] = [
  {
    id: 'standard',
    label: 'Estándar',
    priceClp: 25_000,
    paymentUrl: 'https://fintoc.me/cami-escu/25000',
    turnaround: '3 días',
  },
  {
    id: 'express',
    label: 'Express',
    priceClp: 40_000,
    paymentUrl: 'https://fintoc.me/cami-escu/40000',
    turnaround: '24 horas',
  },
]

/** Address that receives match files by email. */
export const TEAM_INBOX_EMAIL = 'video@camilaescudero.cl'

/** Sentinel price. A real quote must be a different positive CLP amount. */
export const PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP = 999_999_999

export type PrivateTeamOfferConfig = {
  tiers: readonly PrivateTeamOfferTier[]
  inboxEmail: string
  enabled: string | undefined
}

export function readPrivateTeamOfferConfig(): PrivateTeamOfferConfig {
  return {
    tiers: PRIVATE_TEAM_OFFER_TIERS,
    inboxEmail: TEAM_INBOX_EMAIL,
    enabled: process.env.TEAM_INBOX_ENABLED,
  }
}

function isPlaceholderText(value: string): boolean {
  return value.toLowerCase().includes('placeholder')
}

function isRealPaymentUrl(paymentUrl: string): boolean {
  const trimmed = paymentUrl.trim()
  return trimmed.length > 0 && !isPlaceholderText(trimmed)
}

function isRealPrice(priceClp: number): boolean {
  return (
    Number.isSafeInteger(priceClp) &&
    priceClp > 0 &&
    priceClp !== PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP
  )
}

/**
 * True only when every tier has a real payment URL and a positive price,
 * the inbox email is no longer a placeholder, and `TEAM_INBOX_ENABLED`
 * is exactly `true`.
 * Pass `config` from tests; the route and the home page call it with none.
 */
export function isPrivateTeamOfferReady(
  config: PrivateTeamOfferConfig = readPrivateTeamOfferConfig(),
): boolean {
  if (config.enabled !== 'true') {
    return false
  }
  if (config.tiers.length === 0) {
    return false
  }
  if (
    !config.tiers.every(
      (tier) => isRealPaymentUrl(tier.paymentUrl) && isRealPrice(tier.priceClp),
    )
  ) {
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
