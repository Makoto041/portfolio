import Image from 'next/image'
import Link from 'next/link'

import { fetchLatest } from '@/lib/payload'
import WeatherWidget from '@/components/WeatherWidget'

/* ---------- CONST ---------- */
const GLASS = 'glass mask-stripe'
const CONTAINER = 'mx-auto max-w-7xl px-6 lg:px-8'
const NAV = [
  { label: '日記', href: '/' },
  { label: 'メモ', href: '/memo' },
  { label: 'わたしについて', href: '/profile' },
  { label: 'お便りを送る', href: '/letter' },
] as const

/* ---------- SHARED UI ---------- */
function Social({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      className="hover:text-[color:var(--brand-600)] transition dark:hover:text-sky-400"
    >
      {label}
    </a>
  )
}

function SiteHeader() {
  return (
    <header className={`sticky top-0 z-30 w-full border-b border-white/40 shadow-md ${GLASS}`}>
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-widest">
          いわぶち
        </Link>

        <nav className="hidden md:flex gap-6 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="hover:text-[color:var(--brand-600)] transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex gap-4">
          <Social href="https://x.com/asanorina_" label="X" />
          <Social href="https://instagram.com/asanorina_" label="Instagram" />
        </div>
      </div>
    </header>
  )
}

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <header className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <Link href={href} className="text-[color:var(--brand-600)]">
        もっと見る →
      </Link>
    </header>
  )
}

/* ---------- PAGE ---------- */
export default async function Home() {
  const { timeline, blog, gallery } = await fetchLatest({
    timelineLimit: 5,
    mediaLimit: 1,
  })

  const heroImg = gallery?.[0]?.url ?? gallery?.[0]?.image?.url ?? '/no-image.png'

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* MAIN GRID ------------------------------------------------ */}
      <div className={`${CONTAINER} flex flex-col lg:flex-row gap-10 section-pad`}>
        {/* ==== TIMELINE ========================================= */}
        <section className="relative flex-1 min-w-0">
          {/* 右上ウィジェット */}
          <WeatherWidget />

          <SectionHead title="Timeline" href="/timeline" />

          <ul className="space-y-6">
            {timeline.map((item: any) => (
              <li key={item.id} className={`${GLASS} p-6`}>
                <time className="block text-xs tracking-widest text-zinc-500 mb-2">
                  {new Date(item.publishedAt ?? item.createdAt).toLocaleDateString()}
                </time>
                <p className="whitespace-pre-wrap leading-relaxed">{item.text}</p>
              </li>
            ))}
          </ul>

          <Link href="/timeline" className="mt-8 inline-block text-[color:var(--brand-600)]">
            もっと読む →
          </Link>
        </section>

        {/* ==== SIDE RAIL ======================================= */}
        <aside className="rail-width flex flex-col gap-12 shrink-0">
          {blog && (
            <article className={`${GLASS} p-6`}>
              <h3 className="text-lg font-semibold mb-2 line-clamp-2">{blog.title}</h3>
              <p className="text-sm text-zinc-600 line-clamp-3 mb-4">{blog.excerpt}</p>
              <Link
                href={blog.slug ? `/blog/${blog.slug}` : '/blog'}
                className="text-sm font-medium text-[color:var(--brand-600)]"
              >
                続きを読む →
              </Link>
            </article>
          )}

          <div className={`${GLASS} overflow-hidden`}>
            <Image
              src={heroImg}
              alt="Latest media"
              width={640}
              height={420}
              className="w-full h-auto aspect-video object-cover"
              unoptimized
            />
            <Link
              href="/gallery"
              className="block text-center py-3 text-sm font-medium text-[color:var(--brand-600)]"
            >
              ギャラリー →
            </Link>
          </div>
        </aside>
      </div>

      {/* FOOTER -------------------------------------------------- */}
      <footer className="mt-auto py-16 border-t border-white/40 glass">
        <div
          className={`${CONTAINER} flex flex-col md:flex-row gap-8 items-center justify-between text-sm text-zinc-500`}
        >
          <div className="flex gap-6">
            <Social href="https://github.com/your" label="GitHub" />
            <Social href="https://twitter.com/your" label="X" />
            <Social href="https://zenn.dev/your" label="Zenn" />
          </div>
          <small>© 2025 Makoto Iwabuchi</small>
        </div>
      </footer>
    </main>
  )
}
