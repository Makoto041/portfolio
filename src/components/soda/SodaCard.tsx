// src/components/soda/SodaCard.tsx
// 写真（またはロゴ書体の文字カバー）の下に、種類・タイトル・補足を置くカード。
// つくったもの・イベントに使う。文字は写真に重ねない。外部リンクは写真の右上に ↗ を出す。
import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import SodaIcon from '@/components/soda/SodaIcon'
import { toCFUrl } from '@/lib/cfUrl'

export type CardView = {
  id: string
  href: string
  external?: boolean
  imageUrl?: string | null
  /** 画像が無いときに大きく置く文字（ロゴ書体） */
  cover?: string
  attr?: string
  title: ReactNode
  /** アクセシブルネーム用のプレーンなタイトル */
  label: string
  desc?: string
  live?: boolean
}

type Props = CardView & { sizes?: string }

export default function SodaCard({
  href,
  external = false,
  imageUrl,
  cover,
  attr,
  title,
  label,
  desc,
  live = false,
  sizes = '(max-width: 760px) 76vw, (max-width: 1080px) 31vw, 300px',
}: Props) {
  const inner = (
    <>
      <span className="s-card-ph">
        {imageUrl ? (
          <Image
            src={toCFUrl(imageUrl)}
            alt=""
            fill
            sizes={sizes}
            quality={72}
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <span className="s-card-cover" aria-hidden="true">
            {cover ?? ''}
          </span>
        )}
        {live && <span className="s-live">LIVE</span>}
        {external && (
          <span className="s-card-ext" aria-hidden="true">
            <SodaIcon name="external" />
          </span>
        )}
      </span>
      <div className="s-card-body">
        {attr && <span className="s-card-attr">{attr}</span>}
        <h3 className="s-card-title">{title}</h3>
        {desc && <span className="s-card-desc">{desc}</span>}
      </div>
    </>
  )

  if (external) {
    return (
      <a
        className="s-card"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label}（新しいタブで開く）`}
      >
        {inner}
      </a>
    )
  }
  return (
    <Link className="s-card" href={href} aria-label={label}>
      {inner}
    </Link>
  )
}
