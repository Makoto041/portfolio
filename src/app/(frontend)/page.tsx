// src/app/(frontend)/page.tsx
// タイムラインを主役にしたトップページ
export const dynamic = 'force-static'
export const revalidate = 60

import Link from 'next/link'
import { Analytics } from '@vercel/analytics/next'
import WeatherWidgetClient from '@/components/widgets/WeatherWidgetClient'
import { fetchLatest } from '@/lib/payload'
import { getActiveEvent } from '@/lib/getActiveEvent'
import { getPayloadClient } from '@/lib/payloadClient'
import ActiveEventCard from '@/components/cards/ActiveEventCard'
import HomeTimeline from '@/components/timeline/HomeTimeline'
import SideRail from '@/components/home/SideRail'
import AdminLinks from '@/components/admin/AdminLinks'
import type { TimelineDoc, MediaDoc } from '@/lib/payloadTypes'

export const metadata = {
  title: '岩渕誠（いわぶちまこと） | ライフログ',
  description:
    '岩渕誠（いわぶちまこと）の個人サイト。日記、写真、制作ログ、イベント記録など日々の記録をタイムラインで残しています。',
  openGraph: {
    title: '岩渕誠（いわぶちまこと） | ライフログ',
    description:
      '岩渕誠（いわぶちまこと）の個人サイト。日記、写真、制作ログ、イベント記録など日々の記録をタイムラインで残しています。',
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
    title: '岩渕誠（いわぶちまこと） | ライフログ',
    description:
      '岩渕誠（いわぶちまこと）の個人サイト。日記、写真、制作ログ、イベント記録など日々の記録をタイムラインで残しています。',
    images: ['https://iwabuchi-makoto.com/myicon.png'],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/',
  },
  keywords: ['岩渕誠', 'いわぶちまこと', 'Makoto Iwabuchi', 'ライフログ', '日記', '写真', '制作ログ'],
}

/** タイムライン投稿からタグを集計（出現数順・最大12件） */
function aggregateTags(timeline: TimelineDoc[]): string[] {
  const counts = new Map<string, number>()
  for (const post of timeline) {
    for (const tag of post.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag]) => tag)
}

/** site-settings グローバルからミニプロフィールを取得 */
async function fetchProfile() {
  try {
    const payload = await getPayloadClient()
    const settings = await payload.findGlobal({ slug: 'site-settings' })
    const profile = settings?.profile
    const profileImage = profile?.profileImage
    return {
      name: profile?.name,
      nameJapanese: profile?.nameJapanese,
      title: profile?.title,
      description: profile?.description,
      imageUrl:
        typeof profileImage === 'object' && profileImage?.url ? profileImage.url : null,
      socialLinks: profile?.socialLinks ?? [],
    }
  } catch (error) {
    console.error('Error fetching site settings:', error)
    return {}
  }
}

export default async function Home() {
  const [{ timeline, gallery }, activeEvent, profile] = await Promise.all([
    fetchLatest({
      timelineLimit: 8,
      mediaLimit: 12,
      includeTimelineOnly: false,
    }),
    getActiveEvent(),
    fetchProfile(),
  ])

  const tags = aggregateTags(timeline)
  const photos = gallery.filter((g: MediaDoc) => g.url || g.sizes?.thumbnail?.url)

  return (
    <main className="pb-12">
      <Analytics />

      {/* アイデンティティ（実名表記はSEOシグナルも兼ねる・群青グラデーションが個性） */}
      <header className="fade-in-up pt-10 pb-2">
        <span aria-hidden className="accent-dash mb-3 block h-1 w-10 rounded-full" />
        <h1 className="text-2xl font-bold tracking-wide sm:text-3xl">
          <span className="text-gradient">いわぶちまこと</span>
          <span className="ml-3 text-sm font-normal tracking-normal text-muted">
            岩渕誠 / Makoto Iwabuchi
          </span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          日々の記録・写真・制作物を残すライフログ
        </p>
      </header>

      {/* お知らせ（開催中イベントがある場合のみ） */}
      {activeEvent && (
        <section className="pt-4">
          <ActiveEventCard event={activeEvent} />
        </section>
      )}

      {/* タイムライン + サイドレール */}
      <div className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* メイン: タイムライン */}
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-semibold tracking-wide">Timeline</h2>
              <AdminLinks />
            </div>
            <WeatherWidgetClient />
          </div>

          <HomeTimeline timelineData={timeline} />

          <div className="mt-8 text-center">
            <Link href="/timeline" className="pill text-muted">
              もっと読む →
            </Link>
          </div>
        </section>

        {/* サイドレール（モバイルではタイムラインの下に1カラム表示） */}
        <aside>
          <div className="lg:sticky lg:top-24">
            <SideRail profile={profile} tags={tags} photos={photos} />
          </div>
        </aside>
      </div>
    </main>
  )
}
