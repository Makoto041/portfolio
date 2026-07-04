// src/components/layout/PageHeader.tsx
// 全ページ共通のページ見出し。
// タイトルサイズ・余白・縦位置をここで一元管理し、タブ間の表示ずれを防ぐ
import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  /** タイトル下に表示する一行説明（任意） */
  description?: string
  /** 右側に表示する要素（ウィジェット・管理リンク等） */
  actions?: ReactNode
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 pt-6 pb-8">
      <div>
        {/* シグネチャーの群青ダッシュ */}
        <span aria-hidden className="accent-dash mb-2.5 block h-1 w-8 rounded-full" />
        <h1 className="text-2xl font-semibold tracking-wide">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  )
}
