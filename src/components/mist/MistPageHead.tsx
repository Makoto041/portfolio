// src/components/mist/MistPageHead.tsx
// サブページ共通の見出し（ターミナル風プロンプト + 大型タイトル + 任意の説明/アクション）。
// タイトルは静的表示（サーバーコンポーネント）。タイプライター演出はトップページの
// ヒーローに限定し、サブページは .content の m-fadeup フェードのみとする
// （JS 不要で即時表示・繰り返し閲覧でも待たせない。Codex レビュー反映）。
import React from 'react'

type Props = {
  /** 例: 'cd ./posts' → `~/life $ cd ./posts` と表示 */
  cmd: string
  title: string
  desc?: string
  actions?: React.ReactNode
}

export default function MistPageHead({ cmd, title, desc, actions }: Props) {
  return (
    <header className="pagehead">
      <div>
        <span className="cmd">~/life $ {cmd}</span>
        <h1>{title}</h1>
        {desc && <p className="desc jp">{desc}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  )
}
