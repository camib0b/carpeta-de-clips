/**
 * Private team folder offer on the home page.
 *
 * PLACEHOLDERS — Camila must replace every value below before the offer is real:
 * - FINTOC_PAYMENT_URL
 * - PRICE_PER_MATCH_CLP
 * - TEAM_INBOX_EMAIL
 *
 * The home section and `/api/team-inbox` stay closed until those values are
 * real and `TEAM_INBOX_ENABLED` is the string `true`. See `isPrivateTeamOfferReady`.
 */

/** PLACEHOLDER. Replace with the real fintoc.me payment link. */
export const FINTOC_PAYMENT_URL = 'https://fintoc.me/PLACEHOLDER'

/**
 * PLACEHOLDER. 999999999 is temporary and is not a quote.
 * Replace with the price per match in Chilean pesos.
 */
export const PRICE_PER_MATCH_CLP = 999_999_999

/** PLACEHOLDER. Replace with the address that receives match files by email. */
export const TEAM_INBOX_EMAIL = 'placeholder@example.com'

/** Sentinel price. A real quote must be a different positive CLP amount. */
export const PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP = 999_999_999

export type PrivateTeamOfferConfig = {
  paymentUrl: string
  pricePerMatchClp: number
  inboxEmail: string
  enabled: string | undefined
}

export function readPrivateTeamOfferConfig(): PrivateTeamOfferConfig {
  return {
    paymentUrl: FINTOC_PAYMENT_URL,
    pricePerMatchClp: PRICE_PER_MATCH_CLP,
    inboxEmail: TEAM_INBOX_EMAIL,
    enabled: process.env.TEAM_INBOX_ENABLED,
  }
}

function isPlaceholderText(value: string): boolean {
  return value.toLowerCase().includes('placeholder')
}

/**
 * True only when the Fintoc URL, the price, and the inbox email are no longer
 * placeholders and `TEAM_INBOX_ENABLED` is exactly `true`.
 * Pass `config` from tests; the route and the home page call it with none.
 */
export function isPrivateTeamOfferReady(
  config: PrivateTeamOfferConfig = readPrivateTeamOfferConfig(),
): boolean {
  if (config.enabled !== 'true') {
    return false
  }
  if (config.paymentUrl.trim().length === 0 || isPlaceholderText(config.paymentUrl)) {
    return false
  }
  if (
    !Number.isSafeInteger(config.pricePerMatchClp) ||
    config.pricePerMatchClp <= 0 ||
    config.pricePerMatchClp === PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP
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
