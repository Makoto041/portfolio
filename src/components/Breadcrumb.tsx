'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Crumb = {
  href: string
  label: string
}

export default function Breadcrumb({
  items,
}: {
  items?: Crumb[] // propsとして渡すか、下記defaultで自動生成
}) {
  // props未指定時はURLから自動生成
  const pathname = usePathname()
  const segments = pathname?.split('/').filter(Boolean) || []

  // 「/foo/bar/baz」で [ {href:'/',label:'Home'}, {href:'/foo',label:'foo'}, ... ]
  const autoItems: Crumb[] = [
    { href: '/', label: 'Home' },
    ...segments.map((seg, i) => {
      const href = '/' + segments.slice(0, i + 1).join('/')
      // 必要ならラベルを整形（キャメル → 単語区切り など）
      const label = seg.charAt(0).toUpperCase() + seg.slice(1)
      return { href, label }
    }),
  ]

  const crumbs = items && items.length > 0 ? items : autoItems

  return (
    <nav
      aria-label="Breadcrumb"
      className="mx-auto w-full max-w-[80rem] px-5 sm:px-8 text-sm text-gray-400 mb-4"
    >
      <ol className="flex flex-wrap gap-1">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1
          return (
            <li key={crumb.href} className="flex items-center">
              {idx > 0 && <span className="px-1 select-none text-xs opacity-50">/</span>}
              <Link
                href={crumb.href}
                aria-current={isLast ? 'page' : undefined}
                className={`text-gray-400 hover:underline hover:text-gray-600 transition ${isLast ? 'font-medium' : ''}`}
              >
                {crumb.label}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
