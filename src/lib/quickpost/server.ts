// src/lib/quickpost/server.ts
// さっと投稿の API（/api/quickpost/*）で共通に使うサーバー側の処理。
// - 送信元・IP の回数制限・JSON の受信上限
// - 端末ごとのログイン（post-sessions）の発行・確認・延長・取り消しと Cookie
// - パスキーの確認値（チャレンジ）Cookie と、使用済みの記録（使い回しの拒否）
// - 1台ごとの回数制限（SQL で原子的に数える）・投稿の受付票（二重投稿の防止）・トランザクション
// - 新しい端末を登録するときの管理画面パスワードの確認
import { sql } from '@payloadcms/db-vercel-postgres'
import { NextResponse, type NextRequest } from 'next/server'
import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  ValidationError,
  type Payload,
  type PayloadRequest,
} from 'payload'
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
  type RateKind,
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

const DAY = 24 * 60 * 60 * 1000

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
  // 使った日時だけを書く。Payload の update は行の全部の列を書き戻すので、同時に走る回数制限・投稿数の
  // 加算（consumeRate・recordPost の SQL）を打ち消してしまう
  await payload.db.drizzle.execute(sql`
    UPDATE post_sessions SET last_used_at = ${lastUsedAt}, updated_at = ${lastUsedAt}
    WHERE id = ${session.id}`)
  session.lastUsedAt = lastUsedAt
  return true
}

/** Cookie の期限を、このログインの残り期間に合わせて置き直す */
export function refreshSessionCookies(req: NextRequest, res: NextResponse, session: QPSession) {
  const token = req.cookies.get(QP.sessionCookie)?.value
  if (isSessionTokenShape(token)) setSessionCookies(res, token, sessionDeadline(session, QP.idleMs))
}

/**
 * ひとまとまりの書き込みを1つのトランザクションで行う（途中で失敗したら全部取り消す）。
 * fn には Local API に渡す req（transactionID つき）を渡す
 */
export async function withTransaction<T>(
  payload: Payload,
  fn: (req: PayloadRequest) => Promise<T>,
): Promise<T> {
  const req = await createLocalReq({}, payload)
  const own = await initTransaction(req)
  try {
    const result = await fn(req)
    if (own) assertInTransaction(req)
    if (own) await commitTransaction(req)
    return result
  } catch (e) {
    if (own) await killTransaction(req)
    throw e
  }
}

/**
 * 一意制約（unique）で断られた書き込みか。Postgres の一意制約違反は、Payload が項目名つきの
 * ValidationError に変えて投げる。DB の障害などはこれに当たらないので、呼び出し側でそのまま 500 にする
 */
export function isUniqueViolation(e: unknown, field: string): boolean {
  if (!(e instanceof ValidationError)) return false
  const errors = (e.data as { errors?: { path?: unknown }[] } | null)?.errors
  return Array.isArray(errors) && errors.some((x) => x?.path === field)
}

/**
 * トランザクションがまだ生きているか確かめる。Payload は失敗した操作のトランザクションを取り消して
 * transactionID を消すので、どこかのフックがその失敗を握りつぶしていても、ここで成功として扱わない
 */
export function assertInTransaction(req: PayloadRequest): void {
  if (!req.transactionID) throw new Error('quickpost: the transaction was rolled back')
}

export class ReplayedChallengeError extends Error {
  constructor() {
    super('challenge already used')
    this.name = 'ReplayedChallengeError'
  }
}

/**
 * 確認値（チャレンジ）を「使用済み」として記録する。同じ確認値の2回目は一意制約で失敗させる。
 * ログアウトや端末の取り消しでも消えない別の表（quickpost-nonces）に残すので、取り消し後の使い回しも通らない
 */
export async function markChallengeUsed(
  payload: Payload,
  purpose: ChallengePurpose,
  challenge: string,
  req: PayloadRequest,
): Promise<void> {
  try {
    await payload.create({
      collection: 'quickpost-nonces',
      data: {
        key: `challenge:${sha256Hex(`${purpose}:${challenge}`)}`,
        expiresAt: new Date(Date.now() + DAY).toISOString(),
      },
      depth: 0,
      overrideAccess: true,
      req,
    })
  } catch (e) {
    if (isUniqueViolation(e, 'key')) throw new ReplayedChallengeError()
    throw e
  }
}

