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
          className="fixed inset-0 bg-white/10 backdrop-blur-3xl z-50 flex items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {/* 拡大画像 */}
            <img
              src={selected.url ?? selected.image?.url ?? '/fallback.jpg'}
              alt={selected.alt ?? ''}
              className="rounded-2xl shadow-lg max-w-[90vw] max-h-[90vh] object-contain"
            />

            {/* ◎ 完全中央配置◎ まん丸バツボタン */}
            <button
              className="
                mt-4
                w-10 h-10
                flex items-center justify-center
                border border-white/50 rounded-full
                bg-white/10 backdrop-blur
                hover:bg-white/20
                text-white text-2xl
                leading-[2.5rem]    /* line-height を高さに揃える */
                cursor-pointer
                select-none         /* テキスト選択を防ぐ */
                focus:outline-none
                transition
              "
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
