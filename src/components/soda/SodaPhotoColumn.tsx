// src/components/soda/SodaPhotoColumn.tsx
// ホームの「写真」（タイムラインの下に横長に並べる。PC: 5列×2段の10枚 / タブレット: 6列 / SP: 3列×2段）。
// 各写真は /gallery へ（7枚目以降は 1080px 未満で CSS が隠す）。
import Image from 'next/image'
import Link from 'next/link'
import SodaSectionHead from '@/components/soda/SodaSectionHead'
import { toCFUrl } from '@/lib/cfUrl'

export type ColumnPhoto = { key: string; url: string; alt?: string | null }

export default function SodaPhotoColumn({ photos, total }: { photos: ColumnPhoto[]; total: number }) {
  if (photos.length === 0) return null
  return (
    <section className="s-photocol" aria-labelledby="h-photos">
      <SodaSectionHead id="h-photos" ja="写真" en="Photos" href="/gallery" />
      <div className="s-phs">
        {photos.slice(0, 10).map((p) => (
          <Link key={p.key} href="/gallery" aria-label={p.alt ? `写真: ${p.alt}` : '写真のページへ'}>
            <Image
              src={toCFUrl(p.url)}
              alt={p.alt ?? ''}
              fill
              sizes="(max-width: 760px) 31vw, (max-width: 1079px) 16vw, min(calc(20vw - 30px), 245px)"
              quality={72}
              className="object-cover"
              loading="lazy"
            />
          </Link>
        ))}
      </div>
      <p className="s-photocol-foot s-num">{total}枚</p>
    </section>
  )
}
