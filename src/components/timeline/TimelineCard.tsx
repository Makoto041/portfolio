// src/components/timeline/TimelineCard.tsx
// タイムライン投稿カード（ホーム・/timeline 共用）
// 半透明ガラス面・控えめなホバーのみ動く
'use client'

import Image from 'next/image'
import Link from 'next/link'
import LocalDate from '@/components/shared/LocalDate'
import { LocalTime } from '@/components/shared/LocalTime'
import LikeButton from '@/components/timeline/LikeButton'
import RichTextRenderer from '@/components/shared/RichTextRenderer'
import UrlPreview from '@/components/shared/UrlPreview'
import { toCFUrl } from '@/lib/cfUrl'
import type { TimelineDoc, TimelinePostType } from '@/lib/payloadTypes'

/** 投稿タイプの表示ラベル */
const POST_TYPE_LABELS: Record<TimelinePostType, string> = {
  diary: '日記',
  tech: '技術メモ',
  photo: '写真',
  making: '制作ログ',
  event: 'イベント記録',
  travel: '旅行記',
  study: '学習ログ',
}

type RelatedLink = { label: string; href: string }

/** related グループから表示用リンクを組み立てる（depth=2 で解決済みの場合のみ） */
function buildRelatedLinks(post: TimelineDoc): RelatedLink[] {
  const links: RelatedLink[] = []
  const related = post.related
  if (!related) return links

  const event = related.event
  if (event && typeof event === 'object' && 'title' in event) {
    links.push({ label: event.title, href: '/in_event' })
  }
  const blogPost = related.post
  if (blogPost && typeof blogPost === 'object' && 'title' in blogPost) {
    links.push({
      label: blogPost.title,
      href: blogPost.slug ? `/posts/${blogPost.slug}` : '/posts',
    })
  }
  const product = related.product
  if (product && typeof product === 'object' && 'name' in product) {
    links.push({ label: product.name, href: '/products' })
  }
  return links
}

type TimelineCardProps = {
  post: TimelineDoc
  /** 日付の表示形式: 日付+時刻（ホーム） or 時刻のみ（日付グループ表示時） */
  dateMode?: 'date' | 'time'
  /** 本文の行数制限（ホームの抜粋表示用） */
  clampLines?: number
  onImageClick?: (url: string) => void
  onLikeUpdate?: (id: string | number, newLikes: number) => void
}

export default function TimelineCard({
  post,
  dateMode = 'date',
  clampLines,
  onImageClick,
  onLikeUpdate,
}: TimelineCardProps) {
  const typeLabel = post.postType ? POST_TYPE_LABELS[post.postType] : null
  const relatedLinks = buildRelatedLinks(post)

  return (
    <article className="glass-card fade-in-up p-5">
      {/* ヘッダー: 投稿タイプ + 日時 */}
      <div className="mb-2 flex items-center gap-2.5">
        {typeLabel && <span className="chip">{typeLabel}</span>}
        {post.priority === 'pinned' && <span className="chip">📌 ピン留め</span>}
        <time className="text-xs text-muted">
          {dateMode === 'date' ? (
            <LocalDate dateStr={post.publishedAt ?? post.createdAt} formatType="auto" />
          ) : (
            <LocalTime dateString={post.publishedAt ?? post.createdAt} />
          )}
        </time>
      </div>

      {/* タイトル（任意） */}
      {post.title && (
        <h3 className="mb-1.5 text-base font-semibold leading-snug">{post.title}</h3>
      )}

      {/* 本文 */}
      <div
        className="text-sm leading-relaxed"
        style={clampLines ? {
          display: '-webkit-box',
          WebkitLineClamp: clampLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } : undefined}
      >
        {post.text ? (
          <RichTextRenderer data={post.text} />
        ) : (
          <span className="text-muted italic">テキストがありません</span>
        )}
      </div>

      {/* URLプレビュー */}
      {(post.embedUrl || post.urlMetadata) && (
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

      {/* 画像（最大3枚） */}
      {post.images?.length ? (
        <div className="mt-3 flex gap-2">
          {post.images.slice(0, 3).map((imgObj) =>
            imgObj?.image?.url ? (
              <button
                key={imgObj.id || imgObj.image?.id}
                type="button"
                aria-label="画像を拡大表示"
                className="relative h-28 w-28 cursor-zoom-in overflow-hidden rounded-xl sm:h-32 sm:w-32"
                onClick={() => onImageClick?.(imgObj.image.url)}
              >
                <Image
                  src={toCFUrl(imgObj.image.sizes?.thumbnail?.url ?? imgObj.image.url)}
                  alt={post.title ?? 'timeline-img'}
                  fill
                  sizes="(max-width: 640px) 33vw, 128px"
                  quality={75}
                  className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                  loading="lazy"
                />
              </button>
            ) : null,
          )}
        </div>
      ) : null}

      {/* タグ + 関連リンク + いいね */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {post.tags?.map((tag) => (
          <span key={tag} className="chip opacity-80">
            #{tag}
          </span>
        ))}
        {relatedLinks.map(({ label, href }) => (
          <Link
            key={`${href}-${label}`}
            href={href}
            className="chip transition-opacity hover:opacity-70"
          >
            ↗ {label}
          </Link>
        ))}
        <div className="ml-auto">
          <LikeButton id={post.id} initialLikes={post.likes ?? 0} onLikeUpdate={onLikeUpdate} />
        </div>
      </div>
    </article>
  )
}
