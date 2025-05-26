// ───────────────────────────────────────────
// src/components/GalleryGrid.tsx
// ───────────────────────────────────────────
'use client'

import { useState } from 'react'
import type { MediaDoc } from '@/lib/payloadTypes'

export default function GalleryGrid({ gallery }: { gallery: MediaDoc[] }) {
  const [selected, setSelected] = useState<MediaDoc | null>(null)

  return (
    <>
      {/* Masonry レイアウト */}
      <div className="columns-2 gap-x-4 md:columns-3 lg:columns-4">
        {gallery.map((m) => {
          const src = m.url ?? m.image?.url ?? '/fallback.jpg'
          return (
            <div
              key={m.id}
              className="mb-4 break-inside-avoid cursor-pointer group rounded-lg overflow-hidden"
              onClick={() => setSelected(m)}
            >
              <img
                src={src}
                alt={m.alt ?? ''}
                className="w-full h-auto object-cover group-hover:scale-105 transition"
              />
            </div>
          )
        })}
      </div>

      {/* すりガラス風モーダル */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div className="relative flex flex-col items-center max-w-[92vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* 拡大画像 */}
            <img
              src={selected.url ?? selected.image?.url ?? '/fallback.jpg'}
              alt={selected.alt ?? ''}
              className="rounded-lg shadow-xl max-w-full max-h-[80vh] object-contain bg-white/5 backdrop-blur-lg p-1"
            />

            {/* PC表示ではモーダル右上に、スマホでは画像から十分離して表示 */}
            <button
              className="md:absolute md:top-3 md:right-3 w-10 h-10 flex items-center justify-center border-0 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 text-xl font-light cursor-pointer select-none focus:outline-none transition z-50 mt-8 md:mt-0 shadow-md"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  )
}
