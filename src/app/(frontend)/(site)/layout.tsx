// app/(frontend)/(site)/layout.tsx
// サブページ共通のシェル（グラスナビ + 統一コンテナ + フッター）。
// トップページ（Mist Terminal デザイン）は独自シェルを持つため、
// このレイアウトはトップ以外のページにのみ適用される。
import React from 'react'
import GlassNav from '@/components/layout/GlassNav'
import SiteFooter from '@/components/layout/SiteFooter'
import Breadcrumb from '@/components/layout/Breadcrumb'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── 上部グラスナビゲーション ── */}
      <GlassNav />

      {/* ── 1カラムのメインコンテンツ（各ページが <main> を持つため div）
           全ページ同一のコンテナ幅にすることで、ページ遷移時の横ずれを防ぐ ── */}
      <div className="mx-auto min-h-screen w-full max-w-5xl px-4 sm:px-6">
        {/* パンくずはレイアウト層で一元描画（ページごとの位置ずれを防ぐ） */}
        <Breadcrumb />
        {children}
      </div>

      {/* ── フッター ── */}
      <SiteFooter />
    </>
  )
}
