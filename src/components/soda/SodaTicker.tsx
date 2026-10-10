// src/components/soda/SodaTicker.tsx
// ホーム最上部のティッカー。おしらせと最新の投稿が右から左へ流れる。
// 内容を2セット並べて translateX(-50%) でループ（2セット目は装飾扱いで読み上げ・フォーカス対象外）。
// ホバー/フォーカスで一時停止、右端のボタンでも停止できる（WCAG 2.2.2）。
// prefers-reduced-motion では流さず、1セットだけを横スクロールで読めるようにする（CSS）。
'use client'

import { useState } from 'react'
import Link from 'next/link'
import SodaIcon from '@/components/soda/SodaIcon'

export type TickerItem = {
  key: string
  /** おしらせ（赤い点）/ 投稿（✎） */
  kind: 'notice' | 'post'
  date: string
  text: string
  /** 投稿はタイムラインの該当箇所へ。おしらせは本文がすべてなのでリンクにしない */
  href?: string
}

export default function SodaTicker({ items }: { items: TickerItem[] }) {
  const [paused, setPaused] = useState(false)
  if (items.length === 0) return null

  const render = (dup: boolean) =>
    items.map((it) => {
      const body = (
        <>
          <span className="s-tk">
            {it.kind === 'notice' ? <span className="s-tk-dot" aria-hidden="true" /> : <span aria-hidden="true">✎</span>}
            {it.date}
          </span>
          {it.text}
        </>
      )
      const key = `${dup ? 'dup-' : ''}${it.key}`
      const className = `s-tk-item${dup ? ' s-tk-dup' : ''}`
      return it.href ? (
        <Link key={key} className={className} href={it.href} tabIndex={dup ? -1 : undefined} aria-hidden={dup || undefined}>
          {body}
        </Link>
      ) : (
        <span key={key} className={className} aria-hidden={dup || undefined}>
          {body}
        </span>
      )
    })

  return (
    <section className={`s-ticker${paused ? ' is-paused' : ''}`} aria-label="おしらせと最新の投稿">
      <div className="s-ticker-view">
        <div className="s-ticker-track">
          {render(false)}
          {render(true)}
        </div>
      </div>
      <button
        type="button"
        className="s-ticker-toggle"
        aria-pressed={paused}
        aria-label="流れる文字を一時停止"
        onClick={() => setPaused((v) => !v)}
      >
        <SodaIcon name={paused ? 'play' : 'pause'} />
      </button>
    </section>
  )
}