/** 新しくログインを発行する（呼び出し側のトランザクションの中で） */
export async function createSession(
  payload: Payload,
  opts: { userId: ID; passkeyId: ID; name: string },
  req: PayloadRequest,
): Promise<{ token: string; deadline: number }> {
  const now = Date.now()
  // このユーザーの期限切れの記録を片付ける（表が増え続けないように）
  await payload.delete({
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
    req,
  })

  const token = newSessionToken()
  const doc = await payload.create({
    collection: 'post-sessions',
    data: {
      user: opts.userId,
      passkey: opts.passkeyId,
      name: opts.name,
      tokenHash: sha256Hex(token),
      lastUsedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + QP.absoluteMs).toISOString(),
      postCount: 0,
    },
    depth: 0,
    overrideAccess: true,
    req,
  })
  return { token, deadline: sessionDeadline(doc, QP.idleMs) }
}

/**
 * 1台ごとの回数制限を1回分使う。使えたら true。
 * 読んでから書く方式だと同時に送られた分を数え漏らすため、1回の UPDATE で
 * 「時間枠が過ぎていれば数え直し、上限未満なら 1 足す」を行い、更新できた行があるかで判定する。
 * SQL を直接流すので withTransaction の中では呼ばない（そのトランザクションが持つ行ロックを待ち続ける）
 */
export async function consumeRate(
  payload: Payload,
  sessionId: ID,
  kind: RateKind,
): Promise<boolean> {
  const max = QP.rate[kind]
  const windowSecs = QP.rate.windowMs / 1000
  const expired = sql`(rl_window_start IS NULL OR rl_window_start <= now() - make_interval(secs => ${windowSecs}))`
  const used = kind === 'posts' ? sql`COALESCE(rl_posts, 0)` : sql`COALESCE(rl_photos, 0)`
  const addPosts = kind === 'posts' ? 1 : 0
  const addPhotos = kind === 'photos' ? 1 : 0
  const result = await payload.db.drizzle.execute(sql`
    UPDATE post_sessions SET
      rl_window_start = CASE WHEN ${expired} THEN now() ELSE rl_window_start END,
      rl_posts = CASE WHEN ${expired} THEN ${addPosts} ELSE COALESCE(rl_posts, 0) + ${addPosts} END,
      rl_photos = CASE WHEN ${expired} THEN ${addPhotos} ELSE COALESCE(rl_photos, 0) + ${addPhotos} END
    WHERE id = ${sessionId} AND (${expired} OR ${used} < ${max})
    RETURNING id`)
  return (result.rows?.length ?? 0) > 0
}

/**
 * 投稿したことを記録する。投稿数は同時に送られても数え漏らさないよう、読まずに SQL で 1 足す。
 * consumeRate と同じく withTransaction の中では呼ばない
 */
export async function recordPost(payload: Payload, sessionId: ID, at: string): Promise<void> {
  await payload.db.drizzle.execute(sql`
    UPDATE post_sessions SET
      post_count = COALESCE(post_count, 0) + 1,
      last_post_at = ${at},
      last_used_at = ${at},
      updated_at = ${at}
    WHERE id = ${sessionId}`)
}

/**
 * ログインに使ったパスキーを記録する（使用回数・バックアップの有無・最後に使った日時を1回の UPDATE で）。
 * 使用回数は記録より大きいときだけ進める（同時のログインで小さい値に戻さない）。回数を数えないパスキー（いつも 0）は、
 * 記録も 0 のときだけ通す（記録が進んでいるのに 0 が返るのは、数える鍵の複製の疑い）。判定は @simplewebauthn と同じ規則を、
 * 読み取りから書き込みまでの間にほかのログインが割り込んでも崩れないよう、この UPDATE の条件で確かめ直す。
 * 通せないときは false を返し、呼び出し側はログインさせない。Payload の update は行の全部の列を書き戻し、
 * 同時のログインで古い回数に戻しうるので、ログインではこの行をここ以外で書かない。トランザクションの外で呼ぶこと
 */
