// src/app/api/quickpost/register/verify/route.ts
// 端末が作ったパスキー（公開鍵）を確かめて保存し、そのままこの端末のログインを発行する。
// 秘密鍵は端末から出ない。サーバーに残るのは公開鍵だけ（漏れてもログインには使えない）。
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import type { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payloadClient'
import { QP } from '@/lib/quickpost/config'
import { deviceLabel } from '@/lib/quickpost/input'
import {
  clearChallengeCookie,
  createSession,
  json,
  readChallenge,
  readJson,
  rejectCrossSite,
  rejectTooManyFromIp,
  setSessionCookies,
} from '@/lib/quickpost/server'
import { asRegistrationResponse } from '@/lib/quickpost/webauthn'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const blocked = rejectCrossSite(req) ?? rejectTooManyFromIp(req, 'register')
  if (blocked) return blocked

  const done = (status: number, body: Record<string, unknown>) => {
    const res = json(body, status)
    clearChallengeCookie(res)
    return res
  }

  const ticket = readChallenge(req, 'register')
  if (!ticket || ticket.u === undefined) return done(400, { error: 'challenge_expired' })

  const response = asRegistrationResponse(await readJson(req))
  if (!response) return done(400, { error: 'invalid_body' })

  try {
    const payload = await getPayloadClient()
    const user = await payload.findByID({
      collection: 'users',
      id: ticket.u,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    })
    if (!user) return done(401, { error: 'invalid_credentials' })

    let verification
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: ticket.c,
        expectedOrigin: QP.origin,
        expectedRPID: QP.rpID,
        requireUserVerification: true,
      })
    } catch (e) {
      console.warn('quickpost: passkey registration failed:', e instanceof Error ? e.message : e)
      return done(400, { error: 'verification_failed' })
    }
    if (!verification.verified) return done(400, { error: 'verification_failed' })

    const { credential, credentialBackedUp } = verification.registrationInfo
    const name = deviceLabel(req.headers.get('user-agent'))
    const now = new Date().toISOString()

    let passkeyId: number | string
    try {
      const passkey = await payload.create({
        collection: 'passkeys',
        data: {
          name,
          user: user.id,
          credentialId: credential.id,
          publicKey: isoBase64URL.fromBuffer(credential.publicKey),
          counter: credential.counter,
          transports: (credential.transports ?? []).join(','),
          backedUp: credentialBackedUp,
          lastUsedAt: now,
        },
        depth: 0,
        overrideAccess: true,
      })
      passkeyId = passkey.id
    } catch (e) {
      // 同じ鍵の二重登録（credentialId の一意制約）
      console.warn('quickpost: passkey was not saved:', e instanceof Error ? e.message : e)
      return done(409, { error: 'already_registered' })
    }

    const created = await createSession(payload, {
      userId: user.id,
      passkeyId,
      name,
      challenge: ticket.c,
      purpose: 'register',
    })
    const res = done(200, { ok: true })
    setSessionCookies(res, created.token, created.deadline)
    return res
  } catch (e) {
    console.error('quickpost: register failed', e)
    return done(500, { error: 'server_error' })
  }
}
