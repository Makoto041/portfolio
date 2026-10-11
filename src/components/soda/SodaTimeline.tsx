// src/components/soda/SodaTimeline.tsx
// タイムライン（日付ごとの日記帳）。日ごとに「曜日の丸 + M.D + 年 + きょう/○日前」の見出しを立て、
// その日の投稿を並べる。写真はプリント（右下にフィルムの日付写し込み）。
// 追加分は Payload REST（GET /api/timeline）からページ単位で取得する（初期転送量の削減）。
// 種類のフィルタと月の目次（その月だけを見る）は where 句としてサーバー側に問い合わせ、
// 結果を「種類|月」のキーごとにキャッシュする。
// compact（ホーム）ではフィルタ・目次・追加読込を出さず、専用ページへの導線を出す。
'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import RichTextRenderer from '@/components/shared/RichTextRenderer'
import UrlPreview from '@/components/shared/UrlPreview'
import SodaIcon from '@/components/soda/SodaIcon'
import SodaLike from '@/components/soda/SodaLike'
import SodaPhotoGrid from '@/components/soda/SodaPhotoGrid'
import RelDay from '@/components/soda/RelDay'
import { dayParts, fmtFilmDate, fmtTime, type DayParts } from '@/lib/date'
import {
  TIMELINE_PAGE_SIZE,
  TYPE_LABELS,
  monthRange,
  postPhotos,
  postSummary,
  type MonthBucket,
} from '@/lib/timeline'
import { timeoutSignal } from '@/lib/timeoutSignal'
import type { TimelineDoc, TimelinePostType } from '@/lib/payloadTypes'

/** フィルタ → 投稿タイプの対応 */
const FILTERS: { key: string; label: string; types: TimelinePostType[] | null }[] = [
  { key: 'all', label: 'すべて', types: null },
  { key: 'diary', label: '日記', types: ['diary', 'event'] },
  { key: 'photo', label: '写真', types: ['photo', 'travel'] },
  { key: 'build', label: 'つくる', types: ['making', 'tech', 'study'] },
]

function PostItem({ post }: { post: TimelineDoc }) {
  const date = post.publishedAt ?? post.createdAt
  const photos = postPhotos(post)
  // 大半を占める「日記」は既定扱いでラベルを出さない（ほかの種類だけ目印にする）
  const typeLabel = post.postType && post.postType !== 'diary' ? TYPE_LABELS[post.postType] : null
  const hasLink = Boolean(post.embedUrl || post.urlMetadata?.url)

  return (
    <article className="s-post" id={`post-${post.id}`}>
      <div className="s-post-meta">
        <time dateTime={date}>{fmtTime(date)}</time>
        {typeLabel && <span className="s-cat">{typeLabel}</span>}
        <SodaLike id={post.id} initialLikes={post.likes ?? 0} />
      </div>
      {post.title && <p className="s-post-title">{post.title}</p>}
      <div className="s-post-body s-rt">
        <RichTextRenderer data={post.text} />
      </div>
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
      {photos.length > 0 && (
        <SodaPhotoGrid photos={photos} alt={postSummary(post) || 'タイムラインの写真'} filmDate={fmtFilmDate(date)} />
      )}
    </article>
  )
}

type DayGroup = { key: string; date: string; parts: DayParts | null; items: TimelineDoc[] }

function groupByDay(posts: TimelineDoc[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const post of posts) {
    const date = post.publishedAt ?? post.createdAt
    const parts = dayParts(date)
    const key = parts?.key ?? `unknown-${post.id}`
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(post)
    else groups.push({ key, date, parts, items: [post] })
  }
  return groups
}

