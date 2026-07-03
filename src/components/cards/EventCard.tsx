// src/components/cards/EventCard.tsx
// イベント一覧用カード。glass-cardデザインシステムに統一し、
// プラットフォームは色付きドット+チップで控えめに示す
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, Calendar, Clock } from 'lucide-react'
import type { Event } from '@/payload-types'
import { toCFUrl } from '@/lib/cfUrl'
import { formatEventDateWithExtendedHour } from '@/components/utils/formatEventDateWithExtendedHour'

const PLATFORMS: Record<string, { name: string; dotClass: string }> = {
  twitch: { name: 'Twitch', dotClass: 'bg-purple-500' },
  youtube: { name: 'YouTube', dotClass: 'bg-red-500' },
  nico: { name: 'ニコニコ', dotClass: 'bg-orange-500' },
  offline: { name: '現地イベント', dotClass: 'bg-emerald-500' },
  other: { name: 'その他', dotClass: 'bg-slate-400' },
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
      href={e.externalUrl || `/in_event`}
      target={e.externalUrl ? '_blank' : undefined}
      rel={e.externalUrl ? 'noopener noreferrer' : undefined}
      className="card-link group block"
    >
      <article className="glass-card fade-in-up overflow-hidden">
        {/* サムネイル */}
        <div className="relative aspect-[16/9] overflow-hidden">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={e.title}
              fill
              sizes="(max-width: 640px) 100vw, 480px"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[color:var(--chip-bg)] text-muted">
              <Calendar size={40} strokeWidth={1.5} />
            </div>
          )}

          {/* LIVEバッジ */}
          {isLive && (
            <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              LIVE
            </span>
          )}
        </div>

        {/* 本文 */}
        <div className="space-y-2.5 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="chip">
              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${platform.dotClass}`} />
              {platform.name}
            </span>
            {e.externalUrl && (
              <ExternalLink
                size={14}
                strokeWidth={1.5}
                className="shrink-0 text-muted transition-opacity group-hover:opacity-70"
              />
            )}
          </div>

          <h2 className="line-clamp-2 text-base font-semibold leading-snug">{e.title}</h2>

          {e.summary && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted">{e.summary}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[color:var(--glass-border)] pt-2.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} strokeWidth={1.5} />
              {date}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} strokeWidth={1.5} />
              {time}
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
