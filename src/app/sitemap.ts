// src/app/sitemap.ts
// 検索エンジンに渡す URL 一覧。固定ページ + ブログ記事（DB から）。
// 記事の取得に失敗しても固定ページ分は返す（ビルド・クロールを止めない）
import type { MetadataRoute } from 'next'
import { getPayloadClient } from '@/lib/payloadClient'
import { SITE_ORIGIN } from '@/lib/siteUrl'

export const revalidate = 3600

const STATIC_PATHS: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/posts', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/timeline', priority: 0.7, changeFrequency: 'daily' },
  { path: '/profile', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/products', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/gallery', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/events', priority: 0.5, changeFrequency: 'weekly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_ORIGIN}${path === '/' ? '' : path}`,
    changeFrequency,
    priority,
  }))

  try {
    const client = await getPayloadClient()
    const { docs } = await client.find({
      collection: 'blogPosts',
      limit: 1000,
      depth: 0,
      pagination: false,
      select: { slug: true, updatedAt: true, publishedAt: true },
    })
    for (const post of docs) {
      if (typeof post.slug !== 'string' || !post.slug) continue
      entries.push({
        url: `${SITE_ORIGIN}/posts/${encodeURIComponent(post.slug)}`,
        lastModified: post.updatedAt || post.publishedAt || undefined,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
  } catch (error) {
    console.error('Failed to build sitemap posts:', error)
  }

  return entries
}
