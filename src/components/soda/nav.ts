// src/components/soda/nav.ts
// サイト全体のナビゲーション定義（ヘッダー・ドロワー・フッター・ドックで共用）。
export type NavItem = { href: string; ja: string; en: string }

export const NAV: readonly NavItem[] = [
  { href: '/', ja: 'ホーム', en: 'Home' },
  { href: '/timeline', ja: 'タイムライン', en: 'Timeline' },
  { href: '/gallery', ja: '写真', en: 'Photos' },
  { href: '/posts', ja: 'ブログ', en: 'Blog' },
  { href: '/events', ja: 'イベント', en: 'Events' },
  { href: '/products', ja: 'つくったもの', en: 'Products' },
  { href: '/profile', ja: 'プロフィール', en: 'Profile' },
  { href: '/letter', ja: 'お便り', en: 'Letter' },
]

/** 現在地判定（/posts/xxx は /posts を現在地とみなす） */
export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
