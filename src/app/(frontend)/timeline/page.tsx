import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumb from '@/components/layout/Breadcrumb'
import WeatherWidgetClient from '@/components/widgets/WeatherWidgetClient'
import TimelineList from '@/components/timeline/TimelineList'
import AdminLinks from '@/components/admin/AdminLinks'
import { fetchLatest } from '@/lib/payload'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'タイムライン | 岩渕誠（いわぶちまこと）',
  description: '岩渕誠の日々の活動記録。リアルタイムで更新される思考の断片や日常の出来事を時系列で公開しています。',
  keywords: ['タイムライン', '日記', '岩渕誠', 'いわぶちまこと', '日常', '活動記録'],
  authors: [{ name: 'いわぶちまこと' }],
  openGraph: {
    title: 'タイムライン | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠の日々の活動記録。リアルタイムで更新される思考の断片や日常の出来事を時系列で公開しています。',
    url: 'https://iwabuchi-makoto.com/timeline',
    siteName: 'いわぶちまこと',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: '/myicon.png',
        width: 1200,
        height: 630,
        alt: 'いわぶちまこと タイムライン',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'タイムライン | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠の日々の活動記録。リアルタイムで更新される思考の断片や日常の出来事を時系列で公開しています。',
    images: ['/myicon.png'],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/timeline',
  },
}

export default async function TimelinePage() {
  // サーバーコンポーネントで直接fetchLatest()を使用
  const { timeline } = await fetchLatest({
    timelineLimit: 100, // 全件取得
  })

  return (
    <main className="mx-auto w-full max-w-2xl pb-20">
      <div className="pt-6">
        <Breadcrumb />
      </div>

      <section className="pt-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-semibold tracking-wide">Timeline</h1>
            <AdminLinks />
          </div>
          <WeatherWidgetClient />
        </div>

        <TimelineList initialTimeline={timeline} />

        <div className="mt-16 text-center">
          <Link href="/" className="pill text-muted">
            ← TOPページへ
          </Link>
        </div>
      </section>
    </main>
  )
}