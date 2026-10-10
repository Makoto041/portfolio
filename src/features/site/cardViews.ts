// ───────────────────────────────────────────
// src/features/site/cardViews.ts
// コレクションのドキュメント → カード/行の表示モデルへの変換（純関数）。
// ホームと各一覧ページで共用する。
// ───────────────────────────────────────────
import { fmtDateJa } from '@/lib/date'
import { lexicalToPlainText } from '@/lib/richtext'
import { safeHref } from '@/lib/safeHref'
import { formatEventDateWithExtendedHour } from '@/components/utils/formatEventDateWithExtendedHour'
import type { TabCardView } from '@/components/soda/SodaTabCard'
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

/** 本文の最初の空でない1行（ティッカー・抜粋用） */
export function firstLine(text: string, max: number): string {
  const line = text.split('\n').find((l) => l.trim()) ?? ''
  return line.length > max ? `${line.slice(0, max)}…` : line
}

/** 開催中か（終了日時が無いものは開始から3時間を目安にする） */
export function isLiveNow(start: string, end?: string | null, now: number = Date.now()): boolean {
  const s = Date.parse(start)
  const e = end ? Date.parse(end) : s + 3 * 60 * 60 * 1000
  return Number.isFinite(s) && now >= s && now <= e
}

/** イベント → タブカード */
export function eventCard(e: EventLike, short = true): TabCardView {
  const { time } = formatEventDateWithExtendedHour(e.startDate, e.endDate)
  const thumb = uploadUrl(e.thumbnail)
  // カードでは開始時刻まで（「〜」以降の終了時刻は一覧ページの補足に回す）
  const when = short ? `${fmtDateJa(e.startDate)} ${time.split('〜')[0]}〜` : `${fmtDateJa(e.startDate)} ${time}`
  const url = safeHref(e.externalUrl)
  return {
    id: String(e.id),
    href: url ?? '/events',
    external: Boolean(url),
    imageUrl: thumb ?? null,
    cover: PLATFORM_LABELS[e.platform ?? 'other'] ?? 'Event',
    attr: PLATFORM_LABELS[e.platform ?? 'other'] ?? 'イベント',
    title: e.title,
    label: e.title,
    desc: when,
    live: isLiveNow(e.startDate, e.endDate),
  }
}

/** つくったもの → タブカード */
export function productCard(p: ProductLike): TabCardView {
  const image = uploadUrl(p.image)
  const url = safeHref(p.url)
  return {
    id: String(p.id),
    href: url ?? '/products',
    external: Boolean(url),
    imageUrl: image ?? null,
    cover: p.name,
    attr: p.tags?.[0] || 'つくったもの',
    title: p.name,
    label: p.name,
  }
}

/** ブログ記事 → 行 */
export function blogRow(p: BlogPostDoc): BlogRowView {
  const date = p.publishedAt ?? p.createdAt
  const cover = p.coverImage && typeof p.coverImage === 'object' ? p.coverImage.url : null
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
