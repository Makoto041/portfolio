// src/components/soda/SodaSectionHead.tsx
// セクション見出し（和文ラベル + 英字キャプション + 罫線 + 右端の「すべて見る」）。
import Link from 'next/link'
import SodaIcon from '@/components/soda/SodaIcon'

type Props = { ja: string; en: string; href?: string; more?: string; id?: string }

export default function SodaSectionHead({ ja, en, href, more = 'すべて見る', id }: Props) {
  return (
    <div className="s-sh">
      <h2 id={id}>
        {ja}
        <span className="s-en">{en}</span>
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
