// src/components/ActiveEventCard.tsx
import { Calendar, Clock, Play, Bell } from 'lucide-react'
import Image from 'next/image'
import type { Event } from '@/payload-types'

const platformConfig = {
  twitch: {
    name: 'Twitch',
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
  },
  youtube: {
    name: 'YouTube',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
  },
  nico: {
    name: 'ニコニコ',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
  },
  offline: {
    name: '現地イベント',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
  },
  other: {
    name: 'その他',
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
  },
}

function formatEventDate(startDate: string, endDate?: string | null) {
  const start = new Date(startDate)
  const startTime = start.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
  const startDateStr = start.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  })

  if (endDate) {
    const end = new Date(endDate)
    const endTime = end.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo',
    })
    return { date: startDateStr, time: `${startTime} - ${endTime}` }
  }

  return { date: startDateStr, time: startTime }
}

function getEventStatus(startDate: string, endDate?: string | null) {
  const now = new Date()
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : null

  if (now < start) {
    return 'upcoming' // 告知モード
  } else if (now >= start && (!end || now <= end)) {
    return 'live' // 開催中モード
  } else {
    return 'ended' // 終了（表示しない）
  }
}

type EventDoc = Event

export default function ActiveEventCard({ event }: { event: EventDoc }) {
  const href = event.externalUrl || `/events/${event.slug}`
  const platform =
    platformConfig[event.platform as keyof typeof platformConfig] || platformConfig.other
  const { date, time } = formatEventDate(event.startDate, event.endDate)
  const status = getEventStatus(event.startDate, event.endDate)

  // 終了したイベントは表示しない
  if (status === 'ended') {
    return null
  }

  if (status === 'upcoming') {
    // 告知モード：控えめなカード
    return (
      <div className="mb-6 rounded-xl border border-gray-200/50 bg-white/60 backdrop-blur-sm shadow-sm relative overflow-hidden h-24 sm:h-32">
        <div className="flex h-full">
          {/* Thumbnail - カード全体サイズに合わせる */}
          {event.thumbnail &&
            typeof event.thumbnail === 'object' &&
            'url' in event.thumbnail &&
            event.thumbnail.url && (
              <div className="flex-shrink-0 w-32 sm:w-48 h-full relative">
                <Image src={event.thumbnail.url} alt={event.title} fill className="object-cover" />
              </div>
            )}

          <div className="flex-1 min-w-0 p-2 sm:p-4 flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-1 mb-1">
              <Bell size={10} className="text-blue-500" />
              <span className="text-xs text-blue-600 font-medium">予定</span>
              <span
                className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-medium ${platform.textColor} ${platform.bgColor}`}
              >
                {platform.name}
              </span>
            </div>
            <h3 className="text-xs sm:text-base font-semibold text-gray-900 line-clamp-2 mb-1">
              {event.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-1">
              <div className="flex items-center gap-1">
                <Calendar size={8} />
                <span>{date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={8} />
                <span>{time}</span>
              </div>
            </div>
            <a
              href={href}
              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium"
              target={event.externalUrl ? '_blank' : undefined}
            >
              詳細 →
            </a>
          </div>
        </div>
      </div>
    )
  }

  // 開催中モード：目立つカード
  return (
    <div className="mb-6 rounded-xl border-2 border-red-400/60 bg-gradient-to-r from-red-50/90 to-pink-50/90 shadow-xl backdrop-blur-sm relative overflow-hidden animate-pulse h-32 sm:h-40">
      {/* 目立つ背景エフェクト */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-pink-500 to-orange-500" />
      </div>

      <div className="relative h-full">
        <div className="flex h-full">
          {/* Thumbnail - カード全体サイズに合わせる */}
          {event.thumbnail &&
            typeof event.thumbnail === 'object' &&
            'url' in event.thumbnail &&
            event.thumbnail.url && (
              <div className="flex-shrink-0 w-24 sm:w-64 h-full relative">
                <Image src={event.thumbnail.url} alt={event.title} fill className="object-cover" />
              </div>
            )}

          {/* Content */}
          <div className="flex-1 p-2 sm:p-5 flex flex-col justify-center">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-1 mb-1">
              <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                配信中
              </div>
              <span
                className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium ${platform.textColor} ${platform.bgColor} border`}
              >
                <div className={`w-1 h-1 rounded-full ${platform.color} mr-1`} />
                {platform.name}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xs sm:text-lg font-bold text-gray-900 mb-1 leading-tight line-clamp-2">
              {event.title}
            </h2>

            {/* Date and time */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-2">
              <div className="flex items-center gap-0.5">
                <Calendar size={10} />
                <span>{date}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <Clock size={10} />
                <span>{time}</span>
              </div>
            </div>

            {/* Action button */}
            <a
              href={href}
              className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg group text-xs"
              target={event.externalUrl ? '_blank' : undefined}
            >
              <Play size={10} />
              配信を見る
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
