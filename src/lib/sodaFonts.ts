// src/lib/sodaFonts.ts
// Soda Press デザインの書体を next/font でセルフホストする。
//   - Bagel Fat One : ロゴ「MAKOTO」（ディスプレイ用・1ウェイト）
//   - DM Sans       : 欧文・数字（可変ウェイト + opsz）
//   - Zen Kaku Gothic New : 和文本文
//   - Klee One      : 手書きの添え書き（メモ帳のおしらせ・プリントのキャプション）
//   - Doto          : フィルムの日付写し込み・ベタ焼きのコマ番号（ドット書体・数字のみで使う）
import { Bagel_Fat_One, DM_Sans, Doto, Klee_One, Zen_Kaku_Gothic_New } from 'next/font/google'

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

export const klee = Klee_One({
  weight: ['400', '600'],
  subsets: ['latin'],
  variable: '--font-klee',
  display: 'swap',
  preload: false, // 添え書きだけに使うので先読みしない（日本語は unicode-range 分割）
})

export const doto = Doto({
  weight: '800',
  subsets: ['latin'],
  variable: '--font-doto',
  display: 'swap',
  preload: false, // 写真の上の装飾なので先読みしない
})

/** <html> に付与するフォント変数クラス */
export const sodaFontVars = `${bagel.variable} ${dmSans.variable} ${zenKaku.variable} ${klee.variable} ${doto.variable}`
