// src/lib/quickpost/server.ts
// さっと投稿の API（/api/quickpost/*）で共通に使うサーバー側の処理。
// - 送信元・IP の回数制限・JSON の受信上限
// - 端末ごとのログイン（post-sessions）の発行・確認・延長・取り消しと Cookie
// - パスキーの確認値（チャレンジ）Cookie
// - 新しい端末を登録するときの管理画面パスワードの確認
import { NextResponse, type NextRequest } from 'next/server'
import type { Payload } from 'payload'
import { getPayloadClient } from '@/lib/payloadClient'
import type { PostSession } from '@/payload-types'
import { COOKIE_BASE, QP } from './config'
import {
  createIpLimiter,
  isSameOriginRequest,
  isSessionAlive,
  maxAgeSeconds,
  sessionDeadline,
  shouldTouch,
} from './policy'
import {
  isSessionTokenShape,
  newSessionToken,
  sha256Hex,
  signTicket,
  verifyTicket,
  type ChallengePurpose,
  type ChallengeTicket,
} from './tokens'

/** Payload（Postgres）の ID は数値 */
type ID = number

export type QPUser = { id: ID; email: string; name?: string | null; collection: 'users' }

export type QPSession = PostSession

export const relId = (v: ID | { id: ID } | null | undefined): ID | null =>
  v === null || v === undefined ? null : typeof v === 'object' ? v.id : v

// ── 応答 ──

