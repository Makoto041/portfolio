// src/components/layout/SiteFooter.tsx
// グラス風フッター（実名表記はSEO・E-E-A-Tシグナルも兼ねる）
import Link from 'next/link'

const FOOTER_NAV = [
  { label: 'Timeline', href: '/timeline' },
  { label: 'Posts', href: '/posts' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Products', href: '/products' },
  { label: 'Profile', href: '/profile' },
  { label: 'Letter', href: '/letter' },
] as const

export default function SiteFooter() {
  return (
    <footer className="mx-auto mt-8 w-full max-w-5xl px-4 pb-8 sm:px-6">
      <div className="glass rounded-2xl px-6 py-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold tracking-wide">
              岩渕誠<span className="ml-1.5 text-xs font-normal text-muted">いわぶちまこと / Makoto Iwabuchi</span>
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              日々の記録・写真・制作物を残す個人のライフログサイト
            </p>
            <div className="mt-3 flex justify-center gap-4 text-xs sm:justify-start">
              <a
                href="https://x.com/613_kmk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted transition-opacity hover:opacity-70"
              >
                X
              </a>
              <a
                href="https://instagram.com/makoto0140"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted transition-opacity hover:opacity-70"
              >
                Instagram
              </a>
              <a
                href="https://github.com/Makoto041"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted transition-opacity hover:opacity-70"
              >
                GitHub
              </a>
            </div>
          </div>

          <nav aria-label="フッターナビゲーション" className="grid grid-cols-3 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
            {FOOTER_NAV.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-muted transition-opacity hover:opacity-70"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-5 border-t border-[color:var(--glass-border)] pt-4 text-center text-[11px] text-muted sm:text-left">
          © {new Date().getFullYear()} Makoto Iwabuchi
        </p>
      </div>
    </footer>
  )
}
