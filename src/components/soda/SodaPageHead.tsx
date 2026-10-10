// src/components/soda/SodaPageHead.tsx
// サブページの見出し。英字の大見出し（ロゴと同じ丸い書体・地色の淡色）+ 和文 h1 + 説明。
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
      <span className="s-phead-en" aria-hidden="true">
        {en}
      </span>
      <div className="s-phead-row">
        <h1>{title}</h1>
        {(desc || actions) && (
          <div className="s-phead-actions">
            {desc && <p>{desc}</p>}
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
