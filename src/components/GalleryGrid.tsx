// src/components/GalleryGrid.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import type { MediaDoc } from '@/lib/payloadTypes'

export default function GalleryGrid({ gallery }: { gallery: MediaDoc[] }) {
  // 1) id で重複除去
  const unique = Array.from(new Map(gallery.map((item) => [item.id, item])).values())

  // 2) 日付文字列を取ってきてタイムスタンプに変換するヘルパー
  const toTime = (item: MediaDoc) => {
    const dateStr = item.updatedAt ?? (item as any).updated_at ?? ''
    const t = Date.parse(dateStr)
    return Number.isNaN(t) ? 0 : t
  }

  // 3) 降順ソートして最新4件を取得
  const latest = unique.sort((a, b) => toTime(b) - toTime(a)).slice(0, 4)

  return (
    <div className="bg-white/90 rounded-lg overflow-hidden shadow-sm p-4 flex flex-col">
      <h2 className="text-xl font-medium mb-2">Gallery</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 flex-1">
        {latest.map((item, idx) => (
          <div key={item.id} className={idx === 3 ? 'hidden sm:block' : ''}>
            <GalleryImage item={item} />
          </div>
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
          className={`object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setLoaded(true)}
          onLoadingComplete={() => setLoaded(true)}
        />
      </div>
    </div>
  )
}
