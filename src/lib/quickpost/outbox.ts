// src/lib/quickpost/outbox.ts
// さっと投稿（/post）の送信待ち（「投稿する」を押したあと、端末に保存して順番に送る投稿）の決まりごと。
// 純粋な関数だけを置く（単体テストあり）。保存（IndexedDB）と送信は src/components/quickpost/useOutbox.ts。
//   - 次にどれを送るか・失敗したらいつ送り直すか
//   - 失敗をどう扱うか（自動で送り直す / 直してもらう / ログインし直す）
//   - 画面の上の帯に何を出すか
//   - 端末に保存した中身が正しい形か
import { LIMITS, POST_TYPES } from './input'

/** 送信待ちの写真1枚（写真のデータは別に保存する。キーは id） */
export type OutboxPhoto = {
  id: string
  /** サーバーに上げ終えた写真の ID（まだなら null） */
  mediaId: number | null
  /** 写真の中身の指紋（送り直しで写真を差し替えたかを見分ける。src/components/quickpost/photo.ts） */
  print: string
}

/** 送れなかった理由 */
export type Problem =
  | 'network' // 通信が切れた・届かなかった
  | 'server' // サーバーの失敗（500 など）
  | 'busy' // 同じ投稿をまだ受け付けている途中（409）
  | 'rate' // 送りすぎ（429）
  | 'auth' // ログインが切れた（401）
  | 'forbidden' // 送信元の確認で断られた（403。ページを開き直す）
  | 'invalid' // 入力の誤り（400。直さないと送れない）
  | 'photo' // 写真が使えない（読めない・大きすぎる・端末にもサーバーにも残っていない）
  | 'conflict' // この受付番号では、すでに別の内容が投稿されていた

const PROBLEMS: ReadonlySet<string> = new Set<Problem>([
  'network',
  'server',
  'busy',
  'rate',
  'auth',
  'forbidden',
  'invalid',
  'photo',
  'conflict',
])

export type OutboxItem = {
  /** 受付番号（下書きのキー）。同じ番号で送り直しても、投稿は1件 */
  key: string
  text: string
  title?: string
  postType: string
  photos: OutboxPhoto[]
  /** 送る内容の指紋（受付番号ですでに投稿済みだったとき、同じ内容かを見分ける） */
  digest: string
  createdAt: number
  /** 続けて失敗した回数（送り直すまでの時間を伸ばす） */
  attempts: number
  /** 次に送ってよい時刻（0 ならすぐ） */
  nextAt: number
  /** 最後に送れなかった理由（送れるまでは null） */
  problem: Problem | null
  /** 入力の誤りのときのサーバーの理由（text_too_long など。文言に使う） */
  code?: string
  /** 写真が見つからず、端末に残した写真から上げ直したか（2回目は止めて、直してもらう） */
  reuploaded?: boolean
}

/** 自動で送り直す理由（それ以外は、直すか「もう一度」を押すか、ログインし直すまで待つ） */
const AUTO_RETRY: ReadonlySet<Problem> = new Set(['network', 'server', 'busy', 'rate'])
export const isAutoRetry = (p: Problem | null): boolean => p !== null && AUTO_RETRY.has(p)

/** 「もう一度」で送り直せる理由（入力・写真の誤りは直さないと同じ結果になる。受付番号の重なりは別の操作） */
const MANUAL_RETRY: ReadonlySet<Problem> = new Set([
  'network',
  'server',
  'busy',
  'rate',
  'forbidden',
])

/** 続けて失敗したときの、次に送るまでの時間（5秒・15秒・30秒・1分・2分、そのあとは5分ごと） */
export function backoffMs(attempts: number, problem: Problem): number {
  // 同じ投稿を受け付けている途中なら、すぐ終わるので短く待つ
  if (problem === 'busy') return 1500
  const steps = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000]
  const ms = steps[Math.min(Math.max(attempts, 1), steps.length) - 1]
  // 送りすぎは、枠が空くまで少なくとも1分待つ
  return problem === 'rate' ? Math.max(ms, 60_000) : ms
}

/** 送信の失敗を理由に分ける（status 0 は通信の失敗） */
export function classify(status: number, code?: string): Problem {
  if (status === 0) return 'network'
  if (status === 401) return 'auth'
  if (status === 403) return 'forbidden'
  if (status === 409) return 'busy'
  if (status === 429) return 'rate'
  if (status === 413 || status === 415) return 'photo'
  if (status === 400) return code === 'invalid_images' ? 'photo' : 'invalid'
  return 'server'
}

