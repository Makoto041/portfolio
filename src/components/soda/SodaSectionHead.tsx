// src/components/soda/SodaSectionHead.tsx
// セクション見出し＝ノートのインデックスタブ（耳の形の見出し + 件数のバッジ）+ 右端の「すべて見る」。
import Link from 'next/link'
import SodaIcon from '@/components/soda/SodaIcon'

type Props = {
  title: string
  /** 見出しの耳に添える件数（0 や未指定なら出さない） */
  count?: number
  /** 件数の単位（読み上げ用） */
  unit?: string
  href?: string
  more?: string
  id?: string
}

export default function SodaSectionHead({ title, count, unit = '件', href, more = 'すべて見る', id }: Props) {
  return (
    <div className="s-sh">
      <h2 id={id}>
        {title}
        {count ? (
          <span className="s-cnt s-num">
            {count}
            <span className="sr-only">{unit}</span>
          </span>
        ) : null}
      </h2>
      {href && (
        <Link className="s-more" href={href}>
          {more}
          <SodaIcon name="arrow" />
        </Link>
      )}
    </div>
  )
}
