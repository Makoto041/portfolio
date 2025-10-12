// ───────────────────────────────────────────
// src/app/(frontend)/gallery/page.tsx
// ───────────────────────────────────────────

import type { Metadata } from 'next'
import Breadcrumb from '@/components/Breadcrumb'
import { fetchLatest } from '@/lib/payload'
import GalleryGrid from '@/components/GalleryGridMain'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'ギャラリー | いわぶちまこと',
  description: '岩渕誠の写真ギャラリー。日常の風景や旅行の思い出、気になる瞬間を切り取った写真を公開しています。',
  keywords: ['ギャラリー', '写真', '岩渕誠', 'いわぶちまこと', '日常', '風景', '旅行'],
  authors: [{ name: 'いわぶちまこと' }],
  openGraph: {
    title: 'ギャラリー | いわぶちまこと',
    description: '岩渕誠の写真ギャラリー。日常の風景や旅行の思い出、気になる瞬間を切り取った写真を公開しています。',
    url: 'https://iwabuchi-makoto.com/gallery',
    siteName: 'いわぶちまこと',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: '/myicon.png',
        width: 1200,
        height: 630,
        alt: 'いわぶちまこと ギャラリー',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ギャラリー | いわぶちまこと',
    description: '岩渕誠の写真ギャラリー。日常の風景や旅行の思い出、気になる瞬間を切り取った写真を公開しています。',
    images: ['/myicon.png'],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/gallery',
  },
}

export default async function GalleryPage() {
  // サーバーコンポーネント内でデータ取得
  // includeTimelineOnly=falseでタイムライン専用画像をサーバー側で除外
  const { gallery } = await fetchLatest({
    mediaLimit: 100,
    includeTimelineOnly: false
  })

  return (
    <main className="min-h-screen flex flex-col">
      {/* パンくず */}
      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
      </div>

      {/* セクションラップ */}
      <section className="mx-auto w-full max-w-[58rem] px-5 sm:px-8 section-pad">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">Gallery</h1>
        </div>

        {/* サーバーサイドでフィルタリング済みのギャラリーデータを使用 */}
        <GalleryGrid gallery={gallery} />
      </section>
    </main>
  )
}
