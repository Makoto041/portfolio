// src/components/soda/SodaDock.tsx
// SP（≤760px）だけに出す、画面下の親指で届くナビ。表示可否は CSS（.s-dock）が担う。
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SodaIcon, { type SodaIconName } from '@/components/soda/SodaIcon'
import { useSodaNav } from '@/components/soda/SodaNav'
import { isActive } from '@/components/soda/nav'

const DOCK: { href: string; label: string; icon: SodaIconName }[] = [
  { href: '/', label: 'ホーム', icon: 'home' },
  { href: '/gallery', label: '写真', icon: 'camera' },
  { href: '/posts', label: 'ブログ', icon: 'book' },
  { href: '/profile', label: 'プロフィール', icon: 'smile' },
]

export default function SodaDock() {
  const pathname = usePathname() ?? '/'
  const { open } = useSodaNav()

  return (
    <nav className="s-dock" aria-label="クイックナビ">
      {DOCK.map(({ href, label, icon }) => (
        <Link key={href} href={href} aria-current={isActive(pathname, href) ? 'page' : undefined}>
          <SodaIcon name={icon} />
          <span>{label}</span>
        </Link>
      ))}
      <button type="button" onClick={open} aria-haspopup="dialog">
        <SodaIcon name="menu" />
        <span>メニュー</span>
      </button>
    </nav>
  )
}
