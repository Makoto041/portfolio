import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumb from '@/components/Breadcrumb'
import WeatherWidgetClient from '@/components/WeatherWidgetClient'
import TimelineList from '@/components/TimelineList'
import { fetchLatest } from '@/lib/payload'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'タイムライン | いわぶちまこと',
  description: '岩渕誠の日々の活動記録。リアルタイムで更新される思考の断片や日常の出来事を時系列で公開しています。',
  keywords: ['タイムライン', '日記', '岩渕誠', 'いわぶちまこと', '日常', '活動記録'],
  authors: [{ name: 'いわぶちまこと' }],
  openGraph: {
    title: 'タイムライン | いわぶちまこと',
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
    title: 'タイムライン | いわぶちまこと',
    description: '岩渕誠の日々の活動記録。リアルタイムで更新される思考の断片や日常の出来事を時系列で公開しています。',
    images: ['/myicon.png'],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/timeline',
  },
}

const WRAP = 'mx-auto w-full max-w-[58rem] px-5 sm:px-8 section-pad'

export default async function TimelinePage() {
  // サーバーコンポーネントで直接fetchLatest()を使用
  const { timeline } = await fetchLatest({
    timelineLimit: 100, // 全件取得
  })

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
      </div>

      <section className={`${WRAP} py-12`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold">Timeline</h1>
          <WeatherWidgetClient />
        </div>

        <TimelineList initialTimeline={timeline} />

        <div className="text-center mt-20">
          <Link href="/" className="text-sm underline">
            ← TOPページへ
          </Link>
        </div>
      </section>
    </main>
  )
}