// src/components/soda/SodaLead.tsx
// ホームのカバーストーリー＝いちばん新しい投稿（ホームのタイムラインはこの次の投稿から並ぶ）。
//   写真つき: 写真いっぱいに3段タブ（種類 / 見出し / 日時・枚数）を重ね、下に本文・リンク・続きへの導線
//   文章のみ: 本文を大きな文字で（語の切れ目で改行）。下に種類と日時の2段タブといいね
// 見出しを切り詰めたときや長文を畳んだときは、タイムラインの該当投稿（#post-{id}）へ誘導する。
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
import type { TimelineDoc } from '@/lib/payloadTypes'

/** これ以上長い本文は文字を一段小さくする */
const LONG_TEXT = 60
/** 写真に重ねる見出しはここで切る（SP で写真を覆いすぎない長さ） */
const PHOTO_HEADLINE = 40
/** 文章のみの表紙で、これ以上長い本文は数行で畳んで続きへ誘導する */
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
  const big = post.title || text
  const sub = post.title ? text : ''
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

  // 見出しを持つ投稿の本文が長いときは数行で畳む
  const subFolded = sub.length > FOLD_TEXT
  const subText = sub ? <p className={`s-lead-sub${subFolded ? ' is-folded' : ''}`}>{sub}</p> : null

  if (photos.length > 0) {
    const cut = big.length > PHOTO_HEADLINE
    const headline = cut ? `${big.slice(0, PHOTO_HEADLINE)}…` : big
    const hasAfter = Boolean(sub || preview || cut)
    return (
      <article className="s-lead is-photo" aria-label="最新の投稿">
        <div className="s-lead-cover">
          <SodaLeadPhoto photos={photos} alt={headline || '最新の投稿の写真'} />
          <SodaLike id={post.id} initialLikes={post.likes ?? 0} />
          <SodaTabs
            attr={typeLabel}
            title={<Phrase text={headline} />}
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
        </div>
        {hasAfter && (
          <div className="s-lead-after">
            {subText}
            {preview}
            {(cut || subFolded) && <ReadMore id={post.id} />}
          </div>
        )}
      </article>
    )
  }

  const bigFolded = big.length > FOLD_TEXT
  return (
    <article className="s-lead is-text" aria-label="最新の投稿">
      <div className="s-eyebrow">
        <span className="s-dot" aria-hidden="true" />
        Latest ・ 最新の投稿
      </div>
      <h2 className={`s-big${big.length > LONG_TEXT ? ' is-long' : ''}${bigFolded ? ' is-folded' : ''}`}>
        <Phrase text={big} />
      </h2>
      {subText}
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
