// src/middleware.ts
// 1) 管理画面（/admin）と認証 API（/api/users）の門番（判定は src/lib/adminGate.ts。ほかの /api は素通り）。
//    通行証のない人にはログイン画面を見せず、ネタページ（/nope）に差し替える。
//    秘密のログイン画面（/admin/<ADMIN_LOGIN_SLUG>）だけが入口で、開くとログインの窓の Cookie が付く。
// 2) さっと投稿（/post）だけに、リクエストごとの nonce を使った厳しい CSP をかける。
//    読み込めるスクリプトは、この nonce を持つ Next.js 自身のスクリプトと、それが読み込むものだけ（strict-dynamic）。
//    接続先・画像・フォントも自サイトに限り、ほかのサイトへの埋め込み（frame-ancestors）も禁止する。
//    サイト本体は静的配信（ISR）なので nonce は使えず、対象外にしている。
import { NextResponse, type NextRequest } from 'next/server'
import {
  ADMIN_GATE_COOKIE,
  ADMIN_GATE_TTL_SEC,
  ADMIN_NOPE_PATH,
  ADMIN_TOKEN_COOKIE,
  adminLoginSlug,
  decideGate,
  gateSurface,
  isGateEnforced,
  issueGateCookie,
} from '@/lib/adminGate'

const TEAPOT = 418

/** 門番の応答はキャッシュさせず、検索にも出さない */
function hardenGateResponse(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'private, no-store')
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return res
}

async function adminGate(req: NextRequest): Promise<NextResponse> {
  const slug = adminLoginSlug()
  const secret = process.env.PAYLOAD_SECRET
  const verdict = await decideGate({
    pathname: req.nextUrl.pathname,
    token: req.cookies.get(ADMIN_TOKEN_COOKIE)?.value,
    gate: req.cookies.get(ADMIN_GATE_COOKIE)?.value,
    slug,
    secret,
    enforced: isGateEnforced(process.env.NODE_ENV, slug),
  })

  if (verdict === 'pass') return NextResponse.next()

  if (verdict === 'open') {
    const res = hardenGateResponse(NextResponse.next())
    res.cookies.set(ADMIN_GATE_COOKIE, await issueGateCookie(secret!), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // Lax: パスワード再設定メールのリンク（別サイトからのトップレベルの GET 遷移）にも付くように。
      // 別サイトからの POST・fetch・画像などには付かない
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_GATE_TTL_SEC,
    })
    return res
  }

  // 画面の取得はネタページに差し替える（URL はそのまま。418 を指定するが、Next の動作・ホスティングで 200 になることがある）。
  // それ以外（認証 API・POST）は本文つきで 418 を返す
  const pageRequest = req.method === 'GET' || req.method === 'HEAD'
  if (pageRequest && gateSurface(req.nextUrl.pathname) === 'admin') {
    const url = req.nextUrl.clone()
    url.pathname = ADMIN_NOPE_PATH
    url.search = ''
    return hardenGateResponse(NextResponse.rewrite(url, { status: TEAPOT }))
  }
  return hardenGateResponse(new NextResponse("I'm a teapot.\n", { status: TEAPOT, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
}

function postCsp(req: NextRequest): NextResponse {
  const nonce = btoa(crypto.randomUUID())
  const dev = process.env.NODE_ENV !== 'production'
  const csp = [
    "default-src 'self'",
    // 開発時だけ React の開発ツールが eval を使う
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    // 写真のプレビューは端末内の画像（blob:）
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "manifest-src 'self'",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')

  // Next.js はリクエストの CSP から nonce を読み取り、自身のスクリプトに付ける
  const headers = new Headers(req.headers)
  headers.set('content-security-policy', csp)
  const res = NextResponse.next({ request: { headers } })
  res.headers.set('Content-Security-Policy', csp)
  return res
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (gateSurface(pathname)) return adminGate(req)
  if (pathname === '/post') return postCsp(req)
  return NextResponse.next()
}

// /api は全部通す: `/api/./users/login` や `/api/x/../users/login` のように、matcher には /api/users と見えず、
// Payload のルーターでは解決されて /api/users/login になるパスを取りこぼさないため（判定は gateSurface が解決した形も見る）。
// 対象外のパスはここで素通りさせる
export const config = {
  matcher: ['/post', '/admin/:path*', '/api/:path*'],
}
