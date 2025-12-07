// src/components/EventCard.tsx
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, Calendar, Clock } from 'lucide-react'
import type { Event } from '@/payload-types'
import { toCFUrl } from '@/lib/cfUrl'

const platformConfig = {
  twitch: {
    name: 'Twitch',
    color: 'bg-purple-500',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    darkColor: 'bg-purple-700',
    darkTextColor: 'text-purple-300',
    darkBgColor: 'bg-purple-900/20',
  },
  youtube: {
    name: 'YouTube',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    darkColor: 'bg-red-700',
    darkTextColor: 'text-red-300',
    darkBgColor: 'bg-red-900/20',
  },
  nico: {
    name: 'ニコニコ',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    darkColor: 'bg-orange-700',
    darkTextColor: 'text-orange-300',
    darkBgColor: 'bg-orange-900/20',
  },
  offline: {
    name: '現地イベント',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    darkColor: 'bg-green-700',
    darkTextColor: 'text-green-300',
    darkBgColor: 'bg-green-900/20',
  },
  other: {
    name: 'その他',
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    darkColor: 'bg-gray-700',
    darkTextColor: 'text-gray-300',
    darkBgColor: 'bg-gray-900/20',
  },
}

import { formatEventDateWithExtendedHour } from '@/components/utils/formatEventDateWithExtendedHour'


export default function EventCard({ e }: { e: Event }) {
  const platform = platformConfig[e.platform as keyof typeof platformConfig] || platformConfig.other
  const { date, time } = formatEventDateWithExtendedHour(e.startDate, e.endDate)
  const isLive = e.externalUrl && new Date(e.startDate) <= new Date() && (!e.endDate || new Date(e.endDate) >= new Date())

  return (
    <Link href={e.externalUrl || `/events/${e.slug}`} target={e.externalUrl ? '_blank' : undefined}>
      <article
        className={`
          group relative
          bg-white/80 dark:bg-gray-900/80
          backdrop-blur-xl
          border border-white/20 dark:border-gray-700/20
          hover:border-white/40 dark:hover:border-gray-500/40
          shadow-lg hover:shadow-xl
          transition-all duration-500
          rounded-2xl overflow-hidden
          hover:bg-white/90 dark:hover:bg-gray-800/90
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
  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-bold shadow-sm bg-opacity-50 text-opacity-90 ${platform.bgColor} dark:${platform.darkBgColor} ${platform.textColor} dark:${platform.darkTextColor} transition-colors duration-200`}
>
  <span className={`w-2 h-2 rounded-full mr-1 ${platform.color} dark:${platform.darkColor}`} />
  {platform.name}
</span>
            {e.externalUrl && (
              <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors duration-300" strokeWidth={1.5} />
            )}
          </div>
          
          {/* Title */}
          <h3
            className="
              font-bold text-xl leading-tight
              text-gray-900 dark:text-gray-100
              group-hover:text-blue-600 dark:group-hover:text-blue-400
              transition-colors duration-300
              line-clamp-2
            "
          >
            {e.title}
          </h3>
          
          {/* Summary */}
          {e.summary && (
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-2">
              {e.summary}
            </p>
          )}
          
          {/* Date and time */}
          <div
            className="
              flex items-center gap-6 text-sm
              text-gray-500 dark:text-gray-300
              pt-2
              border-t border-gray-100/80 dark:border-gray-700/60
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
