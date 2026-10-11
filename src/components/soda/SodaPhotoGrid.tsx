// src/components/soda/SodaPhotoGrid.tsx
// 投稿の写真を「プリント」で並べる（白いフチ・1枚目の右下にフィルムの日付写し込み）。
// タップで写真ビューア（前後移動つき）。
//   1枚: 縦横比は Media の width/height から算出。縦長はトリミングせず幅を絞る（最大 320px）
//   2〜3枚: 同じ大きさのプリントを横に並べる（4:5 で object-cover）
'use client'

import type { CSSProperties } from 'react'
import ImageModal from '@/components/gallery/ImageModal'
import { usePhotoViewer } from '@/components/gallery/usePhotoViewer'
import SmartImage from '@/components/shared/SmartImage'
import { toCFUrl } from '@/lib/cfUrl'
import type { GridPhoto } from '@/lib/timeline'

/** 枚数ごとの表示幅（SP は画面幅基準・PC は最大 560px の列） */
const SIZES = [
  '(max-width: 760px) 88vw, 540px',
  '(max-width: 760px) 44vw, 270px',
  '(max-width: 760px) 30vw, 180px',
] as const

type Props = {
  photos: GridPhoto[]
  alt: string
  /** フィルムの日付写し込み `'25 10 12`（1枚目に出す） */
  filmDate?: string
}

export default function SodaPhotoGrid({ photos, alt, filmDate }: Props) {
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
      <div className={`s-pgrid is-${n}`} style={single}>
        {items.map((p, i) => (
          <button
            key={p.key}
            type="button"
            aria-label={n > 1 ? `写真を拡大（${i + 1}/${n}枚目）` : '写真を拡大'}
            onClick={(e) => open(i, e.currentTarget.querySelector('img')?.currentSrc || null)}
          >
            <span className="s-pgrid-ph">
              <SmartImage
                src={toCFUrl(p.url)}
                alt={p.alt || alt}
                fill
                sizes={SIZES[Math.min(n, 3) - 1]}
                quality={75}
                className="object-cover"
                loading="lazy"
              />
              {i === 0 && filmDate && (
                <span className="s-datemark" aria-hidden="true">
                  {filmDate}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
      <ImageModal {...modalProps} />
    </>
  )
}
