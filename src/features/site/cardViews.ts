// ───────────────────────────────────────────
// src/features/site/cardViews.ts
// コレクションのドキュメント → 半券・ステッカー・行の表示モデルへの変換（純関数）。
// ホームと各一覧ページで共用する。
// ───────────────────────────────────────────
import { dayParts, fmtDateJa } from '@/lib/date'
import { lexicalFirstImageUrl, lexicalToPlainText } from '@/lib/richtext'
import { clip } from '@/lib/text'
import { safeHref } from '@/lib/safeHref'
import { formatEventDateWithExtendedHour } from '@/components/utils/formatEventDateWithExtendedHour'
import type { TicketView } from '@/components/soda/SodaTicket'
import type { StickerView } from '@/components/soda/SodaSticker'
import type { BlogRowView } from '@/components/soda/SodaBlogRow'
import type { BlogPost as BlogPostDoc } from '@/payload-types'

/** upload 関連（depth で ID or ドキュメントになる） */
type UploadRef = number | string | { url?: string | null } | null | undefined

function uploadUrl(ref: UploadRef): string | null {
  return ref && typeof ref === 'object' && ref.url ? ref.url : null
}

/** イベント（payload-types / lib/payloadTypes どちらの形も受ける） */
export type EventLike = {
  id: number | string
  title: string
  summary?: string | null
  platform?: string | null
  externalUrl?: string | null
  startDate: string
  endDate?: string | null
  thumbnail?: UploadRef
}

/** つくったもの */
export type ProductLike = {
  id: number | string
  name: string
  description?: string | null
  url?: string | null
  image?: UploadRef
  tags?: string[] | null
}

/** イベントのプラットフォーム表記 */
export const PLATFORM_LABELS: Record<string, string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
  nico: 'ニコニコ',
  offline: '現地イベント',
  other: 'イベント',
}

/** 本文の最初の空でない1行（抜粋用） */
export function firstLine(text: string, max: number): string {
  const line = text.split('\n').find((l) => l.trim()) ?? ''
  return clip(line, max)
}

/** 開催中か（終了日時が無いものは開始から3時間を目安にする） */
export function isLiveNow(start: string, end?: string | null, now: number = Date.now()): boolean {
  const s = Date.parse(start)
  const e = end ? Date.parse(end) : s + 3 * 60 * 60 * 1000
  return Number.isFinite(s) && now >= s && now <= e
}

/** イベント → 半券（withNote: 一覧ページでは概要も添える） */
export function eventTicket(e: EventLike, withNote = false): TicketView {
  const { time } = formatEventDateWithExtendedHour(e.startDate, e.endDate)
  const day = dayParts(e.startDate)
  const url = safeHref(e.externalUrl)
  return {
    id: String(e.id),
    href: url ?? '/events',
    external: Boolean(url),
    title: e.title,
    platform: PLATFORM_LABELS[e.platform ?? 'other'] ?? 'イベント',
    year: day?.year,
    month: day?.month,
    day: day?.day,
    weekday: day?.weekday,
    time,
    live: isLiveNow(e.startDate, e.endDate),
    note: withNote ? e.summary : null,
  }
}

/** つくったもの → ステッカー（withDesc: 一覧ページでは説明も添える） */
export function productSticker(p: ProductLike, withDesc = false): StickerView {
  const url = safeHref(p.url)
  return {
    id: String(p.id),
    href: url ?? '/products',
    external: Boolean(url),
    imageUrl: uploadUrl(p.image),
    name: p.name,
    tag: p.tags?.[0] || 'つくったもの',
    desc: withDesc ? p.description : null,
  }
}

/** ブログ記事 → 行 */
export function blogRow(p: BlogPostDoc): BlogRowView {
  const date = p.publishedAt ?? p.createdAt
  // カバー画像が無い記事は本文の最初の画像をサムネイルに使う
  const cover = (p.coverImage && typeof p.coverImage === 'object' ? p.coverImage.url : null) ?? lexicalFirstImageUrl(p.body)
  const excerpt = firstLine(lexicalToPlainText(p.body), 80)
  return {
    id: String(p.id),
    href: p.slug ? `/posts/${p.slug}` : '/posts',
    date: fmtDateJa(date),
    dateTime: date,
    title: p.title,
    excerpt,
    imageUrl: cover ?? null,
  }
}
