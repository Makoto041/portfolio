// src/components/ActiveEventCard.tsx
import { Calendar, Clock, Bell } from 'lucide-react'
import Image from 'next/image'
import type { Event } from '@/payload-types'
import { toCFUrl } from '@/lib/cfUrl'

const platformConfig = {
  twitch: {
    name: 'Twitch',
    badgeClass: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
    dotClass: 'bg-purple-500 dark:bg-purple-400',
  },
  youtube: {
    name: 'YouTube',
    badgeClass: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    dotClass: 'bg-red-500 dark:bg-red-400',
  },
  nico: {
    name: 'ニコニコ',
    badgeClass: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
    dotClass: 'bg-orange-500 dark:bg-orange-400',
  },
  offline: {
    name: '現地イベント',
    badgeClass: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
    dotClass: 'bg-green-500 dark:bg-green-400',
  },
  other: {
    name: 'その他',
    badgeClass: 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300',
    dotClass: 'bg-gray-500 dark:bg-gray-400',
  },
}

import { formatEventDateWithExtendedHour } from './formatEventDateWithExtendedHour'

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
type ActiveEventCardProps = {
  event: EventDoc
  cardClass: string
}

export default function ActiveEventCard({ event, cardClass }: ActiveEventCardProps) {
  const href = event.externalUrl || `/events/${event.slug}`
  const platform =
    platformConfig[event.platform as keyof typeof platformConfig] || platformConfig.other
  const { date, time } = formatEventDateWithExtendedHour(event.startDate, event.endDate)
  const status = getEventStatus(event.startDate, event.endDate)

  // 終了したイベントは表示しない
  if (status === 'ended') {
    return null
  }

  if (status === 'upcoming') {
    // 告知モード：控えめなカード
    return (
      <a
        href={href}
        target={event.externalUrl ? '_blank' : undefined}
        className={`card-link block mb-6 rounded-xl border border-[color:var(--card-border)] bg-[color:var(--card-bg)] backdrop-blur-sm shadow-sm relative overflow-hidden h-24 sm:h-32 hover:shadow-md transition-all duration-300 ${cardClass}`}
      >
        <div className="flex h-full">
          {/* Thumbnail - カード全体サイズに合わせる */}
          {event.thumbnail &&
            typeof event.thumbnail === 'object' &&
            'url' in event.thumbnail &&
            event.thumbnail.url && (
              <div className="flex-shrink-0 w-32 sm:w-48 h-full relative">
                <Image
                  src={toCFUrl(event.thumbnail.url)}
                  alt={event.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

          <div className="flex-1 min-w-0 p-2 sm:p-4 flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-1 mb-1">
              <Bell size={10} className="text-blue-500" />
              <span className="text-xs text-blue-600 font-medium">予定</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-bold shadow-sm transition-colors duration-200 ${platform.badgeClass}`}
              >
                <span className={`w-2 h-2 rounded-full mr-1 ${platform.dotClass}`} />
                {platform.name}
              </span>
            </div>
            <h3 className="text-lg sm:text-base font-semibold text-gray-900 dark:!text-gray-100 line-clamp-2 mb-1">
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
          </div>
        </div>
      </a>
    )
  }

  // 開催中モード：目立つカード
  return (
    <a
      href={href}
      target={event.externalUrl ? '_blank' : undefined}
      className={`
      card-link
      block mb-6 rounded-xl border-2
      border-red-400/60 dark:border-red-700/60
      bg-gradient-to-r from-red-50/90 to-pink-50/90
      dark:from-red-700/60 dark:via-pink-700/60 dark:to-orange-700/60
      shadow-xl backdrop-blur-sm relative overflow-hidden
      h-32 sm:h-40 hover:shadow-2xl transition-all duration-300 ${cardClass}
    `}
    >
      {/* ダークモード背景エフェクト */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="
        absolute inset-0
        bg-gradient-to-br from-red-500 via-pink-500 to-orange-500
        dark:from-red-800 dark:via-pink-800 dark:to-orange-800
      "
        />
      </div>

      <div className="relative h-full">
        <div className="flex h-full">
          {/* Thumbnail - unchanged */}
          {event.thumbnail &&
            typeof event.thumbnail === 'object' &&
            'url' in event.thumbnail &&
            event.thumbnail.url && (
              <div className="flex-shrink-0 w-32 sm:w-64 h-full relative">
                <Image
                  src={toCFUrl(event.thumbnail.url)}
                  alt={event.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

          {/* Content */}
          <div className="flex-1 p-2 sm:p-5 flex flex-col justify-center">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-1 mb-1">
              <div
                className="
              flex items-center gap-1
              bg-red-500 dark:bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-bold
            "
              >
                <div className="w-1 h-1 bg-white rounded-full" />
                配信中
              </div>
              <span
                className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium border dark:border-gray-600 ${platform.badgeClass}`}
              >
                <div className={`w-1 h-1 rounded-full mr-1 ${platform.dotClass}`} />
                {platform.name}
              </span>
            </div>

            {/* Title */}
            <h2
              className="
            text-base sm:text-lg font-bold !text-gray-900 dark:!text-gray-100
            mb-1 leading-tight line-clamp-2
          "
            >
              {event.title}
            </h2>

            {/* Date and time */}
            <div
              className="
            flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300 mb-2
          "
            >
              <div className="flex items-center gap-0.5">
                <Calendar size={10} />
                <span>{date}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <Clock size={10} />
                <span>{time}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a>
  )
}
