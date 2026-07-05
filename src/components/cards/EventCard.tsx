// src/components/cards/EventCard.tsx
// イベント一覧用カード。glass-cardデザインシステムに統一し、
// プラットフォームは色付きドット+チップで控えめに示す
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, Calendar, Clock } from 'lucide-react'
import type { Event } from '@/payload-types'
import { toCFUrl } from '@/lib/cfUrl'
import { formatEventDateWithExtendedHour } from '@/components/utils/formatEventDateWithExtendedHour'

const PLATFORMS: Record<string, { name: string; dot: string }> = {
  twitch: { name: 'Twitch', dot: 'oklch(0.55 0.2 300)' },
  youtube: { name: 'YouTube', dot: 'oklch(0.6 0.22 25)' },
  nico: { name: 'ニコニコ', dot: 'oklch(0.68 0.16 55)' },
  offline: { name: '現地イベント', dot: 'oklch(0.65 0.16 155)' },
  other: { name: 'その他', dot: 'oklch(0.6 0.03 260)' },
}

export default function EventCard({ e }: { e: Event }) {
  const platform = PLATFORMS[e.platform ?? 'other'] ?? PLATFORMS.other
  const { date, time } = formatEventDateWithExtendedHour(e.startDate, e.endDate)
  const isLive =
    new Date(e.startDate) <= new Date() && (!e.endDate || new Date(e.endDate) >= new Date())
  const thumbnailUrl =
    e.thumbnail && typeof e.thumbnail === 'object' && 'url' in e.thumbnail && e.thumbnail.url
      ? toCFUrl(e.thumbnail.url)
      : null

  return (
    <Link
      href={e.externalUrl || `/events`}
      target={e.externalUrl ? '_blank' : undefined}
      rel={e.externalUrl ? 'noopener noreferrer' : undefined}
      className="ccard"
    >
      {/* サムネイル */}
      <div className="thumb">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={e.title}
            fill
            sizes="(max-width: 720px) 100vw, 480px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[color:var(--m-faint)]">
            <Calendar size={38} strokeWidth={1.5} />
          </div>
        )}

        {/* LIVEバッジ */}
        {isLive && (
          <span className="livebadge absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1.5">
            <span className="livedot h-1.5 w-1.5 rounded-full bg-white" />
            LIVE
          </span>
        )}
      </div>

      {/* 本文 */}
      <div className="cbody">
        <span className="cmeta justify-between">
          <span className="tagchip">
            {/* プラットフォーム色は動的なため style で指定（配色トークン外の識別色） */}
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: platform.dot }} />
            {platform.name}
          </span>
          {e.externalUrl && <ExternalLink size={13} strokeWidth={1.5} />}
        </span>

        <span className="ctitle jp line-clamp-2">{e.title}</span>

        {e.summary && <span className="cexcerpt jp line-clamp-2">{e.summary}</span>}

        <span className="cmeta mt-0.5 border-t border-[color:var(--m-hairline)] pt-2.5">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={12} strokeWidth={1.5} />
            {date}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={12} strokeWidth={1.5} />
            {time}
          </span>
        </span>
      </div>
    </Link>
  )
}
