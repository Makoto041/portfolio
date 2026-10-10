// src/components/soda/SodaPhotoGrid.tsx
// 投稿の写真（X/Threads 方式の枚数別レイアウト・角丸）。タップで写真ビューア（前後移動つき）。
//   1枚: 縦横比は Media の width/height から算出。縦長はトリミングせず幅を絞る（最大 320px）
//   2〜4枚: グリッドで object-cover
'use client'

import type { CSSProperties } from 'react'
import ImageModal from '@/components/gallery/ImageModal'
import { usePhotoViewer } from '@/components/gallery/usePhotoViewer'
import SmartImage from '@/components/shared/SmartImage'
import { toCFUrl } from '@/lib/cfUrl'
import type { GridPhoto } from '@/lib/timeline'

export default function SodaPhotoGrid({ photos, alt }: { photos: GridPhoto[]; alt: string }) {
  const items = photos.slice(0, 4)
  const { open, modalProps } = usePhotoViewer(items.map((p) => ({ src: p.url, alt: p.alt || alt })))
  const n = items.length
  if (n === 0) return null

  let single: CSSProperties | undefined
  if (n === 1) {
    const { width, height } = items[0]
    const raw = width && height ? width / height : 4 / 3
    const ratio = Math.min(Math.max(raw, 0.75), 16 / 9) // 極端な縦長/横長をクランプ
    single = { '--s-ar': ratio.toFixed(3), '--s-w': ratio < 1 ? '320px' : '560px' } as CSSProperties
  }

  return (
    <>
      <div className={`s-pgrid is-${n}`}>
        {items.map((p, i) => (
          <button
            key={p.key}
            type="button"
            style={single}
            aria-label={n > 1 ? `写真を拡大（${i + 1}/${n}枚目）` : '写真を拡大'}
            onClick={(e) => open(i, e.currentTarget.querySelector('img')?.currentSrc || null)}
          >
            <SmartImage
              src={toCFUrl(p.url)}
              alt={p.alt || alt}
              fill
              sizes={n === 1 ? '(max-width: 760px) 92vw, 560px' : '(max-width: 760px) 46vw, 280px'}
              quality={75}
              className="object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
      <ImageModal {...modalProps} />
    </>
  )
}
