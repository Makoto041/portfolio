// src/components/ActiveEventCard.tsx
import type { Event } from '@/lib/payloadTypes'

type EventDoc = Event

export default function ActiveEventCard({ event }: { event: EventDoc }) {
  const href = event.externalUrl || `/events/${event.slug}`

  return (
    <div className="mb-6 rounded-xl border bg-white/70 shadow p-4 backdrop-blur">
      <p className="text-sm text-gray-500">📢 お知らせ</p>
      <h2 className="mt-1 text-lg font-bold">{event.title}</h2>
      {event.summary && <p className="mt-1 text-sm">{event.summary}</p>}

      <a
        href={href}
        className="mt-2 inline-block text-blue-600 hover:underline"
        target={event.externalUrl ? '_blank' : undefined}
      >
        {event.externalUrl ? '配信を見る →' : '詳細を見る →'}
      </a>
    </div>
  )
}
