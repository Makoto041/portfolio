// src/components/layout/GlassNav.tsx
// 上部固定のグラス風ナビゲーション（デスクトップ・モバイル共用）
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import ThemeToggle from '@/components/ThemeToggle'

const NAV = [
  { label: 'Timeline', href: '/timeline' },
  { label: 'Posts', href: '/posts' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Events', href: '/events' },
  { label: 'Products', href: '/products' },
  { label: 'Profile', href: '/profile' },
  { label: 'Letter', href: '/letter' },
] as const

export default function GlassNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 pb-2 sm:px-6">
      <div className="glass mx-auto flex h-12 max-w-4xl items-center justify-between rounded-full px-5">
        {/* ブランド（群青グラデーションのドットがシグネチャー） */}
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-[0.18em] text-[color:var(--fg-base)] hover:opacity-80 transition-opacity"
          onClick={() => setOpen(false)}
        >
          <span aria-hidden className="accent-dash h-2.5 w-2.5 rounded-full" />
          IWABUCHI
        </Link>

        {/* デスクトップナビ */}
        <nav className="hidden items-center gap-1.5 md:flex">
          {NAV.map(({ href, label }) => {
            const isActive = pathname === href || pathname?.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'rounded-full px-3 py-1 text-[13px] tracking-wide transition-all duration-200',
                  isActive
                    ? 'bg-[color:var(--accent)] font-semibold text-[color:var(--accent-contrast)] shadow-sm'
                    : 'opacity-65 hover:bg-[color:var(--chip-bg)] hover:opacity-100',
                )}
              >
                {label}
              </Link>
            )
          })}
          <span className="ml-2">
            <ThemeToggle />
          </span>
        </nav>

        {/* モバイル：テーマ切替＋ハンバーガー */}
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle variant="mobile" />
          <button
            aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(!open)}
            className="relative h-7 w-7 text-[color:var(--fg-base)]"
          >
            <span
              className={clsx(
                'absolute left-1 right-1 top-2 block h-[1.5px] rounded-sm bg-current transition-transform duration-300',
                open && 'translate-y-[5px] rotate-45',
              )}
            />
            <span
              className={clsx(
                'absolute left-1 right-1 top-1/2 block h-[1.5px] -translate-y-1/2 rounded-sm bg-current transition-opacity duration-300',
                open && 'opacity-0',
              )}
            />
            <span
              className={clsx(
                'absolute bottom-2 left-1 right-1 block h-[1.5px] rounded-sm bg-current transition-transform duration-300',
                open && '-translate-y-[5px] -rotate-45',
              )}
            />
          </button>
        </div>
      </div>

      {/* モバイルドロップダウン */}
      {open && (
        <nav
          id="mobile-menu"
          className="glass fade-in-up mx-auto mt-2 max-w-4xl rounded-2xl p-4 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV.map(({ href, label }) => {
              const isActive = pathname === href || pathname?.startsWith(href + '/')
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className={clsx(
                      'block rounded-xl px-3 py-2 text-sm tracking-wide transition-colors',
                      isActive
                        ? 'bg-[color:var(--accent)] font-semibold text-[color:var(--accent-contrast)]'
                        : 'opacity-75 hover:opacity-100',
                    )}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </header>
  )
}
