// src/components/soda/SodaPhotoColumn.tsx
// ホームの「写真」の柱（PC: 左の縦1列・最大10枚 / タブレット: 6列 / SP: 3列×2段）。各写真は /gallery へ。
// PC はタイムラインの長さに合わせて枚数を増やす（7枚目以降は 1080px 未満で CSS が隠す）。
import Image from 'next/image'
import Link from 'next/link'
import SodaIcon from '@/components/soda/SodaIcon'
import SodaSectionHead from '@/components/soda/SodaSectionHead'
import { toCFUrl } from '@/lib/cfUrl'

export type ColumnPhoto = { key: string; url: string; alt?: string | null }

export default function SodaPhotoColumn({ photos, total }: { photos: ColumnPhoto[]; total: number }) {
  if (photos.length === 0) return null
  return (
    <section className="s-photocol" aria-labelledby="h-photos">
      <SodaSectionHead id="h-photos" ja="写真" en="Photos" />
      <div className="s-phs">
        {photos.slice(0, 10).map((p) => (
          <Link key={p.key} href="/gallery" aria-label={p.alt ? `写真: ${p.alt}` : '写真のページへ'}>
            <Image
              src={toCFUrl(p.url)}
              alt={p.alt ?? ''}
              fill
              sizes="(max-width: 760px) 31vw, (max-width: 1080px) 16vw, 172px"
              quality={72}
              className="object-cover"
              loading="lazy"
            />
          </Link>
        ))}
      </div>
      <div className="s-photocol-foot">
        <span className="s-num">{total}枚</span>
        <Link className="s-more" href="/gallery">
          写真をもっと見る
          <SodaIcon name="arrow" />
        </Link>
      </div>
    </section>
  )
}
