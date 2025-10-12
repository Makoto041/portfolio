'use client'
import { LocalTime } from '@/components/LocalTime'
import React, { useState, useEffect } from 'react'
import WeatherWidgetClient from '@/components/WeatherWidgetClient'
import type { TimelineDoc } from '@/lib/payloadTypes'
import { FaSpinner } from 'react-icons/fa'
import Link from 'next/link'
import Image from 'next/image'
import LocalDate from '@/components/LocalDate'
import LikeButton from '@/components/LikeButton'
import RichTextRenderer from '@/components/RichTextRenderer'
import UrlPreview from '@/components/UrlPreview'
import { toCFUrl } from '@/lib/cfUrl'

// ──────────── 定数定義 ────────────
const WRAP = 'mx-auto w-full max-w-[58rem] px-5 sm:px-8 section-pad'
const CARD = 'glass rounded-lg overflow-hidden'

export default function TimelinePageClient() {
  const [modalImg, setModalImg] = useState<string | null>(null)
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
    <>
      {/* モーダルは全体の一番上で一度だけ表示 */}
      {modalImg && (
        <div
          className="fixed inset-0 bg-black/75 z-[9999] flex items-center justify-center p-4"
          onClick={() => setModalImg(null)}
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            zIndex: 9999,
            transform: 'none',
            zoom: 1
          }}
        >
          <div
            className="relative flex flex-col items-center max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            style={{ transform: 'none', zoom: 1 }}
          >
            <Image
              src={toCFUrl(modalImg)}
              alt="timeline-modal-img"
              width={800}
              height={600}
              sizes="90vw"
              className="rounded-lg shadow-xl max-w-full max-h-[80vh] object-contain"
              style={{ transform: 'none', zoom: 1 }}
            />
            <button
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/75 text-white text-lg cursor-pointer focus:outline-none transition"
              onClick={() => setModalImg(null)}
              style={{ transform: 'none', zoom: 1 }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <section className={`${WRAP} py-12`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold">Timeline</h1>
          <WeatherWidgetClient />
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
                    <div className="text-sm leading-relaxed">
                      {t.text ? (
                        <RichTextRenderer data={t.text} />
                      ) : (
                        <span className="text-gray-500 italic">テキストがありません</span>
                      )}
                    </div>
                    
                    {/* URLプレビュー */}
                    {(t.embedUrl || t.urlMetadata) && (
                      <UrlPreview 
                        metadata={{
                          title: t.urlMetadata?.title,
                          description: t.urlMetadata?.description,
                          image: t.urlMetadata?.image,
                          siteName: t.urlMetadata?.siteName,
                          url: t.urlMetadata?.url
                        }}
                        embedUrl={t.embedUrl}
                      />
                    )}
                    
                    {/* 画像がある場合のみ余白を追加 */}
                    {t.images?.length ? <div className="h-4"></div> : null}
                    {t.images
                      ?.slice(0, 3)
                      .map((imgObj: any) =>
                        imgObj?.image?.url ? (
                          <Image
                            key={imgObj.id || imgObj.image?.id}
                            src={toCFUrl(imgObj.image.url)}
                            alt="timeline-img"
                            width={128}
                            height={128}
                            sizes="128px"
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

        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="glass p-3 w-32 flex items-center justify-center rounded-lg shadow-sm hover:bg-white transition"
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
    </>
  )
}