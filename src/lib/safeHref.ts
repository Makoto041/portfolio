// ───────────────────────────────────────────
// src/lib/safeHref.ts
// リッチテキスト等の利用者入力由来の URL を href に入れる前の検査。
// javascript: / data: などのスキームを弾き、http(s) / mailto と相対パスだけを通す。
// ───────────────────────────────────────────

const ALLOWED = new Set(['http:', 'https:', 'mailto:'])

// 相対パスの解決に使うダミーの基準オリジン（実在しない .invalid ドメイン）
const BASE = 'https://relative.invalid'

export function safeHref(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  // サイト内の相対パス。ブラウザと同じ規則（\ を / とみなす・タブ/改行を除く）で解決し、
  // 別オリジンになるもの（//evil.com・/\evil.com・/<TAB>/evil.com など）は外部扱いで不可
  if (trimmed.startsWith('/')) {
    try {
      return new URL(trimmed, BASE).origin === BASE ? trimmed : null
    } catch {
      return null
    }
  }
  try {
    const parsed = new URL(trimmed)
    return ALLOWED.has(parsed.protocol) ? trimmed : null
  } catch {
    return null
  }
}
