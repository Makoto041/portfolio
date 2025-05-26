'use client' // クライアント実行を指定
import { LocalTime } from '@/components/LocalTime'
import React, { useState, useEffect } from 'react'
import WeatherWidget from '@/components/WeatherWidget'
import type { TimelineDoc } from '@/lib/payloadTypes'
import Breadcrumb from '@/components/Breadcrumb'
import { FaSpinner } from 'react-icons/fa'
import Link from 'next/link'

// ──────────── ヘルパー関数 ────────────
import LocalDate from '@/components/LocalDate'
import LikeButton from '@/components/LikeButton'

function formatLocalTime(dateStr: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(dateStr))
}

// ──────────── 定数定義 ────────────
const WRAP = 'mx-auto w-full max-w-[58rem] px-5 sm:px-8 section-pad'
const CARD = 'glass rounded-lg overflow-hidden' // ホームページと同じクラス
const DATE_SEPARATOR = 'text-left text-base font-semibold py-2'

export default function TimelinePage() {
  const [modalImg, setModalImg] = useState<string | null>(null)
  // React state
  const [timeline, setTimeline] = useState<TimelineDoc[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const limit = 10

  // いいね処理の即時反映用ハンドラ
  const handleLikeUpdate = (id: string | number, newLikes: number) => {
    setTimeline((prev) => {
      return prev.map((item) => {
        if (item.id === id) {
          return { ...item, likes: newLikes }
        }
        return item
      })
    })
  }

  // データ取得処理
  useEffect(() => {
    setLoading(true)
    fetch(`/api/timeline?page=${page}&limit=${limit}`)
      .then((res) => res.json())
      .then((data) => {
        // API の返却形式に合わせて配列を取り出す
        const newDocs: TimelineDoc[] = Array.isArray(data) ? data : data.docs || []

        // 重複なく追加
        setTimeline((prev) => {
          const seen = new Set(prev.map((d) => d.id))
          return [...prev, ...newDocs.filter((d) => !seen.has(d.id))]
        })
        setHasMore(newDocs.length === limit)
      })
      .catch((error) => {
        console.error('タイムライン取得に失敗:', error)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [page])

  // 日付ごとにグループ化
  const groups = timeline.reduce<Record<string, TimelineDoc[]>>((acc, doc) => {
    const dateObj = new Date(doc.publishedAt ?? doc.createdAt)
    const dateKey = dateObj.toISOString().slice(0, 10)
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(doc)
    return acc
  }, {})

  // 日付を降順ソート
  const sortedDates = Object.keys(groups).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  )

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      {/* モーダルは全体の一番上で一度だけ表示 */}
      {modalImg && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center"
          onClick={() => setModalImg(null)}
        >
          <div
            className="relative flex flex-col items-center max-w-[92vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={modalImg}
              alt="timeline-modal-img"
              className="rounded-lg shadow-xl max-w-full max-h-[80vh] object-contain bg-white/5 backdrop-blur-lg p-1"
            />
            {/* PC表示ではモーダル右上に、スマホでは画像から十分離して表示 */}
            <button
              className="md:absolute md:top-3 md:right-3 w-10 h-10 flex items-center justify-center border-0 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-600 text-xl font-light cursor-pointer select-none focus:outline-none transition z-50 mt-8 md:mt-0 shadow-md"
              onClick={() => setModalImg(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
      </div>
      <section className={`${WRAP} py-12`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold">Timeline</h1>
          <WeatherWidget />
        </div>

        {loading && timeline.length === 0 && (
          <div>
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="bg-white/90 p-4 rounded-lg shadow-sm mb-4 animate-pulse">
                <div className="h-3 w-20 bg-gray-200/30 rounded mb-2" />
                <div className="h-4 w-full bg-gray-200/20 rounded" />
                <div className="h-4 w-2/3 bg-gray-200/20 rounded mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* 日付ごとにグループ化して表示 */}
        {(() => {
          // 日付ごとグループ化
          const groups = timeline.reduce<Record<string, TimelineDoc[]>>((acc, doc) => {
            const dateObj = new Date(doc.publishedAt ?? doc.createdAt)
            const dateKey = dateObj.toISOString().slice(0, 10)
            if (!acc[dateKey]) acc[dateKey] = []
            acc[dateKey].push(doc)
            return acc
          }, {})
          // 降順ソート
          const sortedDates = Object.keys(groups).sort(
            (a, b) => new Date(b).getTime() - new Date(a).getTime(),
          )
          return (
            <div>
              {sortedDates.map((date) => (
                <div key={date} className="mb-8">
                  <div className="text-left text-base font-semibold py-2">
                    <LocalDate dateStr={date} formatType="dateOnly" />
                  </div>
                  <ul className="space-y-4">
                    {groups[date].map((t) => (
                      <li key={t.id} className={`${CARD} p-4`}>
                        <time className="block text-xs opacity-60 mb-1">
                          <LocalTime dateString={t.publishedAt ?? t.createdAt} />
                        </time>
                        <p className="text-sm leading-relaxed whitespace-pre-line">{t.text}</p>
                        {/* 画像がある場合のみ余白を追加 */}
                        {t.images?.length ? <div className="h-4"></div> : null}
                        {t.images
                          ?.slice(0, 3)
                          .map((imgObj: any) =>
                            imgObj?.image?.url ? (
                              <img
                                key={imgObj.id || imgObj.image?.id}
                                src={imgObj.image.url}
                                alt="timeline-img"
                                className="w-32 h-32 object-cover rounded mr-2 inline-block cursor-pointer"
                                onClick={() => setModalImg(imgObj.image.url)}
                              />
                            ) : null,
                          )}
                        <LikeButton
                          id={t.id}
                          initialLikes={t.likes ?? 0}
                          onLikeUpdate={handleLikeUpdate}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        })()}

        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="bg-white/90 p-3 w-32 flex items-center justify-center rounded-lg shadow-sm hover:bg-white transition"
              disabled={loading}
            >
              {loading && <FaSpinner className="animate-spin mr-2" />}
              もっと見る ▼
            </button>
          </div>
        )}

        <div className="text-center mt-20">
          <Link href="/" className="text-sm underline">
            ← TOPページへ
          </Link>
        </div>
      </section>
    </main>
  )
}
