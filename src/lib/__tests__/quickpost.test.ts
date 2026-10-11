import { describe, expect, it } from 'vitest'
import { deviceLabel, normalizeText, parseQuickPost } from '@/lib/quickpost/input'
import {
  createIpLimiter,
  isSameOriginRequest,
  isSessionAlive,
  maxAgeSeconds,
  sessionDeadline,
  shouldTouch,
  takeRate,
} from '@/lib/quickpost/policy'
import { isSessionTokenShape, newSessionToken, sha256Hex, signTicket, userHandle, verifyTicket } from '@/lib/quickpost/tokens'
import { asAuthenticationResponse, asRegistrationResponse, parseTransports } from '@/lib/quickpost/webauthn'

const SECRET = 'test-secret'
const HOUR = 3_600_000
const DAY = 24 * HOUR

describe('ログイン Cookie の値', () => {
  it('256bit の乱数を base64url 43文字で作る', () => {
    const a = newSessionToken()
    const b = newSessionToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(a).not.toBe(b)
    expect(isSessionTokenShape(a)).toBe(true)
  })

  it('形の違う値は DB を引く前に断る', () => {
    expect(isSessionTokenShape(undefined)).toBe(false)
    expect(isSessionTokenShape('short')).toBe(false)
    expect(isSessionTokenShape('A'.repeat(42) + '=')).toBe(false)
  })

  it('DB には SHA-256 だけを保存する', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe('確認値（チャレンジ）の署名つき Cookie', () => {
  const now = 1_000_000
  const ticket = { p: 'login' as const, c: 'challenge-1', e: now + 5 * 60_000 }

  it('署名・用途・期限が合えば中身を返す', () => {
    expect(verifyTicket(signTicket(ticket, SECRET), 'login', SECRET, now)).toEqual(ticket)
  })

  it('期限切れは断る', () => {
    expect(verifyTicket(signTicket(ticket, SECRET), 'login', SECRET, ticket.e)).toBeNull()
  })

  it('用途が違えば断る（ログイン用を登録に流用させない）', () => {
    expect(verifyTicket(signTicket(ticket, SECRET), 'register', SECRET, now)).toBeNull()
  })

  it('中身の書き換え・署名の付け替え・別の鍵は断る', () => {
    const raw = signTicket(ticket, SECRET)
    const [, sig] = raw.split('.')
    const forged = Buffer.from(JSON.stringify({ ...ticket, c: 'other' })).toString('base64url')
    expect(verifyTicket(`${forged}.${sig}`, 'login', SECRET, now)).toBeNull()
    expect(verifyTicket(`${raw.split('.')[0]}.AAAA`, 'login', SECRET, now)).toBeNull()
    expect(verifyTicket(raw, 'login', 'other-secret', now)).toBeNull()
    expect(verifyTicket(`${raw}.x`, 'login', SECRET, now)).toBeNull()
    expect(verifyTicket(undefined, 'login', SECRET, now)).toBeNull()
  })

  it('登録用はユーザーが入っていなければ断る', () => {
    const reg = signTicket({ p: 'register', c: 'c', e: now + 1000 }, SECRET)
    expect(verifyTicket(reg, 'register', SECRET, now)).toBeNull()
    const ok = signTicket({ p: 'register', c: 'c', u: 7, e: now + 1000 }, SECRET)
    expect(verifyTicket(ok, 'register', SECRET, now)?.u).toBe(7)
  })

  it('パスキーのユーザー識別子は ID から固定で導くが、ID そのものは出さない', () => {
    const a = userHandle(1, SECRET)
    expect(a).toHaveLength(32)
    expect(Buffer.from(a).equals(Buffer.from(userHandle(1, SECRET)))).toBe(true)
    expect(Buffer.from(a).equals(Buffer.from(userHandle(2, SECRET)))).toBe(false)
  })
})

describe('ログインの期限', () => {
  const created = Date.UTC(2026, 9, 11)
  const s = (lastUsed: number) => ({
    lastUsedAt: new Date(lastUsed).toISOString(),
    expiresAt: new Date(created + 90 * DAY).toISOString(),
  })

  it('使わなければ 30 日で切れる', () => {
    expect(isSessionAlive(s(created), 30 * DAY, created + 29 * DAY)).toBe(true)
    expect(isSessionAlive(s(created), 30 * DAY, created + 30 * DAY)).toBe(false)
  })

  it('使い続けても 90 日で切れる', () => {
    const lastUsed = created + 89 * DAY
    expect(sessionDeadline(s(lastUsed), 30 * DAY)).toBe(created + 90 * DAY)
    expect(isSessionAlive(s(lastUsed), 30 * DAY, created + 90 * DAY)).toBe(false)
  })

  it('日時が壊れていれば切れている扱い', () => {
    expect(isSessionAlive({ lastUsedAt: 'x', expiresAt: 'y' }, 30 * DAY, 0)).toBe(false)
  })

  it('最後に使った日時は 1 時間に 1 回だけ更新する', () => {
    expect(shouldTouch(new Date(created).toISOString(), HOUR, created + HOUR - 1)).toBe(false)
    expect(shouldTouch(new Date(created).toISOString(), HOUR, created + HOUR)).toBe(true)
  })

  it('Cookie の Max-Age は残り秒数（過ぎていれば 0）', () => {
    expect(maxAgeSeconds(10_500, 500)).toBe(10)
    expect(maxAgeSeconds(0, 500)).toBe(0)
  })
})

describe('1台ごとの回数制限', () => {
  const limits = { windowMs: HOUR, posts: 2, photos: 1 }
  const t0 = Date.UTC(2026, 9, 11, 10)

  it('枠の中で上限まで使え、超えると断る', () => {
    const a = takeRate({}, 'posts', limits, t0)
    expect(a.ok).toBe(true)
    const b = takeRate(a.next, 'posts', limits, t0 + 1000)
    expect(b.ok).toBe(true)
    const c = takeRate(b.next, 'posts', limits, t0 + 2000)
    expect(c.ok).toBe(false)
    expect(c.next.rlPosts).toBe(2)
  })

  it('写真と投稿は別に数える', () => {
    const a = takeRate({}, 'photos', limits, t0)
    expect(takeRate(a.next, 'photos', limits, t0).ok).toBe(false)
    expect(takeRate(a.next, 'posts', limits, t0).ok).toBe(true)
  })

  it('時間枠が過ぎれば数え直す', () => {
    const full = { rlWindowStart: new Date(t0).toISOString(), rlPosts: 2, rlPhotos: 1 }
    expect(takeRate(full, 'posts', limits, t0 + HOUR - 1).ok).toBe(false)
    const fresh = takeRate(full, 'posts', limits, t0 + HOUR)
    expect(fresh.ok).toBe(true)
    expect(fresh.next).toEqual({ rlWindowStart: new Date(t0 + HOUR).toISOString(), rlPosts: 1, rlPhotos: 0 })
  })

  it('IP ごとの制限は枠の中の回数を超えると断る', () => {
    const allow = createIpLimiter(60_000, 2)
    expect(allow('a', 0)).toBe(true)
    expect(allow('a', 1)).toBe(true)
    expect(allow('a', 2)).toBe(false)
    expect(allow('b', 2)).toBe(true)
    expect(allow('a', 60_001)).toBe(true)
  })
})

describe('送信元の確認（CSRF）', () => {
  const origin = 'https://iwabuchi-makoto.com'
  const h = (init: Record<string, string>) => new Headers(init)

  it('自サイトの Origin で same-origin なら通す', () => {
    expect(isSameOriginRequest(h({ origin, 'sec-fetch-site': 'same-origin' }), origin)).toBe(true)
    expect(isSameOriginRequest(h({ origin }), origin)).toBe(true)
  })

  it('Origin が無い・違う・同じサイトの別オリジン・ほかのサイトからは断る', () => {
    expect(isSameOriginRequest(h({}), origin)).toBe(false)
    expect(isSameOriginRequest(h({ origin: 'https://evil.example' }), origin)).toBe(false)
    expect(isSameOriginRequest(h({ origin: 'https://iwabuchi-makoto.com.evil.example' }), origin)).toBe(false)
    expect(isSameOriginRequest(h({ origin: 'http://iwabuchi-makoto.com' }), origin)).toBe(false)
    expect(isSameOriginRequest(h({ origin, 'sec-fetch-site': 'same-site' }), origin)).toBe(false)
    expect(isSameOriginRequest(h({ origin, 'sec-fetch-site': 'cross-site' }), origin)).toBe(false)
    expect(isSameOriginRequest(h({ origin: 'null' }), origin)).toBe(false)
  })
})

describe('投稿の入力チェック', () => {
  const key = '9b2c3f4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f'

  it('本文・種類・写真・キーを受け付け、正規化する', () => {
    const r = parseQuickPost({ text: '  こんにちは\r\n2行目\u0000 ', postType: 'travel', images: [3, 3, 5], key: key.toUpperCase() })
    expect(r).toEqual({
      ok: true,
      value: { text: 'こんにちは\n2行目', title: undefined, postType: 'travel', images: [3, 5], key },
    })
  })

  it('種類が無ければ日記にする。タイトルは1行にまとめる', () => {
    const r = parseQuickPost({ text: 'a', title: ' 見出し\n2行目 ', key })
    expect(r.ok && r.value.postType).toBe('diary')
    expect(r.ok && r.value.title).toBe('見出し 2行目')
  })

  it.each([
    [{ key }, 'text_required'],
    [{ text: '   ', key }, 'text_required'],
    [{ text: 'a'.repeat(5001), key }, 'text_too_long'],
    [{ text: 'a', title: 't'.repeat(101), key }, 'title_too_long'],
    [{ text: 'a', postType: 'admin', key }, 'invalid_post_type'],
    [{ text: 'a', images: [1, 2, 3, 4], key }, 'invalid_images'],
    [{ text: 'a', images: ['1'], key }, 'invalid_images'],
    [{ text: 'a', images: [0], key }, 'invalid_images'],
    [{ text: 'a', images: [1.5], key }, 'invalid_images'],
    [{ text: 'a' }, 'invalid_key'],
    [{ text: 'a', key: 'abc' }, 'invalid_key'],
    [null, 'invalid_body'],
    [[], 'invalid_body'],
  ])('%j は断る（%s）', (body, error) => {
    expect(parseQuickPost(body)).toEqual({ ok: false, error })
  })

  it('絵文字は1文字と数える', () => {
    expect(parseQuickPost({ text: '😀'.repeat(5000), key }).ok).toBe(true)
  })

  it('制御文字を除く（改行とタブは残す）', () => {
    expect(normalizeText('a\tb\u0007c\u001Bd')).toBe('a\tbcd')
  })
})

describe('端末の名前', () => {
  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 'iPhone（Safari）'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', 'Mac（Chrome）'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0', 'Windows（Edge）'],
    ['Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', 'Android（Chrome）'],
    ['', '端末'],
  ])('%s → %s', (ua, label) => {
    expect(deviceLabel(ua)).toBe(label)
  })
})

