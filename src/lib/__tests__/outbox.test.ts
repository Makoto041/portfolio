import { describe, expect, it } from 'vitest'
import {
  asNewPost,
  backoffMs,
  classify,
  isExpired,
  markFailed,
  MAX_AGE_MS,
  nextToSend,
  nextWakeAt,
  parseOutboxItem,
  problemMessage,
  resumeAuth,
  retryNow,
  stripView,
  wakeAll,
  type OutboxItem,
} from '../quickpost/outbox'
import { isDiscardablePhoto } from '../quickpost/policy'

const ID_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ID_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const ID_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const KEY_A = '11111111-1111-4111-8111-111111111111'
const KEY_B = '22222222-2222-4222-8222-222222222222'

const item = (over: Partial<OutboxItem> = {}): OutboxItem => ({
  id: ID_A,
  key: KEY_A,
  text: '夕方の散歩',
  postType: 'diary',
  photos: [],
  digest: 'a'.repeat(64),
  createdAt: 1000,
  attempts: 0,
  nextAt: 0,
  problem: null,
  ...over,
})

describe('送り直すまでの時間', () => {
  it('続けて失敗するほど長く待つ（5秒から5分まで）', () => {
    expect([1, 2, 3, 4, 5, 6, 9].map((n) => backoffMs(n, 'network'))).toEqual([
      5_000, 15_000, 30_000, 60_000, 120_000, 300_000, 300_000,
    ])
  })
  it('受付中（409）は短く、送りすぎ（429）は少なくとも1分', () => {
    expect(backoffMs(3, 'busy')).toBe(1500)
    expect(backoffMs(1, 'rate')).toBe(60_000)
    expect(backoffMs(6, 'rate')).toBe(300_000)
  })
})

describe('失敗の分け方', () => {
  it('状態コードと理由から分ける', () => {
    expect(classify(0)).toBe('network')
    expect(classify(401)).toBe('auth')
    expect(classify(403)).toBe('forbidden')
    expect(classify(409)).toBe('busy')
    expect(classify(429)).toBe('rate')
    expect(classify(413)).toBe('photo')
    expect(classify(415)).toBe('photo')
    expect(classify(400, 'invalid_images')).toBe('photo')
    expect(classify(400, 'text_too_long')).toBe('invalid')
    expect(classify(500)).toBe('server')
    expect(classify(502)).toBe('server')
  })
})

describe('次に送るもの', () => {
  const now = 10_000
  it('押した順に送り、直してもらう必要があるものは飛ばす', () => {
    const items = [
      item({ id: ID_B, createdAt: 3000 }),
      item({ id: ID_A, createdAt: 2000, problem: 'invalid' }),
      item({ id: ID_C, createdAt: 4000 }),
    ]
    expect(nextToSend(items, now)?.id).toBe(ID_B)
  })
  it('自動で送り直すものは、時刻になってから', () => {
    const waiting = item({ problem: 'network', nextAt: now + 1 })
    expect(nextToSend([waiting], now)).toBeNull()
    expect(nextToSend([{ ...waiting, nextAt: now }], now)?.id).toBe(ID_A)
    expect(nextWakeAt([waiting], now)).toBe(now + 1)
  })
  it('ログイン切れ・受付番号の重なり・古すぎるものは自動では送らない', () => {
    expect(
      nextToSend(
        [
          item({ problem: 'auth' }),
          item({ id: ID_B, problem: 'conflict' }),
          item({ id: ID_C, problem: 'expired' }),
        ],
        now,
      ),
    ).toBeNull()
    expect(nextWakeAt([item({ problem: 'auth', nextAt: now + 5 })], now)).toBeNull()
  })
  it('サーバーの受付票が消える前（25日）までしか自動では送らない', () => {
    expect(isExpired(item({ createdAt: 0 }), MAX_AGE_MS)).toBe(false)
    expect(isExpired(item({ createdAt: 0 }), MAX_AGE_MS + 1)).toBe(true)
  })
})

