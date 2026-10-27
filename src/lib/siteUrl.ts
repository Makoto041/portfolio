// src/lib/siteUrl.ts
// 自サイトの URL とオリジン。CORS / CSRF（payload.config.ts）と、
// さっと投稿の送信元チェック・パスキーの RP ID（src/lib/quickpost/config.ts）で同じ値を使う。
// 空文字は || で既定値に落とし、Origin ヘッダーとの突き合わせのため末尾スラッシュを除去する。
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://iwabuchi-makoto.com' : 'http://localhost:3000')
).replace(/\/$/, '')

/** `https://iwabuchi-makoto.com` の形（パスなし） */
export const SITE_ORIGIN = new URL(SITE_URL).origin

/**
 * 管理画面のパスワード再設定リンク。ホストを Host ヘッダーに任せず、渡された siteUrl に固定する
 * （Payload は serverURL が無いと Host ヘッダーからリンクを作るため、偽装されたホストへ誘導されうる）。
 */
export const adminResetUrl = (siteUrl: string, adminRoute: string, resetRoute: string, token: string): string => {
  const trim = (s: string) => s.replace(/^\/+|\/+$/g, '')
  const path = [trim(adminRoute), trim(resetRoute), encodeURIComponent(token)].filter(Boolean).join('/')
  return `${siteUrl.replace(/\/+$/, '')}/${path}`
}
