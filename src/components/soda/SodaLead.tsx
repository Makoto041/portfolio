// src/components/soda/SodaLead.tsx
// ホームの「最新の投稿」（ホームのタイムラインはこの次の投稿から並ぶ）。
//   文章のみ: 罫線のノートの1ページ（マスキングテープ・大きな文字は語の切れ目で改行）
//   写真つき: プリント（写真の右下にフィルムの日付写し込み・下の余白に手書きのキャプション）
// 長文は数行で畳み、「続きを読む」でタイムラインの該当投稿（#post-{id}）へ誘導する。
import Link from 'next/link'
import SodaIcon from '@/components/soda/SodaIcon'
import SodaLike from '@/components/soda/SodaLike'
import SodaLeadPhoto from '@/components/soda/SodaLeadPhoto'
import RelDay from '@/components/soda/RelDay'
import Phrase from '@/components/soda/Phrase'
import UrlPreview from '@/components/shared/UrlPreview'
import { dayParts, fmtFilmDate, fmtTime } from '@/lib/date'
import { TYPE_LABELS, postPhotos } from '@/lib/timeline'
import { lexicalToPlainText } from '@/lib/richtext'
import { charLength, clip } from '@/lib/text'
import type { TimelineDoc } from '@/lib/payloadTypes'

/** これ以上長い本文は文字を一段小さくする */
const LONG_TEXT = 60
/** これ以上長い本文は数行で畳んで続きへ誘導する */
const FOLD_TEXT = 140

function ToTimeline({ id, folded }: { id: TimelineDoc['id']; folded: boolean }) {
  return (
    <Link href={`/timeline#post-${id}`} className="s-more">
      {folded ? '続きを読む' : 'タイムラインで読む'}
      <SodaIcon name="arrow" />
    </Link>
  )
}

export default function SodaLead({ post }: { post?: TimelineDoc }) {
  if (!post) {
    return (
      <article className="s-note is-empty" aria-label="最新の投稿">
        まだ投稿がありません。
      </article>
    )
  }

  const date = post.publishedAt ?? post.createdAt
  const day = dayParts(date)
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
  const head = (
    <p className="s-lead-head">
      <span className="s-dot" aria-hidden="true" />
      <span className="s-lead-lbl">LATEST</span>
      <RelDay date={date} className="s-lead-rel" />
      <time dateTime={date}>
        {day ? `${day.month}.${day.day}（${day.weekday}）` : ''} <span className="s-num">{fmtTime(date)}</span>
      </time>
    </p>
  )
  const like = <SodaLike id={post.id} initialLikes={post.likes ?? 0} />

  if (photos.length > 0) {
    const folded = charLength(text) > FOLD_TEXT
    return (
      <article className="s-print is-lead" aria-label="最新の投稿">
        <span className="s-tape" aria-hidden="true" />
        <SodaLeadPhoto photos={photos} alt={clip(title || text, 40) || '最新の投稿の写真'} filmDate={fmtFilmDate(date)} />
        <div className="s-print-cap">
          {head}
          {title && <h2 className="s-print-title">{title}</h2>}
          {text &&
            (title ? (
              <p className={`s-print-text${folded ? ' is-folded' : ''}`}>{text}</p>
            ) : (
              <h2 className={`s-print-text${folded ? ' is-folded' : ''}`}>{text}</h2>
            ))}
          {preview}
          <div className="s-lead-foot">
            {post.postType && post.postType !== 'diary' && <span className="s-cat">{typeLabel}</span>}
            <ToTimeline id={post.id} folded={folded} />
            {like}
          </div>
        </div>
      </article>
    )
  }

  const big = title || text
  const sub = title ? text : ''
  const bigFolded = charLength(big) > FOLD_TEXT
  const subFolded = charLength(sub) > FOLD_TEXT
  return (
    <article className="s-note" aria-label="最新の投稿">
      <span className="s-tape" aria-hidden="true" />
      {head}
      <h2 className={`s-note-text${charLength(big) > LONG_TEXT ? ' is-long' : ''}${bigFolded ? ' is-folded' : ''}`}>
        <Phrase text={big} />
      </h2>
      {sub && <p className={`s-note-sub${subFolded ? ' is-folded' : ''}`}>{sub}</p>}
      {preview}
      <div className="s-lead-foot">
        <span className="s-cat">{typeLabel}</span>
        <ToTimeline id={post.id} folded={bigFolded || subFolded} />
        {like}
      </div>
    </article>
  )
}
