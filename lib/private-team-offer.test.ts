import assert from 'node:assert/strict'
import test from 'node:test'

import {
  FINTOC_PAYMENT_URL,
  PRICE_PER_MATCH_CLP,
  PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP,
  TEAM_INBOX_EMAIL,
  isPrivateTeamOfferReady,
  type PrivateTeamOfferConfig,
} from './private-team-offer'

const READY_OFFER: PrivateTeamOfferConfig = {
  paymentUrl: 'https://fintoc.me/carpeta-equipos',
  pricePerMatchClp: 45_000,
  inboxEmail: 'equipos@carpeta.cl',
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

test('the shipped offer stays closed while any placeholder remains', async () => {
  assert.equal(PRICE_PER_MATCH_CLP, PRIVATE_TEAM_OFFER_PLACEHOLDER_PRICE_CLP)
  assert.match(FINTOC_PAYMENT_URL, /placeholder/i)
  assert.match(TEAM_INBOX_EMAIL, /placeholder/i)

  await withInboxFlag('true', () => {
    assert.equal(isPrivateTeamOfferReady(), false)
  })
  await withInboxFlag(undefined, () => {
    assert.equal(isPrivateTeamOfferReady(), false)
  })
})

test('the offer is ready only when every value is real and the flag is true', () => {
  assert.equal(isPrivateTeamOfferReady(READY_OFFER), true)

  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, enabled: undefined }), false)
  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, enabled: '' }), false)
  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, enabled: 'TRUE' }), false)
  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, enabled: '1' }), false)

  assert.equal(
    isPrivateTeamOfferReady({ ...READY_OFFER, paymentUrl: FINTOC_PAYMENT_URL }),
    false,
  )
  assert.equal(
    isPrivateTeamOfferReady({ ...READY_OFFER, pricePerMatchClp: PRICE_PER_MATCH_CLP }),
    false,
  )
  assert.equal(
    isPrivateTeamOfferReady({ ...READY_OFFER, inboxEmail: TEAM_INBOX_EMAIL }),
    false,
  )
  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, paymentUrl: '   ' }), false)
  assert.equal(isPrivateTeamOfferReady({ ...READY_OFFER, pricePerMatchClp: 0 }), false)
})

test('the team inbox route returns 503 and does not open a submission', async () => {
  const { POST, PUT } = await import('../app/api/team-inbox/route')
  await withInboxFlag('true', async () => {
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
