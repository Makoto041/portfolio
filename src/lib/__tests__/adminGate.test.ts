import { createHash } from 'node:crypto'
import { jwtSign } from 'payload'
import { describe, expect, it } from 'vitest'
import {
  ADMIN_GATE_TTL_SEC,
  adminLoginSlug,
  decideGate,
  gateSurface,
  isGateEnforced,
  isLoginPath,
  isResetPath,
  issueGateCookie,
  normalizePath,
  resolveDotSegments,
  verifyAdminToken,
  verifyGateCookie,
} from '@/lib/adminGate'

const SECRET = 'test-payload-secret'
const SLUG = 'a1b2c3d4e5f6a7b8c9d0e1f2'
const NOW = Date.UTC(2026, 9, 27, 12, 0, 0)

/** Payload が実際にログインで出す JWT（鍵は Payload が config.secret から作る payload.secret と同じ作り方） */
async function payloadToken(secret = SECRET, tokenExpiration = 7200, now = NOW) {
  const payloadSecret = createHash('sha256').update(secret).digest('hex').slice(0, 32)
  const realNow = Date.now
  Date.now = () => now
  try {
    const { token } = await jwtSign({
      fieldsToSign: { id: 1, collection: 'users', email: 'me@example.com' },
      secret: payloadSecret,
      tokenExpiration,
    })
    return token
  } finally {
    Date.now = realNow
  }
}

describe('adminLoginSlug', () => {
  it('16〜64文字の URL 安全な文字列だけ使える', () => {
    expect(adminLoginSlug(SLUG)).toBe(SLUG)
    expect(adminLoginSlug(`  ${SLUG}\n`)).toBe(SLUG)
    expect(adminLoginSlug('a'.repeat(64))).toBe('a'.repeat(64))
  })

  it.each([undefined, '', 'login', 'short-slug', 'a'.repeat(65), 'has space in it 1234', 'slash/in/the/middle1', '日本語の合言葉はつかえない1234'])(
    '%j は使えない',
    (raw) => {
      expect(adminLoginSlug(raw)).toBeUndefined()
    },
  )
})

describe('isGateEnforced', () => {
  it('本番は合言葉がなくてもかける（入れ忘れたら閉じる）', () => {
    expect(isGateEnforced('production', undefined)).toBe(true)
    expect(isGateEnforced('production', SLUG)).toBe(true)
  })

  it('開発は合言葉を決めたときだけかける', () => {
    expect(isGateEnforced('development', undefined)).toBe(false)
    expect(isGateEnforced('development', SLUG)).toBe(true)
    expect(isGateEnforced(undefined, undefined)).toBe(false)
  })
})

describe('normalizePath / gateSurface', () => {
  it.each([
    ['/admin', 'admin'],
    ['/admin/', 'admin'],
    ['/admin/login', 'admin'],
    ['/admin/collections/timeline/create', 'admin'],
    ['/%61dmin', 'admin'],
    ['/%61dmin/%6cogin', 'admin'],
    ['//admin//login', 'admin'],
    ['/ADMIN/login', 'admin'],
    ['/api/users/login', 'api'],
    ['/api/users/forgot-password', 'api'],
    ['/api/users', 'api'],
    ['/api/users/', 'api'],
    ['/api/%75sers/login', 'api'],
    ['/api/Users/login', 'api'],
    // `.` / `..` / %2e の区切り（Payload のルーターは解決してから振り分ける）
    ['/api/./users/login', 'api'],
    ['/api/%2e/users/login', 'api'],
    ['/api/x/../users/login', 'api'],
    ['/api/x/%2e%2e/users/login', 'api'],
    ['/api/x/%2E%2E/users/forgot-password', 'api'],
    ['/api/users/./login', 'api'],
    ['/api/users/me/../login', 'api'],
    ['/./admin', 'admin'],
    ['/x/../admin/login', 'admin'],
    ['/admin/x/../login', 'admin'],
  ])('%s は %s', (path, surface) => {
    expect(gateSurface(path)).toBe(surface)
  })

  it.each(['/', '/timeline', '/post', '/api/timeline', '/api/quickpost/session', '/administrator', '/adminx/login', '/api/usersx', '/nope'])(
    '%s は対象外',
    (path) => {
      expect(gateSurface(path)).toBeNull()
    },
  )

  it('/api/users/me は、そのままの形のときだけ対象外（公開ページの管理者リンクが読むだけ）', () => {
    expect(gateSurface('/api/users/me')).toBeNull()
    expect(gateSurface('/api/users/me/')).toBeNull()
    expect(gateSurface('/api/users/%6de')).toBeNull()
    expect(gateSurface('/api/users/me/x')).toBe('api')
    // 回りくどい形は対象にする（取りこぼさない側に倒す）
    expect(gateSurface('/api/./users/me')).toBe('api')
    expect(gateSurface('/api/users/./me')).toBe('api')
  })

  it('/api/users/reset-password は、そのままの形のときだけ対象外（メールのトークンが本物の認証情報）', () => {
    expect(gateSurface('/api/users/reset-password')).toBeNull()
    expect(gateSurface('/api/users/reset-password/')).toBeNull()
    expect(gateSurface('/api/users/reset-password/x')).toBe('api')
    expect(gateSurface('/api/./users/reset-password')).toBe('api')
    expect(gateSurface('/api/users/forgot-password')).toBe('api') // 「忘れた」の送信は閉じたまま
  })

  it('対象外のパスは、`..` で解決しても対象外のまま', () => {
    expect(gateSurface('/timeline/../post')).toBeNull()
    expect(gateSurface('/api/x/../timeline')).toBeNull()
    expect(gateSurface('/api/quickpost/../quickpost/session')).toBeNull()
  })

  it('壊れた %エンコードでも落ちない', () => {
    expect(normalizePath('/admin/%E0%A4%A')).toBe('/admin/%E0%A4%A')
    expect(gateSurface('/admin/%E0%A4%A')).toBe('admin')
  })
})

