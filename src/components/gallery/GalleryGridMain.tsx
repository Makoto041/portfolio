// ───────────────────────────────────────────
// src/components/GalleryGrid.tsx
// ───────────────────────────────────────────
'use client'

import { useState } from 'react'
import { toCFUrl } from '@/lib/cfUrl'
import ImageModal from '@/components/gallery/ImageModal'
import SmartImage from '@/components/shared/SmartImage'
import type { MediaDoc } from '@/lib/payloadTypes'

export default function GalleryGrid({ gallery }: { gallery: MediaDoc[] }) {
  const [selected, setSelected] = useState<{ doc: MediaDoc; poster: string | null } | null>(null)

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
              onClick={(e) =>
                setSelected({
                  doc: m,
                  // ブラウザが実際に描画したURL（=キャッシュ命中確実）をモーダルのポスターに使う
                  poster: e.currentTarget.querySelector('img')?.currentSrc || null,
                })
              }
            >
              <SmartImage
                src={src}
                alt={m.alt ?? ''}
                // 実寸の縦横比を渡し、ロード前からタイルの高さを確定させる（masonry の再流動を防ぐ）
                width={m.width ?? 500}
                height={m.height ?? 500}
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
        src={
          selected?.doc.url ??
          selected?.doc.image?.url ??
          selected?.doc.sizes?.thumbnail?.url ??
          '/fallback.jpg'
        }
        alt={selected?.doc.alt ?? ''}
        posterSrc={selected?.poster}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
