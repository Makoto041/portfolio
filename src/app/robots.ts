// src/app/robots.ts
// クロール可否と sitemap の場所。管理画面・API・さっと投稿・ネタページは検索に出さない
import type { MetadataRoute } from 'next'
import { SITE_ORIGIN } from '@/lib/siteUrl'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/post', '/nope'] }],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  }
}
