// src/app/api/quickpost/login/verify/route.ts
// パスキーの署名を確かめて、この端末のログインを発行する。
// 確認値 Cookie は成否にかかわらず消す（1回きり）。同じ確認値での2回目は post-sessions の一意制約で弾く。
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
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
  relId,
  setSessionCookies,
} from '@/lib/quickpost/server'
import { asAuthenticationResponse, parseTransports } from '@/lib/quickpost/webauthn'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const blocked = rejectCrossSite(req) ?? rejectTooManyFromIp(req, 'login')
  if (blocked) return blocked

  const done = (status: number, body: Record<string, unknown>) => {
    const res = json(body, status)
    clearChallengeCookie(res)
    return res
  }

  const ticket = readChallenge(req, 'login')
  if (!ticket) return done(400, { error: 'challenge_expired' })

  const response = asAuthenticationResponse(await readJson(req))
  if (!response) return done(400, { error: 'invalid_body' })

  try {
    const payload = await getPayloadClient()
    const found = await payload.find({
      collection: 'passkeys',
      where: { credentialId: { equals: response.id } },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    const passkey = found.docs[0]
    // 管理画面で消したパスキーは、端末に残っていても使えない
    if (!passkey) return done(401, { error: 'unknown_passkey' })

    let verification
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: ticket.c,
        expectedOrigin: QP.origin,
        expectedRPID: QP.rpID,
        credential: {
          id: passkey.credentialId,
          publicKey: isoBase64URL.toBuffer(passkey.publicKey),
          counter: passkey.counter ?? 0,
          transports: parseTransports(passkey.transports),
        },
        requireUserVerification: true,
      })
    } catch (e) {
      console.warn('quickpost: passkey verification failed:', e instanceof Error ? e.message : e)
      return done(401, { error: 'verification_failed' })
    }
    if (!verification.verified) return done(401, { error: 'verification_failed' })

    const userId = relId(passkey.user)
    const user = userId
      ? await payload.findByID({
          collection: 'users',
          id: userId,
          depth: 0,
          overrideAccess: true,
          disableErrors: true,
        })
      : null
    if (!user) return done(401, { error: 'verification_failed' })

    const { newCounter, credentialBackedUp } = verification.authenticationInfo
    await payload.update({
      collection: 'passkeys',
      id: passkey.id,
      data: {
        counter: newCounter,
        backedUp: credentialBackedUp,
        lastUsedAt: new Date().toISOString(),
      },
      depth: 0,
      overrideAccess: true,
    })

    let created
    try {
      created = await createSession(payload, {
        userId: user.id,
        passkeyId: passkey.id,
        name: deviceLabel(req.headers.get('user-agent')),
        challenge: ticket.c,
        purpose: 'login',
      })
    } catch (e) {
      // 同じ確認値での2回目（使い回し）はここで失敗する
      console.warn('quickpost: session was not created:', e instanceof Error ? e.message : e)
      return done(401, { error: 'verification_failed' })
    }

    const res = done(200, { ok: true })
    setSessionCookies(res, created.token, created.deadline)
    return res
  } catch (e) {
    console.error('quickpost: login failed', e)
    return done(500, { error: 'server_error' })
  }
}
