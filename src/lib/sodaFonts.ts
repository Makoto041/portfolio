// src/lib/sodaFonts.ts
// Soda Press デザインの書体を next/font でセルフホストする。
//   - Bagel Fat One : ロゴ「MAKOTO」と各ページの英字見出し（ディスプレイ用・1ウェイト）
//   - DM Sans       : 欧文・数字（可変ウェイト + opsz）
//   - Zen Kaku Gothic New : 和文本文（雑誌らしい端正なゴシック）
import { Bagel_Fat_One, DM_Sans, Zen_Kaku_Gothic_New } from 'next/font/google'

export const bagel = Bagel_Fat_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bagel',
  display: 'swap',
})

export const dmSans = DM_Sans({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-dm',
  display: 'swap',
})

export const zenKaku = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-zkg',
  display: 'swap',
  preload: false, // 日本語は unicode-range 分割で必要分のみ取得
})

/** <html> に付与するフォント変数クラス（3書体分） */
export const sodaFontVars = `${bagel.variable} ${dmSans.variable} ${zenKaku.variable}`
