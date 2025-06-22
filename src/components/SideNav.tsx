// src/components/SideNav.tsx
'use client'

import Link from 'next/link'
const NAV = [
  { label: 'Timeline', href: '/timeline' },
  { label: 'Blog', href: '/posts' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Events', href: '/in_event' }, // ★追加
  { label: 'Products', href: '/products' }, // ★追加
  { label: 'Profile', href: '/profile' },
  { label: 'Letter', href: '/letter' },
] as const

export default function SideNav() {
  return (
    <aside className="hidden md:flex flex-col justify-between w-56 p-10 sticky top-0 h-screen glass backdrop-saturate-150 text-[color:var(--fg-base)]">
      <Link href="/" className="font-semibold tracking-[0.14em] text-lg hover:opacity-90">
        IWABUCHI
      </Link>

      <nav className="space-y-6 text-sm">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href} className="block opacity-70 hover:opacity-100">
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex gap-5 opacity-70">
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
