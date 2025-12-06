'use client'

import { useState } from 'react'
import Link from 'next/link'

import clsx from 'clsx'
import { BookText, StickyNote, Image as ImageIcon, User, Mail, Disc3, Pen } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

const NAV = [
  { label: 'Timeline', href: '/timeline', icon: BookText },
  { label: 'Blog', href: '/posts', icon: StickyNote },
  { label: 'Gallery', href: '/gallery', icon: ImageIcon },
  { label: 'Events', href: '/in_event', icon: Disc3 }, // DJ系
  { label: 'Products', href: '/products', icon: Pen }, // ペンマーク
  { label: 'Profile', href: '/profile', icon: User },
  { label: 'Letter', href: '/letter', icon: Mail },
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
             bg-[color:var(--bg-base)] drop-shadow-lg
             shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
      >
        <Link
          href="/"
          className="font-semibold tracking-[0.14em] text-[color:var(--fg-base)] hover:opacity-90 transition-opacity"
        >
          IWABUCHI
        </Link>

        {/* Right side: Theme toggle + Hamburger */}
        <div className="flex items-center gap-3">
          <ThemeToggle variant="mobile" />

          {/* hamburger */}
          <button
            aria-label="open menu"
            onClick={() => setOpen(!open)}
            className="relative w-8 h-8 text-[color:var(--fg-base)]"
          >
          {/* top line */}
          <span
            className={clsx(
              'absolute left-0 top-1 block w-full h-[2px] rounded-sm bg-current transition-transform duration-300',
              open && 'rotate-45 translate-y-[8px]',
            )}
          />
          {/* middle line */}
          <span
            className={clsx(
              'absolute left-0 top-1/2 -translate-y-1/2 block w-full h-[2px] rounded-sm bg-current transition-all duration-300',
              open && 'opacity-0',
            )}
          />
          {/* bottom line */}
          <span
            className={clsx(
              'absolute left-0 bottom-1 block w-full h-[2px] rounded-sm bg-current transition-transform duration-300',
              open && '-rotate-45 -translate-y-[8px]',
            )}
          />
          </button>
        </div>
      </header>

      {/* ── Drawer ────────────────────────────── */}
      {open && (
        <nav
          className={clsx(
            'fixed inset-0 z-40 bg-gray-600/30 backdrop-blur-md',
            'transition-opacity duration-300', // フェード
            open ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
          onClick={() => setOpen(false)}
        >
          <ul
            className={clsx(
              'absolute top-14 left-0 w-64 h-[calc(100%-3.5rem)] p-8',
              'bg-[color:var(--bg-base)] backdrop-blur-lg rounded-r-2xl shadow-2xl flex flex-col gap-6',
              'border-r border-[color:var(--glass-border)]',
              'transition-transform duration-300', // スライド
              open ? 'translate-x-0' : '-translate-x-full',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {NAV.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center text-lg py-1.5 font-medium tracking-wide text-[color:var(--fg-base)] hover:opacity-90 transition-opacity"
                  onClick={() => setOpen(false)}
                >
                  <Icon size={18} className="inline mr-2" />
                  {label}
                </Link>
              </li>
            ))}
            {/* SNSリンクを下部に追加 */}
            <li className="mt-8 flex gap-6 opacity-70">
              <a
                href="https://x.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--fg-base)] hover:opacity-100"
              >
                X
              </a>
              <a
                href="https://instagram.com/makoto0140"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--fg-base)] hover:opacity-100"
              >
                IG
              </a>
            </li>
          </ul>
        </nav>
      )}
    </>
  )
}
