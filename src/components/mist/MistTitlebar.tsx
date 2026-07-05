// src/components/mist/MistTitlebar.tsx
// トップページ用ウィンドウタイトルバー（macOS風ドット + ライブ時刻 + ターミナル風ナビ）
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// トップページ＝Timeline のため ./timeline はトップ（/）を指す
const NAV = [
  { label: './timeline', href: '/', on: true },
  { label: './posts', href: '/posts', on: false },
  { label: './gallery', href: '/gallery', on: false },
  { label: './events', href: '/in_event', on: false },
  { label: './products', href: '/products', on: false },
  { label: './profile', href: '/profile', on: false },
  { label: './letter', href: '/letter', on: false },
] as const

function fmtTime(d: Date) {
  const p = (v: number) => String(v).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export default function MistTitlebar() {
  // SSRとの不一致を避けるためマウント後に時計を開始する
  const [time, setTime] = useState('--:--:--')

  useEffect(() => {
    const tick = () => setTime(fmtTime(new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="titlebar">
      <div className="dots" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <span className="tb-path max-sm:hidden">
        makoto@tokyo: ~/life — <span suppressHydrationWarning>{time}</span>
      </span>
      <nav className="nav" aria-label="メインナビゲーション">
        {NAV.map(({ label, href, on }) => (
          <Link key={href} href={href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
