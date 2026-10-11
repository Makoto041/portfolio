import { describe, expect, it } from 'vitest'
import {
  canSendPhotoAsIs,
  deviceLabel,
  normalizeText,
  parseQuickPost,
  PHOTO_TYPES,
  photoTypeOf,
} from '@/lib/quickpost/input'
import {
  createIpLimiter,
  isQuickPostPhoto,
  isSameOriginRequest,
  isSessionAlive,
  maxAgeSeconds,
  sessionDeadline,
  shouldTouch,
} from '@/lib/quickpost/policy'
import {
  isSessionTokenShape,
  newSessionToken,
  sha256Hex,
  signTicket,
  userHandle,
  verifyTicket,
} from '@/lib/quickpost/tokens'
import { contentDigest } from '@/components/quickpost/digest'
import { photoPrint } from '@/components/quickpost/photo'
import {
  asAuthenticationResponse,
  asRegistrationResponse,
  parseTransports,
} from '@/lib/quickpost/webauthn'

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
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
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

describe('IP ごとの回数制限', () => {
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
    expect(
      isSameOriginRequest(h({ origin: 'https://iwabuchi-makoto.com.evil.example' }), origin),
    ).toBe(false)
    expect(isSameOriginRequest(h({ origin: 'http://iwabuchi-makoto.com' }), origin)).toBe(false)
    expect(isSameOriginRequest(h({ origin, 'sec-fetch-site': 'same-site' }), origin)).toBe(false)
    expect(isSameOriginRequest(h({ origin, 'sec-fetch-site': 'cross-site' }), origin)).toBe(false)
    expect(isSameOriginRequest(h({ origin: 'null' }), origin)).toBe(false)
  })
})

describe('投稿の入力チェック', () => {
  const key = '9b2c3f4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f'

  it('本文・種類・写真・キーを受け付け、正規化する', () => {
    const r = parseQuickPost({
      text: '  こんにちは\r\n2行目\u0000 ',
      postType: 'travel',
      images: [3, 3, 5],
      key: key.toUpperCase(),
    })
    expect(r).toEqual({
      ok: true,
      value: {
        text: 'こんにちは\n2行目',
        title: undefined,
        postType: 'travel',
        images: [3, 5],
        key,
      },
    })
  })

  it('送った内容の指紋（SHA-256 の16進）を受け付ける。無くてもよい', () => {
    const digest = 'a'.repeat(64)
    const r = parseQuickPost({ text: 'a', key, digest })
    expect(r.ok && r.value.digest).toBe(digest)
    const none = parseQuickPost({ text: 'a', key })
    expect(none.ok && none.value.digest).toBeUndefined()
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
    [{ text: 'a', key, digest: 'abc' }, 'invalid_digest'],
    [{ text: 'a', key, digest: 'A'.repeat(64) }, 'invalid_digest'],
    [{ text: 'a', key, digest: 1 }, 'invalid_digest'],
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
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'iPhone（Safari）',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Mac（Chrome）',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
      'Windows（Edge）',
    ],
    [
      'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
      'Android（Chrome）',
    ],
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
    response: {
      clientDataJSON: 'e30',
      authenticatorData: 'YXV0aA',
      signature: 'c2ln',
      userHandle: 'dXNlcg',
    },
    clientExtensionResults: { evil: true },
    authenticatorAttachment: 'platform',
    extra: 'dropped',
  }

  it('知っている項目だけで組み直す', () => {
    expect(asAuthenticationResponse(auth)).toEqual({
      id: 'Y3JlZA',
      rawId: 'Y3JlZA',
      type: 'public-key',
      response: {
        clientDataJSON: 'e30',
        authenticatorData: 'YXV0aA',
        signature: 'c2ln',
        userHandle: 'dXNlcg',
      },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform',
    })
  })

  it('形が違えば断る', () => {
    expect(asAuthenticationResponse({ ...auth, type: 'password' })).toBeNull()
    expect(asAuthenticationResponse({ ...auth, id: 'not base64url!' })).toBeNull()
    expect(asAuthenticationResponse({ ...auth, id: { $ne: null } })).toBeNull()
    expect(
      asAuthenticationResponse({ ...auth, response: { ...auth.response, signature: '' } }),
    ).toBeNull()
    expect(asAuthenticationResponse('x')).toBeNull()
  })

  it('登録の応答も同じく組み直し、通信手段は知っている値だけ残す', () => {
    const reg = asRegistrationResponse({
      id: 'Y3JlZA',
      rawId: 'Y3JlZA',
      type: 'public-key',
      response: {
        clientDataJSON: 'e30',
        attestationObject: 'YXR0',
        transports: ['internal', 'hybrid', 'evil'],
      },
    })
    expect(reg?.response).toEqual({
      clientDataJSON: 'e30',
      attestationObject: 'YXR0',
      transports: ['internal', 'hybrid'],
    })
    expect(
      asRegistrationResponse({ id: 'Y3JlZA', rawId: 'Y3JlZA', type: 'public-key', response: {} }),
    ).toBeNull()
  })

  it('保存した通信手段の文字列を戻す', () => {
    expect(parseTransports('usb,internal,usb')).toEqual(['usb', 'internal'])
    expect(parseTransports('')).toBeUndefined()
    expect(parseTransports(null)).toBeUndefined()
  })
})

