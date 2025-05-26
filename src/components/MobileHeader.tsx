'use client'

import { useState } from 'react'
import Link from 'next/link'

import clsx from 'clsx'
import { BookText, StickyNote, Image as ImageIcon, User, Mail } from 'lucide-react'

const NAV = [
  { label: '日記', href: '/timeline', icon: BookText },
  { label: 'メモ', href: '/posts', icon: StickyNote },
  { label: '写真', href: '/gallery', icon: ImageIcon },
  { label: 'プロフィール', href: '/profile', icon: User },
  { label: 'お便り', href: '/letter', icon: Mail },
] as const

export default function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* ── Top bar ───────────────────────────── */}
      <header
        className="md:hidden sticky top-0 z-40 h-14 px-4 flex items-center justify-between
             rounded-b-[var(--radius-m)] backdrop-blur-[var(--blur-m)]
             border-b border-[color:var(--glass-border)]
             bg-[color:var(--bg-base)/.85] text-[color:var(--fg-base)]
             shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      >
        <Link
          href="/"
          className="font-semibold tracking-[0.14em] text-[color:var(--fg-base)] hover:opacity-90 transition-opacity"
        >
          IWABUCHI
        </Link>
        {/* hamburger */}
        <button
          aria-label="open menu"
          onClick={() => setOpen(!open)}
          className="relative w-8 h-8"
        >
          {/* top line */}
          <span
            className={clsx(
              'absolute left-0 top-1 block w-full h-[2px] rounded-sm bg-current transition-transform duration-300',
              open && 'rotate-45 translate-y-[8px]'
            )}
          />
          {/* middle line */}
          <span
            className={clsx(
              'absolute left-0 top-1/2 -translate-y-1/2 block w-full h-[2px] rounded-sm bg-current transition-all duration-300',
              open && 'opacity-0'
            )}
          />
          {/* bottom line */}
          <span
            className={clsx(
              'absolute left-0 bottom-1 block w-full h-[2px] rounded-sm bg-current transition-transform duration-300',
              open && '-rotate-45 -translate-y-[8px]'
            )}
          />
        </button>
      </header>

      {/* ── Drawer ────────────────────────────── */}
      {open && (
        <nav
          className={clsx(
            'fixed inset-0 z-40 bg-[color:var(--bg-base)/.7] backdrop-blur-sm',
            'transition-opacity duration-300', // フェード
            open ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          onClick={() => setOpen(false)}
        >
          <ul
            className={clsx(
              'absolute top-14 left-0 w-64 h-[calc(100%-3.5rem)] p-8',
              'bg-[color:var(--bg-base)/.9] rounded-r-2xl shadow-2xl flex flex-col gap-6',
              'transition-transform duration-300', // スライド
              open ? 'translate-x-0' : '-translate-x-full',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {NAV.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center text-lg py-1.5 font-medium tracking-wide
                             text-[color:var(--fg-base)] hover:opacity-90 transition-opacity"
                  onClick={() => setOpen(false)}
                >
                  <Icon size={18} className="inline mr-2" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  )
}
