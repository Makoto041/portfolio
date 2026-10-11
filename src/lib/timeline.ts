// ───────────────────────────────────────────
// src/lib/timeline.ts
// タイムラインの定数と表示用ヘルパー（server/client 共用）。
// 'use client' モジュールからの export はサーバー側でクライアント参照に
// なり得るため、共用の定数・純関数はこの境界なしモジュールに置く。
// ───────────────────────────────────────────
import { dayParts } from '@/lib/date'
import { lexicalToPlainText } from '@/lib/richtext'
import { clip } from '@/lib/text'
import type { TimelineDoc, TimelinePostType } from '@/lib/payloadTypes'

/** 1ページの取得件数。/timeline の SSR 初期取得（page 1 とみなす）と
    クライアントの追加読込（page 2〜）で必ず同じ値を使うこと */
export const TIMELINE_PAGE_SIZE = 20

/** 投稿タイプの表示ラベル */
export const TYPE_LABELS: Record<TimelinePostType, string> = {
  diary: '日記',
  tech: '技術メモ',
  photo: '写真',
  making: '制作',
  event: 'イベント',
  travel: 'おでかけ',
  study: '学習',
}

/** 投稿に添付された写真1枚分の表示モデル */
export type GridPhoto = {
  key: string
  url: string
  alt?: string | null
  width?: number | null
  height?: number | null
}

/** 投稿の写真（URL のあるものを最大4枚） */
export function postPhotos(post: TimelineDoc): GridPhoto[] {
  return (post.images ?? [])
    .filter((img) => img?.image?.url)
    .slice(0, 4)
    .map((img, i) => ({
      key: String(img.id ?? img.image.id ?? i),
      url: img.image.url,
      alt: img.image.alt,
      width: img.image.width,
      height: img.image.height,
    }))
}

/** 画像の代替テキスト等に使う投稿の要約（タイトル or 本文の1行目・40字まで） */
export function postSummary(post: TimelineDoc, max = 40): string {
  const text = post.title || lexicalToPlainText(post.text)
  const first = text.split('\n')[0] ?? ''
  return clip(first, max)
}

/** 月の目次の1項目（Asia/Tokyo の年月ごとの投稿数） */
export type MonthBucket = {
  /** `2025-07` */
  key: string
  year: number
  month: number
  count: number
}

/** 投稿日を Asia/Tokyo の年月ごとに数える（新しい月から順に並べる） */
export function monthBuckets(dates: string[]): MonthBucket[] {
  const byKey = new Map<string, MonthBucket>()
  for (const d of dates) {
    const p = dayParts(d)
    if (!p) continue
    const key = `${p.year}-${String(p.month).padStart(2, '0')}`
    const bucket = byKey.get(key)
    if (bucket) bucket.count += 1
    else byKey.set(key, { key, year: p.year, month: p.month, count: 1 })
  }
  return [...byKey.values()].sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0))
}

/** 月キー `2025-07` → その月（Asia/Tokyo）の範囲 [start, end)。不正なキーは null */
export function monthRange(key: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (month < 1 || month > 12) return null
  // 日本時間の 0 時 = 前日 15 時 UTC（夏時間なし）
  const start = new Date(Date.UTC(year, month - 1, 1, -9))
  const end = new Date(Date.UTC(year, month, 1, -9))
  return { start: start.toISOString(), end: end.toISOString() }
}

/** プロフィールの数字（投稿数・写真数・連続日数・最終更新日） */
export type TodayStats = {
  entries: number
  photos: number
  streak: number
  /** いちばん新しい投稿の日付 `7.5`（投稿が無ければ空） */
  last: string
}

/**
 * 3つ目の数字の表示。連続投稿が途切れているときは「連続 0日」ではなく最終更新日を出す。
 */
export function streakFact(stats: Pick<TodayStats, 'streak' | 'last'>): { value: string; label: string } {
  if (stats.streak > 0) return { value: `${stats.streak}日`, label: '連続' }
  if (stats.last) return { value: stats.last, label: '最終更新' }
  return { value: '—', label: '連続' }
}

