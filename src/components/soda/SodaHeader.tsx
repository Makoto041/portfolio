// src/components/soda/SodaHeader.tsx
// 全ページ共通の sticky ヘッダー。
// ホームでは最上部で表紙ロゴ（#soda-wordmark）が見えている間だけ帯を透明にして小ロゴを隠し、
// ロゴがヘッダーの下に隠れたら小ロゴ付きの帯に切り替える。
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SodaIcon from '@/components/soda/SodaIcon'
import { useSodaNav } from '@/components/soda/SodaNav'
import { NAV, isActive } from '@/components/soda/nav'

// PC ナビに並べる項目（ホームはロゴ、お便りは右のボタンが担う）
const HEADER_NAV = NAV.filter((n) => n.href !== '/' && n.href !== '/letter')

export default function SodaHeader({ home = false }: { home?: boolean }) {
  const pathname = usePathname() ?? '/'
  const { open } = useSodaNav()
  // SSR 時点の初期値: ホームは「最上部」扱い（透明）、それ以外は通常の帯
  const [atTop, setAtTop] = useState(home)

  useEffect(() => {
    if (!home) {
      setAtTop(false)
      return
    }
    const mark = document.getElementById('soda-wordmark')
    if (!mark || typeof IntersectionObserver === 'undefined') {
      setAtTop(false)
      return
    }
    // ヘッダーの高さ分だけ上を詰めて判定（ロゴがヘッダーの下に潜ったら切替）
    const io = new IntersectionObserver(([entry]) => setAtTop(entry.isIntersecting), {
      rootMargin: '-64px 0px 0px 0px',
    })
    io.observe(mark)
    return () => io.disconnect()
  }, [home, pathname])

  return (
    <header className={`s-hdr${atTop ? ' is-top' : ''}`}>
      <Link
        href="/"
        className="s-logo-s"
        aria-label="いわぶちまこと ホームへ"
        aria-hidden={atTop || undefined}
        tabIndex={atTop ? -1 : undefined}
      >
        MAKOTO
      </Link>
      <nav className="s-hdr-nav" aria-label="メイン">
        {HEADER_NAV.map(({ href, ja }) => {
          const on = isActive(pathname, href)
          return (
            <Link key={href} href={href} aria-current={on ? 'page' : undefined}>
              {ja}
            </Link>
          )
        })}
      </nav>
      <div className="s-hdr-right">
        <Link href="/letter" className="s-pill s-letterpill">
          <SodaIcon name="mail" />
          お便り
        </Link>
        <Link href="/letter" className="s-iconbtn s-mailbtn" aria-label="お便りを送る">
          <SodaIcon name="mail" />
        </Link>
        <button
          type="button"
          className="s-iconbtn s-menubtn"
          aria-label="メニューを開く"
          aria-haspopup="dialog"
          onClick={open}
        >
          <SodaIcon name="menu" />
        </button>
      </div>
    </header>
  )
}
