// src/components/SideNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
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
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col justify-between w-56 p-10 sticky top-0 h-screen glass backdrop-saturate-150 text-[color:var(--fg-base)]">
      <div className="space-y-6">
        <Link href="/" className="font-semibold tracking-[0.14em] text-lg hover:opacity-90">
          IWABUCHI
        </Link>
      </div>

      <nav className="space-y-6 text-sm">
        {NAV.map(({ href, label }) => {
          const isActive = pathname === href || pathname?.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`block transition-all ${
                isActive
                  ? 'opacity-100 font-semibold'
                  : 'opacity-70 font-normal hover:opacity-100'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-4">
        {/* Theme Toggle */}
        <div className="flex justify-center">
          <ThemeToggle />
        </div>

        {/* SNS Links */}
        <div className="flex gap-5 opacity-70 justify-center">
          <a href="https://x.com/613_kmk" target="_blank" rel="noopener noreferrer" className="hover:opacity-100">
            X
          </a>
          <a href="https://instagram.com/makoto0140" target="_blank" rel="noopener noreferrer" className="hover:opacity-100">
            IG
          </a>
        </div>
      </div>
    </aside>
  )
}
