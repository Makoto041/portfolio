// src/components/soda/SodaLeadPhoto.tsx
// 最新の投稿の写真（大きく・LCP 候補なので priority）。文字は重ねない。タップで写真ビューア。
'use client'

import Image from 'next/image'
import ImageModal from '@/components/gallery/ImageModal'
import { usePhotoViewer } from '@/components/gallery/usePhotoViewer'
import { toCFUrl } from '@/lib/cfUrl'
import type { GridPhoto } from '@/lib/timeline'

export default function SodaLeadPhoto({ photos, alt }: { photos: GridPhoto[]; alt: string }) {
  const { open, modalProps } = usePhotoViewer(photos.map((p) => ({ src: p.url, alt: p.alt || alt })))
  const first = photos[0]
  if (!first) return null

  return (
    <>
      <button
        type="button"
        className="s-lead-img"
        aria-label={photos.length > 1 ? `写真を拡大（${photos.length}枚）` : '写真を拡大'}
        onClick={(e) => open(0, e.currentTarget.querySelector('img')?.currentSrc || null)}
      >
        <Image
          src={toCFUrl(first.url)}
          alt={first.alt || alt}
          fill
          priority
          sizes="(max-width: 760px) 100vw, (max-width: 1080px) 66vw, 760px"
          quality={80}
          className="object-cover"
        />
        {photos.length > 1 && (
          <span className="s-lead-count s-num" aria-hidden="true">
            1 / {photos.length}
          </span>
        )}
      </button>
      <ImageModal {...modalProps} />
    </>
  )
}
