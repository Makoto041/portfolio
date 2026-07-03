// src/components/cards/ActiveEventCard.tsx
// トップページのお知らせカード（予定/開催中）。
// glass-cardベースの横型レイアウトで、開催中は赤リングで控えめに強調する。
// 開催状態はISRキャッシュの影響を受けないよう、クライアント側で定期再計算する
'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Calendar, Clock, Bell } from 'lucide-react'
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

function getEventStatus(startDate: string, endDate: string | null | undefined, now: Date) {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : null

  if (now < start) return 'upcoming' // 告知
  if (now >= start && (!end || now <= end)) return 'live' // 開催中
  return 'ended'
}

type ActiveEventCardProps = {
  event: Event
  /** 互換のため残置（未使用） */
  cardClass?: string
}

export default function ActiveEventCard({ event }: ActiveEventCardProps) {
  const href = event.externalUrl || '/in_event'
  const platform = PLATFORMS[event.platform ?? 'other'] ?? PLATFORMS.other
  const { date, time } = formatEventDateWithExtendedHour(event.startDate, event.endDate)

  // ISR(60s)で固まった判定を使わず、マウント後は30秒ごとに現在時刻で再計算する
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  const status = getEventStatus(event.startDate, event.endDate, now)

  if (status === 'ended') return null

  const isLive = status === 'live'
  const thumbnailUrl =
    event.thumbnail &&
    typeof event.thumbnail === 'object' &&
    'url' in event.thumbnail &&
    event.thumbnail.url
      ? toCFUrl(event.thumbnail.url)
      : null

  return (
    <a
      href={href}
      target={event.externalUrl ? '_blank' : undefined}
      rel={event.externalUrl ? 'noopener noreferrer' : undefined}
      className={`card-link glass-card fade-in-up group block overflow-hidden ${
        isLive ? 'ring-1 ring-red-400/40' : ''
      }`}
    >
      <div className="flex">
        {/* サムネイル */}
        {thumbnailUrl && (
          <div className="relative w-28 shrink-0 sm:w-44">
            <Image
              src={thumbnailUrl}
              alt={event.title}
              fill
              sizes="(max-width: 640px) 112px, 176px"
              className="object-cover"
            />
          </div>
        )}

        {/* 本文 */}
        <div className="min-w-0 flex-1 space-y-1.5 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                開催中
              </span>
            ) : (
              <span className="chip">
                <Bell size={11} className="mr-1" />
                予定
              </span>
            )}
            <span className="chip">
              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${platform.dotClass}`} />
              {platform.name}
            </span>
          </div>

          <h2 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
            {event.title}
          </h2>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} strokeWidth={1.5} />
              {date}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} strokeWidth={1.5} />
              {time}
            </span>
          </div>
        </div>
      </div>
    </a>
  )
}
