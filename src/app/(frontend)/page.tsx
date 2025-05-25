// src/app/(frontend)/page.tsx
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from 'next/link'
import { Analytics } from '@vercel/analytics/next'
import WeatherWidget from '@/components/WeatherWidget'
import { fetchLatest } from '@/lib/payload'
import type { TimelineDoc, MediaDoc, BlogPost } from '@/lib/payloadTypes'
import Breadcrumb from '@/components/Breadcrumb'
import MemoGrid from '@/components/MemoGrid'
import GalleryGrid from '@/components/GalleryGrid'
import LocalDate from '@/components/LocalDate'

const WRAP = 'mx-auto w-full max-w-[58rem] px-5 sm:px-8'
const CARD = 'glass rounded-lg overflow-hidden'

export default async function Home() {
  const { timeline, posts, gallery } = await fetchLatest({
    timelineLimit: 5,
    mediaLimit: 10,
  })
  const latestPost: BlogPost | null = posts.length > 0 ? posts[0] : null
  const filteredGallery = gallery.filter((g: MediaDoc) => {
    const url = g.url ?? g.image?.url
    return url && url !== latestPost?.coverImage?.url
  })

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
      </div>
      {/* Timeline */}
      <section className={`${WRAP} py-12`}>
        <div className="flex items-center justify-between mb-6">
         
          <WeatherWidget />
        </div>
        <ul className="space-y-4">
          {timeline.map((t: TimelineDoc) => (
            <li key={t.id} className={`${CARD} p-4`}>
              <time className="block text-xs opacity-60 mb-1">
  <LocalDate dateStr={t.publishedAt ?? t.createdAt} formatType="auto" />
</time>
              <p className="text-sm leading-relaxed">{t.text}</p>
            </li>
          ))}
        </ul>
        <Link
          href="/timeline"
          className="mt-10 inline-block text-sm text-gray-400 hover:text-gray-600 underline"
        >
          もっと読む →
        </Link>
      </section>

      {/* Memo & Gallery部分だけクライアントコンポーネントに渡す */}
      <section className={`${WRAP} grid gap-8 md:grid-cols-2 mb-16`}>
        <MemoGrid posts={posts} />
        <GalleryGrid gallery={filteredGallery} />
      </section>
    </main>
  )
}
