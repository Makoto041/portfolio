// src/app/api/quickpost/register/options/route.ts
// 新しい端末にパスキーを登録する準備。登録のたびに管理画面のメールアドレスとパスワードを確かめる
// （盗まれたログイン Cookie だけでは鍵を増やせない。失敗が5回続くと Payload が10分ロックする）。
// 確かめたユーザーは、署名つきの確認値 Cookie（5分）に入れて次の /register/verify に渡す。
import { generateRegistrationOptions } from '@simplewebauthn/server'
import type { NextRequest } from 'next/server'
import { getPayloadClient } from '@/lib/payloadClient'
import { QP } from '@/lib/quickpost/config'
import {
  fail,
  json,
  qpSecret,
  readJson,
  rejectCrossSite,
  rejectTooManyFromIp,
  setChallengeCookie,
  verifyAdminPassword,
} from '@/lib/quickpost/server'
import { userHandle } from '@/lib/quickpost/tokens'
import { parseTransports } from '@/lib/quickpost/webauthn'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const blocked = rejectCrossSite(req) ?? rejectTooManyFromIp(req, 'register')
  if (blocked) return blocked

  const body = (await readJson(req, 4096)) as { email?: unknown; password?: unknown } | undefined
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password || email.length > 254 || password.length > 1024) return fail(400, 'invalid_body')

  try {
    const payload = await getPayloadClient()
    const user = await verifyAdminPassword(payload, email, password)
    if (!user) return fail(401, 'invalid_credentials')

    const existing = await payload.find({
      collection: 'passkeys',
      where: { user: { equals: user.id } },
      limit: 50,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })

    const options = await generateRegistrationOptions({
      rpName: QP.rpName,
      rpID: QP.rpID,
      userName: user.email,
      userDisplayName: user.name || user.email,
      userID: userHandle(user.id, qpSecret()),
      attestationType: 'none',
      // 登録済みの鍵を持つ端末（iCloud で同期された端末を含む）には二重に作らせない
      excludeCredentials: existing.docs.map((pk) => ({
        id: pk.credentialId,
        transports: parseTransports(pk.transports),
      })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      timeout: QP.challengeTtlMs,
    })

    const res = json(options)
    setChallengeCookie(res, { p: 'register', c: options.challenge, u: user.id })
    return res
  } catch (e) {
    console.error('quickpost: register options failed', e)
    return fail(500, 'server_error')
  }
}
