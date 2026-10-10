// src/components/soda/SodaLead.tsx
// ホームのカバーストーリー＝いちばん新しい投稿（ホームのタイムラインはこの次の投稿から並ぶ）。
//   写真つき: 写真いっぱいに罫線タブを重ねる。見出しはタイトル、無ければ短い本文（キャプション）。
//             長い本文はタブに押し込まず、写真の下の紙面に全文を置く（タブは種類・日時だけ）
//   文章のみ: 本文を大きな文字で（語の切れ目で改行）。下に種類と日時の2段タブといいね
// 長文を畳んだときやタイトルを切り詰めたときは、タイムラインの該当投稿（#post-{id}）へ誘導する。
// 表紙ロゴが上 26% に重なるため、上余白は --s-overlap 分を確保している（soda.css）。
import Link from 'next/link'
import SodaIcon from '@/components/soda/SodaIcon'
import SodaLike from '@/components/soda/SodaLike'
import SodaLeadPhoto from '@/components/soda/SodaLeadPhoto'
import SodaTabs from '@/components/soda/SodaTabs'
import Phrase from '@/components/soda/Phrase'
import UrlPreview from '@/components/shared/UrlPreview'
import { fmtDateJa, fmtTime } from '@/lib/date'
import { TYPE_LABELS, postPhotos } from '@/lib/timeline'
import { lexicalToPlainText } from '@/lib/richtext'
import { charLength, clip } from '@/lib/text'
import type { TimelineDoc } from '@/lib/payloadTypes'

/** これ以上長い本文は文字を一段小さくする */
const LONG_TEXT = 60
/** 写真に重ねるタイトルはここで切る */
const PHOTO_TITLE = 40
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
  const big = title || text
  const sub = title ? text : ''
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

  if (photos.length > 0) {
    // 見出し: タイトル（長ければ切る）か、短い本文。どちらも無ければタブは種類・日時だけ
    const titleCut = charLength(title) > PHOTO_TITLE
    const caption = !title && charLength(text) <= PHOTO_CAPTION ? text : ''
    const headline = title ? clip(title, PHOTO_TITLE) : caption
    // 写真の下に置く本文（見出しに使っていない本文はすべてここに出す）
    const body = title ? text : caption ? '' : text
    const bodyFolded = charLength(body) > FOLD_TEXT
    const when = (
      <time dateTime={date}>
        {fmtDateJa(date)} {fmtTime(date)}
      </time>
    )
    const hasAfter = Boolean(body || preview || titleCut)
    return (
      <article className="s-lead is-photo" aria-label="最新の投稿">
        <div className="s-lead-cover">
          <SodaLeadPhoto photos={photos} alt={headline || clip(text, 40) || '最新の投稿の写真'} />
          <SodaLike id={post.id} initialLikes={post.likes ?? 0} />
          {headline ? (
            <SodaTabs
              attr={typeLabel}
              title={<Phrase text={headline} />}
              desc={
                <>
                  {when}
                  {` ・ 写真${photos.length}枚`}
                </>
              }
              as="h2"
            />
          ) : (
            <SodaTabs attr={typeLabel} title={when} desc={`写真${photos.length}枚`} meta />
          )}
        </div>
        {hasAfter && (
          <div className="s-lead-after">
            {body && <p className={`s-lead-body${bodyFolded ? ' is-folded' : ''}`}>{body}</p>}
            {preview}
            {(titleCut || bodyFolded) && <ReadMore id={post.id} />}
          </div>
        )}
      </article>
    )
  }

  // 長文（本文 or 見出しを持つ投稿の本文）は数行で畳む
  const bigFolded = charLength(big) > FOLD_TEXT
  const subFolded = charLength(sub) > FOLD_TEXT
  return (
    <article className="s-lead is-text" aria-label="最新の投稿">
      <div className="s-eyebrow">
        <span className="s-dot" aria-hidden="true" />
        Latest ・ 最新の投稿
      </div>
      <h2 className={`s-big${charLength(big) > LONG_TEXT ? ' is-long' : ''}${bigFolded ? ' is-folded' : ''}`}>
        <Phrase text={big} />
      </h2>
      {sub && <p className={`s-lead-sub${subFolded ? ' is-folded' : ''}`}>{sub}</p>}
      {preview}
      {(bigFolded || subFolded) && <ReadMore id={post.id} />}
      <div className="s-lead-foot">
        <SodaTabs
          attr={typeLabel}
          title={
            <time dateTime={date}>
              {fmtDateJa(date)} <span className="s-num">{fmtTime(date)}</span>
            </time>
          }
          paper
          meta
        />
        <SodaLike id={post.id} initialLikes={post.likes ?? 0} />
      </div>
    </article>
  )
}
