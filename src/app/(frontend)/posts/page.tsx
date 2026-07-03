// src/app/(frontend)/posts/page.tsx
// ───────────────────────────────────────────
export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import { fetchLatest } from '@/lib/payload'
import { Suspense } from 'react'
import PostsList from './PostsList'
import PostsListLoading from './PostsListLoading'

export const metadata: Metadata = {
  title: 'ブログ | 岩渕誠（いわぶちまこと）',
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
    images: [
      {
        url: '/myicon.png',
        width: 1200,
        height: 630,
        alt: 'いわぶちまこと ブログ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ブログ | 岩渕誠（いわぶちまこと）',
    description: '岩渕誠のブログ記事一覧。日々の考えや学習記録、技術的な話題について書き留めています。',
    images: ['/myicon.png'],
  },
  alternates: {
    canonical: 'https://iwabuchi-makoto.com/posts',
  },
}

const WRAP = 'section-pad'

export default async function BlogPage() {
  // blogLimit: 10 件取得
  const { posts } = await fetchLatest({ blogLimit: 10 })

  return (
    <main className="min-h-screen flex flex-col">      <section className={WRAP}>
        <h1 className="text-2xl font-semibold tracking-wide mb-2">Blog</h1>
        <p className="mb-8 opacity-80">考えていることを書き留めておく場所</p>
        {/* Suspense でラップ！ */}
        <Suspense fallback={<PostsListLoading />}>
          <PostsList posts={posts} />
        </Suspense>
      </section>
    </main>
  )
}
