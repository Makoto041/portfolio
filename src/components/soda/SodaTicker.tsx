// src/components/soda/SodaTicker.tsx
// ホーム最上部のティッカー。おしらせと最新の投稿が右から左へ流れる。
// 内容を2セット並べて translateX(-50%) でループ（2セット目は装飾扱いで読み上げ・フォーカス対象外）。
// ホバー/フォーカスで一時停止、右端のボタンでも停止できる（WCAG 2.2.2）。
// prefers-reduced-motion では流さず横スクロールで読めるようにする（CSS）。
'use client'

import { useState } from 'react'
import Link from 'next/link'
import SodaIcon from '@/components/soda/SodaIcon'

export type TickerItem = {
  key: string
  /** 先頭の記号（☞ おしらせ / ✎ 投稿） */
  mark: string
  date: string
  text: string
  href: string
}

export default function SodaTicker({ items }: { items: TickerItem[] }) {
  const [paused, setPaused] = useState(false)
  if (items.length === 0) return null

  const render = (dup: boolean) =>
    items.map((it) => (
      <Link
        key={`${dup ? 'dup-' : ''}${it.key}`}
        href={it.href}
        tabIndex={dup ? -1 : undefined}
        aria-hidden={dup || undefined}
      >
        <span className="s-tk">
          {it.mark} {it.date}
        </span>
        {it.text}
      </Link>
    ))

  return (
    <section className={`s-ticker${paused ? ' is-paused' : ''}`} aria-label="おしらせと最新の投稿">
      <div className="s-ticker-track">
        {render(false)}
        {render(true)}
      </div>
      <button
        type="button"
        className="s-ticker-toggle"
        aria-pressed={paused}
        aria-label={paused ? '流れる文字を再生する' : '流れる文字を一時停止する'}
        onClick={() => setPaused((v) => !v)}
      >
        <SodaIcon name={paused ? 'play' : 'pause'} />
      </button>
    </section>
  )
}
