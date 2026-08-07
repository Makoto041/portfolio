// src/components/mist/MistLogTimeline.tsx
// git log 風タイムライン（フィルタチップ・コミット列・load more・いいね）。
// 全件をSSRで渡す方式をやめ、追加分は Payload REST（GET /api/timeline）から
// ページ単位で取得する（初期転送量の削減。Codex レビュー反映）。
// フィルタは postType の where 句としてサーバー側に問い合わせ、結果をキーごとにキャッシュする。
'use client'

import { type CSSProperties, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import ImageModal from '@/components/gallery/ImageModal'
import SmartImage from '@/components/shared/SmartImage'
import RichTextRenderer from '@/components/shared/RichTextRenderer'
import UrlPreview from '@/components/shared/UrlPreview'
import { toCFUrl } from '@/lib/cfUrl'
import { fmtDateTimeMeta } from '@/lib/date'
import { TIMELINE_PAGE_SIZE } from '@/lib/timeline'
import type { TimelineDoc, TimelinePostType } from '@/lib/payloadTypes'

/** 投稿タイプの表示ラベル（git log のカテゴリ表記） */
const TYPE_LABELS: Record<TimelinePostType, string> = {
  diary: '日記',
  tech: '技術メモ',
  photo: '写真',
  making: '制作',
  event: 'イベント',
  travel: 'おでかけ',
  study: '学習',
}

/** フィルタチップ → 現行カテゴリのマッピング（README「State Management」参照） */
const FILTERS: { key: string; label: string; types: TimelinePostType[] | null }[] = [
  { key: 'all', label: '--all', types: null },
  { key: 'diary', label: '--diary', types: ['diary', 'event'] },
  { key: 'photo', label: '--photo', types: ['photo', 'travel'] },
  { key: 'build', label: '--build', types: ['making', 'tech', 'study'] },
]

/** 投稿IDから決定的な擬似コミットハッシュ（7桁hex）を生成 */
function pseudoHash(id: string | number): string {
  const s = String(id)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h.toString(16).padStart(7, '0').slice(0, 7)
}

/* ── いいね（既存 /api/timeline/[id]/like を利用。localStorage キーも現行と共通） ── */
const LIKED_STORAGE_KEY = 'tl_liked_posts'

function MistLike({ id, initialLikes }: { id: string | number; initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const [busy, setBusy] = useState(false)

  // ローカルのいいね済み状態を復元（SSRとの不一致を避けるためマウント後に読む）
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LIKED_STORAGE_KEY) ?? '[]') as string[]
      setLiked(stored.includes(String(id)))
    } catch {
      // localStorage が使えない環境では未いいね扱い
    }
  }, [id])

  async function handleLike() {
    if (busy || liked) return
    const prev = likes
    setLikes(prev + 1)
    setLiked(true)
    try {
      setBusy(true)
      const res = await fetch(`/api/timeline/${id}/like`, { method: 'POST' })
      if (!res.ok) throw new Error(`Failed to like: ${res.status}`)
      const data = await res.json()
      setLikes(data.likes)
      try {
        const stored = JSON.parse(localStorage.getItem(LIKED_STORAGE_KEY) ?? '[]') as string[]
        if (!stored.includes(String(id))) {
          stored.push(String(id))
          localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(stored.slice(-200)))
        }
      } catch {
        // localStorage が使えない環境では UI 状態のみ
      }
    } catch (e) {
      console.error('いいねエラー:', e)
      setLikes(prev)
      setLiked(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`likes ${liked ? 'liked' : ''}`}
      onClick={handleLike}
      disabled={busy || liked}
      aria-label={liked ? 'いいね済み' : 'いいねする'}
      aria-pressed={liked}
    >
      {liked ? '♥' : '♡'} {likes}
    </button>
  )
}

/* ── 写真ブロック（X/Threads 方式の枚数別レイアウト） ─────────
   1枚: Media の width/height から縦横比を算出し、縦画像は高さ基準で
        トリミングせず表示。横画像は幅いっぱい・比率は最大16:9でクランプ。
   2〜4枚: グリッドで object-cover。 */
type TLImage = {
  id?: string
  image: {
    id?: string
    url: string
    sizes?: Record<string, { url: string }>
    width?: number | null
    height?: number | null
  }
}

