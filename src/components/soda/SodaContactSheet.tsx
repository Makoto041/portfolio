// src/components/soda/SodaContactSheet.tsx
// 最近の写真の「ベタ焼き」（黒い台紙にコマ番号つきで並べる）。各写真は /gallery へ。
// PC は脇に3列、タブレットは6列、SP は3列。
import Image from 'next/image'
import Link from 'next/link'
import { toCFUrl } from '@/lib/cfUrl'

export type ColumnPhoto = { key: string; url: string; alt?: string | null }

export default function SodaContactSheet({ photos, total }: { photos: ColumnPhoto[]; total: number }) {
  if (photos.length === 0) return null
  return (
    <section className="s-contact" aria-labelledby="h-photos">
      <h2 id="h-photos" className="s-contact-h">
        写真 <span className="s-num">{total}</span>
        <span className="sr-only">枚</span>
      </h2>
      <div className="s-contact-grid">
        {photos.slice(0, 9).map((p, i) => (
          <Link key={p.key} href="/gallery" aria-label={p.alt ? `写真: ${p.alt}` : '写真のページへ'}>
            <span className="s-contact-ph">
              <Image
                src={toCFUrl(p.url)}
                alt={p.alt ?? ''}
                fill
                sizes="(max-width: 760px) 31vw, (max-width: 1080px) 15vw, 96px"
                quality={70}
                className="object-cover"
                loading="lazy"
              />
            </span>
            <span className="s-contact-no" aria-hidden="true">
              {i + 1}A
            </span>
          </Link>
        ))}
      </div>
      <Link className="s-contact-more" href="/gallery">
        ぜんぶ見る →
      </Link>
    </section>
  )
}
