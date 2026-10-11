// src/components/soda/SodaPageHead.tsx
// サブページの見出し。和文 h1 の横に、ロゴと同じ丸い書体の英字を小さく添える + 説明・操作。
// 大見出しで画面を使わず、すぐ本文（一覧）に入れる高さに抑える。
import React from 'react'

type Props = {
  en: string
  title: string
  desc?: React.ReactNode
  actions?: React.ReactNode
}

export default function SodaPageHead({ en, title, desc, actions }: Props) {
  return (
    <header className="s-phead">
      <h1>
        {title}
        <span className="s-phead-en" aria-hidden="true">
          {en}
        </span>
      </h1>
      {(desc || actions) && (
        <div className="s-phead-actions">
          {desc && <p>{desc}</p>}
          {actions}
        </div>
      )}
    </header>
  )
}
