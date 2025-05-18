'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import type { BlogPost } from '@/lib/payloadTypes'

export default function MemoGrid({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="glass rounded-lg overflow-hidden p-4 flex flex-col">
      <h2 className="text-xl font-medium mb-2">Memo</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 flex-1">
        {posts.map((p) => (
          <MemoImageLink key={p.id} p={p} />
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
  const imgUrl = p.coverImage?.url ?? '/default.jpg'
  return (
    <Link href={`/posts/${p.slug}`} className="flex flex-col group">
      <div className="relative w-full h-32 overflow-hidden rounded">
        {!loaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
        <Image
          src={imgUrl}
          alt={p.title}
          fill
          className={`object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onLoadingComplete={() => setLoaded(true)}
        />
      </div>
      <p className="mt-1 text-sm font-medium line-clamp-1 text-gray-400 group-hover:text-gray-600 transition">
        {p.title}
      </p>
    </Link>
  )
}
