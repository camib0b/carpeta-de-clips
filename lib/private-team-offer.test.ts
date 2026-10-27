import assert from 'node:assert/strict'
import test from 'node:test'

import {
  FINTOC_PAYMENT_BASE_URL,
  PRIVATE_TEAM_OFFER_DETAIL_LEVELS,
  PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP,
  PRIVATE_TEAM_OFFER_PRICE_MATRIX,
  PRIVATE_TEAM_OFFER_TURNAROUNDS,
  PRIVATE_TEAM_OFFER_WIDEST_PRICE_CLP,
  TEAM_INBOX_EMAIL,
  formatPricePerMatchClp,
  isPrivateTeamOfferReady,
  listPrivateTeamOfferPrices,
  paymentUrlForPrice,
  priceForPrivateTeamOffer,
  readPrivateTeamOfferConfig,
  type PrivateTeamOfferConfig,
} from './private-team-offer'

const EXPECTED_PRICES: [string, string, number][] = [
  ['basic', 'standard', 21_000],
  ['basic', 'express', 32_000],
  ['exhaustive', 'standard', 30_000],
  ['exhaustive', 'express', 39_990],
]

const READY_OFFER: PrivateTeamOfferConfig = {
  ...readPrivateTeamOfferConfig(),
  enabled: 'true',
}

async function withInboxFlag(
  value: string | undefined,
  run: () => void | Promise<void>,
) {
  const previous = process.env.TEAM_INBOX_ENABLED
  if (value === undefined) {
    delete process.env.TEAM_INBOX_ENABLED
  } else {
    process.env.TEAM_INBOX_ENABLED = value
  }
  try {
    await run()
  } finally {
    if (previous === undefined) {
      delete process.env.TEAM_INBOX_ENABLED
    } else {
      process.env.TEAM_INBOX_ENABLED = previous
    }
  }
}

test('the price matrix lists every detail and turnaround combination once', () => {
  assert.equal(PRIVATE_TEAM_OFFER_DETAIL_LEVELS.length, 2)
  assert.equal(PRIVATE_TEAM_OFFER_TURNAROUNDS.length, 2)
  assert.equal(listPrivateTeamOfferPrices().length, 4)

  for (const [detailId, turnaroundId, priceClp] of EXPECTED_PRICES) {
    assert.equal(
      priceForPrivateTeamOffer(
        detailId as 'basic' | 'exhaustive',
        turnaroundId as 'standard' | 'express',
      ),
      priceClp,
    )
    assert.equal(PRIVATE_TEAM_OFFER_PRICE_MATRIX[detailId as 'basic' | 'exhaustive'][turnaroundId as 'standard' | 'express'], priceClp)
  }

  assert.equal(PRIVATE_TEAM_OFFER_WIDEST_PRICE_CLP, 39_990)
})

test('payment URLs are built from the integer CLP amount', () => {
  assert.equal(paymentUrlForPrice(39_990), 'https://fintoc.me/cami-escu/39990')
  assert.equal(paymentUrlForPrice(21_000), `${FINTOC_PAYMENT_BASE_URL}/21000`)
  assert.equal(paymentUrlForPrice(1), `${FINTOC_PAYMENT_BASE_URL}/1`)
})

test('offer prices are grouped as CLP without cents', () => {
  assert.equal(formatPricePerMatchClp(21_000), '$21.000')
  assert.equal(formatPricePerMatchClp(39_990), '$39.990')
  assert.equal(
    formatPricePerMatchClp(PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP),
    '$999.999.999',
  )
})

test('the shipped matrix and inbox address are real, and the flag still closes the offer', async () => {
  assert.equal(TEAM_INBOX_EMAIL, 'video@camilaescudero.cl')
  assert.equal(FINTOC_PAYMENT_BASE_URL.includes('placeholder'), false)

  await withInboxFlag('true', () => {
    assert.equal(isPrivateTeamOfferReady(), true)
  })
  await withInboxFlag(undefined, () => {
    assert.equal(isPrivateTeamOfferReady(), false)
  })
})

test('the offer is ready only when every matrix price and the base URL are real', () => {
  assert.equal(isPrivateTeamOfferReady(READY_OFFER), true)

  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, enabled: undefined }), false)
  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, paymentBaseUrl: '   ' }), false)
  assert.equal(
    isPrivateTeamOfferReady({ ...READY_OFFER, paymentBaseUrl: 'https://fintoc.me/PLACEHOLDER' }),
    false,
  )
  assert.equal(
    isPrivateTeamOfferReady({
      ...READY_OFFER,
      priceMatrix: {
        ...PRIVATE_TEAM_OFFER_PRICE_MATRIX,
        basic: { ...PRIVATE_TEAM_OFFER_PRICE_MATRIX.basic, standard: 0 },
      },
    }),
    false,
  )
  assert.equal(
    isPrivateTeamOfferReady({
      ...READY_OFFER,
      priceMatrix: {
        ...PRIVATE_TEAM_OFFER_PRICE_MATRIX,
        exhaustive: {
          ...PRIVATE_TEAM_OFFER_PRICE_MATRIX.exhaustive,
          express: PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP,
        },
      },
    }),
    false,
  )
  assert.equal(
    isPrivateTeamOfferReady({ ...READY_OFFER, inboxEmail: 'placeholder@example.com' }),
    false,
  )
})

test('the team inbox route returns 503 while the flag is not exactly true', async () => {
  const { POST, PUT } = await import('../app/api/team-inbox/route')
  await withInboxFlag(undefined, async () => {
    const postResponse = await POST(
      new Request('https://carpeta.cl/api/team-inbox', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          teamName: 'Universidad Católica',
          contactEmail: 'equipo@example.com',
          externalLink: 'https://example.com/partido',
          files: [],
        }),
      }),
    )
    assert.equal(postResponse.status, 503)

    const putResponse = await PUT(
      new Request('https://carpeta.cl/api/team-inbox?submissionId=x&uploadId=y&partNumber=1', {
        method: 'PUT',
        headers: { 'content-type': 'application/octet-stream', 'content-length': '1' },
        body: new Uint8Array([1]),
      }),
    )
    assert.equal(putResponse.status, 503)
  })
})
