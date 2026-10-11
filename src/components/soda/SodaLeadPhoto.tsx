// src/components/soda/SodaLeadPhoto.tsx
// 最新の投稿（プリント）の写真。LCP 候補なので priority。右下にフィルムの日付写し込み。タップで写真ビューア。
'use client'

import Image from 'next/image'
import ImageModal from '@/components/gallery/ImageModal'
import { usePhotoViewer } from '@/components/gallery/usePhotoViewer'
import { toCFUrl } from '@/lib/cfUrl'
import type { GridPhoto } from '@/lib/timeline'

type Props = { photos: GridPhoto[]; alt: string; filmDate: string }

export default function SodaLeadPhoto({ photos, alt, filmDate }: Props) {
  const { open, modalProps } = usePhotoViewer(photos.map((p) => ({ src: p.url, alt: p.alt || alt })))
  const first = photos[0]
  if (!first) return null

  return (
    <>
      <button
        type="button"
        className="s-print-ph"
        aria-label={photos.length > 1 ? `写真を拡大（${photos.length}枚）` : '写真を拡大'}
        onClick={(e) => open(0, e.currentTarget.querySelector('img')?.currentSrc || null)}
      >
        <Image
          src={toCFUrl(first.url)}
          alt={first.alt || alt}
          fill
          priority
          sizes="(max-width: 760px) 92vw, (max-width: 1080px) 88vw, 760px"
          quality={80}
          className="object-cover"
        />
        {filmDate && (
          <span className="s-datemark" aria-hidden="true">
            {filmDate}
          </span>
        )}
        {photos.length > 1 && (
          <span className="s-print-count" aria-hidden="true">
            1 / {photos.length}
          </span>
        )}
      </button>
      <ImageModal {...modalProps} />
    </>
  )
}
