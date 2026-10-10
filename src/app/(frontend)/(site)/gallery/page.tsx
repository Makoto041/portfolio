// ───────────────────────────────────────────
// src/app/(frontend)/gallery/page.tsx
// ───────────────────────────────────────────

import SodaPageHead from '@/components/soda/SodaPageHead'
import type { Metadata } from 'next'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'
import { fetchLatest } from '@/lib/payload'
import GalleryGrid from '@/components/gallery/GalleryGridMain'
import { getTodayData } from '@/features/site/getTodayData'

export const revalidate = 60 // ISR: 更新時は各コレクションの afterChange で on-demand 再検証

export const metadata: Metadata = {
  // template が「| 岩渕誠（いわぶちまこと）」を付与するためページ名のみ
  title: 'ギャラリー',
  description: '岩渕誠の写真ギャラリー。日常の風景や旅行の思い出、気になる瞬間を切り取った写真を公開しています。',
  keywords: ['ギャラリー', '写真', '岩渕誠', 'いわぶちまこと', '日常', '風景', '旅行'],
  authors: [{ name: 'いわぶちまこと' }],
  openGraph: {
    title: 'ギャラリー | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠の写真ギャラリー。日常の風景や旅行の思い出、気になる瞬間を切り取った写真を公開しています。',
    url: 'https://iwabuchi-makoto.com/gallery',
    siteName: 'いわぶちまこと',
    locale: 'ja_JP',
    type: 'website',
    // og:image は /og（1200×630 生成）を明示指定
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ギャラリー | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠の写真ギャラリー。日常の風景や旅行の思い出、気になる瞬間を切り取った写真を公開しています。',
    images: [OG_IMAGE_URL],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/gallery',
  },
}

export default async function GalleryPage() {
  // タイムライン専用画像はサーバー側で除外（includeTimelineOnly=false）
  const [{ gallery }, today] = await Promise.all([
    fetchLatest({ mediaLimit: 100, includeTimelineOnly: false }),
    getTodayData(),
  ])
  // 取得失敗・0件時のダミー画像は出さず、空状態の文言にする
  const photos = gallery.filter((m) => m.id !== 'dummy-media' && m.id !== 'error-media')
  const count = Math.max(today.stats.photos, photos.length)

  return (
    <div className="s-wrap">
      <SodaPageHead en="Photos" title="写真" desc={`写真のアーカイブ · ${count}枚`} />
      <div className="s-pbody">
        <GalleryGrid gallery={photos} />
      </div>
    </div>
  )
}
