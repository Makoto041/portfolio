// src/middleware.ts
// さっと投稿（/post）だけに、リクエストごとの nonce を使った厳しい CSP をかける。
// 読み込めるスクリプトは、この nonce を持つ Next.js 自身のスクリプトと、それが読み込むものだけ（strict-dynamic）。
// 接続先・画像・フォントも自サイトに限り、ほかのサイトへの埋め込み（frame-ancestors）も禁止する。
// サイト本体は静的配信（ISR）なので nonce は使えず、対象外にしている。
import { NextResponse, type NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
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

export const config = {
  matcher: ['/post'],
}
