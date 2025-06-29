// src/components/EventCard.tsx
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, Calendar, Clock } from 'lucide-react'
import type { Event } from '@/lib/payloadTypes'

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

function formatEventDate(startDate: string, endDate?: string) {
  const start = new Date(startDate)
  const startTime = start.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Asia/Tokyo'
  })
  const startDateStr = start.toLocaleDateString('ja-JP', { 
    month: 'short', 
    day: 'numeric',
    timeZone: 'Asia/Tokyo'
  })
  
  if (endDate) {
    const end = new Date(endDate)
    const endTime = end.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    })
    return { date: startDateStr, time: `${startTime} - ${endTime}` }
  }
  
  return { date: startDateStr, time: startTime }
}

export default function EventCard({ e }: { e: Event }) {
  const platform = platformConfig[e.platform as keyof typeof platformConfig] || platformConfig.other
  const { date, time } = formatEventDate(e.startDate, e.endDate)
  const isLive = e.externalUrl && new Date(e.startDate) <= new Date() && (!e.endDate || new Date(e.endDate) >= new Date())

  return (
    <Link href={e.externalUrl || `/events/${e.slug}`} target={e.externalUrl ? '_blank' : undefined}>
      <article className="group relative bg-white/80 backdrop-blur-xl border border-white/20 hover:border-white/40 shadow-lg hover:shadow-xl transition-all duration-500 rounded-2xl overflow-hidden hover:bg-white/90">
        {/* Live indicator */}
        {isLive && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-red-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}
        
        {/* Thumbnail */}
        <div className="relative h-52 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          {e.thumbnail?.url ? (
            <Image
              src={e.thumbnail.url}
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
            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-sm border border-white/30 ${platform.textColor} ${platform.bgColor}`}>
              <div className={`w-2 h-2 rounded-full ${platform.color} mr-2`} />
              {platform.name}
            </span>
            {e.externalUrl && (
              <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors duration-300" strokeWidth={1.5} />
            )}
          </div>
          
          {/* Title */}
          <h3 className="font-bold text-xl leading-tight text-gray-900 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2">
            {e.title}
          </h3>
          
          {/* Summary */}
          {e.summary && (
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
              {e.summary}
            </p>
          )}
          
          {/* Date and time */}
          <div className="flex items-center gap-6 text-sm text-gray-500 pt-2 border-t border-gray-100/80">
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