function DayFeed({ posts }: { posts: TimelineDoc[] }) {
  return (
    <>
      {groupByDay(posts).map(({ key, date, parts, items }) => (
        <div key={key} className="s-day">
          <h3 className="s-dayhead">
            {parts ? (
              <>
                <span className={`s-wd${parts.weekday === '日' ? ' is-sun' : ''}`} aria-hidden="true">
                  {parts.weekday}
                </span>
                <span className="s-md" aria-hidden="true">
                  {parts.month}.{parts.day}
                </span>
                <span className="s-yr" aria-hidden="true">
                  {parts.year}
                </span>
                <span className="sr-only">
                  {parts.year}年{parts.month}月{parts.day}日（{parts.weekday}）
                </span>
                <RelDay date={date} />
              </>
            ) : (
              <span className="s-md">—</span>
            )}
          </h3>
          <div>
            {items.map((post) => (
              <PostItem key={post.id} post={post} />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

/* ── 取得 ─────────────────────────────── */

type FeedState = { docs: TimelineDoc[]; page: number; hasMore: boolean; total: number }

/** 種類と月の組み合わせ（キャッシュのキー） */
const feedKey = (type: string, month: string) => `${type}|${month}`

/** Payload REST から1ページ取得（read: anyone の公開コレクション） */
async function fetchTimelinePage(type: string, month: string, page: number) {
  const types = FILTERS.find((f) => f.key === type)?.types
  const range = month ? monthRange(month) : null
  const params = new URLSearchParams()
  params.set('limit', String(TIMELINE_PAGE_SIZE))
  params.set('page', String(page))
  params.set('sort', '-publishedAt')
  params.set('depth', '2')
  types?.forEach((t, i) => params.append(`where[postType][in][${i}]`, t))
  if (range) {
    params.set('where[publishedAt][greater_than_equal]', range.start)
    params.set('where[publishedAt][less_than]', range.end)
  }
  // 無応答時に loading/disabled が解除されなくなるのを防ぐタイムアウト
  const res = await fetch(`/api/timeline?${params.toString()}`, { signal: timeoutSignal(15_000) })
  if (!res.ok) throw new Error(`timeline fetch failed: ${res.status}`)
  return (await res.json()) as { docs: TimelineDoc[]; totalDocs: number; hasNextPage: boolean }
}

function emptyMessage(type: string, month: string): string {
  if (month && type !== 'all') return 'この月のこの種類の投稿はありません'
  if (month) return 'この月の投稿はありません'
  if (type !== 'all') return 'この種類の投稿はまだありません'
  return 'まだ投稿がありません'
}

type Props = {
  posts: TimelineDoc[]
  /** 全投稿数（「もっと見る」の件数表示に使う） */
  total: number
  /** ホーム用ダイジェスト（フィルタ・目次・追加読込なし、専用ページへの導線を出す） */
  compact?: boolean
  /** 月の目次（新しい月から）。2か月以上あるときだけ出す */
  months?: MonthBucket[]
}

export default function SodaTimeline({ posts, total, compact = false, months = [] }: Props) {
  const [type, setType] = useState('all')
  const [month, setMonth] = useState('')
  const [feeds, setFeeds] = useState<Record<string, FeedState>>({
    [feedKey('all', '')]: {
      docs: posts,
      page: posts.length > 0 ? 1 : 0,
      // SSR が空（取得失敗を含む）でもクライアントから page 1 を取り直せるようにする
      hasMore: posts.length < total || posts.length === 0,
      total,
    },
  })
  // 取得中のキー（state は表示用・ref は連打時の同キー重複 fetch ガード）
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(new Set())
  const inflight = useRef<Set<string>>(new Set())
  const [errorKey, setErrorKey] = useState<string | null>(null)

  const key = feedKey(type, month)
  const current = feeds[key]
  const shown = compact ? posts : (current?.docs ?? [])
  const loading = pendingKeys.has(key)
  const failed = errorKey === key

  async function loadFeed(nextType: string, nextMonth: string, page: number) {
    const k = feedKey(nextType, nextMonth)
    if (inflight.current.has(k)) return
    inflight.current.add(k)
    setPendingKeys(new Set(inflight.current))
    setErrorKey((e) => (e === k ? null : e))
    try {
      const data = await fetchTimelinePage(nextType, nextMonth, page)
      setFeeds((prev) => {
        const existing = page === 1 ? [] : (prev[k]?.docs ?? [])
        // 追加読込の間に新規投稿があった場合のページずれ重複を除外
        const seen = new Set(existing.map((d) => String(d.id)))
        const docs = [...existing, ...data.docs.filter((d) => !seen.has(String(d.id)))]
        return { ...prev, [k]: { docs, page, hasMore: data.hasNextPage, total: data.totalDocs } }
      })
    } catch (e) {
      console.error('タイムライン取得エラー:', e)
      setErrorKey(k)
    } finally {
      inflight.current.delete(k)
      setPendingKeys(new Set(inflight.current))
    }
  }

  function select(nextType: string, nextMonth: string) {
    setType(nextType)
    setMonth(nextMonth)
    if (!feeds[feedKey(nextType, nextMonth)]) void loadFeed(nextType, nextMonth, 1)
  }

  const remaining = Math.max(0, (current?.total ?? total) - shown.length)

  return (
    <div className="s-feed">
      {!compact && months.length > 1 && (
        <div className="s-months" role="group" aria-label="月の目次（その月の投稿だけを表示）">
          {months.map((m) => {
            const on = month === m.key
            return (
              <button
                key={m.key}
                type="button"
                className="s-month"
                aria-pressed={on}
                aria-label={`${m.year}年${m.month}月（${m.count}件）`}
                onClick={() => select(type, on ? '' : m.key)}
              >
                <b className="s-num">
                  {m.year}.{m.month}
                </b>
                <small className="s-num">{m.count}件</small>
                {on && <SodaIcon name="close" />}
              </button>
            )
          })}
        </div>
      )}

      {!compact && (
        <div className="s-chips" role="group" aria-label="種類で絞り込み">
          {FILTERS.map(({ key: k, label }) => (
            <button
              key={k}
              type="button"
              className="s-chip"
              aria-pressed={type === k}
              onClick={() => select(k, month)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div aria-busy={loading || undefined}>
        {shown.length > 0 ? (
          <DayFeed posts={shown} />
        ) : (
          !failed && <p className="s-feed-state">{loading ? '読み込み中…' : emptyMessage(type, month)}</p>
        )}
      </div>

      {failed && (
        <p className="s-feed-state s-feed-error" role="alert">
          読み込みに失敗しました。もう一度お試しください。
        </p>
      )}

      {compact ? (
        <div className="s-loadmore">
          <Link href="/timeline" className="s-pill">
            タイムラインをもっと見る
            <SodaIcon name="arrow" />
          </Link>
        </div>
      ) : current?.hasMore || failed ? (
        <div className="s-loadmore">
          <button
            type="button"
            className="s-pill"
            disabled={loading}
            onClick={() => void loadFeed(type, month, (current?.page ?? 0) + 1)}
          >
            {loading
              ? '読み込み中…'
              : failed
                ? 'もう一度読み込む'
                : remaining > 0
                  ? `もっと見る（あと ${remaining} 件）`
                  : '読み込む'}
          </button>
        </div>
      ) : (
        shown.length > 0 && <p className="s-endmark">すべて表示しました（{shown.length}件）</p>
      )}
    </div>
  )
}
