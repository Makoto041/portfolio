// ───────────────────────────────────────────
// src/lib/date.ts
// 日付ユーティリティ（Asia/Tokyo 固定）。
// SSR/CSR の表示一致・トップページ/タイムラインでの重複排除・
// 単体テスト容易性のため純関数として集約する。
// ───────────────────────────────────────────

const TZ = 'Asia/Tokyo'

/** Asia/Tokyo での日付キー（YYYY-MM-DD） */
export const toDayKey = (date: Date): string => formatter({}).format(date)

/**
 * 日次投稿日から連続投稿日数（streak）を計算する。
 * 今日未投稿なら昨日を起点に遡る。`now` はテスト用に注入可能。
 */
export function buildStreak(dates: string[], now: number = Date.now()): number {
  const days = new Set<string>()
  for (const d of dates) {
    const t = new Date(d)
    if (Number.isNaN(t.getTime())) continue
    days.add(toDayKey(t))
  }

  const DAY_MS = 24 * 60 * 60 * 1000
  let streak = 0
  let cursor = now
  // 今日未投稿なら昨日起点
  if (!days.has(toDayKey(new Date(cursor)))) cursor -= DAY_MS
  while (days.has(toDayKey(new Date(cursor)))) {
    streak += 1
    cursor -= DAY_MS
  }
  return streak
}

// Intl.DateTimeFormat の生成は比較的重いため、オプション別にキャッシュして再利用する
// （タイムラインは1行ごとに fmtDateTimeMeta を呼ぶ）
const fmtCache = new Map<string, Intl.DateTimeFormat>()
function formatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options)
  let f = fmtCache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, ...options })
    fmtCache.set(key, f)
  }
  return f
}

function parts(dateStr: string, options: Intl.DateTimeFormatOptions) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  const list = formatter(options).formatToParts(d)
  return (type: string) => list.find((p) => p.type === type)?.value ?? ''
}

/** `YYYY.MM.DD` */
export function fmtDate(dateStr?: string): string {
  if (!dateStr) return ''
  const get = parts(dateStr, { year: 'numeric', month: '2-digit', day: '2-digit' })
  if (!get) return ''
  return `${get('year')}.${get('month')}.${get('day')}`
}

/** お知らせバッジ用の `MM.DD` */
export function fmtDateBadge(dateStr: string): string {
  const get = parts(dateStr, { month: '2-digit', day: '2-digit' })
  if (!get) return ''
  return `${get('month')}.${get('day')}`
}

/** タイムラインのメタ行用 `2025-12-06 sat 18:26` */
export function fmtDateTimeMeta(dateStr: string): string {
  const get = parts(dateStr, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  if (!get) return ''
  const day = get('weekday').toLowerCase()
  return `${get('year')}-${get('month')}-${get('day')} ${day} ${get('hour')}:${get('minute')}`
}