describe('canSendPhotoAsIs', () => {
  it('受け付ける形式で上限以下なら、そのまま送る（HEIC・AVIF を含む）', () => {
    for (const type of PHOTO_TYPES) expect(canSendPhotoAsIs(type, 1000, 2000)).toBe(true)
    expect(canSendPhotoAsIs('image/HEIC', 2000, 2000)).toBe(true)
  })

  it('ほかの形式・空・上限超えは送らない', () => {
    expect(canSendPhotoAsIs('image/gif', 1000, 2000)).toBe(false)
    expect(canSendPhotoAsIs('image/svg+xml', 1000, 2000)).toBe(false)
    expect(canSendPhotoAsIs('', 1000, 2000)).toBe(false)
    expect(canSendPhotoAsIs('image/jpeg', 0, 2000)).toBe(false)
    expect(canSendPhotoAsIs('image/heic', 2001, 2000)).toBe(false)
  })
})

describe('photoTypeOf', () => {
  it('形式があればそのまま使う（小文字にそろえる）', () => {
    expect(photoTypeOf('image/HEIC', 'IMG_0001.HEIC')).toBe('image/heic')
    expect(photoTypeOf('image/jpeg', 'photo.heic')).toBe('image/jpeg')
  })

  it('形式が空なら拡張子から補う', () => {
    expect(photoTypeOf('', 'IMG_0001.HEIC')).toBe('image/heic')
    expect(photoTypeOf('', 'scan.heif')).toBe('image/heif')
    expect(photoTypeOf('', 'a.JPG')).toBe('image/jpeg')
    expect(photoTypeOf('', 'b.avif')).toBe('image/avif')
  })

  it('知らない拡張子・拡張子なしは空のまま（送らない）', () => {
    expect(photoTypeOf('', 'anim.gif')).toBe('')
    expect(photoTypeOf('', 'noext')).toBe('')
    expect(canSendPhotoAsIs(photoTypeOf('', 'x.svg'), 100, 2000)).toBe(false)
  })
})

describe('isQuickPostPhoto', () => {
  it('さっと投稿で上げた写真（タイムライン専用・post- で始まる名前）だけを使える', () => {
    expect(isQuickPostPhoto({ filename: 'post-3f2a.jpg', isTimelineOnly: true })).toBe(true)
  })

  it('ギャラリーの写真・管理画面で上げた写真は使えない', () => {
    expect(isQuickPostPhoto({ filename: 'post-3f2a.jpg', isTimelineOnly: false })).toBe(false)
    expect(isQuickPostPhoto({ filename: 'IMG_0001.jpg', isTimelineOnly: true })).toBe(false)
    expect(isQuickPostPhoto({ filename: null, isTimelineOnly: true })).toBe(false)
    expect(isQuickPostPhoto({})).toBe(false)
  })
})

describe('photoPrint', () => {
  const file = (bytes: number[], name = 'IMG_0001.jpg') =>
    new File([new Uint8Array(bytes)], name, { type: 'image/jpeg' })

  it('同じ中身なら、名前や選び直しに関係なく同じ指紋', async () => {
    const a = await photoPrint(file([1, 2, 3], 'IMG_0001.jpg'))
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(await photoPrint(file([1, 2, 3], 'image.jpg'))).toBe(a)
  })

  it('中身が違えば違う指紋（差し替えを見分ける）', async () => {
    expect(await photoPrint(file([1, 2, 3]))).not.toBe(await photoPrint(file([1, 2, 4])))
  })

  it('読み直せないときは、同じ File には同じ値・名前や大きさが同じ別の File には違う値', async () => {
    const unreadable = () =>
      ({
        name: 'a.jpg',
        size: 3,
        lastModified: 123,
        arrayBuffer: () => Promise.reject(new Error('NotReadableError')),
      }) as unknown as File
    const a = unreadable()
    const first = await photoPrint(a)
    expect(first).toMatch(/^unreadable:/)
    expect(await photoPrint(a)).toBe(first)
    expect(await photoPrint(unreadable())).not.toBe(first)
  })
})

describe('contentDigest', () => {
  it('同じ内容なら同じ、違えば違う指紋（SHA-256 の16進 64 文字）', async () => {
    const a = await contentDigest(JSON.stringify(['本文', '', 'diary', []]))
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await contentDigest(JSON.stringify(['本文', '', 'diary', []]))).toBe(a)
    expect(await contentDigest(JSON.stringify(['本文を直した', '', 'diary', []]))).not.toBe(a)
  })
})
