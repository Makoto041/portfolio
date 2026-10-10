// src/components/soda/SodaTabCard.tsx
// 写真（またはロゴ書体の文字カバー）に3段タブを重ねるカード。
// つくったもの・イベント・ブログのサムネに使う。外部リンクは右上に ↗ を出す。
import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import SodaIcon from '@/components/soda/SodaIcon'
import SodaTabs from '@/components/soda/SodaTabs'
import { toCFUrl } from '@/lib/cfUrl'

export type TabCardView = {
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

type Props = TabCardView & { sizes?: string }

export default function SodaTabCard({
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
        <span className="s-tcard-cover" aria-hidden="true">
          {cover ?? ''}
        </span>
      )}
      {live && <span className="s-live">LIVE</span>}
      {external && (
        <span className="s-tcard-ext" aria-hidden="true">
          <SodaIcon name="external" />
        </span>
      )}
      <SodaTabs attr={attr} title={title} desc={desc} as="h3" />
    </>
  )

  if (external) {
    return (
      <a
        className="s-tcard"
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
    <Link className="s-tcard" href={href} aria-label={label}>
      {inner}
    </Link>
  )
}
