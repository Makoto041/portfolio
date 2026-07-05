// ───────────────────────────────────────────
// src/components/GalleryGrid.tsx
// ───────────────────────────────────────────
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toCFUrl } from '@/lib/cfUrl'
import ImageModal from '@/components/gallery/ImageModal'
import type { MediaDoc } from '@/lib/payloadTypes'

export default function GalleryGrid({ gallery }: { gallery: MediaDoc[] }) {
  const [selected, setSelected] = useState<MediaDoc | null>(null)

  return (
    <>
      {/* Masonry レイアウト（Mist Terminal 意匠） */}
      <div className="masonry">
        {gallery.map((m, idx) => {
          const src = toCFUrl(m.sizes?.thumbnail?.url ?? m.url ?? m.image?.url ?? '/fallback.jpg')
          return (
            <button
              key={m.id}
              type="button"
              className="tile"
              aria-label="画像を拡大表示"
              onClick={() => setSelected(m)}
            >
              <Image
                src={src}
                alt={m.alt ?? ''}
                width={500}
                height={500}
                sizes="(min-width:1080px) 25vw, (min-width:720px) 33vw, 50vw"
                priority={idx === 0}
                className="object-cover w-full h-auto"
              />
            </button>
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
