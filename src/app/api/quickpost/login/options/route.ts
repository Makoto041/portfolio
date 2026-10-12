// src/app/api/quickpost/login/options/route.ts
// パスキーでログインするための確認値（チャレンジ）を発行する。
// どの端末のパスキーかはまだ分からないので、端末に保存されたパスキーから選んでもらう（allowCredentials なし）。
// 確認値は DB に書かず、署名つきの短命 Cookie（HttpOnly・SameSite=Strict・5分）で持つ。
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import type { NextRequest } from 'next/server'
import { QP } from '@/lib/quickpost/config'
import {
  json,
  rejectCrossSite,
  rejectTooManyFromIp,
  setChallengeCookie,
} from '@/lib/quickpost/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const blocked = rejectCrossSite(req) ?? rejectTooManyFromIp(req, 'login')
  if (blocked) return blocked

  const options = await generateAuthenticationOptions({
    rpID: QP.rpID,
    // 顔・指紋・端末のパスコードでの本人確認を必須にする（端末を拾っただけでは入れない）
    userVerification: 'required',
    timeout: QP.challengeTtlMs,
  })
  const res = json(options)
  setChallengeCookie(res, { p: 'login', c: options.challenge })
  return res
}
