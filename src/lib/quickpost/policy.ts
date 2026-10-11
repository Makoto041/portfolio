// src/lib/quickpost/policy.ts
// さっと投稿のログイン期限・回数制限・送信元の判定（DB に触れない純粋な関数。単体テストあり）。

export type SessionTimes = {
  /** 最後に使った日時 */
  lastUsedAt: string
  /** ログインし直しが必要になる日時（ログイン時点 + 最長期間） */
  expiresAt: string
}

/** このログインが切れる時刻（使わなければ切れる時刻と、最長期限の早い方） */
export function sessionDeadline(s: SessionTimes, idleMs: number): number {
  const idle = Date.parse(s.lastUsedAt) + idleMs
  const absolute = Date.parse(s.expiresAt)
  if (Number.isNaN(idle) || Number.isNaN(absolute)) return 0
  return Math.min(idle, absolute)
}

export function isSessionAlive(s: SessionTimes, idleMs: number, now: number = Date.now()): boolean {
  return now < sessionDeadline(s, idleMs)
}

/** 「最後に使った日時」を更新する頃か（毎回は書き込まない） */
export function shouldTouch(
  lastUsedAt: string,
  everyMs: number,
  now: number = Date.now(),
): boolean {
  const last = Date.parse(lastUsedAt)
  return Number.isNaN(last) || now - last >= everyMs
}

/** Cookie の Max-Age（秒）。期限を過ぎていれば 0 */
export function maxAgeSeconds(deadline: number, now: number = Date.now()): number {
  return Math.max(0, Math.floor((deadline - now) / 1000))
}

// ── 回数制限（1台ごと・時間枠ごと） ──
// 数える処理は同時アクセスでも漏れないよう SQL の1回の UPDATE で行う（server.ts の consumeRate）

export type RateKind = 'posts' | 'photos'

// ── 送信元 ──

/**
 * このサイトのページからの送信か。
 * Origin が自サイトと完全一致し、Sec-Fetch-Site があれば same-origin であること。
 * ほかのサイトに仕込まれたフォームやスクリプトからの送信（CSRF）を断る
 */
export function isSameOriginRequest(headers: Headers, origin: string): boolean {
  const sent = headers.get('origin')
  if (!sent || sent !== origin) return false
  const site = headers.get('sec-fetch-site')
  if (site && site !== 'same-origin') return false
  return true
}

/** IP ごとの簡易回数制限（サーバーレスのためインスタンス内だけのベストエフォート） */
export function createIpLimiter(windowMs: number, max: number) {
  const hits = new Map<string, { count: number; resetAt: number }>()
  return (key: string, now: number = Date.now()): boolean => {
    // 古い記録を掃除して、Map が増え続けないようにする
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k)
    }
    const entry = hits.get(key)
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return true
    }
    entry.count += 1
    return entry.count <= max
  }
}
