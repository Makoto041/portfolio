// src/components/soda/SodaBlogRow.tsx
// ブログの1行（日付・題・抜粋・正方サムネ）。サムネが無ければロゴ書体の「Blog」。
import Image from 'next/image'
import Link from 'next/link'
import { toCFUrl } from '@/lib/cfUrl'

export type BlogRowView = {
  id: string
  href: string
  date: string
  dateTime?: string
  title: string
  excerpt?: string
  imageUrl?: string | null
}

export default function SodaBlogRow({ href, date, dateTime, title, excerpt, imageUrl }: BlogRowView) {
  return (
    <Link className="s-brow" href={href}>
      <div>
        <time className="s-bd" dateTime={dateTime}>
          {date}
        </time>
        <h3 className="s-bt">{title}</h3>
        {excerpt && <p className="s-bx">{excerpt}</p>}
      </div>
      <div className="s-bth">
        {imageUrl ? (
          <Image
            src={toCFUrl(imageUrl)}
            alt=""
            fill
            sizes="120px"
            quality={72}
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <span className="s-bth-cover" aria-hidden="true">
            Blog
          </span>
        )}
      </div>
    </Link>
  )
}
