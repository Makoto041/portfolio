// ───────────────────────────────────────────
// src/lib/payload.ts
// ───────────────────────────────────────────
import { getPayloadClient } from './payloadClient'
import type { TimelineDoc, MediaDoc, BlogPost } from './payloadTypes'

type LatestOpts = {
  timelineLimit?: number
  blogLimit?: number
  mediaLimit?: number
  /** タイムライン専用画像を取得するかどうか */
  includeTimelineOnly?: boolean
}

export async function fetchLatest({
  timelineLimit = 5,
  blogLimit = 5,
  mediaLimit = 1,
  includeTimelineOnly = false, // デフォルトでタイムライン専用画像を除外
}: LatestOpts = {}) {
  const payload = await getPayloadClient()

  // タイムライン専用画像を除外するクエリ条件を構築
  const mediaWhere: any = {}
  
  // includeTimelineOnlyがfalseの場合、タイムライン専用画像を除外
  if (!includeTimelineOnly) {
    mediaWhere.isTimelineOnly = { equals: false }
  }
  
  const [tRes, bRes, mRes] = await Promise.all([
    payload.find({ collection: 'timeline', limit: timelineLimit, sort: '-publishedAt' }),
    payload.find({ collection: 'blogPosts', limit: blogLimit, sort: '-publishedAt' }),
    payload.find({ 
      collection: 'media', 
      limit: mediaLimit, 
      sort: '-publishedAt',
      where: mediaWhere,
    }),
  ])

  /* ──── timeline ───────────────────────── */
  const timeline: TimelineDoc[] = tRes.docs.length
    ? (tRes.docs as unknown as TimelineDoc[])
    : [
        {
          id: 'dummy-timeline',
          text: '📝 まだ投稿がありません。',
          createdAt: new Date().toISOString(),
        },
      ]

  /* ──── posts（旧 blog）────────────────── */
  const posts: BlogPost[] = bRes.docs.length ? (bRes.docs as unknown as BlogPost[]) : []

  /* ──── gallery ───────────────────────── */
  const gallery: MediaDoc[] = mRes.docs.length
    ? (mRes.docs as unknown as MediaDoc[])
    : [
        {
          id: 'dummy-media',
          url: '/default.jpg',
          createdAt: new Date().toISOString(),
        },
      ]

  return { timeline, posts, gallery }
}
