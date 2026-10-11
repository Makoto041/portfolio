// ───────────────────────────────────────────
// src/features/site/getTimelineMonths.ts
// /timeline の「月の目次」。全投稿の日付だけを軽量に取得し、Asia/Tokyo の年月ごとに数える。
// 取得に失敗したら空（目次を出さない）。
// ───────────────────────────────────────────
import { cache } from 'react'
import { getPayloadClient } from '@/lib/payloadClient'
import { monthBuckets, type MonthBucket } from '@/lib/timeline'

export const getTimelineMonths = cache(async (): Promise<MonthBucket[]> => {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'timeline',
      pagination: false,
      sort: '-publishedAt',
      depth: 0,
      // 月の絞り込み（publishedAt の範囲）と数えかたをそろえる
      where: { publishedAt: { exists: true } },
      select: { publishedAt: true },
    })
    const dates = (res.docs as { publishedAt?: string | null }[])
      .map((d) => d.publishedAt)
      .filter((d): d is string => Boolean(d))
    return monthBuckets(dates)
  } catch (e) {
    console.error('Timeline months fetch failed (index hidden):', e)
    return []
  }
})
