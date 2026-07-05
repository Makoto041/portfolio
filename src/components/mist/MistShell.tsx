// src/components/mist/MistShell.tsx
// 全サブページ共通の Mist Terminal シェル（ミスト背景 + ブロブ + タイトルバー + フッター）。
// トップページは page.tsx に独自シェルを持つため、このシェルはサブページ専用。
import React from 'react'
import '../../app/(frontend)/mist.css'
import { mistFontVars } from '@/lib/mistFonts'
import MistTitlebar from '@/components/mist/MistTitlebar'
import MistFooter from '@/components/mist/MistFooter'

export default function MistShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`mist ${mistFontVars}`}>
      <div className="page">
        <div className="mist1" aria-hidden />
        <div className="mist2" aria-hidden />
        <div className="inner">
          <MistTitlebar />
          {children}
          <MistFooter />
        </div>
      </div>
    </div>
  )
}
