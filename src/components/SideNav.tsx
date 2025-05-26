// src/components/SideNav.tsx
'use client'

import Link from 'next/link'
import WeatherWidget from '@/components/WeatherWidget'

const NAV = [
  { label: '日記', href: '/timeline' },
  { label: 'メモ', href: '/posts' },
  { label: '写真', href: '/gallery' },
  { label: 'プロフィール', href: '/profile' },
  { label: 'お便り', href: '/letter' },
] as const

export default function SideNav() {
  return (
    <aside
      className="hidden md:flex flex-col justify-between w-56 p-10 sticky top-0 h-screen glass backdrop-saturate-150 text-[color:var(--fg-base)]"
    >
      <Link
        href="/"
        className="font-semibold tracking-[0.14em] text-lg text-[color:var(--fg-base)] hover:opacity-90 transition-opacity"
      >
        IWABUCHI
      </Link>
      {/* Weather & Date Widget */}

      <nav className="space-y-6 text-sm">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="block opacity-70 hover:opacity-100 transition-colors text-[color:var(--fg-base)]"
          >
            {n.label}
          </Link>
        ))}
      </nav>
    

      <div className="flex gap-5 opacity-70 text-[color:var(--fg-base)]">
        
        <a href="https://x.com/" target="_blank" rel="noopener noreferrer">
          X
        </a>
        <a href="https://instagram.com/makoto0140" target="_blank" rel="noopener noreferrer">
          IG
        </a>
      </div>
    </aside>
  )
}
