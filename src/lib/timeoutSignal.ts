// ───────────────────────────────────────────
// src/lib/timeoutSignal.ts
// fetch のタイムアウト用 AbortSignal。AbortSignal.timeout が無いブラウザ（Safari 15 以前など）でも
// TypeError で処理全体を落とさず、AbortController + setTimeout で同じ挙動にする。
// ───────────────────────────────────────────

export function timeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal === 'undefined') return undefined
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}
