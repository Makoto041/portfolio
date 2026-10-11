// ───────────────────────────────────────────
// src/features/site/getTodayData.ts
// おしらせ（メモ帳）と数字（投稿数・写真数・連続日数・最終更新日）。
// ホーム・タイムライン・写真・プロフィールで共用し、React cache で同一リクエスト内の重複取得をまとめる。
// それぞれ独立に失敗を握りつぶし、取れた分だけで表示を成立させる。
// ───────────────────────────────────────────
import { cache } from 'react'
import { getPayloadClient } from '@/lib/payloadClient'
import { buildStreak, fmtDateBadge, fmtMonthDay } from '@/lib/date'
import { phraseChunks } from '@/lib/phrase'
import type { TodayStats } from '@/lib/timeline'

/** おしらせ1件（メモ帳・SP のピン留め用） */
export type NoticeView = {
  key: string
  /** `07.05` */
  badge: string
  text: string
  /** サーバーで分割済みの語の切れ目（<wbr> 用） */
  chunks: string[]
}

/** タイムライン専用画像を除いた「ギャラリー写真」の条件 */
export const GALLERY_WHERE = {
  or: [{ isTimelineOnly: { equals: false } }, { isTimelineOnly: { exists: false } }],
}

export type TodayData = { notices: NoticeView[]; stats: TodayStats }

export const EMPTY_TODAY: TodayData = { notices: [], stats: { entries: 0, photos: 0, streak: 0, last: '' } }

export const getTodayData = cache(async (): Promise<TodayData> => {
  try {
    const payload = await getPayloadClient()
    const [entries, photos, dates, notices] = await Promise.all([
      payload.count({ collection: 'timeline' }).catch(() => ({ totalDocs: 0 })),
      payload.count({ collection: 'media', where: GALLERY_WHERE }).catch(() => ({ totalDocs: 0 })),
      // 連続日数の計算用に日付だけを軽量に取得
      payload
        .find({
          collection: 'timeline',
          limit: 366,
          sort: '-publishedAt',
          depth: 0,
          select: { publishedAt: true, createdAt: true },
        })
        .catch(() => ({ docs: [] as { publishedAt?: string | null; createdAt: string }[] })),
      // おしらせ（公開分を新しい順）。notices テーブル未作成でも全体を巻き込まない
      payload
        .find({
          collection: 'notices',
          limit: 20,
          sort: '-date',
          depth: 0,
          where: { isPublic: { equals: true } },
        })
        .catch((e) => {
          console.error('Notices fetch failed (falling back to none):', e)
          return { docs: [] as { id: number | string; date: string; body: string }[] }
        }),
    ])

    const postDates = (dates.docs as { publishedAt?: string | null; createdAt: string }[]).map(
      (d) => d.publishedAt ?? d.createdAt,
    )
    const streak = buildStreak(postDates)
    const last = postDates[0] ? fmtMonthDay(postDates[0]) : ''

    return {
      notices: (notices.docs as { id: number | string; date: string; body: string }[])
        .filter((n) => n.body)
        .map((n) => ({
          key: String(n.id),
          badge: fmtDateBadge(n.date),
          text: n.body,
          chunks: phraseChunks(n.body),
        })),
      stats: { entries: entries.totalDocs, photos: photos.totalDocs, streak, last },
    }
  } catch (error) {
    console.error('Today data fetch failed (rendering empty):', error)
    return EMPTY_TODAY
  }
})
