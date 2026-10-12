// src/app/api/quickpost/login/verify/route.ts
// パスキーの署名を確かめて、この端末のログインを発行する。
// 確認値 Cookie は成否にかかわらず消す（1回きり）。同じ確認値での2回目は、使用済みの記録（quickpost-nonces の一意制約）で弾く。
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
  markChallengeUsed,
  ReplayedChallengeError,
  withTransaction,
  readChallenge,
  readJson,
  recordPasskeyUse,
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

    // パスキーの使用回数・バックアップの有無・最後に使った日時を、1回の UPDATE で記録する。使用回数は記録より
    // 大きいときだけ進め、進められない（同じかより新しい回数の応答がすでに通った＝複製された鍵の疑い）ならログインさせない。
    // この行はトランザクションの中では書かない（Payload の update は全部の列を書き戻し、同時のログインで古い回数に戻しうる）
    const { newCounter, credentialBackedUp } = verification.authenticationInfo
    if (
      !(await recordPasskeyUse(payload, passkey.id, {
        counter: newCounter,
        backedUp: credentialBackedUp,
      }))
    ) {
      console.warn('quickpost: passkey counter did not advance; refusing the login')
      return done(401, { error: 'verification_failed' })
    }

    // 確認値を使用済みにする・ログインを発行、を1つのトランザクションで
    let created
    try {
      created = await withTransaction(payload, async (txReq) => {
        await markChallengeUsed(payload, 'login', ticket.c, txReq)
        return createSession(
          payload,
          {
            userId: user.id,
            passkeyId: passkey.id,
            name: deviceLabel(req.headers.get('user-agent')),
          },
          txReq,
        )
      })
    } catch (e) {
      // 同じ確認値での2回目（使い回し）はここで弾く
      if (e instanceof ReplayedChallengeError) return done(401, { error: 'verification_failed' })
      throw e
    }

    const res = done(200, { ok: true })
    setSessionCookies(res, created.token, created.deadline)
    return res
  } catch (e) {
    console.error('quickpost: login failed', e)
    return done(500, { error: 'server_error' })
  }
}