function PhotoGrid({
  photos,
  title,
  onOpen,
}: {
  photos: TLImage[]
  title?: string | null
  onOpen: (url: string, poster: string | null) => void
}) {
  const items = photos.slice(0, 4)
  const n = items.length
  if (n === 0) return null
  const cls = n === 1 ? 'one' : n === 2 ? 'two' : n === 3 ? 'three' : 'four'

  return (
    <div className={`photos ${cls}`}>
      {items.map((imgObj) => {
        const im = imgObj.image
        const url = im.sizes?.thumbnail?.url ?? im.url
        let style: CSSProperties | undefined
        if (n === 1) {
          const raw = im.width && im.height ? im.width / im.height : 1.4
          const ratio = Math.min(Math.max(raw, 0.5), 16 / 9) // 極端な縦長/横長をクランプ
          style =
            ratio <= 1
              ? // 縦/正方: 高さ最大500px基準で幅を算出（トリミングしない）
                { width: Math.round(500 * ratio), maxWidth: '100%', aspectRatio: String(ratio) }
              : // 横: 幅いっぱい・高さ上限500px
                { width: '100%', aspectRatio: String(ratio), maxHeight: 500 }
        }
        return (
          <button
            key={imgObj.id || im.id || url}
            type="button"
            className="ph"
            style={style}
            aria-label="画像を拡大表示"
            onClick={(e) =>
              // 描画済みURL（=キャッシュ命中確実）をモーダルのポスターに渡す
              onOpen(im.url, e.currentTarget.querySelector('img')?.currentSrc || null)
            }
          >
            <SmartImage
              src={toCFUrl(url)}
              alt={title ?? 'timeline photo'}
              fill
              sizes={n === 1 ? '(max-width: 640px) 100vw, 640px' : '(max-width: 640px) 50vw, 320px'}
              quality={75}
              className="object-cover"
              loading="lazy"
            />
          </button>
        )
      })}
    </div>
  )
}

/* ── 本体 ─────────────────────────────────── */

/** フィルタキーごとの取得済みフィード */
type FeedState = {
  docs: TimelineDoc[]
  page: number
  hasMore: boolean
  total: number
}

