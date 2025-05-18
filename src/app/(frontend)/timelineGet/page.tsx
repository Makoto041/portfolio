// src/app/(frontend)/timeline/page.tsx
'use client'

import React from 'react'
import { useState, useEffect } from 'react'
import WeatherWidget from '@/components/WeatherWidget'
import type { TimelineDoc } from '@/lib/payloadTypes'
import Breadcrumb from '@/components/Breadcrumb'
import { FaSpinner } from 'react-icons/fa'
import Link from 'next/link'

const WRAP = 'mx-auto w-full max-w-[58rem] px-5 sm:px-8 section-pad'
const CARD = 'glass p-4 rounded-lg mb-4'
const DATE_SEPARATOR = 'text-left text-base font-semibold py-2'
const MAINT = '/maintenance'

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineDoc[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const limit = 10

  useEffect(() => {
    setLoading(true)
    fetch(`/api/timeline?page=${page}&limit=${limit}`)
      .then((res) => res.json())
      .then((newDocs: TimelineDoc[]) => {
        setTimeline((prev) => {
          // 重複を除いて追加
          const seen = new Set(prev.map((d) => d.id))
          return [...prev, ...newDocs.filter((d) => !seen.has(d.id))]
        })
        setHasMore(newDocs.length === limit)
      })
      .finally(() => setLoading(false))
  }, [page])

  // 日付ごとにグループ化
  const groups = timeline.reduce<Record<string, TimelineDoc[]>>((acc, doc) => {
    const dateKey = new Date(doc.publishedAt ?? doc.createdAt).toLocaleDateString()
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(doc)
    return acc
  }, {})

  // グループの日付を降順（新しい日付→古い日付）
  const sortedDates = Object.keys(groups).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  )

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
      </div>
      <section className={`${WRAP} py-12`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold">Timeline</h1>
          <WeatherWidget />
        </div>

        {/* ローディング中かつタイムラインが空の場合はスケルトン表示 */}
        {loading && timeline.length === 0 && (
          <div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="glass p-4 rounded-lg mb-4 animate-pulse">
                <div className="h-3 w-20 bg-gray-200/30 rounded mb-2" />
                <div className="h-4 w-full bg-gray-200/20 rounded" />
                <div className="h-4 w-2/3 bg-gray-200/20 rounded mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* 日付グループ＋1列表示 */}
        {sortedDates.map((date) => (
          <div key={date} className="mb-6">
            <div className={DATE_SEPARATOR}>{date}</div>
            {groups[date].map((t) => (
              <div key={t.id} className={CARD}>
                <time className="block text-xs opacity-60 mb-2">
                  {new Date(t.publishedAt ?? t.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{t.text}</p>
              </div>
            ))}
          </div>
        ))}

        {/* もっと見るボタン（hasMore が true の時だけ表示） */}
        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="glass p-3 w-32 flex items-center justify-center rounded-lg hover:glass-hover transition"
              disabled={loading}
            >
              {loading ? <FaSpinner className="animate-spin mr-2" /> : null}
              もっと見る ▼
            </button>
          </div>
        )}

        <div className="text-center mt-20">
          <Link href="/" className="text-sm underline">
            TOPページへ →
          </Link>
        </div>
      </section>
    </main>
  )
}