describe('失敗の記録と送り直し', () => {
  it('自動で送り直すものは次の時刻を決め、直してもらうものは決めない', () => {
    const a = markFailed(item(), 'network', 100)
    expect(a).toMatchObject({ problem: 'network', attempts: 1, nextAt: 5_100 })
    const b = markFailed(a, 'server', 200)
    expect(b).toMatchObject({ attempts: 2, nextAt: 15_200 })
    expect(markFailed(item(), 'invalid', 100, 'text_too_long')).toMatchObject({
      problem: 'invalid',
      code: 'text_too_long',
      nextAt: 0,
    })
  })
  it('電波が戻ったら、自動で送り直すものだけ待たずに送る（送りすぎは待つ）', () => {
    const [x, y, z] = wakeAll([
      item({ problem: 'network', nextAt: 99 }),
      item({ id: ID_B, problem: 'invalid', nextAt: 0 }),
      item({ id: ID_C, problem: 'rate', nextAt: 99 }),
    ])
    expect(x.nextAt).toBe(0)
    expect(y.problem).toBe('invalid')
    expect(z.nextAt).toBe(99)
  })
  it('ログインし直したら、ログイン切れで止まったものを送る', () => {
    const [x, y] = resumeAuth([item({ problem: 'auth' }), item({ problem: 'invalid' })])
    expect(x.problem).toBeNull()
    expect(y.problem).toBe('invalid')
  })
  it('「もう一度」と「別の投稿として送る」（送信待ちの中での ID はそのまま、受付番号だけ変える）', () => {
    expect(retryNow(item({ problem: 'forbidden', nextAt: 5 }))).toMatchObject({
      problem: null,
      nextAt: 0,
    })
    const fresh = asNewPost(item({ problem: 'conflict', attempts: 3 }), KEY_B)
    expect(fresh).toMatchObject({ id: ID_A, key: KEY_B, problem: null, attempts: 0 })
  })
})

describe('帯に出すもの', () => {
  const base = { progress: null, resumedIds: new Set<string>(), paused: null, done: null }
  const sendingA = { id: ID_A, phase: 'post' as const, done: 0, total: 0, fraction: 0 }
  it('何も無ければ出さない', () => {
    expect(stripView({ ...base, items: [] })).toEqual({ kind: 'none' })
  })
  it('写真を送っている途中は、何枚目かと進み具合', () => {
    const v = stripView({
      ...base,
      items: [item(), item({ id: ID_B, createdAt: 2000 })],
      progress: { id: ID_A, phase: 'photos', done: 1, total: 2, fraction: 0.5 },
    })
    expect(v).toEqual({ kind: 'sending', label: '写真を送っています（2 / 2）', more: 1, pct: 50 })
  })
  it('投稿を作っているところ・開き直して続きを送っているところ', () => {
    expect(stripView({ ...base, items: [item()], progress: sendingA })).toMatchObject({
      label: '投稿しています…',
      pct: 92,
    })
    expect(
      stripView({ ...base, items: [item()], progress: sendingA, resumedIds: new Set([ID_A]) }),
    ).toMatchObject({ label: '前回の続きを送っています' })
    // 前回の続きでないものは、ふつうに出す
    expect(
      stripView({ ...base, items: [item()], progress: sendingA, resumedIds: new Set([ID_B]) }),
    ).toMatchObject({ label: '投稿しています…' })
  })
  it('送っている間は、ほかに送れなかったものがあっても送信中を出す', () => {
    const v = stripView({
      ...base,
      items: [item({ id: ID_B, createdAt: 500, problem: 'invalid' }), item()],
      progress: sendingA,
    })
    expect(v).toMatchObject({ kind: 'sending', more: 1 })
  })
  it('送り終えた直後は「投稿しました」、そのあと送れなかったものを出す', () => {
    const stuck = [item({ problem: 'conflict' })]
    expect(stripView({ ...base, items: stuck, done: { postId: 7 } })).toEqual({
      kind: 'done',
      postId: 7,
    })
    expect(stripView({ ...base, items: stuck })).toMatchObject({ kind: 'failed', id: ID_A })
    expect(stripView({ ...base, items: [], done: { postId: 7 } })).toEqual({
      kind: 'done',
      postId: 7,
    })
  })
  it('送れなかったもの: 「もう一度」は送り直せるものだけ、重なりには「別の投稿として送る」', () => {
    expect(stripView({ ...base, items: [item({ problem: 'network' })] })).toMatchObject({
      kind: 'failed',
      retry: true,
      resend: false,
      edit: true,
    })
    expect(
      stripView({ ...base, items: [item({ problem: 'invalid', code: 'text_too_long' })] }),
    ).toMatchObject({
      retry: false,
      resend: false,
      message: '本文が5000文字を超えています。「直す」で短くしてください。',
    })
    expect(stripView({ ...base, items: [item({ problem: 'conflict' })] })).toMatchObject({
      retry: false,
      resend: true,
    })
    expect(stripView({ ...base, items: [item({ problem: 'expired' })] })).toMatchObject({
      retry: false,
      resend: false,
      edit: true,
    })
  })
  it('受付中（409）は送れなかった扱いにしない（送るのを待っている）', () => {
    expect(stripView({ ...base, items: [item({ problem: 'busy' })] })).toEqual({
      kind: 'sending',
      label: '送っています…',
      more: 0,
      pct: 4,
    })
  })
  it('止まっている間は理由を出す（ボタンなし）', () => {
    expect(
      stripView({ ...base, paused: 'loggedOut', items: [item({ problem: 'auth' })] }),
    ).toMatchObject({
      kind: 'failed',
      message: problemMessage({ problem: 'auth' }),
      retry: false,
      resend: false,
      edit: false,
    })
    // 自分でログアウトしたときは「切れました」と言わない
    expect(stripView({ ...base, paused: 'loggedOut', items: [item()] })).toMatchObject({
      message: 'ログインすると、送りかけの投稿を続きから送ります。',
      edit: false,
    })
    expect(stripView({ ...base, paused: 'offline', items: [item()] })).toMatchObject({
      message: 'つながっていません。電波が戻ったら続きから送ります。',
      edit: false,
    })
  })
})

