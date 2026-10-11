// src/lib/quickpost/tokens.ts
// さっと投稿のログインに使う乱数・ハッシュ・署名つきの確認値（チャレンジ）。
// - ログイン Cookie の中身は 256bit の乱数。DB にはその SHA-256 だけを保存する
// - パスキーの確認値は DB に書かず、HMAC で署名した短命の Cookie に入れる（5分・用途つき）。
//   使い回しは、ログイン成功時にその確認値のハッシュを一意制約つきで記録して防ぐ
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/** ログイン Cookie に入れる値（base64url 43文字） */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

/** ログイン Cookie の形として正しいか（DB を引く前の門前払い） */
export function isSessionTokenShape(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token)
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export type ChallengePurpose = 'login' | 'register'

export type ChallengeTicket = {
  /** 用途（ログイン用の確認値を登録に流用させない） */
  p: ChallengePurpose
  /** パスキーの確認値（base64url） */
  c: string
  /** 登録用: パスワードで確認したユーザー */
  u?: number | string
  /** 失効時刻（ms） */
  e: number
}

/** 署名用の鍵は PAYLOAD_SECRET から用途別に導出する（他の用途の署名と混ざらないように） */
function ticketKey(secret: string): Buffer {
  return createHmac('sha256', secret).update('quickpost/challenge/v1').digest()
}

export function signTicket(ticket: ChallengeTicket, secret: string): string {
  const body = Buffer.from(JSON.stringify(ticket)).toString('base64url')
  const sig = createHmac('sha256', ticketKey(secret)).update(body).digest('base64url')
  return `${body}.${sig}`
}

/** 署名・用途・期限を確かめて中身を返す。どれか1つでも合わなければ null */
export function verifyTicket(
  raw: string | undefined,
  purpose: ChallengePurpose,
  secret: string,
  now: number = Date.now(),
): ChallengeTicket | null {
  if (!raw || raw.length > 2048) return null
  const parts = raw.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  const [body, sig] = parts

  const expected = createHmac('sha256', ticketKey(secret)).update(body).digest()
  const given = Buffer.from(sig, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  let ticket: unknown
  try {
    ticket = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!ticket || typeof ticket !== 'object') return null
  const t = ticket as Partial<ChallengeTicket>
  if (t.p !== purpose || typeof t.c !== 'string' || !t.c || typeof t.e !== 'number') return null
  if (now >= t.e) return null
  if (purpose === 'register' && (t.u === undefined || t.u === null)) return null
  return t as ChallengeTicket
}

/**
 * パスキーに入れるユーザーの識別子（WebAuthn の user.id）。DB の ID やメールアドレスをそのまま端末に渡さず、
 * 秘密鍵から導いた固定の値にする（同じ端末で登録し直したときは、端末側で上書きされる）
 */
export function userHandle(userId: number | string, secret: string): Uint8Array<ArrayBuffer> {
  const digest = createHmac('sha256', secret).update(`quickpost/user/v1:${userId}`).digest()
  return new Uint8Array(digest)
}
