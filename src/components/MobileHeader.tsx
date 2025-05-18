'use client'

import { useState } from 'react'
import Link from 'next/link'

const NAV = [
  { label: '日記', href: '/timeline' },
  { label: 'メモ', href: '/posts' },
  { label: '写真', href: '/gallery' },
  { label: 'プロフィール', href: '/profile' },
  { label: 'お便り', href: '/letter' },
] as const

export default function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* ── Top bar ───────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 glass h-14 px-4 flex items-center justify-between backdrop-saturate-150">
        <Link href="/" className="font-semibold tracking-[0.14em]">
          IWABUCHI
        </Link>

        {/* hamburger */}
        <button
          aria-label="open menu"
          onClick={() => setOpen(!open)}
          className="w-8 h-8 flex flex-col justify-between py-1.5"
        >
          <span className="block w-full h-[2px] bg-current rounded-sm" />
          <span className="block w-full h-[2px] bg-current rounded-sm" />
          <span className="block w-full h-[2px] bg-current rounded-sm" />
        </button>
      </header>

      {/* ── Drawer ────────────────────────────── */}
      {open && (
        <nav
          className="fixed inset-0 z-40 bg-white/80 backdrop-blur-sm" // ← 白系半透明＋ぼかし
          onClick={() => setOpen(false)}
        >
          <ul
            className="absolute top-14 left-0 w-64 h-[calc(100%-3.5rem)]
                 p-8 bg-white/95 rounded-r-2xl shadow-xl flex flex-col gap-6 text-black"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className="block text-lg py-1.5 font-semibold"
                  onClick={() => setOpen(false)}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  )
}
