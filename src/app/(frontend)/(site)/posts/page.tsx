// src/app/(frontend)/posts/page.tsx
// ───────────────────────────────────────────
export const revalidate = 60 // ISR: 更新時は各コレクションの afterChange で on-demand 再検証

import type { Metadata } from 'next'
import { Suspense } from 'react'
import SodaPageHead from '@/components/soda/SodaPageHead'
import { OG_IMAGE, OG_IMAGE_URL } from '@/lib/seo'
import { getPayloadClient } from '@/lib/payloadClient'
import type { BlogPost } from '@/payload-types'
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

async function PostsSection() {
  let posts: BlogPost[] = []
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({ collection: 'blogPosts', limit: 50, sort: '-publishedAt', depth: 1 })
    posts = res.docs as BlogPost[]
  } catch (error) {
    console.error('Blog list fetch failed (rendering empty):', error)
  }
  return <PostsList posts={posts} />
}

export default function BlogPage() {
  return (
    <div className="s-wrap">
      <SodaPageHead en="Blog" title="ブログ" desc="考えていることを書き留めておく場所" />
      <div className="s-pbody">
        <Suspense fallback={<PostsListLoading />}>
          <PostsSection />
        </Suspense>
      </div>
    </div>
  )
}
