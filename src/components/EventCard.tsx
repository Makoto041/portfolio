// src/components/EventCard.tsx
import Image from 'next/image'
import Link from 'next/link'
import type { Event } from '@/lib/payloadTypes'

export default function EventCard({ e }: { e: Event }) {
  return (
    <Link href={e.externalUrl || `/events/${e.slug}`} target={e.externalUrl ? '_blank' : undefined}>
      <article className="glass hover:shadow-[0_12px_32px_rgba(0,0,0,.18)] transition rounded-lg overflow-hidden flex gap-4">
        {e.thumbnail?.url && (
          <Image
            src={e.thumbnail.url}
            alt={e.title}
            width={140}
            height={80}
            className="h-24 w-40 object-cover"
          />
        )}
        <div className="pr-4">
          <h3 className="font-semibold line-clamp-2">{e.title}</h3>
          <p className="text-xs text-gray-500">
            {new Date(e.startDate).toLocaleDateString('ja-JP', { dateStyle: 'medium' })}
          </p>
          {e.summary && <p className="text-sm line-clamp-2">{e.summary}</p>}
        </div>
      </article>
    </Link>
  )
}
