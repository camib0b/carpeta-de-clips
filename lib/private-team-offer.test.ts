import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP,
  PRIVATE_TEAM_OFFER_TIERS,
  TEAM_INBOX_EMAIL,
  formatPricePerMatchClp,
  isPrivateTeamOfferReady,
  type PrivateTeamOfferConfig,
  type PrivateTeamOfferTier,
} from './private-team-offer'

const READY_TIERS: PrivateTeamOfferTier[] = [
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

const READY_OFFER: PrivateTeamOfferConfig = {
  tiers: READY_TIERS,
  inboxEmail: 'video@camilaescudero.cl',
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

function offerWithTier(
  index: number,
  patch: Partial<PrivateTeamOfferTier>,
): PrivateTeamOfferConfig {
  return {
    ...READY_OFFER,
    tiers: READY_TIERS.map((tier, tierIndex) =>
      tierIndex === index ? { ...tier, ...patch } : tier,
    ),
  }
}

test('the shipped tiers and inbox address are real, and the flag still closes the offer', async () => {
  assert.deepEqual(PRIVATE_TEAM_OFFER_TIERS, READY_TIERS)
  assert.equal(TEAM_INBOX_EMAIL, 'video@camilaescudero.cl')
  assert.equal(TEAM_INBOX_EMAIL.toLowerCase().includes('placeholder'), false)

  await withInboxFlag('true', () => {
    assert.equal(isPrivateTeamOfferReady(), true)
  })
  await withInboxFlag(undefined, () => {
    assert.equal(isPrivateTeamOfferReady(), false)
  })
  await withInboxFlag('', () => {
    assert.equal(isPrivateTeamOfferReady(), false)
  })
  await withInboxFlag('TRUE', () => {
    assert.equal(isPrivateTeamOfferReady(), false)
  })
})

test('offer prices are grouped as CLP without cents', () => {
  assert.equal(formatPricePerMatchClp(25_000), '$25.000')
  assert.equal(formatPricePerMatchClp(40_000), '$40.000')
  assert.equal(formatPricePerMatchClp(1), '$1')
  assert.equal(
    formatPricePerMatchClp(PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP),
    '$999.999.999',
  )
})

test('the offer is ready only when every tier is real and the flag is true', () => {
  assert.equal(isPrivateTeamOfferReady(READY_OFFER), true)

  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, enabled: undefined }), false)
  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, enabled: '' }), false)
  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, enabled: 'TRUE' }), false)
  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, enabled: '1' }), false)

  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, tiers: [] }), false)
  assert.equal(
    isPrivateTeamOfferReady(
      offerWithTier(0, { paymentUrl: 'https://fintoc.me/PLACEHOLDER' }),
    ),
    false,
  )
  assert.equal(
    isPrivateTeamOfferReady(
      offerWithTier(1, { paymentUrl: 'https://fintoc.me/PLACEHOLDER' }),
    ),
    false,
  )
  assert.equal(isPrivateTeamOfferReady(offerWithTier(0, { paymentUrl: '   ' })), false)
  assert.equal(isPrivateTeamOfferReady(offerWithTier(0, { priceClp: 0 })), false)
  assert.equal(isPrivateTeamOfferReady(offerWithTier(1, { priceClp: 0 })), false)
  assert.equal(isPrivateTeamOfferReady(offerWithTier(1, { priceClp: -1 })), false)
  assert.equal(
    isPrivateTeamOfferReady(
      offerWithTier(0, { priceClp: PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP }),
    ),
    false,
  )
  assert.equal(
    isPrivateTeamOfferReady({ ...READY_OFFER, inboxEmail: 'placeholder@example.com' }),
    false,
  )
  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, inboxEmail: '   ' }), false)
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
    const postBody = (await postResponse.json()) as { error?: string }
    assert.equal(typeof postBody.error, 'string')

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