describe('resolveDotSegments', () => {
  it.each([
    ['/api/./users/login', '/api/users/login'],
    ['/api/x/../users/login', '/api/users/login'],
    ['/a/b/../../c', '/c'],
    ['/../../admin', '/admin'],
    ['/admin', '/admin'],
    ['/', '/'],
  ])('%s → %s', (input, expected) => {
    expect(resolveDotSegments(input)).toBe(expected)
  })

  it('URL が解決した形と同じになる', () => {
    for (const raw of ['/api/./users/login', '/api/%2e/users/login', '/api/x/../users/login', '/api/x/%2e%2e/users/login']) {
      expect(resolveDotSegments(normalizePath(new URL(raw, 'http://localhost').pathname))).toBe('/api/users/login')
    }
  })
})

const RESET_TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678' // Payload の再設定トークンと同じ形（20 バイトの16進）

describe('isResetPath', () => {
  it('/admin/reset/<40 桁の16進> だけ', () => {
    expect(RESET_TOKEN).toHaveLength(40)
    expect(isResetPath(`/admin/reset/${RESET_TOKEN}`)).toBe(true)
    expect(isResetPath(`/admin/reset/${RESET_TOKEN}/`)).toBe(true)
    expect(isResetPath(`/admin/reset/${RESET_TOKEN.toUpperCase()}`)).toBe(true)
  })

  it.each([
    '/admin/reset',
    '/admin/reset/',
    '/admin/reset/x',
    `/admin/reset/${'a'.repeat(39)}`,
    `/admin/reset/${'a'.repeat(41)}`,
    `/admin/reset/${'g'.repeat(40)}`,
    `/admin/reset/${RESET_TOKEN}/extra`,
    `/admin/x/reset/${RESET_TOKEN}`,
    `/admin/x/../reset/${RESET_TOKEN}`,
    `/admin/reset/../login`,
    `/api/users/reset/${RESET_TOKEN}`,
  ])('%s は通さない', (path) => {
    expect(isResetPath(path)).toBe(false)
  })
})

describe('isLoginPath', () => {
  it('合言葉と完全に一致するときだけ', () => {
    expect(isLoginPath(`/admin/${SLUG}`, SLUG)).toBe(true)
    expect(isLoginPath(`/admin/${SLUG}/`, SLUG)).toBe(true)
    expect(isLoginPath(`/admin/${SLUG.toUpperCase()}`, SLUG)).toBe(false)
    expect(isLoginPath(`/admin/${SLUG}x`, SLUG)).toBe(false)
    expect(isLoginPath(`/admin/${SLUG.slice(0, -1)}`, SLUG)).toBe(false)
    expect(isLoginPath(`/admin/${SLUG}/extra`, SLUG)).toBe(false)
    expect(isLoginPath('/admin/login', SLUG)).toBe(false)
    expect(isLoginPath(`/other/${SLUG}`, SLUG)).toBe(false)
  })

  it('`..` を挟んだ形は秘密のログイン画面として扱わない', () => {
    expect(isLoginPath(`/admin/x/../${SLUG}`, SLUG)).toBe(false)
    expect(isLoginPath(`/admin/./${SLUG}`, SLUG)).toBe(false)
  })

  it('合言葉がなければ、どこも秘密のログイン画面にならない', () => {
    expect(isLoginPath('/admin/login', undefined)).toBe(false)
    expect(isLoginPath('/admin/', undefined)).toBe(false)
  })
})

