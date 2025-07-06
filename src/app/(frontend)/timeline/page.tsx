import type { Metadata } from 'next'
import Breadcrumb from '@/components/Breadcrumb'
import TimelinePageClient from '@/components/TimelinePageClient'

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

export default function TimelinePage() {
  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
      </div>
      <TimelinePageClient />
    </main>
  )
}