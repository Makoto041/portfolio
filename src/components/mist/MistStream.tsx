// src/components/mist/MistStream.tsx
// ギャラリーストリーム: 写真が左へ42sで無限に流れる全幅マーキー
// （translateX(-50%) ループのため内容を2セット複製する）
import Image from 'next/image'
import Link from 'next/link'
import { toCFUrl } from '@/lib/cfUrl'
import type { MediaDoc } from '@/lib/payloadTypes'

/** ファイル名チップ表示（`img_001 — 那須` 形式。altがなければ連番のみ） */
function label(photo: MediaDoc, index: number): string {
  const name = `img_${String(index + 1).padStart(3, '0')}`
  return photo.alt ? `${name} — ${photo.alt}` : name
}

export default function MistStream({ photos }: { photos: MediaDoc[] }) {
  const usable = photos.filter((p) => p.url || p.sizes?.thumbnail?.url)
  if (usable.length === 0) return null

  // 写真が少なくてもマーキーが途切れないよう最低8枚まで繰り返す
  const repeat = Math.max(1, Math.ceil(8 / usable.length))
  const half = Array.from({ length: repeat }, () => usable).flat()
  // 2セット複製（-50% translate でシームレスにループ）
  const doubled = [...half, ...half]

  return (
    <div className="stream">
      <span className="cmd">~/life $ open ./gallery --stream</span>
      <div className="streamwrap">
        <div className="streamrow">
          {doubled.map((photo, i) => {
            const url = photo.sizes?.card?.url ?? photo.sizes?.thumbnail?.url ?? photo.url!
            const isClone = i >= half.length
            return (
              <Link
                key={`${photo.id}-${i}`}
                href="/gallery"
                className="sph"
                tabIndex={isClone ? -1 : undefined}
                aria-hidden={isClone || undefined}
              >
                <Image
                  src={toCFUrl(url)}
                  alt={isClone ? '' : photo.alt || 'gallery photo'}
                  fill
                  sizes="260px"
                  quality={70}
                  className="object-cover"
                  loading="lazy"
                />
                <em className="jp">{label(photo, i % half.length % usable.length)}</em>
              </Link>
            )
          })}
        </div>
        <div className="fadeL" aria-hidden />
        <div className="fadeR" aria-hidden />
      </div>
    </div>
  )
}