describe('verifyAdminToken', () => {
  it('Payload が出した JWT を通す', async () => {
    expect(await verifyAdminToken(await payloadToken(), SECRET, NOW + 60_000)).toBe(true)
  })

  it('有効期限が切れた JWT は通さない', async () => {
    const token = await payloadToken(SECRET, 7200)
    expect(await verifyAdminToken(token, SECRET, NOW + 7200_000 - 1)).toBe(true)
    expect(await verifyAdminToken(token, SECRET, NOW + 7200_000)).toBe(false)
  })

  it('別の鍵で署名された JWT は通さない', async () => {
    expect(await verifyAdminToken(await payloadToken('another-secret'), SECRET, NOW)).toBe(false)
  })

  it('本文を書き換えた JWT は通さない', async () => {
    const [header, , signature] = (await payloadToken()).split('.')
    const forged = Buffer.from(JSON.stringify({ id: 1, collection: 'users', exp: 9_999_999_999 })).toString('base64url')
    expect(await verifyAdminToken(`${header}.${forged}.${signature}`, SECRET, NOW)).toBe(false)
  })

  it('署名なし（alg: none）や壊れた値は通さない', async () => {
    const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const body = Buffer.from(JSON.stringify({ id: 1, exp: 9_999_999_999 })).toString('base64url')
    expect(await verifyAdminToken(`${none}.${body}.`, SECRET, NOW)).toBe(false)
    expect(await verifyAdminToken(`${none}.${body}.AAAA`, SECRET, NOW)).toBe(false)
    expect(await verifyAdminToken('', SECRET, NOW)).toBe(false)
    expect(await verifyAdminToken('a.b', SECRET, NOW)).toBe(false)
    expect(await verifyAdminToken('a.b.c', SECRET, NOW)).toBe(false)
    expect(await verifyAdminToken('!!.@@.##', SECRET, NOW)).toBe(false)
  })
})

describe('ログインの窓の Cookie', () => {
  it('発行した直後から有効期間いっぱいは通り、過ぎたら通らない', async () => {
    const value = await issueGateCookie(SECRET, NOW)
    expect(await verifyGateCookie(value, SECRET, NOW)).toBe(true)
    expect(await verifyGateCookie(value, SECRET, NOW + (ADMIN_GATE_TTL_SEC - 1) * 1000)).toBe(true)
    expect(await verifyGateCookie(value, SECRET, NOW + ADMIN_GATE_TTL_SEC * 1000 + 1000)).toBe(false)
  })

  it('別の鍵・期限の書き換え・壊れた値は通さない', async () => {
    const value = await issueGateCookie(SECRET, NOW)
    const [exp, signature] = value.split('.')
    expect(await verifyGateCookie(value, 'another-secret', NOW)).toBe(false)
    expect(await verifyGateCookie(`${Number(exp) + 86400}.${signature}`, SECRET, NOW)).toBe(false)
    expect(await verifyGateCookie(`${exp}.${'0'.repeat(64)}`, SECRET, NOW)).toBe(false)
    expect(await verifyGateCookie(`${exp}.zz`, SECRET, NOW)).toBe(false)
    expect(await verifyGateCookie(`${exp}`, SECRET, NOW)).toBe(false)
    expect(await verifyGateCookie(`${value}.x`, SECRET, NOW)).toBe(false)
    expect(await verifyGateCookie('', SECRET, NOW)).toBe(false)
  })

  it('Payload の JWT とは取り違えない', async () => {
    expect(await verifyGateCookie(await payloadToken(), SECRET, NOW)).toBe(false)
    expect(await verifyAdminToken(await issueGateCookie(SECRET, NOW), SECRET, NOW)).toBe(false)
  })
})

