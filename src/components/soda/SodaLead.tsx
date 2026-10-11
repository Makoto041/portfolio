// src/components/soda/SodaLead.tsx
// ホームの「最新の投稿」＝いちばん新しい投稿（ホームのタイムラインはこの次の投稿から並ぶ）。
//   写真つき: 写真を大きく見せ、文字は写真に重ねずに下の紙面に置く（見出しはタイトルか短い本文）
//   文章のみ: 本文を大きな文字で（語の切れ目で改行）
// 下の行に種類・日時といいね。長文は畳んで、タイムラインの該当投稿（#post-{id}）へ誘導する。
import Link from 'next/link'
import SodaIcon from '@/components/soda/SodaIcon'
import SodaLike from '@/components/soda/SodaLike'
import SodaLeadPhoto from '@/components/soda/SodaLeadPhoto'
import Phrase from '@/components/soda/Phrase'
import UrlPreview from '@/components/shared/UrlPreview'
import { fmtDateJa, fmtTime } from '@/lib/date'
import { TYPE_LABELS, postPhotos } from '@/lib/timeline'
import { lexicalToPlainText } from '@/lib/richtext'
import { charLength, clip } from '@/lib/text'
import type { TimelineDoc } from '@/lib/payloadTypes'

/** これ以上長い本文は文字を一段小さくする */
const LONG_TEXT = 60
/** タイトルの無い写真投稿で、本文をそのまま見出しにできる長さ（SP で2行まで） */
const PHOTO_CAPTION = 28
/** これ以上長い本文は数行で畳んで続きへ誘導する */
const FOLD_TEXT = 140

function ReadMore({ id }: { id: TimelineDoc['id'] }) {
  return (
    <Link href={`/timeline#post-${id}`} className="s-more s-lead-more">
      続きを読む
      <SodaIcon name="arrow" />
    </Link>
  )
}

function Eyebrow() {
  return (
    <div className="s-eyebrow">
      <span className="s-dot" aria-hidden="true" />
      Latest ・ 最新の投稿
    </div>
  )
}

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
  const title = post.title ?? ''
  const photos = postPhotos(post)
  const hasLink = Boolean(post.embedUrl || post.urlMetadata?.url)
  const preview = hasLink ? (
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
  ) : null
  const foot = (extra?: string) => (
    <div className="s-lead-foot">
      <p className="s-lead-meta">
        <span className="s-cat">{typeLabel}</span>
        <time dateTime={date}>
          {fmtDateJa(date)} <span className="s-num">{fmtTime(date)}</span>
        </time>
        {extra && <span>{extra}</span>}
      </p>
      <SodaLike id={post.id} initialLikes={post.likes ?? 0} />
    </div>
  )

  if (photos.length > 0) {
    // 見出し: タイトルか、短い本文。見出しに使っていない本文は下にすべて出す
    const headline = title || (charLength(text) <= PHOTO_CAPTION ? text : '')
    const body = title ? text : headline ? '' : text
    const bodyFolded = charLength(body) > FOLD_TEXT
    return (
      <article className="s-lead is-photo" aria-label="最新の投稿">
        <div className="s-lead-cover">
          <SodaLeadPhoto photos={photos} alt={headline || clip(text, 40) || '最新の投稿の写真'} />
        </div>
        <div className="s-lead-after">
          <Eyebrow />
          {headline && (
            <h2 className="s-lead-title">
              <Phrase text={headline} />
            </h2>
          )}
          {body && <p className={`s-lead-body${bodyFolded ? ' is-folded' : ''}`}>{body}</p>}
          {preview}
          {bodyFolded && <ReadMore id={post.id} />}
          {foot(`写真${photos.length}枚`)}
        </div>
      </article>
    )
  }

  // 長文（本文 or 見出しを持つ投稿の本文）は数行で畳む
  const big = title || text
  const sub = title ? text : ''
  const bigFolded = charLength(big) > FOLD_TEXT
  const subFolded = charLength(sub) > FOLD_TEXT
  return (
    <article className="s-lead is-text" aria-label="最新の投稿">
      <Eyebrow />
      <h2 className={`s-big${charLength(big) > LONG_TEXT ? ' is-long' : ''}${bigFolded ? ' is-folded' : ''}`}>
        <Phrase text={big} />
      </h2>
      {sub && <p className={`s-lead-sub${subFolded ? ' is-folded' : ''}`}>{sub}</p>}
      {preview}
      {(bigFolded || subFolded) && <ReadMore id={post.id} />}
      {foot()}
    </article>
  )
}
