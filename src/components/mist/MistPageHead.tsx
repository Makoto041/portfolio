// src/components/mist/MistPageHead.tsx
// サブページ共通の見出し（ターミナル風プロンプト + 大型タイトル + 任意の説明/アクション）。
// タイトルはトップページのヒーローと同様にタイプライター表示で統一する。
'use client'

import React, { useEffect, useState } from 'react'

type Props = {
  /** 例: 'cd ./posts' → `~/life $ cd ./posts` と表示 */
  cmd: string
  title: string
  desc?: string
  actions?: React.ReactNode
}

export default function MistPageHead({ cmd, title, desc, actions }: Props) {
  const [typed, setTyped] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setTyped(title)
      setDone(true)
      return
    }
    setTyped('')
    setDone(false)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setTyped(title.slice(0, i))
      if (i >= title.length) {
        clearInterval(id)
        setDone(true)
      }
    }, 65)
    return () => clearInterval(id)
  }, [title])

  return (
    <header className="pagehead">
      <div>
        <span className="cmd">~/life $ {cmd}</span>
        {/* min-height（CSS）で空→タイプ完了まで高さ一定＝CLS 0。
            表示はタイプ演出（aria-hidden）、SEO/AT 用に実タイトルを sr-only で常時保持 */}
        <h1>
          <span aria-hidden>
            {typed}
            {!done && <span className="headcaret" />}
          </span>
          <span className="sr-only">{title}</span>
        </h1>
        {desc && <p className="desc jp">{desc}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  )
}