/** Payload REST から1ページ取得（read: anyone の公開コレクション） */
async function fetchTimelinePage(filterKey: string, page: number) {
  const types = FILTERS.find((f) => f.key === filterKey)?.types
  const params = new URLSearchParams()
  params.set('limit', String(TIMELINE_PAGE_SIZE))
  params.set('page', String(page))
  params.set('sort', '-publishedAt')
  params.set('depth', '2')
  types?.forEach((t, i) => params.append(`where[postType][in][${i}]`, t))
  // 無応答時に loading/disabled が解除されなくなるのを防ぐタイムアウト
  const res = await fetch(`/api/timeline?${params.toString()}`, {
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`timeline fetch failed: ${res.status}`)
  return (await res.json()) as {
    docs: TimelineDoc[]
    totalDocs: number
    hasNextPage: boolean
  }
}

type Props = {
  posts: TimelineDoc[]
  /** タイムライン全投稿数（load --more の (all n) 表示に使う） */
  total: number
  /** loghead（git log 見出し + フィルタ）を表示するか。/timeline ページでは false */
  showHead?: boolean
  /** Home 用ダイジェスト表示。フィルタ・追加読込を出さず、常に /timeline への導線を出す */
  compact?: boolean
}

export default function MistLogTimeline({ posts, total, showHead = true, compact = false }: Props) {
  const [filter, setFilter] = useState('all')
  const [modalImg, setModalImg] = useState<{ src: string; poster: string | null } | null>(null)
  const [feeds, setFeeds] = useState<Record<string, FeedState>>({
    all: {
      docs: posts,
      page: posts.length > 0 ? 1 : 0,
      // SSR が空（取得失敗を含む）でもクライアントから page 1 を取り直せるようにする
      hasMore: posts.length < total || posts.length === 0,
      total,
    },
  })
  // 取得中フィルタキー（state は表示用・ref は連打時の同キー重複 fetch ガード）
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(new Set())
  const inflight = useRef<Set<string>>(new Set())
  const [errorKey, setErrorKey] = useState<string | null>(null)

  // HEAD は 'all' フィードの先頭（=最新投稿）。SSR が空でもクライアント再取得後に付く
  const headId = feeds.all?.docs[0]?.id
  const current = feeds[filter]
  // compact(Home)は SSR 分のみ表示（追加取得なし）
  const shown = compact ? posts : (current?.docs ?? [])
  const loadingCurrent = pendingKeys.has(filter)
  const errorCurrent = errorKey === filter

  async function loadFeed(filterKey: string, page: number) {
    if (inflight.current.has(filterKey)) return
    inflight.current.add(filterKey)
    setPendingKeys(new Set(inflight.current))
    setErrorKey((k) => (k === filterKey ? null : k))
    try {
      const data = await fetchTimelinePage(filterKey, page)
      setFeeds((prev) => {
        const existing = page === 1 ? [] : (prev[filterKey]?.docs ?? [])
        // 追加読込の間に新規投稿があった場合のページずれ重複を除外
        const seen = new Set(existing.map((d) => String(d.id)))
        const docs = [...existing, ...data.docs.filter((d) => !seen.has(String(d.id)))]
        return {
          ...prev,
          [filterKey]: { docs, page, hasMore: data.hasNextPage, total: data.totalDocs },
        }
      })
    } catch (e) {
      console.error('タイムライン取得エラー:', e)
      setErrorKey(filterKey)
    } finally {
      inflight.current.delete(filterKey)
      setPendingKeys(new Set(inflight.current))
    }
  }

  function handleFilter(key: string) {
    setFilter(key)
    if (!feeds[key]) void loadFeed(key, 1)
  }

  return (
    <div>
      <ImageModal
        src={modalImg?.src ?? ''}
        alt="timeline-modal-img"
        posterSrc={modalImg?.poster}
        isOpen={!!modalImg}
        onClose={() => setModalImg(null)}
      />

      <div className="loghead">
        {showHead && <span className="cmd">~/life $ git log --diary --photos</span>}
        {/* フィルタは専用タイムラインタブ側で提供。Home(compact)では出さない */}
        {!compact && (
          <div className="filters" role="group" aria-label="投稿カテゴリで絞り込み">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={filter === key ? 'on' : undefined}
                aria-pressed={filter === key}
                onClick={() => handleFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="commits">
        {shown.map((post) => {
          const isHead = post.id === headId
          const photos = (post.images ?? []).filter((img) => img?.image?.url).slice(0, 4)
          const typeLabel = post.postType ? TYPE_LABELS[post.postType] : null
          return (
            <article key={post.id} className={`commit ${isHead ? 'head' : ''}`}>
              <span className="node" aria-hidden />
              <span className="meta">
                <span className="hash">{pseudoHash(post.id)}</span>
                {' · '}
                <time dateTime={post.publishedAt ?? post.createdAt}>
                  {fmtDateTimeMeta(post.publishedAt ?? post.createdAt)}
                </time>
                {typeLabel && <span className="jp">{` · ${typeLabel}`}</span>}
                {photos.length > 0 && ` +${photos.length} photo${photos.length > 1 ? 's' : ''}`}
                {isHead && <span className="headtag">HEAD</span>}
              </span>

              <div className="body jp">
                {post.title && <strong>{post.title}　</strong>}
                <RichTextRenderer data={post.text} />
              </div>

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

              {photos.length > 0 && (
                <PhotoGrid
                  photos={photos}
                  title={post.title}
                  onOpen={(src, poster) => setModalImg({ src, poster })}
                />
              )}

              <MistLike id={post.id} initialLikes={post.likes ?? 0} />
            </article>
          )
        })}

        {shown.length === 0 && !errorCurrent && (
          <p className="commit jp logstate">
            {loadingCurrent ? '取得中…' : '該当する投稿がありません'}
          </p>
        )}
      </div>

      {errorCurrent && (
        <p className="jp logstate logerror" role="alert">
          取得に失敗しました。もう一度お試しください。
        </p>
      )}

      {compact ? (
        // Home ダイジェスト: 追加読込せず、常に専用タイムラインタブへ誘導
        <Link href="/timeline" className="loadmore">
          $ cd ./timeline <span className="n">(all {total}) →</span>
        </Link>
      ) : current?.hasMore || errorCurrent ? (
        <button
          type="button"
          className="loadmore"
          disabled={loadingCurrent}
          onClick={() => void loadFeed(filter, (current?.page ?? 0) + 1)}
        >
          {loadingCurrent ? '$ loading…' : errorCurrent ? '$ retry' : '$ load --more'}{' '}
          <span className="n">(all {current?.total ?? total})</span>
        </button>
      ) : null}
    </div>
  )
}
