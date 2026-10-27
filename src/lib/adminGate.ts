// src/lib/adminGate.ts
// 管理画面（/admin）と認証 API（/api/users）の門番。狙われやすい URL に、ログイン画面を見せないための判定。
//
//   ログイン済み（Payload の JWT が正しい）            → そのまま通す
//   秘密のログイン画面（/admin/<ADMIN_LOGIN_SLUG>）     → 通す。同時に「ログインの窓」Cookie を30分だけ付ける
//   窓が開いている（ログイン中の画面から認証 API を叩く） → 通す
//   それ以外                                            → ネタページ（/nope）/ 418 のテキスト
//
// middleware（Edge）と payload.config（Node）の両方から読むので、Web Crypto と標準 API だけで書く。
// JWT の検証は Payload の署名（HS256・鍵は PAYLOAD_SECRET の sha256 の先頭32文字）に合わせている。
// 通すかどうかの画面向けの判定にすぎず、認証そのものは今まで通り Payload が行う。

export const ADMIN_TOKEN_COOKIE = 'payload-token'
export const ADMIN_GATE_COOKIE = 'admin-gate'
/** ログインの窓の長さ（秒）。ログイン画面を開いてからパスワードを入れ終わるまでの余裕 */
export const ADMIN_GATE_TTL_SEC = 30 * 60
/** ゲートに引っかかった人を案内するネタページ */
export const ADMIN_NOPE_PATH = '/nope'

/** ログイン画面の合言葉は、推測できない長さの URL 安全な文字列だけ（ADMIN_LOGIN_SLUG。`openssl rand -hex 16` など） */
const SLUG_PATTERN = /^[A-Za-z0-9_-]{16,64}$/

const encoder = new TextEncoder()

/** 環境変数の ADMIN_LOGIN_SLUG。未設定・短すぎる・使えない文字があれば undefined */
export function adminLoginSlug(raw: string | undefined = process.env.ADMIN_LOGIN_SLUG): string | undefined {
  const value = raw?.trim()
  return value && SLUG_PATTERN.test(value) ? value : undefined
}

/**
 * ゲートをかけるか。本番（Preview 含む）は常にかける（合言葉を入れ忘れたら、誰も入れない側に倒す）。
 * 開発は、ADMIN_LOGIN_SLUG を決めたときだけかける（決めていなければ今まで通り /admin/login）。
 */
export function isGateEnforced(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  slug: string | undefined = adminLoginSlug(),
): boolean {
  return nodeEnv === 'production' || slug !== undefined
}

/** パスを判定用にそろえる（%エンコード・連続スラッシュ・末尾スラッシュ。`/%61dmin` や `//admin` で素通りさせない） */
export function normalizePath(pathname: string): string {
  let path = pathname
  try {
    path = decodeURIComponent(pathname)
  } catch {
    // 壊れた %エンコードはそのまま判定する
  }
  path = path.replace(/\/{2,}/g, '/')
  return path.length > 1 ? path.replace(/\/$/, '') : path
}

/** `.` と `..` の区切りを解決する（Payload のルーターは URL を解決してから振り分けるので、`/api/x/../users/login` は /api/users/login と同じ） */
export function resolveDotSegments(path: string): string {
  const out: string[] = []
  for (const segment of path.split('/')) {
    if (segment === '..') out.pop()
    else if (segment !== '.' && segment !== '') out.push(segment)
  }
  return `/${out.join('/')}`
}

export type GateSurface = 'admin' | 'api'

function surfaceOf(path: string): GateSurface | null {
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin'
  if (path === '/api/users' || path.startsWith('/api/users/')) return 'api'
  return null
}

/**
 * ゲートの対象か。/admin 配下と、/api/users 配下（ログイン・パスワード再設定など）。
 * `.` / `..` / %エンコードを解決した形と、しない形の両方を見て、どちらかが対象なら対象にする（取りこぼさない側に倒す）。
 * /api/users/me と /api/users/reset-password だけは、そのままの形のときに限り対象外
 */
export function gateSurface(pathname: string): GateSurface | null {
  const plain = normalizePath(pathname).toLowerCase()
  if (plain === '/api/users/me') return null // 公開ページの管理者リンクが、ログイン中かを調べるのに使う（読むだけ）
  // パスワード再設定の送信先。本物の認証情報は、メールで届いた推測できないトークン（本文）なので、窓の Cookie は要らない
  if (plain === '/api/users/reset-password') return null
  return surfaceOf(plain) ?? surfaceOf(resolveDotSegments(plain))
}

/** 長さが違っても、同じ文字列かどうかを時間差で漏らさずに比べる */
function timingSafeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a)
  const y = encoder.encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ (y[i % (y.length || 1)] ?? 0)
  return diff === 0
}

/**
 * パスワード再設定メールのリンク（/admin/reset/<トークン>）。Payload のトークンは 20 バイトの乱数の16進（40 文字）。
 * メールのリンクは別サイトからの遷移で、SameSite=Strict の窓の Cookie が付かないので、この形のときに限って通す
 */