describe('decideGate', () => {
  const base = { slug: SLUG, secret: SECRET, enforced: true, now: NOW }

  it('対象外のパスは常に通す', async () => {
    expect(await decideGate({ ...base, pathname: '/timeline' })).toBe('pass')
    expect(await decideGate({ ...base, pathname: '/api/users/me' })).toBe('pass')
    expect(await decideGate({ ...base, pathname: '/api/timeline' })).toBe('pass')
  })

  it('ゲートをかけない開発では全部通す', async () => {
    expect(await decideGate({ ...base, enforced: false, pathname: '/admin/login' })).toBe('pass')
    expect(await decideGate({ ...base, enforced: false, pathname: '/api/users/login' })).toBe('pass')
  })

  it('通行証のない人には /admin もログイン画面も認証 API も見せない', async () => {
    for (const pathname of ['/admin', '/admin/login', '/admin/collections/users', '/api/users/login', '/api/users/forgot-password', '/%61dmin']) {
      expect(await decideGate({ ...base, pathname })).toBe('deny')
    }
  })

  it('秘密のログイン画面だけは窓を開けて通す', async () => {
    expect(await decideGate({ ...base, pathname: `/admin/${SLUG}` })).toBe('open')
    expect(await decideGate({ ...base, pathname: `/admin/${SLUG}/` })).toBe('open')
  })

  it('/api/users への回りくどいパスも、通行証なしでは通さない', async () => {
    for (const pathname of ['/api/./users/login', '/api/%2e/users/login', '/api/x/../users/login', '/api/x/%2e%2e/users/login', '/api/users/./login']) {
      expect(await decideGate({ ...base, pathname })).toBe('deny')
    }
    // ログイン済みなら、同じパスでも通す
    expect(await decideGate({ ...base, pathname: '/api/x/../users/logout', token: await payloadToken() })).toBe('pass')
  })

  it('Payload が決め打ちで向ける /admin/login は、通行証があっても通さない（ログアウト後はネタページ）', async () => {
    const token = await payloadToken()
    const gate = await issueGateCookie(SECRET, NOW)
    for (const pathname of ['/admin/login', '/admin/Login', '/admin/login/', '/admin/%6cogin']) {
      expect(await decideGate({ ...base, pathname, token, gate })).toBe('deny')
    }
    // ログイン後に飛ぶ先（redirect）は、クエリなので判定に影響しない
    expect(await decideGate({ ...base, pathname: '/admin', token })).toBe('pass')
  })

  it('パスワード再設定: メールのリンクと送信先だけ、通行証なしで通す（ほかの再設定系は閉じたまま）', async () => {
    expect(await decideGate({ ...base, pathname: `/admin/reset/${RESET_TOKEN}` })).toBe('pass')
    expect(await decideGate({ ...base, pathname: '/api/users/reset-password' })).toBe('pass')
    expect(await decideGate({ ...base, pathname: '/admin/reset/x' })).toBe('deny')
    expect(await decideGate({ ...base, pathname: '/admin/forgot' })).toBe('deny')
    expect(await decideGate({ ...base, pathname: '/api/users/forgot-password' })).toBe('deny')
    // 本番で合言葉が未設定でも、再設定は通る（トークンが本物の認証情報）。ログイン画面は閉じたまま
    expect(await decideGate({ ...base, slug: undefined, pathname: `/admin/reset/${RESET_TOKEN}` })).toBe('pass')
    expect(await decideGate({ ...base, slug: undefined, pathname: '/admin/login' })).toBe('deny')
  })

  it('秘密のログイン画面は /api/users の代わりにはならない', async () => {
    expect(await decideGate({ ...base, pathname: `/api/users/${SLUG}` })).toBe('deny')
  })

  it('ログイン済みの JWT があれば /admin も認証 API も通す', async () => {
    const token = await payloadToken()
    expect(await decideGate({ ...base, pathname: '/admin', token })).toBe('pass')
    expect(await decideGate({ ...base, pathname: '/admin/collections/timeline/create', token })).toBe('pass')
    expect(await decideGate({ ...base, pathname: '/api/users/logout', token })).toBe('pass')
  })

  it('偽物・期限切れの JWT では通さない', async () => {
    expect(await decideGate({ ...base, pathname: '/admin', token: 'x' })).toBe('deny')
    expect(await decideGate({ ...base, pathname: '/admin', token: await payloadToken('another-secret') })).toBe('deny')
    const short = await payloadToken(SECRET, 60)
    expect(await decideGate({ ...base, pathname: '/admin', token: short })).toBe('pass')
    expect(await decideGate({ ...base, now: NOW + 61_000, pathname: '/admin', token: short })).toBe('deny')
  })

  it('窓の Cookie があれば、ログイン中の画面から認証 API を叩ける', async () => {
    const gate = await issueGateCookie(SECRET, NOW)
    expect(await decideGate({ ...base, pathname: '/api/users/login', gate })).toBe('pass')
    expect(await decideGate({ ...base, pathname: '/admin', gate })).toBe('pass')
    expect(await decideGate({ ...base, pathname: '/api/users/login', gate: 'bogus' })).toBe('deny')
  })

  it('合言葉が決まっていない本番では、誰も入れない', async () => {
    expect(await decideGate({ ...base, slug: undefined, pathname: '/admin/login' })).toBe('deny')
    expect(await decideGate({ ...base, slug: undefined, pathname: '/admin' })).toBe('deny')
  })

  it('PAYLOAD_SECRET がなければ閉じる', async () => {
    expect(await decideGate({ ...base, secret: undefined, pathname: `/admin/${SLUG}` })).toBe('deny')
    expect(await decideGate({ ...base, secret: '', pathname: '/admin' })).toBe('deny')
  })
})
