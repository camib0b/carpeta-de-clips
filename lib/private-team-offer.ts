/**
 * Private team folder offer on the home page.
 *
 * PLACEHOLDERS — Camila must replace every value below before the offer is real:
 * - FINTOC_PAYMENT_URL
 * - PRICE_PER_MATCH_CLP
 * - TEAM_INBOX_EMAIL
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
