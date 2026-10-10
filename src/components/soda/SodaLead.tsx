// src/components/soda/SodaLead.tsx
// ホームのカバーストーリー＝いちばん新しい投稿。
//   写真つき: 写真いっぱいに3段タブ（種類 / 本文 / 日時・枚数）を重ねる
//   文章のみ: 本文を大きな文字で（語の切れ目で改行）。下に日時タブといいね
// 表紙ロゴが上 26% に重なるため、上余白は --s-overlap 分を確保している（soda.css）。
import SodaLike from '@/components/soda/SodaLike'
import SodaLeadPhoto from '@/components/soda/SodaLeadPhoto'
import SodaTabs from '@/components/soda/SodaTabs'
import Phrase from '@/components/soda/Phrase'
import UrlPreview from '@/components/shared/UrlPreview'
import { fmtDateJa, fmtTime } from '@/lib/date'
import { TYPE_LABELS, postPhotos } from '@/lib/timeline'
import { lexicalToPlainText } from '@/lib/richtext'
import type { TimelineDoc } from '@/lib/payloadTypes'

/** これ以上長い本文は文字を一段小さくする */
const LONG_TEXT = 60

export default function SodaLead({ post }: { post?: TimelineDoc }) {
  if (!post) {
    return (
      <article className="s-lead is-empty" aria-label="最新の投稿">
        まだ投稿がありません。
      </article>
    )
  }

  const date = post.publishedAt ?? post.createdAt
  const typeLabel = post.postType ? TYPE_LABELS[post.postType] : '日記'
  const text = lexicalToPlainText(post.text)
  const big = post.title || text
  const sub = post.title ? text : ''
  const photos = postPhotos(post)
  const hasLink = Boolean(post.embedUrl || post.urlMetadata?.url)

  if (photos.length > 0) {
    const short = big.length > LONG_TEXT ? `${big.slice(0, LONG_TEXT)}…` : big
    return (
      <article className="s-lead is-photo" aria-label="最新の投稿">
        <SodaLeadPhoto photos={photos} alt={short || '最新の投稿の写真'} />
        <SodaLike id={post.id} initialLikes={post.likes ?? 0} />
        <SodaTabs
          attr={typeLabel}
          title={<Phrase text={short} />}
          desc={
            <>
              <time dateTime={date}>
                {fmtDateJa(date)} {fmtTime(date)}
              </time>
              {` ・ 写真${photos.length}枚`}
            </>
          }
          as="h2"
        />
      </article>
    )
  }

  return (
    <article className="s-lead is-text" aria-label="最新の投稿">
      <div className="s-eyebrow">
        <span className="s-dot" aria-hidden="true" />
        Latest ・ 最新の投稿
      </div>
      <h2 className={`s-big${big.length > LONG_TEXT ? ' is-long' : ''}`}>
        <Phrase text={big} />
      </h2>
      {sub && <p className="s-lead-sub">{sub}</p>}
      {hasLink && (
        <UrlPreview
          metadata={{
            title: post.urlMetadata?.title,
            description: post.urlMetadata?.description,
            image: post.urlMetadata?.image,
            siteName: post.urlMetadata?.siteName,
            url: post.urlMetadata?.url,
          }}
          embedUrl={post.embedUrl}
        />
      )}
      <div className="s-lead-foot">
        <SodaTabs
          attr={typeLabel}
          title={<time dateTime={date}>{fmtDateJa(date)}</time>}
          desc={<span className="s-num">{fmtTime(date)}</span>}
          paper
        />
        <SodaLike id={post.id} initialLikes={post.likes ?? 0} />
      </div>
    </article>
  )
}
