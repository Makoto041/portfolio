// src/components/soda/SodaSticker.tsx
// つくったものの「ステッカー」。白いフチの角丸の絵を少し傾けて貼り、下に種類のタグと名前。
// 外部リンク（サービス）は新しいタブで開く。
import Image from 'next/image'
import Link from 'next/link'
import { toCFUrl } from '@/lib/cfUrl'

export type StickerView = {
  id: string
  href: string
  external: boolean
  imageUrl?: string | null
  name: string
  tag: string
  /** 一覧ページで添える説明 */
  desc?: string | null
}

type Props = StickerView & { sizes?: string }

export default function SodaSticker({
  href,
  external,
  imageUrl,
  name,
  tag,
  desc,
  sizes = '(max-width: 760px) 56vw, (max-width: 1080px) 22vw, 260px',
}: Props) {
  const inner = (
    <>
      <span className="s-sticker-art">
        <span className="s-sticker-ph">
          {imageUrl ? (
            <Image src={toCFUrl(imageUrl)} alt="" fill sizes={sizes} quality={72} className="object-cover" loading="lazy" />
          ) : (
            <span className="s-sticker-cover" aria-hidden="true">
              {name}
            </span>
          )}
        </span>
      </span>
      <span className="s-sticker-tag">{tag}</span>
      <h3 className="s-sticker-name">{name}</h3>
      {desc && <span className="s-sticker-desc">{desc}</span>}
    </>
  )

  if (external) {
    return (
      <a className="s-sticker" href={href} target="_blank" rel="noopener noreferrer">
        {inner}
        <span className="sr-only">（新しいタブで開く）</span>
      </a>
    )
  }
  return (
    <Link className="s-sticker" href={href}>
      {inner}
    </Link>
  )
}