describe('パスキーの応答の形', () => {
  const auth = {
    id: 'Y3JlZA',
    rawId: 'Y3JlZA',
    type: 'public-key',
    response: { clientDataJSON: 'e30', authenticatorData: 'YXV0aA', signature: 'c2ln', userHandle: 'dXNlcg' },
    clientExtensionResults: { evil: true },
    authenticatorAttachment: 'platform',
    extra: 'dropped',
  }

  it('知っている項目だけで組み直す', () => {
    expect(asAuthenticationResponse(auth)).toEqual({
      id: 'Y3JlZA',
      rawId: 'Y3JlZA',
      type: 'public-key',
      response: { clientDataJSON: 'e30', authenticatorData: 'YXV0aA', signature: 'c2ln', userHandle: 'dXNlcg' },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform',
    })
  })

  it('形が違えば断る', () => {
    expect(asAuthenticationResponse({ ...auth, type: 'password' })).toBeNull()
    expect(asAuthenticationResponse({ ...auth, id: 'not base64url!' })).toBeNull()
    expect(asAuthenticationResponse({ ...auth, id: { $ne: null } })).toBeNull()
    expect(asAuthenticationResponse({ ...auth, response: { ...auth.response, signature: '' } })).toBeNull()
    expect(asAuthenticationResponse('x')).toBeNull()
  })

  it('登録の応答も同じく組み直し、通信手段は知っている値だけ残す', () => {
    const reg = asRegistrationResponse({
      id: 'Y3JlZA',
      rawId: 'Y3JlZA',
      type: 'public-key',
      response: { clientDataJSON: 'e30', attestationObject: 'YXR0', transports: ['internal', 'hybrid', 'evil'] },
    })
    expect(reg?.response).toEqual({ clientDataJSON: 'e30', attestationObject: 'YXR0', transports: ['internal', 'hybrid'] })
    expect(asRegistrationResponse({ id: 'Y3JlZA', rawId: 'Y3JlZA', type: 'public-key', response: {} })).toBeNull()
  })

  it('保存した通信手段の文字列を戻す', () => {
    expect(parseTransports('usb,internal,usb')).toEqual(['usb', 'internal'])
    expect(parseTransports('')).toBeUndefined()
    expect(parseTransports(null)).toBeUndefined()
  })
})
