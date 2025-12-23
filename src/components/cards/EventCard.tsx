// src/components/EventCard.tsx
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, Calendar, Clock } from 'lucide-react'
import type { Event } from '@/payload-types'
import { toCFUrl } from '@/lib/cfUrl'

const platformConfig = {
  twitch: {
    name: 'Twitch',
    badgeClass: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-200',
    dotClass: 'bg-purple-500 dark:bg-purple-400',
  },
  youtube: {
    name: 'YouTube',
    badgeClass: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200',
    dotClass: 'bg-red-500 dark:bg-red-400',
  },
  nico: {
    name: 'ニコニコ',
    badgeClass: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-200',
    dotClass: 'bg-orange-500 dark:bg-orange-400',
  },
  offline: {
    name: '現地イベント',
    badgeClass: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-200',
    dotClass: 'bg-green-500 dark:bg-green-400',
  },
  other: {
    name: 'その他',
    badgeClass: 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-200',
    dotClass: 'bg-gray-500 dark:bg-gray-400',
  },
}

import { formatEventDateWithExtendedHour } from '@/components/utils/formatEventDateWithExtendedHour'


export default function EventCard({ e }: { e: Event }) {
  const platform = platformConfig[e.platform as keyof typeof platformConfig] || platformConfig.other
  const { date, time } = formatEventDateWithExtendedHour(e.startDate, e.endDate)
  const isLive = e.externalUrl && new Date(e.startDate) <= new Date() && (!e.endDate || new Date(e.endDate) >= new Date())

  return (
    <Link
      href={e.externalUrl || `/events/${e.slug}`}
      target={e.externalUrl ? '_blank' : undefined}
      className="card-link"
    >
      <article
        className={`
          group relative
          bg-[color:var(--card-bg)] hover:bg-[color:var(--card-bg-hover)]
          backdrop-blur-xl
          border border-[color:var(--card-border)] hover:border-[color:var(--card-border-hover)]
          shadow-lg hover:shadow-xl
          transition-all duration-500
          rounded-2xl overflow-hidden
        `}
      >
        {/* Live indicator */}
        {isLive && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-red-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}
        
        {/* Thumbnail */}
        <div className="relative h-52 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 overflow-hidden">
          {e.thumbnail && typeof e.thumbnail === 'object' && 'url' in e.thumbnail && e.thumbnail.url ? (
            <Image
              src={toCFUrl(e.thumbnail.url)}
              alt={e.title}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <Calendar size={56} strokeWidth={1.5} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Platform badge */}
          <div className="flex items-center justify-between">
            <span
  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-bold shadow-sm transition-colors duration-200 ${platform.badgeClass}`}
>
  <span className={`w-2 h-2 rounded-full mr-1 ${platform.dotClass}`} />
  {platform.name}
</span>
            {e.externalUrl && (
              <ExternalLink size={16} className="!text-gray-400 group-hover:!text-blue-500 transition-colors duration-300" strokeWidth={1.5} />
            )}
          </div>
          
          {/* Title */}
          <h3
            className="
              font-bold text-xl leading-tight
              !text-gray-900 dark:!text-white
              group-hover:!text-blue-600 dark:group-hover:!text-blue-400
              transition-colors duration-300
              line-clamp-2
            "
          >
            {e.title}
          </h3>

          {/* Summary */}
          {e.summary && (
            <p className="!text-gray-600 dark:!text-gray-300 text-sm leading-relaxed line-clamp-2">
              {e.summary}
            </p>
          )}

          {/* Date and time */}
          <div
            className="
              flex items-center gap-6 text-sm
              !text-gray-600 dark:!text-gray-100
              pt-2
              border-t border-gray-300/50 dark:border-gray-600/40
            "
          >
            <div className="flex items-center gap-2">
              <Calendar size={14} strokeWidth={1.5} />
              <span className="font-medium">{date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} strokeWidth={1.5} />
              <span className="font-medium">{time}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