/** 古い順（押した順に送る） */
export const byCreated = (a: OutboxItem, b: OutboxItem) => a.createdAt - b.createdAt

/**
 * 次に送るもの。押した順に、まだ送れていない（理由なし）か、自動で送り直す時刻になったもの。
 * 直してもらう必要があるものは飛ばす（後ろの投稿を止めない）
 */
export function nextToSend(items: readonly OutboxItem[], now: number): OutboxItem | null {
  return (
    [...items]
      .sort(byCreated)
      .find((i) => i.problem === null || (isAutoRetry(i.problem) && i.nextAt <= now)) ?? null
  )
}

/** 自動で送り直す時刻のうち、いちばん早いもの（無ければ null） */
export function nextWakeAt(items: readonly OutboxItem[], now: number): number | null {
  const times = items.filter((i) => isAutoRetry(i.problem) && i.nextAt > now).map((i) => i.nextAt)
  return times.length ? Math.min(...times) : null
}

/** 送れなかったことを記録する（自動で送り直すものは、次に送る時刻も決める） */
export function markFailed(
  item: OutboxItem,
  problem: Problem,
  now: number,
  code?: string,
): OutboxItem {
  const attempts = item.attempts + 1
  return {
    ...item,
    problem,
    code,
    attempts,
    nextAt: isAutoRetry(problem) ? now + backoffMs(attempts, problem) : 0,
  }
}

/** 電波が戻った・画面に戻ったとき: 自動で送り直すものを、待たずにすぐ送る */
export function wakeAll(items: readonly OutboxItem[]): OutboxItem[] {
  return items.map((i) => (isAutoRetry(i.problem) ? { ...i, nextAt: 0 } : i))
}

/** ログインし直したとき: ログインが切れて止まっていたものを送り直す */
export function resumeAuth(items: readonly OutboxItem[]): OutboxItem[] {
  return items.map((i) => (i.problem === 'auth' ? { ...i, problem: null, nextAt: 0 } : i))
}

/** 「もう一度」: 待たずに送り直す */
export function retryNow(item: OutboxItem): OutboxItem {
  return { ...item, problem: null, code: undefined, nextAt: 0 }
}

/** 受付番号が重なっていたものを、別の投稿として送り直す（新しい受付番号） */
export function asNewPost(item: OutboxItem, key: string): OutboxItem {
  return { ...item, key, problem: null, code: undefined, nextAt: 0, attempts: 0 }
}

/** 送れなかった理由を、どうなるか・どうすればよいかが分かる文にする */
export function problemMessage(item: Pick<OutboxItem, 'problem' | 'code'>): string {
  switch (item.problem) {
    case 'network':
      return '送れませんでした。電波が戻ったら自動でもう一度送ります。'
    case 'server':
      return '送れませんでした。少し待ってから自動でもう一度送ります。'
    case 'busy':
      return '前の送信を受け付けている途中です。少し待って送ります。'
    case 'rate':
      return '短い時間に送りすぎています。少し待ってから自動で送ります。'
    case 'auth':
      return 'ログインが切れました。ログインすると続きから送ります。'
    case 'forbidden':
      return '送れませんでした。このページを開き直してから「もう一度」を押してください。'
    case 'photo':
      return '写真を送れませんでした。「直す」で写真を選び直してください。'
    case 'conflict':
      return 'この下書きは、前に違う内容で投稿されていました。「別の投稿として送る」か、「直す」で確かめてください。'
    case 'invalid':
      if (item.code === 'text_too_long')
        return `本文が${LIMITS.text}文字を超えています。「直す」で短くしてください。`
      if (item.code === 'title_too_long')
        return `タイトルが${LIMITS.title}文字を超えています。「直す」で短くしてください。`
      return '送れない内容でした。「直す」で確かめてください。'
    default:
      return ''
  }
}

/** いま送っている投稿の進み具合（写真を上げている途中か、投稿を作っているところか） */
export type SendProgress = {
  key: string
  phase: 'photos' | 'post'
  /** 上げ終えた写真の数 */
  done: number
  total: number
  /** いま上げている写真の進み具合（0〜1） */
  fraction: number
}

/** 画面の上の帯に出すもの */
export type StripView =
  | { kind: 'none' }
  | { kind: 'sending'; label: string; more: number; pct: number }
  | {
      kind: 'failed'
      key: string
      message: string
      /** ほかに送信待ちがある数 */
      more: number
      /** 「もう一度」を出すか */
      retry: boolean
      /** 「別の投稿として送る」を出すか（受付番号の重なり） */
      resend: boolean
      /** 「直す」を出すか（ログインしていない間は出さない） */
      edit: boolean
    }
  | { kind: 'done'; postId: number }

