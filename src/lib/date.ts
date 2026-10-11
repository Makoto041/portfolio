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
// （タイムラインは1行ごとに dayParts / fmtTime を呼ぶ）
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

/** お知らせバッジ用の `MM.DD` */
export function fmtDateBadge(dateStr: string): string {
  const get = parts(dateStr, { month: '2-digit', day: '2-digit' })
  if (!get) return ''
  return `${get('month')}.${get('day')}`
}

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'] as const

export type DayParts = {
  /** 日付キー `YYYY-MM-DD`（日ごとのグルーピング用） */
  key: string
  year: number
  month: number
  day: number
  /** 曜日（漢字1文字） */
  weekday: string
}

/** Asia/Tokyo での年月日と曜日。不正値は null */
export function dayParts(dateStr: string): DayParts | null {
  const get = parts(dateStr, { year: 'numeric', month: '2-digit', day: '2-digit' })
  if (!get) return null
  const year = Number(get('year'))
  const month = Number(get('month'))
  const day = Number(get('day'))
  // 曜日は暦日から計算する（ブラウザごとに異なる曜日の略記テキストに依存しない＝SSR と一致する）
  const weekday = WEEKDAY_JA[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return {
    key: `${get('year')}-${get('month')}-${get('day')}`,
    year,
    month,
    day,
    weekday,
  }
}

/** 時刻 `HH:MM`（Asia/Tokyo・24時間制） */
export function fmtTime(dateStr: string): string {
  const get = parts(dateStr, { hour: '2-digit', minute: '2-digit', hour12: false })
  if (!get) return ''
  // 一部ランタイムは 0 時を "24" と返すため正規化
  const hour = get('hour') === '24' ? '00' : get('hour')
  return `${hour}:${get('minute')}`
}

/** 和文の日付 `2026年7月5日（日）` */
export function fmtDateJa(dateStr?: string | null): string {
  if (!dateStr) return ''
  const p = dayParts(dateStr)
  if (!p) return ''
  return `${p.year}年${p.month}月${p.day}日（${p.weekday}）`
}

/** 短い日付 `7.5`（最終更新日など） */
export function fmtMonthDay(dateStr: string): string {
  const p = dayParts(dateStr)
  return p ? `${p.month}.${p.day}` : ''
}

/** フィルムカメラの日付写し込み `'25 10 12`（Asia/Tokyo） */
export function fmtFilmDate(dateStr: string): string {
  const p = dayParts(dateStr)
  return p ? `'${String(p.year).slice(2)} ${p.month} ${p.day}` : ''
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Asia/Tokyo の暦日どうしの差（日数）。b が a より後なら正 */
function dayDiff(a: DayParts, b: DayParts): number {
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY_MS)
}

/** 暦の上で何か月たったか（日付がまだ来ていない月は数えない。例: 10/12 → 翌年 10/11 は 11 か月） */
function monthDiff(a: DayParts, b: DayParts): number {
  return (b.year - a.year) * 12 + (b.month - a.month) - (b.day < a.day ? 1 : 0)
}

/**
 * 投稿日の「きょう / きのう / ○日前 / ○か月前 / ○年前」（Asia/Tokyo の暦で数える）。
 * 表示時刻に依存するので、静的生成された HTML ではなくクライアントで計算して出す。
 */
export function relativeDayLabel(dateStr: string, now: number = Date.now()): string {
  const day = dayParts(dateStr)
  const today = dayParts(new Date(now).toISOString())
  if (!day || !today) return ''
  const n = dayDiff(day, today)
  if (n <= 0) return 'きょう'
  if (n === 1) return 'きのう'
  const months = monthDiff(day, today)
  if (months < 1) return `${n}日前`
  if (months < 12) return `${months}か月前`
  return `${Math.floor(months / 12)}年前`
}
