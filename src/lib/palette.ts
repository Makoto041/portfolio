// ───────────────────────────────────────────
// src/lib/palette.ts
// 「今月の色」パレット（Soda Press デザイン）。
// 地色(bg) / ロゴ(logo) / 差し色(card) の3色セット。文字・線（--s-ink）は既定で黒系、
// 群青のようにパレット側で文字・線の色（--s-pal-ink など）まで決めるものもある。
// どのパレットでも本文テキスト（--s-ink / --s-sub / --s-faint）は AA(4.5:1) 以上を満たす（テストで確認）。
// 実際の色値は soda.css の :root[data-palette=…] が持ち、ここはキーと割当だけを管理する
// （theme-color・OGP 画像・ホーム画面用に bg / logo / ink / sub だけはここにも持つ。値は soda.css と一致させること）。
// ───────────────────────────────────────────

/** 文字・線と補助の文字の既定色（パレットが自分の色を持たないとき） */
const INK = '#141414'
const SUB = '#42444b'

export const PALETTES = {
  creamsoda: { label: 'クリームソーダ', bg: '#e6f1de', logo: '#74b088', ink: INK, sub: SUB },
  gunjo: { label: '群青', bg: '#e8edfa', logo: '#3354ad', ink: '#1b2a6b', sub: '#3a4473' },
  ramune: { label: 'ラムネ', bg: '#dbecf8', logo: '#8aaecd', ink: INK, sub: SUB },
  melon: { label: 'メロン', bg: '#e0f0e1', logo: '#7fb38a', ink: INK, sub: SUB },
  lemon: { label: 'レモン', bg: '#f6f0cc', logo: '#c8b14f', ink: INK, sub: SUB },
  peach: { label: 'ピーチ', bg: '#fae3d9', logo: '#dc9076', ink: INK, sub: SUB },
  milk: { label: 'ミルク', bg: '#f5f5f0', logo: '#a6abba', ink: INK, sub: SUB },
} as const

export type PaletteKey = keyof typeof PALETTES

/**
 * サイトの地色。'monthly' にすると下の MONTHLY の割当で月替わりになる。
 * 変更はこの1行だけでよい（DB スキーマ変更なし）。
 */
export const SITE_PALETTE: PaletteKey | 'monthly' = 'gunjo'

/** 月替わり時の割当（1月→12月）。季節感で並べている */
const MONTHLY: readonly PaletteKey[] = [
  'milk', // 1月
  'peach', // 2月
  'peach', // 3月
  'melon', // 4月
  'melon', // 5月
  'ramune', // 6月
  'ramune', // 7月
  'lemon', // 8月
  'lemon', // 9月
  'gunjo', // 10月
  'gunjo', // 11月
  'milk', // 12月
]

/** Asia/Tokyo の月（1-12） */
function tokyoMonth(now: Date): number {
  const m = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', month: 'numeric' }).format(now)
  return Number(m)
}

/** いま使うパレットのキー。`now` はテスト用に注入可能 */
export function currentPalette(
  setting: PaletteKey | 'monthly' = SITE_PALETTE,
  now: Date = new Date(),
): PaletteKey {
  if (setting !== 'monthly') return setting
  return MONTHLY[tokyoMonth(now) - 1] ?? 'creamsoda'
}
