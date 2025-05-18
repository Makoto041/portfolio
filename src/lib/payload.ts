// ───────────────────────────────────────────
// src/lib/payload.ts
// ───────────────────────────────────────────
import { getPayloadClient } from './payloadClient'
import type { TimelineDoc, MediaDoc, BlogPost } from './payloadTypes'

type LatestOpts = {
  timelineLimit?: number
  blogLimit?: number // ← 追加
  mediaLimit?: number
}

export async function fetchLatest({
  timelineLimit = 5,
  blogLimit = 5,
   // ← 追加
  mediaLimit = 1,
}: LatestOpts = {}) {
  const payload = await getPayloadClient()

  const [tRes, bRes, mRes] = await Promise.all([
    payload.find({ collection: 'timeline', limit: timelineLimit, sort: '-publishedAt' }),
    payload.find({ collection: 'blogPosts', limit: blogLimit, sort: '-publishedAt' }), // ← blogLimit
    payload.find({ collection: 'media', limit: mediaLimit, sort: '-publishedAt' }),
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