describe('端末に保存した送信待ちの読み直し', () => {
  it('正しい形はそのまま', () => {
    const v = item({
      title: '題',
      photos: [{ id: 'p1', mediaId: 12, print: 'abc' }],
      problem: 'network',
      code: 'x',
      reuploaded: true,
    })
    expect(parseOutboxItem(JSON.parse(JSON.stringify(v)))).toEqual(v)
  })
  it('壊れたもの・知らない形は捨てる', () => {
    expect(parseOutboxItem(null)).toBeNull()
    expect(parseOutboxItem({ ...item(), id: 'nope' })).toBeNull()
    expect(parseOutboxItem({ ...item(), id: undefined })).toBeNull()
    expect(parseOutboxItem({ ...item(), key: 'nope' })).toBeNull()
    expect(parseOutboxItem({ ...item(), text: '  ' })).toBeNull()
    expect(parseOutboxItem({ ...item(), postType: 'other' })).toBeNull()
    expect(parseOutboxItem({ ...item(), digest: 'xyz' })).toBeNull()
    expect(parseOutboxItem({ ...item(), problem: 'weird' })).toBeNull()
    expect(
      parseOutboxItem({ ...item(), photos: [{ id: 'p', mediaId: -1, print: 'a' }] }),
    ).toBeNull()
    const four = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, mediaId: null, print: 'a' }))
    expect(parseOutboxItem({ ...item(), photos: four })).toBeNull()
  })
})

describe('消してよい写真', () => {
  it('さっと投稿で上げて、まだ投稿に使っていない写真だけ', () => {
    const photo = { filename: 'post-abc.jpg', isTimelineOnly: true, pending: true }
    expect(isDiscardablePhoto(photo)).toBe(true)
    expect(isDiscardablePhoto({ ...photo, pending: false })).toBe(false)
    expect(isDiscardablePhoto({ ...photo, filename: 'gallery.jpg' })).toBe(false)
    expect(isDiscardablePhoto({ ...photo, isTimelineOnly: false })).toBe(false)
    expect(isDiscardablePhoto({ filename: 'post-abc.jpg', isTimelineOnly: true })).toBe(false)
  })
})
