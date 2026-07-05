// src/components/mist/MistTitlebar.tsx
// ウィンドウタイトルバー（macOS風ドット + ライブ時刻 + ターミナル風ナビ）。
// 全ページ共通シェル（MistShell）で使用するため、active はパスから判定する。
'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

// Home（/ ＝ポータル）と Timeline（/timeline ＝全件の専用タブ）は別ページ
const NAV = [
  { label: './home', href: '/' },
  { label: './timeline', href: '/timeline' },
  { label: './posts', href: '/posts' },
  { label: './gallery', href: '/gallery' },
  { label: './events', href: '/events' },
  { label: './products', href: '/products' },
  { label: './profile', href: '/profile' },
  { label: './letter', href: '/letter' },
] as const

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function MistTitlebar() {
  const pathname = usePathname() ?? '/'
  // SSRとの不一致を避けるためマウント後に時計を開始する（秒なし・30s 更新）
  const [time, setTime] = useState('--:--')
  // SPでナビが横スクロールするため、アクティブ項目を画面内（中央）へ寄せて存在を可視化
  const activeRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [pathname])

  useEffect(() => {
    const fmt = () => {
      const d = new Date()
      const p = (v: number) => String(v).padStart(2, '0')
      return `${p(d.getHours())}:${p(d.getMinutes())}`
    }
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 30000)
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
      <div className="navwrap">
        <nav className="nav" aria-label="メインナビゲーション">
          {NAV.map(({ label, href }) => {
            const on = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                ref={on ? activeRef : undefined}
                className={on ? 'on' : undefined}
                aria-current={on ? 'page' : undefined}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
