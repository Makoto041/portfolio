'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import type { MediaDoc } from '@/lib/payloadTypes'

export default function GalleryGrid({ gallery }: { gallery: MediaDoc[] }) {
  return (
    <div className="glass rounded-lg overflow-hidden p-4 flex flex-col">
      <h2 className="text-xl font-medium mb-2">Gallery</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 flex-1">
        {gallery.map((item) => (
          <GalleryImage key={item.id} item={item} />
        ))}
      </div>
      <Link
        href="/gallery"
        className="mt-4 inline-block text-sm text-gray-400 hover:text-gray-600 underline self-start"
      >
        もっと見る →
      </Link>
    </div>
  )
}

function GalleryImage({ item }: { item: MediaDoc }) {
  const [loaded, setLoaded] = useState(false)
  const imgUrl = item.url ?? '/default.jpg'
  return (
    <div className="flex flex-col group">
      <div className="relative w-full h-32 overflow-hidden rounded">
        {!loaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
        <Image
          src={imgUrl}
          alt={item.alt || 'gallery image'}
          fill
          className={`object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onLoadingComplete={() => setLoaded(true)}
        />
      </div>
    </div>
  )
}
