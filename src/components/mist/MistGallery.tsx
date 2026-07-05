// src/components/mist/MistGallery.tsx
// ギャラリー統合コンポーネント（枠なし）:
//   1) 最近の静止画グリッド（先頭は大タイル）
//   2) その下に open ./gallery --stream のマーキー（内容2セット複製でループ）
// 写真は罫線なしのオープン表示（タイムラインと同じトーン）。
import Image from 'next/image'
import Link from 'next/link'
import { toCFUrl } from '@/lib/cfUrl'
import type { MediaDoc } from '@/lib/payloadTypes'

const GRID_COUNT = 9 // 先頭の大タイル1 + 小8

function bestUrl(p: MediaDoc) {
  return p.sizes?.card?.url ?? p.sizes?.thumbnail?.url ?? p.url!
}

export default function MistGallery({
  photos,
  photosTotal,
}: {
  photos: MediaDoc[]
  photosTotal: number
}) {
  const usable = photos.filter((p) => p.url || p.sizes?.thumbnail?.url)
  if (usable.length === 0) return null

  const grid = usable.slice(0, GRID_COUNT)

  // マーキーは純装飾（キーボード導線はグリッド＋"342 files →"が担う）。
  // 画像リクエストを抑えるため最大10枚に制限し、途切れないよう最低8枚まで繰り返して2セット複製
  const streamBase = usable.slice(0, 10)
  const repeat = Math.max(1, Math.ceil(8 / streamBase.length))
  const streamRow = Array.from({ length: repeat }, () => streamBase).flat()
  const streamDoubled = [...streamRow, ...streamRow]

  return (
    <section className="gallery">
      <div className="sechead">
        <span className="cmd">~/life $ ls ./gallery</span>
        <Link href="/gallery" className="more-link">
          {photosTotal} files →
        </Link>
      </div>

      {/* 最近の静止画（枠なしグリッド、先頭は大タイル） */}
      <div className="gal">
        {grid.map((p, i) => (
          <Link
            key={p.id}
            href="/gallery"
            className={`g${i === 0 ? ' big' : ''}`}
            aria-label={p.alt || 'gallery photo'}
          >
            <Image
              src={toCFUrl(bestUrl(p))}
              alt={p.alt || 'gallery photo'}
              fill
              sizes={i === 0 ? '(max-width:1180px) 60vw, 320px' : '(max-width:1180px) 30vw, 160px'}
              quality={72}
              className="object-cover"
              loading="lazy"
            />
            {p.alt && <em className="jp">{p.alt}</em>}
          </Link>
        ))}
      </div>

      {/* 同一コンポーネント内に統合したストリーム（マーキー）。全体を装飾扱いにする */}
      <div className="substream" aria-hidden>
        <span>~/life $ open ./gallery --stream</span>
      </div>
      <div className="streamwrap" aria-hidden>
        <div className="streamrow">
          {streamDoubled.map((p, i) => (
            <div key={`${p.id}-${i}`} className="sph">
              <Image
                src={toCFUrl(bestUrl(p))}
                alt=""
                fill
                sizes="180px"
                quality={70}
                className="object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        <div className="fadeL" />
        <div className="fadeR" />
      </div>
    </section>
  )
}
