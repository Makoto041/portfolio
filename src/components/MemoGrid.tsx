// src/components/MemoGrid.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import type { BlogPost } from '@/lib/payloadTypes'
import { toCFUrl } from '@/lib/cfUrl'

const CARD = 'glass rounded-lg overflow-hidden p-4 flex flex-col'

export default function MemoGrid({ posts }: { posts: BlogPost[] }) {
  const latest = [...posts]
    .sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
      return bTime - aTime
    })
    .slice(0, 4)

  return (
    <div className={`${CARD}`}>
      <h2 className="text-xl font-medium mb-2">Memo</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 flex-1">
        {latest.map((p, idx) => (
          <div key={p.id} className={idx === 3 ? 'hidden sm:block' : ''}>
            <MemoImageLink p={p} />
          </div>
        ))}
      </div>
      <Link
        href="/posts"
        className="mt-4 inline-block text-sm text-gray-400 hover:text-gray-600 underline self-start"
      >
        もっと見る →
      </Link>
    </div>
  )
}

function MemoImageLink({ p }: { p: BlogPost }) {
  const [loaded, setLoaded] = useState(false)
  const imgUrl = toCFUrl(p.coverImage?.url ?? '/default.jpg')

  return (
    <Link href={`/posts/${p.slug}`} className="flex flex-col group">
      <div className="relative w-full h-32 overflow-hidden rounded">
        {!loaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
        <Image
          src={imgUrl}
          alt={p.title}
          fill
          sizes="128px"
          quality={75}
          className={`object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={(e) => setLoaded(true)}
        />
      </div>
      <p className="mt-1 text-sm font-medium line-clamp-1 text-gray-400 group-hover:text-gray-600 transition">
        {p.title}
      </p>
    </Link>
  )
}
