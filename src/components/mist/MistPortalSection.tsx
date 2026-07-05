// src/components/mist/MistPortalSection.tsx
// Blog / Events / Products をトップに載せる汎用セクション。
// カードはサムネイル必須。サムネが無い場合はタイトル文字＋斜線地でカバーを代替する。
import Image from 'next/image'
import Link from 'next/link'
import { toCFUrl } from '@/lib/cfUrl'

export type PortalItem = {
  key: string
  title: string
  href: string
  external?: boolean
  thumbUrl?: string | null
  meta?: string
  badge?: { label: string; color: string } | null
}

export default function MistPortalSection({
  cmd,
  moreHref,
  moreLabel,
  items,
}: {
  cmd: string
  moreHref: string
  moreLabel: string
  items: PortalItem[]
}) {
  if (items.length === 0) return null

  return (
    <section className="portal">
      <div className="sechead">
        <span className="cmd">~/life $ {cmd}</span>
        <Link href={moreHref} className="more-link">
          {moreLabel}
        </Link>
      </div>
      <div className="cards">
        {items.map((it) => {
          const badge = it.badge ? (
            <span className="badge">
              <span className="dot" style={{ background: it.badge.color }} />
              {it.badge.label}
            </span>
          ) : null

          const thumb = it.thumbUrl ? (
            <div className="thumb">
              <Image
                src={toCFUrl(it.thumbUrl)}
                alt={it.title}
                fill
                sizes="(max-width:1180px) 40vw, 240px"
                quality={72}
                className="object-cover"
                loading="lazy"
              />
              {badge}
            </div>
          ) : (
            // サムネ無し → タイトル文字でカバーを代替
            <div className="thumb txt">
              <span className="jp">{it.title}</span>
              {badge}
            </div>
          )

          const inner = (
            <>
              {thumb}
              <div className="b">
                {/* サムネ有り時のみ本文にタイトル。文字カバー時はカバーがタイトルを担うため重複させない */}
                {it.thumbUrl && <span className="bt jp">{it.title}</span>}
                {it.meta && <span className="bm">{it.meta}</span>}
              </div>
            </>
          )

          return it.external ? (
            <a key={it.key} href={it.href} target="_blank" rel="noopener noreferrer" className="pcard">
              {inner}
            </a>
          ) : (
            <Link key={it.key} href={it.href} className="pcard">
              {inner}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
