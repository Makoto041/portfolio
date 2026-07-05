// src/app/(frontend)/posts/page.tsx
// ───────────────────────────────────────────
export const revalidate = 60 // ISR: 更新時は各コレクションの afterChange で on-demand 再検証

import type { Metadata } from 'next'
import MistPageHead from '@/components/mist/MistPageHead'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'
import { fetchLatest } from '@/lib/payload'
import { Suspense } from 'react'
import PostsList from './PostsList'
import PostsListLoading from './PostsListLoading'

export const metadata: Metadata = {
  // template（root layout）が「 | 岩渕誠（いわぶちまこと）」を付与するためページ名のみ
  title: 'ブログ',
  description: '岩渕誠のブログ記事一覧。日々の考えや学習記録、技術的な話題について書き留めています。',
  keywords: ['ブログ', '岩渕誠', 'いわぶちまこと', '技術', '学習', '考え'],
  authors: [{ name: 'いわぶちまこと' }],
  openGraph: {
    title: 'ブログ | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠のブログ記事一覧。日々の考えや学習記録、技術的な話題について書き留めています。',
    url: 'https://iwabuchi-makoto.com/posts',
    siteName: 'いわぶちまこと',
    locale: 'ja_JP',
    type: 'website',
    // og:image は /og（1200×630 生成）を明示指定
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ブログ | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠のブログ記事一覧。日々の考えや学習記録、技術的な話題について書き留めています。',
    images: [OG_IMAGE_URL],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/posts',
  },
}

export default async function BlogPage() {
  // blogLimit: 10 件取得
  const { posts } = await fetchLatest({ blogLimit: 10 })

  return (
    <main className="content">
      <MistPageHead cmd="cat ./posts" title="Blog" desc="考えていることを書き留めておく場所" />
      {/* Suspense でラップ！ */}
      <Suspense fallback={<PostsListLoading />}>
        <PostsList posts={posts} />
      </Suspense>
    </main>
  )
}