/** 帯の中身を決める。送れなかったものがあればそれを先に、無ければ送信中、送り終えた直後は「投稿しました」 */
export function stripView(s: {
  items: readonly OutboxItem[]
  progress: SendProgress | null
  /** 開いたときに前回の送りかけが残っていた（その分を送り終えるまで） */
  resumed: boolean
  /** ログインしていない（送信は止まっている） */
  loggedOut: boolean
  done: { postId: number; until: number } | null
  now: number
}): StripView {
  const items = [...s.items].sort(byCreated)
  const sendingKey = s.progress?.key ?? null
  const troubled = items.find((i) => i.problem !== null && i.key !== sendingKey)
  if (troubled || (s.loggedOut && items.length > 0)) {
    const target = troubled ?? items[0]
    const problem = s.loggedOut ? 'auth' : target.problem
    // ログアウトした（切れたのではない）ときは「切れました」とは言わない
    const message =
      s.loggedOut && target.problem !== 'auth'
        ? 'ログインすると、送りかけの投稿を続きから送ります。'
        : problemMessage({ problem, code: target.code })
    return {
      kind: 'failed',
      key: target.key,
      message,
      more: items.length - 1,
      retry: !s.loggedOut && problem !== null && MANUAL_RETRY.has(problem),
      resend: !s.loggedOut && problem === 'conflict',
      edit: !s.loggedOut,
    }
  }
  if (items.length > 0) {
    const p = s.progress
    let label = '送っています…'
    let pct = 4
    if (p) {
      if (p.phase === 'post' || p.total === 0) {
        label = '投稿しています…'
        pct = 92
      } else {
        label = `写真を送っています（${Math.min(p.done + 1, p.total)} / ${p.total}）`
        pct = Math.round(((p.done + p.fraction) / (p.total + 1)) * 100)
      }
    }
    if (s.resumed) label = '前回の続きを送っています'
    return { kind: 'sending', label, more: items.length - 1, pct: Math.max(4, Math.min(pct, 96)) }
  }
  if (s.done && s.done.until > s.now) return { kind: 'done', postId: s.done.postId }
  return { kind: 'none' }
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256_HEX = /^[0-9a-f]{64}$/
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0

/** 端末に保存した送信待ちを読み直すときに、形を確かめる（壊れたもの・古い形のものは捨てる） */
export function parseOutboxItem(v: unknown): OutboxItem | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  if (typeof o.key !== 'string' || !UUID_V4.test(o.key)) return null
  if (typeof o.text !== 'string' || !o.text.trim()) return null
  if (o.title !== undefined && typeof o.title !== 'string') return null
  if (typeof o.postType !== 'string' || !(POST_TYPES as readonly string[]).includes(o.postType))
    return null
  if (typeof o.digest !== 'string' || !SHA256_HEX.test(o.digest)) return null
  if (!isCount(o.createdAt) || !isCount(o.attempts) || !isCount(o.nextAt)) return null
  if (o.problem !== null && !(typeof o.problem === 'string' && PROBLEMS.has(o.problem))) return null
  if (o.code !== undefined && typeof o.code !== 'string') return null
  if (!Array.isArray(o.photos) || o.photos.length > LIMITS.images) return null
  const photos: OutboxPhoto[] = []
  for (const p of o.photos) {
    if (!p || typeof p !== 'object') return null
    const { id, mediaId, print } = p as Record<string, unknown>
    if (typeof id !== 'string' || !id || typeof print !== 'string' || !print) return null
    if (
      mediaId !== null &&
      !(typeof mediaId === 'number' && Number.isSafeInteger(mediaId) && mediaId > 0)
    )
      return null
    photos.push({ id, mediaId: mediaId as number | null, print })
  }
  return {
    key: o.key,
    text: o.text,
    ...(o.title !== undefined ? { title: o.title as string } : {}),
    postType: o.postType,
    photos,
    digest: o.digest,
    createdAt: o.createdAt,
    attempts: o.attempts,
    nextAt: o.nextAt,
    problem: o.problem as Problem | null,
    ...(o.code !== undefined ? { code: o.code as string } : {}),
    ...(o.reuploaded === true ? { reuploaded: true } : {}),
  }
}
