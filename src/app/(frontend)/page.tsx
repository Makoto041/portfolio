// src/app/(frontend)/page.tsx
export const dynamic = 'force-static'
export const revalidate = 60

import Link from 'next/link'
import { Analytics } from '@vercel/analytics/next'
import WeatherWidgetClient from '@/components/WeatherWidgetClient'
import { fetchLatest } from '@/lib/payload'
import { getActiveEvent } from '@/lib/getActiveEvent'
import ActiveEventCard from '@/components/ActiveEventCard'
import type { TimelineDoc, MediaDoc, BlogPost } from '@/lib/payloadTypes'
import type { Event } from '@/payload-types'
import Breadcrumb from '@/components/Breadcrumb'
import MemoGrid from '@/components/MemoGrid'
import GalleryGrid from '@/components/GalleryGrid'
import HomeTimeline from '@/components/HomeTimeline'

export const metadata = {
  title: 'いわぶちまこと - ポートフォリオ',
  description: 'Web制作・開発・UI/UXが得意な岩渕誠のポートフォリオサイトです。',
  openGraph: {
    title: 'いわぶちまこと - ポートフォリオ',
    description: 'Web制作・開発・UI/UXが得意な岩渕誠のポートフォリオサイトです。',
    url: 'https://iwabuchi-makoto.com',
    siteName: 'いわぶちまこと',
    locale: 'ja_JP',
    images: [
      {
        url: 'https://iwabuchi-makoto.com/myicon.png',
        width: 1200,
        height: 630,
        alt: 'OGP画像 - いわぶちまこと',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'いわぶちまこと - ポートフォリオ',
    description: 'Web制作・開発・UI/UXが得意な岩渕誠のポートフォリオサイトです。',
    images: ['https://iwabuchi-makoto.com/myicon.png'],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/',
  },
  keywords: ['いわぶちまこと', '岩渕誠', 'Web制作', '開発', 'UI/UX', 'ポートフォリオ'],
}

const WRAP = 'mx-auto w-full max-w-[58rem] px-5 sm:px-8'
const CARD = 'glass rounded-lg overflow-hidden'

// ======================== UIコンポーネント =========================
function HomeUI({
  timeline,
  posts,
  gallery,
  activeEvent,
}: {
  timeline: TimelineDoc[]
  posts: BlogPost[]
  gallery: MediaDoc[]
  activeEvent: Event | null
}) {
  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <h1 className="sr-only">いわぶちまことポートフォリオ</h1>
      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
        <Analytics />
      </div>

      {/* お知らせセクション（イベントがある場合のみ） */}
      {activeEvent && (
        <section className={`${WRAP} pt-6 md:pt-10`}>
          <ActiveEventCard event={activeEvent} cardClass={CARD} />
        </section>
      )}

      {/* Timeline */}
      <section className={`${WRAP} py-12`}>
        <div className="flex items-center justify-between mb-6">
          <WeatherWidgetClient />
        </div>

        <HomeTimeline timelineData={timeline} cardClass={CARD} />

        <Link
          href="/timeline"
          className="mt-10 inline-block text-sm text-gray-400 hover:text-gray-600 underline"
        >
          もっと読む →
        </Link>
      </section>

      {/* Blog & Gallery */}
      <section className={`${WRAP} grid gap-8 md:grid-cols-2 mb-16`}>
        <MemoGrid posts={posts} />
        <GalleryGrid gallery={gallery} />
      </section>
    </main>
  )
}

// ======================== ページ本体 =========================
export default async function Home() {
  const [{ timeline, posts, gallery }, activeEvent] = await Promise.all([
    fetchLatest({
      timelineLimit: 5,
      mediaLimit: 10,
      includeTimelineOnly: false,
    }),
    getActiveEvent(),
  ])

  const latestPost: BlogPost | null = posts[0] ?? null

  // ブログの表紙画像を除外
  const filteredGallery = gallery.filter((g: MediaDoc) => {
    const url = g.url ?? g.image?.url
    return url !== latestPost?.coverImage?.url
  })

  return (
    <HomeUI timeline={timeline} posts={posts} gallery={filteredGallery} activeEvent={activeEvent} />
  )
}
