// src/components/soda/SodaShell.tsx
// 全ページ共通の外枠。sticky ヘッダー → 本文 → 反転フッター + SP の下部ドック + 全画面メニュー。
// ホーム（page.tsx）と全サブページ（(site)/layout.tsx）の両方から使う。
import React from 'react'
import SodaHeader from '@/components/soda/SodaHeader'
import SodaFooter from '@/components/soda/SodaFooter'
import SodaDock from '@/components/soda/SodaDock'
import SodaDrawer from '@/components/soda/SodaDrawer'
import { SodaNavProvider } from '@/components/soda/SodaNav'
import type { SiteChrome } from '@/features/site/getSiteChrome'

type Props = {
  children: React.ReactNode
  chrome: SiteChrome
  /** ホーム用（題字が見えている間はヘッダーの小ロゴを隠す） */
  home?: boolean
}

export default function SodaShell({ children, chrome, home = false }: Props) {
  return (
    <div className="soda">
      <a href="#main" className="s-skip">
        本文へスキップ
      </a>
      <SodaNavProvider>
        <SodaHeader home={home} />
        <main id="main" className="s-main">
          {children}
        </main>
        <SodaFooter socials={chrome.socials} />
        <SodaDock />
        <SodaDrawer socials={chrome.socials} tagline={chrome.tagline} />
      </SodaNavProvider>
    </div>
  )
}