export async function recordPasskeyUse(
  payload: Payload,
  passkeyId: ID,
  { counter, backedUp }: { counter: number; backedUp: boolean },
): Promise<boolean> {
  const at = new Date().toISOString()
  const result = await payload.db.drizzle.execute(sql`
    UPDATE passkeys SET
      counter = ${counter}::numeric,
      backed_up = ${backedUp},
      last_used_at = ${at},
      updated_at = ${at}
    WHERE id = ${passkeyId}
      AND (
        (${counter}::numeric = 0 AND COALESCE(counter, 0) = 0)
        OR COALESCE(counter, 0) < ${counter}::numeric
      )
    RETURNING id`)
  return result.rows.length > 0
}

// ── 投稿の受付票（二重投稿の防止） ──

/** 作りかけの受付票を「途中で落ちた」とみなすまでの時間（投稿は数秒で終わる） */
const RECEIPT_STALE_MS = 2 * 60 * 1000

export type ReceiptClaim =
  | { status: 'new'; receiptId: ID }
  | { status: 'done'; postId: number; digest: string | null }
  | { status: 'busy' }

/**
 * 下書きのキーで受付票を取る。最初の1回だけ new、すでに投稿できていれば done（その投稿と、最初に送った内容の指紋を返す）、
 * 同じ下書きをいま送っている途中なら busy。指紋は最初に受付票を取った送信のものだけが残る（一意制約で1つに決まる）。
 * 受付票はユーザーごと（同じ端末で別のユーザーに切り替えて同じ下書きを送っても、前のユーザーの投稿を返さない）
 */
export async function claimPostReceipt(
  payload: Payload,
  userId: ID,
  key: string,
  digest: string,
): Promise<ReceiptClaim> {
  const receiptKey = `post:${userId}:${key}`
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const doc = await payload.create({
        collection: 'quickpost-nonces',
        data: {
          key: receiptKey,
          digest,
          expiresAt: new Date(Date.now() + 30 * DAY).toISOString(),
        },
        depth: 0,
        overrideAccess: true,
      })
      return { status: 'new', receiptId: doc.id }
    } catch (e) {
      if (!isUniqueViolation(e, 'key')) throw e
      const found = await payload.find({
        collection: 'quickpost-nonces',
        where: { key: { equals: receiptKey } },
        limit: 1,
        depth: 0,
        pagination: false,
        overrideAccess: true,
      })
      const receipt = found.docs[0]
      if (!receipt) continue
      if (typeof receipt.postId === 'number') {
        return { status: 'done', postId: receipt.postId, digest: receipt.digest ?? null }
      }
      if (Date.now() - Date.parse(receipt.createdAt) < RECEIPT_STALE_MS) return { status: 'busy' }
      // 途中で落ちた受付票は取り直す（同時に取り直した相手が先に消していても、そのまま作り直しへ）
      await deleteOpenReceipt(payload, receipt.id).catch((e) =>
        console.error('quickpost: failed to drop stale receipt', e),
      )
    }
  }
  return { status: 'busy' }
}

/** 受付票に投稿の ID を残す（投稿の保存と同じトランザクションの req を渡す） */
export async function completePostReceipt(
  payload: Payload,
  receiptId: ID,
  postId: number,
  req: PayloadRequest,
): Promise<void> {
  await payload.update({
    collection: 'quickpost-nonces',
    id: receiptId,
    data: { postId },
    depth: 0,
    overrideAccess: true,
    req,
  })
}

/**
 * 投稿の ID が入っていない受付票だけを消す。確定した受付票を消すと送り直しで二重に投稿されうるため、
 * 「まだ空か」の確認と削除を1回の DELETE で行う（別々に行うと、その間に確定した受付票を消しうる）
 */
async function deleteOpenReceipt(payload: Payload, receiptId: ID): Promise<void> {
  await payload.db.drizzle.execute(
    sql`DELETE FROM quickpost_nonces WHERE id = ${receiptId} AND post_id IS NULL`,
  )
}

/** 投稿できなかった受付票を消す（同じ下書きで送り直せるように） */
export async function releasePostReceipt(payload: Payload, receiptId: ID): Promise<void> {
  await deleteOpenReceipt(payload, receiptId).catch((e) =>
    console.error('quickpost: failed to release receipt', e),
  )
}

/** 期限を過ぎた記録を片付ける（投稿のたびに、ついでに） */
export async function pruneNonces(payload: Payload): Promise<void> {
  await payload
    .delete({
      collection: 'quickpost-nonces',
      where: { expiresAt: { less_than: new Date().toISOString() } },
      overrideAccess: true,
    })
    .catch((e) => console.error('quickpost: failed to prune nonces', e))
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
