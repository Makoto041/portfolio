// ───────────────────────────────────────────
// src/components/GalleryGrid.tsx
// ───────────────────────────────────────────
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toCFUrl } from '@/lib/cfUrl'
import ImageModal from '@/components/ImageModal'
import type { MediaDoc } from '@/lib/payloadTypes'

export default function GalleryGrid({ gallery }: { gallery: MediaDoc[] }) {
  const [selected, setSelected] = useState<MediaDoc | null>(null)

  return (
    <>
      {/* Masonry レイアウト */}
      <div className="columns-2 gap-x-4 md:columns-3 lg:columns-4">
        {gallery.map((m, idx) => {
          const src = toCFUrl(m.sizes?.thumbnail?.url ?? m.url ?? m.image?.url ?? '/fallback.jpg')
          return (
            <div
              key={m.id}
              className="mb-4 break-inside-avoid cursor-pointer group rounded-lg overflow-hidden"
              onClick={() => setSelected(m)}
            >
              <div className="relative w-full h-auto">
                <Image
                  src={src}
                  alt={m.alt ?? ''}
                  width={500}
                  height={500}
                  sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw"
                  priority={idx === 0}
                  className="object-cover w-full h-auto group-hover:scale-105 transition"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* 画像モーダル */}
      <ImageModal
        src={selected?.url ?? selected?.image?.url ?? selected?.sizes?.thumbnail?.url ?? '/fallback.jpg'}
        alt={selected?.alt ?? ''}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