export function isResetPath(pathname: string): boolean {
  return /^\/admin\/reset\/[0-9a-f]{40}$/i.test(normalizePath(pathname))
}

/** 秘密のログイン画面（/admin/<slug>）か */
export function isLoginPath(pathname: string, slug: string | undefined): boolean {
  if (!slug) return false
  return timingSafeEqual(normalizePath(pathname), `/admin/${slug}`)
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  try {
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    return Uint8Array.from(binary, (c) => c.charCodeAt(0))
  } catch {
    return null
  }
}

function hexToBytes(value: string): Uint8Array | null {
  if (!/^(?:[0-9a-f]{2})+$/.test(value)) return null
  return Uint8Array.from(value.match(/../g)!, (h) => parseInt(h, 16))
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
}

function hmacKey(keyMaterial: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(keyMaterial), { name: 'HMAC', hash: 'SHA-256' }, false, [usage])
}

/** Payload が JWT の署名に使う鍵（payload.secret）。PAYLOAD_SECRET の sha256（16進）の先頭32文字 */
async function payloadJwtKey(secret: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest('SHA-256', encoder.encode(secret))).slice(0, 32)
}

/** Payload が出したログイン済みの JWT か（署名と有効期限だけ見る。ユーザーが今もいるかは Payload が確かめる） */
export async function verifyAdminToken(token: string, secret: string, now: number = Date.now()): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const header = base64UrlToBytes(parts[0])
  const body = base64UrlToBytes(parts[1])
  const signature = base64UrlToBytes(parts[2])
  if (!header || !body || !signature) return false
  try {
    const { alg } = JSON.parse(new TextDecoder().decode(header)) as { alg?: unknown }
    if (alg !== 'HS256') return false
    const key = await hmacKey(await payloadJwtKey(secret), 'verify')
    const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(`${parts[0]}.${parts[1]}`))
    if (!valid) return false
    const { exp } = JSON.parse(new TextDecoder().decode(body)) as { exp?: unknown }
    return typeof exp === 'number' && exp * 1000 > now
  } catch {
    return false
  }
}

/** 窓の Cookie の署名鍵。PAYLOAD_SECRET から用途別に導出する（Payload の JWT など他の署名と混ざらないように） */
async function gateKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  const master = await hmacKey(secret, 'sign')
  const derived = await crypto.subtle.sign('HMAC', master, encoder.encode('admin-gate/v1'))
  return crypto.subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, [usage])
}

/** ログインの窓の Cookie 値（`<期限(秒)>.<署名>`）。署名は PAYLOAD_SECRET から作るので、秘密のログイン画面を開かない限り作れない */
export async function issueGateCookie(secret: string, now: number = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + ADMIN_GATE_TTL_SEC
  const signature = await crypto.subtle.sign('HMAC', await gateKey(secret, 'sign'), encoder.encode(String(exp)))
  return `${exp}.${bytesToHex(signature)}`
}

export async function verifyGateCookie(value: string, secret: string, now: number = Date.now()): Promise<boolean> {
  const [expText, signatureHex, ...rest] = value.split('.')
  if (rest.length > 0 || !/^\d{1,12}$/.test(expText ?? '')) return false
  const exp = Number(expText)
  if (exp * 1000 <= now) return false
  const signature = hexToBytes(signatureHex ?? '')
  if (!signature) return false
  try {
    return await crypto.subtle.verify('HMAC', await gateKey(secret, 'verify'), signature, encoder.encode(String(exp)))
  } catch {
    return false
  }
}

export type GateVerdict =
  /** ゲートの対象ではない、または通してよい */
  | 'pass'
  /** 秘密のログイン画面。通して、ログインの窓の Cookie を付ける */
  | 'open'
  /** 通さない（ネタページ / 418） */
  | 'deny'

export type GateInput = {
  pathname: string
  /** payload-token Cookie の値 */
  token?: string
  /** admin-gate Cookie の値 */
  gate?: string
  /** 秘密のログイン画面の合言葉（adminLoginSlug()） */
  slug?: string
  /** PAYLOAD_SECRET */
  secret?: string
  /** ゲートをかけるか（isGateEnforced()） */
  enforced: boolean
  now?: number
}

export async function decideGate({ pathname, token, gate, slug, secret, enforced, now }: GateInput): Promise<GateVerdict> {
  const surface = gateSurface(pathname)
  if (!surface || !enforced) return 'pass'
  if (!secret) return 'deny' // 鍵がなければ確かめようがない。閉じる側に倒す
  if (surface === 'admin' && isLoginPath(pathname, slug)) return 'open'
  if (surface === 'admin' && isResetPath(pathname)) return 'pass'
  // Payload が決め打ちで向ける既定のログイン画面（ログアウト後・非アクティブ後）。ここは秘密にした入口とは別で、誰にも見せない
  if (surface === 'admin' && normalizePath(pathname).toLowerCase() === '/admin/login') return 'deny'
  if (token && (await verifyAdminToken(token, secret, now))) return 'pass'
  if (gate && (await verifyGateCookie(gate, secret, now))) return 'pass'
  return 'deny'
}
