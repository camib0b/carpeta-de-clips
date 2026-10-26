import { NextResponse } from 'next/server'

import {
  TeamInboxRequestError,
  abortTeamInboxSubmission,
  completeTeamInboxSubmission,
  createTeamInboxSubmission,
  uploadTeamInboxPart,
} from '@/lib/team-inbox.server'
import { teamInboxMessages } from '@/lib/team-inbox'

export const dynamic = 'force-dynamic'

const JSON_BODY_MAX_BYTES = 1_000_000

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  })
}

function failureResponse(error: unknown): NextResponse {
  if (error instanceof TeamInboxRequestError) {
    return json({ error: error.message }, error.status)
  }
  console.error('team inbox failed', error)
  return json({ error: teamInboxMessages.saveFailed }, 500)
}

async function readJsonBody(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > JSON_BODY_MAX_BYTES) {
    throw new TeamInboxRequestError(teamInboxMessages.unreadable, 413)
  }
  return request.json()
}

export async function POST(request: Request): Promise<NextResponse> {
  const action = new URL(request.url).searchParams.get('action') ?? 'create'
  try {
    if (action === 'create') {
      const body = await readJsonBody(request)
      const plan = await createTeamInboxSubmission(request, body)
      return json(plan, 201)
    }
    if (action === 'complete') {
      const body = await readJsonBody(request)
      await completeTeamInboxSubmission(request, body)
      return json({ ok: true }, 200)
    }
    if (action === 'abort') {
      const body = await readJsonBody(request)
      await abortTeamInboxSubmission(request, body)
      return json({ ok: true }, 200)
    }
    return json({ error: teamInboxMessages.unknownAction }, 400)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return json({ error: teamInboxMessages.unreadable }, 400)
    }
    return failureResponse(error)
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const part = await uploadTeamInboxPart(request)
    return json(part, 200)
  } catch (error) {
    return failureResponse(error)
  }
}