/** 応答は必ずキャッシュさせない */
export function json(body: unknown, status = 200): NextResponse {
  const res = NextResponse.json(body, { status })
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export const fail = (status: number, error: string) => json({ error }, status)

// ── 入口のチェック ──

/** このサイトのページからの送信でなければ 403 を返す */
export function rejectCrossSite(req: NextRequest): NextResponse | null {
  return isSameOriginRequest(req.headers, QP.origin) ? null : fail(403, 'forbidden_origin')
}

const ipLimiter = createIpLimiter(QP.ipRate.windowMs, QP.ipRate.max)

/** x-real-ip は Vercel が付ける信頼できる値。偽装しうる x-forwarded-for は最後の手段 */
export function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

/** ログイン前の API の IP ごとの回数制限 */
export function rejectTooManyFromIp(req: NextRequest, scope: string): NextResponse | null {
  return ipLimiter(`${scope}:${clientIp(req)}`) ? null : fail(429, 'too_many_requests')
}

/** JSON 本文を上限つきで読む。形が違えば undefined */
export async function readJson(req: NextRequest, max: number = QP.maxJsonBytes): Promise<unknown> {
  const type = req.headers.get('content-type') ?? ''
  if (!type.toLowerCase().startsWith('application/json')) return undefined
  if (Number(req.headers.get('content-length') ?? 0) > max) return undefined
  const text = await req.text()
  if (Buffer.byteLength(text) > max) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** 署名・識別子の導出に使う秘密鍵（PAYLOAD_SECRET）。無ければ動かさない */
export function qpSecret(): string {
  const s = process.env.PAYLOAD_SECRET
  if (!s) throw new Error('PAYLOAD_SECRET is not set')
  return s
}

// ── Cookie ──

/** ログイン Cookie（HttpOnly・SameSite=Strict）と、ボタン表示用の目印 Cookie を置く */
export function setSessionCookies(res: NextResponse, token: string, deadline: number) {
  const maxAge = maxAgeSeconds(deadline)
  res.cookies.set(QP.sessionCookie, token, {
    ...COOKIE_BASE,
    httpOnly: true,
    sameSite: 'strict',
    maxAge,
  })
  res.cookies.set(QP.hintCookie, '1', { ...COOKIE_BASE, httpOnly: false, sameSite: 'lax', maxAge })
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(QP.sessionCookie, '', {
    ...COOKIE_BASE,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 0,
  })
  res.cookies.set(QP.hintCookie, '', {
    ...COOKIE_BASE,
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 0,
  })
}

export function setChallengeCookie(res: NextResponse, ticket: Omit<ChallengeTicket, 'e'>) {
  const value = signTicket({ ...ticket, e: Date.now() + QP.challengeTtlMs }, qpSecret())
  res.cookies.set(QP.challengeCookie, value, {
    ...COOKIE_BASE,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: Math.floor(QP.challengeTtlMs / 1000),
  })
}

/** 確認値 Cookie を読む（署名・用途・期限を確認）。使ったら clearChallengeCookie で必ず消す */
export function readChallenge(req: NextRequest, purpose: ChallengePurpose): ChallengeTicket | null {
  return verifyTicket(req.cookies.get(QP.challengeCookie)?.value, purpose, qpSecret())
}

export function clearChallengeCookie(res: NextResponse) {
  res.cookies.set(QP.challengeCookie, '', {
    ...COOKIE_BASE,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 0,
  })
}

// ── 端末ごとのログイン ──

export type ActiveSession = { payload: Payload; session: QPSession; user: QPUser }

/**
 * Cookie からログイン中の端末を確かめる。
 * 期限切れ・ユーザーやパスキーが消えている場合はその記録を消して null を返す
 */
export async function getSession(req: NextRequest): Promise<ActiveSession | null> {
  const token = req.cookies.get(QP.sessionCookie)?.value
  if (!isSessionTokenShape(token)) return null

  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'post-sessions',
    where: { tokenHash: { equals: sha256Hex(token) } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const session = found.docs[0]
  if (!session) return null

  const drop = async () => {
    await payload
      .delete({ collection: 'post-sessions', id: session.id, overrideAccess: true })
      .catch((e) => console.error('quickpost: failed to delete stale session', e))
    return null
  }

  if (!isSessionAlive(session, QP.idleMs)) return drop()

  const userId = relId(session.user)
  const user = userId
    ? await payload.findByID({
        collection: 'users',
        id: userId,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      })
    : null
  if (!user) return drop()

  // ログインは必ずパスキーから発行する。パスキーが消えている（参照が空・存在しない）ログインは無効
  const passkeyId = relId(session.passkey)
  const passkey = passkeyId
    ? await payload.findByID({
        collection: 'passkeys',
        id: passkeyId,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      })
    : null
  if (!passkey) return drop()

  return {
    payload,
    session,
    user: { id: user.id, email: user.email, name: user.name, collection: 'users' },
  }
}

/**
 * 使うたびにログインを延長する（「最後に使った日時」は1時間に1回だけ書き込む）。
 * 延長したら true を返すので、呼び出し側は refreshSessionCookies で Cookie の期限も延ばす
 */
export async function touchSession(active: ActiveSession): Promise<boolean> {
  const { payload, session } = active
  if (!shouldTouch(session.lastUsedAt, QP.touchEveryMs)) return false
  const lastUsedAt = new Date().toISOString()
  await payload.update({
    collection: 'post-sessions',
    id: session.id,
    data: { lastUsedAt },
    depth: 0,
    overrideAccess: true,
  })
  session.lastUsedAt = lastUsedAt
  return true
}

/** Cookie の期限を、このログインの残り期間に合わせて置き直す */
export function refreshSessionCookies(req: NextRequest, res: NextResponse, session: QPSession) {
  const token = req.cookies.get(QP.sessionCookie)?.value
  if (isSessionTokenShape(token)) setSessionCookies(res, token, sessionDeadline(session, QP.idleMs))
}

/** 新しくログインを発行する。同じ確認値での2回目のログインは一意制約で失敗する */
export async function createSession(
  payload: Payload,
  opts: { userId: ID; passkeyId: ID; name: string; challenge: string; purpose: ChallengePurpose },
): Promise<{ token: string; deadline: number }> {
  const now = Date.now()
  // このユーザーの期限切れの記録を片付ける（表が増え続けないように）
  await payload
    .delete({
      collection: 'post-sessions',
      where: {
        and: [
          { user: { equals: opts.userId } },
          {
            or: [
              { expiresAt: { less_than: new Date(now).toISOString() } },
              { lastUsedAt: { less_than: new Date(now - QP.idleMs).toISOString() } },
            ],
          },
        ],
      },
      overrideAccess: true,
    })
    .catch((e) => console.error('quickpost: failed to prune sessions', e))

  const token = newSessionToken()
  const doc = await payload.create({
    collection: 'post-sessions',
    data: {
      user: opts.userId,
      passkey: opts.passkeyId,
      name: opts.name,
      tokenHash: sha256Hex(token),
      challengeHash: sha256Hex(`${opts.purpose}:${opts.challenge}`),
      lastUsedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + QP.absoluteMs).toISOString(),
      postCount: 0,
    },
    depth: 0,
    overrideAccess: true,
  })
  return { token, deadline: sessionDeadline(doc, QP.idleMs) }
}

/** 管理画面のメールアドレスとパスワードを確かめる（Payload のログインと同じ失敗回数ロックが効く） */
export async function verifyAdminPassword(
  payload: Payload,
  email: string,
  password: string,
): Promise<QPUser | null> {
  try {
    const result = await payload.login({ collection: 'users', data: { email, password } })
    const user = result.user
    return user ? { id: user.id, email: user.email, name: user.name, collection: 'users' } : null
  } catch {
    // パスワード違い・存在しないユーザー・ロック中はすべて同じ扱い（どれかを相手に教えない）
    return null
  }
}
