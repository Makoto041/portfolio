// src/app/(post)/layout.tsx
// さっと投稿（/post）専用のルートレイアウト。
// サイト本体のレイアウト（構造化データやタッチ用の小さなインラインスクリプトを持つ）と分け、
// インラインスクリプトの無い素の文書にする。/post には middleware で nonce つきの厳しい CSP をかける。
import '../global.css'
import '../(frontend)/soda.css'
import type { Metadata, Viewport } from 'next'
import React from 'react'
import { sodaFontVars } from '@/lib/sodaFonts'
import { PALETTES, currentPalette } from '@/lib/palette'

export const metadata: Metadata = {
  title: '投稿 | MAKOTO',
  // 自分専用の画面なので検索に出さない
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  // ホーム画面に追加したとき /post から開く
  manifest: '/post.webmanifest',
  icons: { icon: '/myicon.png', apple: '/myicon.png' },
  appleWebApp: { capable: true, title: 'MAKOTO 投稿', statusBarStyle: 'default' },
  referrer: 'same-origin',
}

export function generateViewport(): Viewport {
  return {
    themeColor: PALETTES[currentPalette()].bg,
    colorScheme: 'light',
    viewportFit: 'cover',
  }
}

export default function PostRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-palette={currentPalette()} className={sodaFontVars}>
      <body>{children}</body>
    </html>
  )
}
