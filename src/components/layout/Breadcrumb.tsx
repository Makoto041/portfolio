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

  // トップページでは表示しない（レイアウト層から全ページ共通で描画されるため）
  if (segments.length === 0) return null

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

  // 検索結果にパンくずを表示させるための構造化データ
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: crumb.label,
      item: `https://iwabuchi-makoto.com${crumb.href === '/' ? '' : crumb.href}`,
    })),
  }

  return (
    // レイアウト層の統一コンテナ直下に置かれるため、全ページで同一位置に表示される
    <nav aria-label="Breadcrumb" className="pt-6 text-[13px] text-muted">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1
          return (
            <li key={crumb.href} className="flex items-center">
              {idx > 0 && <span className="px-1 select-none text-xs opacity-50">/</span>}
              <Link
                href={crumb.href}
                aria-current={isLast ? 'page' : undefined}
                className={`transition-opacity hover:opacity-70 ${
                  isLast ? 'font-medium opacity-100' : 'opacity-80'
                }`}
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
