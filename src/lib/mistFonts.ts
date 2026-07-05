// src/lib/mistFonts.ts
// Mist Terminal デザインのフォント（Outfit / IBM Plex Mono / Noto Sans JP）を
// next/font でセルフホストし、トップページ・全サブページ（MistShell）で共用する。
import { Outfit, IBM_Plex_Mono, Noto_Sans_JP } from 'next/font/google'

export const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
})

export const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-jp',
  display: 'swap',
  preload: false, // 日本語フォントはunicode-range分割で必要分のみ取得
})

/** `.mist` ルートに付与するフォント変数クラス（3書体分） */
export const mistFontVars = `${outfit.variable} ${plexMono.variable} ${notoSansJP.variable}`
