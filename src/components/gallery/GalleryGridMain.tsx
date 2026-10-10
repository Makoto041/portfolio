// ───────────────────────────────────────────
// src/components/gallery/GalleryGridMain.tsx
// 写真のアーカイブ（masonry・角丸）。タップで写真ビューア（前後ボタン・←→・スワイプで移動）。
// ───────────────────────────────────────────
'use client'

import ImageModal from '@/components/gallery/ImageModal'
import { usePhotoViewer } from '@/components/gallery/usePhotoViewer'
import SmartImage from '@/components/shared/SmartImage'
import { toCFUrl } from '@/lib/cfUrl'
import type { MediaDoc } from '@/lib/payloadTypes'

function fullUrl(m: MediaDoc): string {
  return m.url ?? m.image?.url ?? m.sizes?.thumbnail?.url ?? ''
}

export default function GalleryGrid({ gallery }: { gallery: MediaDoc[] }) {
  const photos = gallery.filter((m) => fullUrl(m))
  const { open, modalProps } = usePhotoViewer(photos.map((m) => ({ src: fullUrl(m), alt: m.alt ?? '' })))

  if (photos.length === 0) return <p className="s-empty">まだ写真がありません</p>

  return (
    <>
      <div className="s-masonry">
        {photos.map((m, idx) => (
          <button
            key={m.id}
            type="button"
            className="s-tile"
            aria-label={m.alt ? `写真を拡大: ${m.alt}` : `写真を拡大（${idx + 1}枚目）`}
            onClick={(e) =>
              // ブラウザが実際に描画したURL（=キャッシュ命中確実）をビューアのポスターに使う
              open(idx, e.currentTarget.querySelector('img')?.currentSrc || null)
            }
          >
            <SmartImage
              src={toCFUrl(m.sizes?.thumbnail?.url ?? fullUrl(m))}
              alt={m.alt ?? ''}
              // 実寸の縦横比を渡し、ロード前からタイルの高さを確定させる（masonry の再流動を防ぐ）
              width={m.width ?? 500}
              height={m.height ?? 500}
              sizes="(min-width: 1080px) 25vw, (min-width: 761px) 33vw, 50vw"
              priority={idx < 2}
            />
          </button>
        ))}
      </div>
      <ImageModal {...modalProps} />
    </>
  )
}
