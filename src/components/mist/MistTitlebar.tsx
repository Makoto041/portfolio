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
  // SP: ハンバーガーメニューの開閉
  const [open, setOpen] = useState(false)
  // PC でナビがはみ出す場合にアクティブ項目を中央へ寄せる
  const activeRef = useRef<HTMLAnchorElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const nav = navRef.current
    const active = activeRef.current
    if (!nav || !active) return
    // window/ページはスクロールさせず、横スクロールする .nav コンテナだけを動かす
    const target = active.offsetLeft - (nav.clientWidth - active.clientWidth) / 2
    nav.scrollLeft = Math.max(0, target)
  }, [pathname])

  // ページ遷移でメニューを閉じる
  useEffect(() => setOpen(false), [pathname])

  // 開いている間は Escape / 外側クリックで閉じる
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [open])

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
      <div className="navwrap" ref={wrapRef}>
        {/* SP: ハンバーガー（PC では CSS で非表示）。開くと $ ls ./nav 風のドロップダウン */}
        <button
          type="button"
          className="navtoggle"
          aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '✕' : '☰'}
        </button>
        <nav
          className={`nav${open ? ' open' : ''}`}
          aria-label="メインナビゲーション"
          ref={navRef}
        >
          {NAV.map(({ label, href }) => {
            const on = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                ref={on ? activeRef : undefined}
                className={on ? 'on' : undefined}
                aria-current={on ? 'page' : undefined}
                onClick={() => setOpen(false)}
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
