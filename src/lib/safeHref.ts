// ───────────────────────────────────────────
// src/lib/safeHref.ts
// リッチテキスト等の利用者入力由来の URL を href に入れる前の検査。
// javascript: / data: などのスキームを弾き、http(s) / mailto と相対パスだけを通す。
// ───────────────────────────────────────────

const ALLOWED = new Set(['http:', 'https:', 'mailto:'])

export function safeHref(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  // サイト内の相対パス（// で始まるプロトコル相対は外部扱いで不可）
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed
  try {
    const parsed = new URL(trimmed)
    return ALLOWED.has(parsed.protocol) ? trimmed : null
  } catch {
    return null
  }
}
